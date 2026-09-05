/* ================================================================
   Entry point — main loop, init, resize, deep links
================================================================ */

import * as THREE from 'three';
import { buildAccel } from './accel.js';
import { runBoot } from './boot.js';
import { buildCPU } from './cpu.js';
import { updateDOM, updateSpark } from './dom.js';
import { buildAmbient, buildEnvironment, buildParticles, updateAirflow, updateContactShadows, updateDust, updateFlux, updateHalo } from './environment.js';
import { feed } from './feed.js';
import { createComposer } from './fx.js';
import { simStep, updateThermalVisuals } from './sim.js';
import { COLORS, MODELS, backend, camera, cameraHome, clock, controls, coreLight, fluxPoints, haloPoints, introAt, models, reduceMotion, renderer, scene, setBboxLines, setClock, setIntroAt, sim, state } from './state.js';
import { $ } from './state.js';
import { setStyle, setupUI, setWireframe, updateHover } from './ui.js';

const INTRO_FROM = new THREE.Vector3(44, 30, 44);          // camera flight start (matches boot camFrom)
const CORE_COOL = new THREE.Color(0xe8c47c);               // core glow: amber at idle
const CORE_HOT  = new THREE.Color(0xffe3ae);               // …drifts to hot white under load

let composer = null;    // post-processing chain — present on the WebGL path

/* Frame watchdog — three.js setAnimationLoop schedules the next frame only AFTER
   the callback returns, so a single thrown error inside animate() kills the loop
   forever (3D view + telemetry freeze while DOM buttons still fire — the app looks
   dead). Guard the loop and, if the WebGPU backend keeps failing, hand the session
   over to the stable WebGL2 backend via a ?renderer=webgl reload. */
let frameFails = 0, lastFailLog = 0;
function frame() {
    try {
        animate();
        frameFails = 0;
    } catch (err) {
        frameFails++;
        const now = performance.now();
        if (frameFails === 1 || now - lastFailLog > 4000) {
            lastFailLog = now;
            console.error('[X1] frame error:', err);
        }
        if (frameFails >= 8 && backend === 'webgpu' && !sessionStorage.getItem('x1.rtried')) {
            sessionStorage.setItem('x1.rtried', '1');
            console.error('[X1] render loop unstable on WebGPU — switching to WebGL2');
            const u = new URL(location.href);
            u.searchParams.set('renderer', 'webgl');
            location.href = u.href;
        }
    }
}

function animate() {
    clock.update();                          // r185 THREE.Timer — frame-rate independent
    const dt = Math.min(clock.getDelta(), .05);
    const time = clock.getElapsed();
    const sd = MODELS[state.style];

    for (const key in models) {
        const m = models[key];
        const target = key === state.style ? 1 : 0;
        m.scale += (target - m.scale) * (1 - Math.exp(-dt / .22));
        if (m.scale < .001 && target === 0) { m.group.visible = false; m.scale = 0; }
        else m.group.visible = true;
        m.group.scale.setScalar(Math.max(.001, m.scale));
    }

    const eK = 1 - Math.exp(-dt / .5);
    for (const key in models) {
        const m = models[key];
        const offs = MODELS[key].explode;
        const cur = m.explodeCur;
        m.explodeCur = cur + ((state.exploded ? 1 : 0) - cur) * eK;
        for (const lk in offs) {
            const layer = m.layers[lk];
            if (layer) layer.position.y = offs[lk] * m.explodeCur;
        }
    }

    const cpu = models.cpu;
    if (cpu) {
        if (cpu.fanSpin && cpu.group.visible && state.style === 'cpu') {
            const rpm = 500 + sim.fan * 2300;
            cpu.fanSpin.rotation.z += (rpm / 60) * Math.PI * 2 * dt;
        }
        if (cpu.lever) cpu.lever.update(state.exploded ? 1 : 0);
    }

    const tNow = performance.now();
    simStep(dt, tNow);
    updateThermalVisuals(dt, tNow);
    updateDOM(tNow);
    updateSpark(tNow);

    if (coreLight) {
        const tgt = .28 + sim.u * 1.65;
        coreLight.intensity += (tgt - coreLight.intensity) * (1 - Math.exp(-dt / .18));
        coreLight.position.y = sd.coreY;
        coreLight.color.lerpColors(CORE_COOL, CORE_HOT, Math.min(1, Math.max(0, (sim.u - .15) / .55)));
    }

    if (state.showData) {
        updateHalo(time, sim.u, dt);
        updateFlux(time, sim.u);
    } else {
        haloPoints.visible = false;
        fluxPoints.visible = false;
    }

    updateDust(time, dt);
    updateAirflow(time, dt);

    const mActive = models[state.style];
    updateContactShadows(state.style, mActive ? mActive.explodeCur : 0);
    if (composer && composer.bloomPass) {
        // hot surfaces get more glow as load climbs, but capped so white-hot
        // highlights at glancing angles never wash out the scene (fxbloom fixed)
        composer.bloomPass.strength = composer.bloomFixed
            ? composer.bloomBase
            : composer.bloomBase * (.7 + .3 * sim.u);
    }

    // camera intro ease (after the boot overlay lifts)
    if (introAt !== null) {
        const p = Math.min(1, (performance.now() - introAt) / 1700);
        camera.position.lerpVectors(INTRO_FROM, cameraHome, p);
        if (p >= 1) { setIntroAt(null); controls.enabled = true; controls.autoRotate = state.autoRotate; }
    }

    updateHover();
    controls.update();
    if (composer) composer.render();
    else renderer.render(scene, camera);
}

/* ================================================================
   init
================================================================ */
async function init() {
    const timer = new THREE.Timer();         // r185: Timer supersedes the deprecated Clock
    timer.connect(document);                 // pause-safe on tab switches
    setClock(timer);

    await buildEnvironment();                // default WebGL2 (full feature set); WebGPU opt-in via ?renderer=webgpu
    console.info('[X1] renderer backend:', backend);

    const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
        new THREE.LineBasicMaterial({ color: COLORS.gold, transparent: true, opacity: .9 })
    );
    edge.visible = false;
    scene.add(edge);
    setBboxLines(edge);

    models.cpu = buildCPU();
    models.accel = buildAccel();
    scene.add(models.cpu.group);
    scene.add(models.accel.group);
    models.accel.group.visible = false;

    buildParticles();
    buildAmbient();
    setStyle('cpu', true);
    setupUI();

    // wireframe was requested while on the WebGPU backend (see togWire) — we
    // reloaded into WebGL2 above, so re-engage the view now that it is safe.
    if (backend !== 'webgpu' && sessionStorage.getItem('x1.wantWire') === '1') {
        sessionStorage.removeItem('x1.wantWire');
        state.wireframe = true;
        setWireframe(true);
        $('btn-wireframe').classList.add('active');
        $('btn-wireframe').setAttribute('aria-pressed', 'true');
    }

    composer = createComposer(renderer, scene, camera);
    if (reduceMotion) {                          // auto-rotate defaulted off
        $('btn-rotate').classList.remove('active');
        $('btn-rotate').setAttribute('aria-pressed', 'false');
    }
    runBoot();
    renderer.setAnimationLoop(frame);
    feed('renderer backend · ' + (backend === 'webgpu' ? 'WebGPU (r185)' : 'WebGL2 (r185)'), 'info');

    /* deep-link helpers — #accel, #explode, #stress for quick demos */
    const h = (location.hash || '').slice(1);
    if (h) setTimeout(() => {
        if (h.indexOf('accel') >= 0) setStyle('accel');
        if (h.indexOf('explode') >= 0) {
            state.exploded = true;
            $('btn-explode').classList.add('active');
            $('btn-explode').setAttribute('aria-pressed', 'true');
        }
        if (h.indexOf('stress') >= 0) {
            state.stress = true;
            $('btn-stress').classList.add('active');
            $('btn-stress').setAttribute('aria-pressed', 'true');
        }
    }, 3400);
}

window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

(async () => {
    try {
        await init();
    } catch (err) {
        console.error('init failed', err);
        const log = $('boot-log');
        if (log) log.innerHTML += '<div class="ln" style="color:#ff7a6b">init failed: ' + String(err && err.message || err) + '</div>';
    }
})();
