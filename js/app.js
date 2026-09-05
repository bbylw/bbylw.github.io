/* ================================================================
   Entry point — main loop, init, resize, deep links
================================================================ */

import * as THREE from 'three';
import { buildAccel } from './accel.js';
import { runBoot } from './boot.js';
import { buildCPU } from './cpu.js';
import { updateDOM, updateSpark } from './dom.js';
import { buildAmbient, buildEnvironment, buildParticles, updateAirflow, updateDust, updateFlux, updateHalo } from './environment.js';
import { feed } from './feed.js';
import { createComposer } from './fx.js';
import { simStep, updateThermalVisuals } from './sim.js';
import { COLORS, MODELS, backend, camera, cameraHome, clock, controls, coreLight, fluxPoints, haloPoints, introAt, models, reduceMotion, renderer, scene, setBboxLines, setClock, setIntroAt, sim, state } from './state.js';
import { $ } from './state.js';
import { setStyle, setupUI, updateHover } from './ui.js';

const INTRO_FROM = new THREE.Vector3(44, 30, 44);          // camera flight start (matches boot camFrom)
const CORE_COOL = new THREE.Color(0xe8c47c);               // core glow: amber at idle
const CORE_HOT  = new THREE.Color(0xffe3ae);               // …drifts to hot white under load

let composer = null;    // post-processing chain — present on the WebGL path

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
        const tgt = .35 + sim.u * 2.2;
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

    await buildEnvironment();                // picks WebGPU (r185) or WebGL2, with env map
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
    composer = createComposer(renderer, scene, camera);
    if (reduceMotion) $('btn-rotate').classList.remove('active');   // auto-rotate defaulted off
    runBoot();
    renderer.setAnimationLoop(animate);
    feed('renderer backend · ' + (backend === 'webgpu' ? 'WebGPU (r185)' : 'WebGL2 (r185)'), 'info');

    /* deep-link helpers — #accel, #explode, #stress for quick demos */
    const h = (location.hash || '').slice(1);
    if (h) setTimeout(() => {
        if (h.indexOf('accel') >= 0) setStyle('accel');
        if (h.indexOf('explode') >= 0) {
            state.exploded = true;
            $('btn-explode').classList.add('active');
        }
        if (h.indexOf('stress') >= 0) {
            state.stress = true;
            $('btn-stress').classList.add('active');
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
