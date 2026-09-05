/* ================================================================
   Scene, lights, floor + halo/flux/dust/airflow particles
================================================================ */

import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import * as THREE from 'three';
import { COLORS, MODELS, airAnchor, airPoints, camera, cameraTargetHome, controls, coreLight, dustPoints, fluxPoints, haloPoints, models, renderer, scene, setAirAnchor, setAirPoints, setBackend, setCamera, setCameraHome, setCameraTargetHome, setControls, setCoreLight, setDustPoints, setFluxPoints, setHaloPoints, setRenderer, setScene, sim, state } from './state.js';
import { $ } from './state.js';
import { makeCanvas, toTexture } from './textures.js';

function radialGlowTexture() {
    const S = 256;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(232,196,124,0.5)');
    grad.addColorStop(.35, 'rgba(232,196,124,0.16)');
    grad.addColorStop(1, 'rgba(232,196,124,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    return toTexture(c);
}

/* Renderer preference: 'auto' (default) picks WebGPU when the browser exposes it,
   falling back to WebGL2 on any init failure. '?renderer=webgpu|webgl' forces one. */
function rendererPreference() {
    const q = (location.search || '').toLowerCase();
    if (q.indexOf('renderer=webgpu') >= 0) return 'webgpu';
    if (q.indexOf('renderer=webgl') >= 0) return 'webgl';
    return 'auto';
}

async function makeRenderer() {
    const opts = { antialias: true, powerPreference: 'high-performance' };
    const pref = rendererPreference();
    const wantGPU = pref === 'webgpu' || (pref === 'auto' && typeof navigator !== 'undefined' && !!navigator.gpu);
    if (wantGPU) {
        try {
            const W = await import('three/webgpu');
            const r = new W.WebGPURenderer(opts);
            if (typeof r.init === 'function') {
                // guard against drivers/adapters whose init never resolves
                const timeout = new Promise((_, rej) =>
                    setTimeout(() => rej(new Error('WebGPU init timed out after 5s')), 5000));
                await Promise.race([r.init(), timeout]);
            }
            return { renderer: r, pmrem: W.PMREMGenerator, backend: 'webgpu' };
        } catch (err) {
            console.warn('WebGPU init failed — falling back to WebGL2 ·', err && err.message || err);
        }
    }
    return { renderer: new THREE.WebGLRenderer(opts), pmrem: THREE.PMREMGenerator, backend: 'webgl' };
}

async function buildEnvironment() {
    const { renderer: rr, pmrem: Pmrem, backend: bk } = await makeRenderer();
    setRenderer(rr);
    setBackend(bk);

    setScene(new THREE.Scene());
    scene.background = new THREE.Color(0x07080c);

    setCamera(new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 500));
    camera.position.set(32, 20, 32);   // framed so the module clears the side panels and bottom nav
    setCameraHome(camera.position.clone());
    setCameraTargetHome(new THREE.Vector3(0, 3.2, 0));

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    $('scene').appendChild(renderer.domElement);

    setControls(new OrbitControls(camera, renderer.domElement));
    controls.enableDamping = true;
    controls.dampingFactor = .08;
    controls.minDistance = 14;
    controls.maxDistance = 75;
    controls.maxPolarAngle = Math.PI * .88;
    controls.target.copy(cameraTargetHome);
    controls.autoRotate = state.autoRotate;
    controls.autoRotateSpeed = .45;

    try {
        const pmrem = new Pmrem(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    } catch (e) { console.warn('env map unavailable', e); }
    scene.environmentIntensity = 1.15;   // r16x+: global IBL scale, no per-material juggling

    scene.add(new THREE.AmbientLight(0xffffff, .22));
    const main = new THREE.DirectionalLight(0xfff2dd, 1.15);
    main.position.set(16, 26, 14);
    main.castShadow = true;
    main.shadow.mapSize.set(2048, 2048);
    main.shadow.camera.left = -22; main.shadow.camera.right = 22;
    main.shadow.camera.top = 22; main.shadow.camera.bottom = -22;
    main.shadow.camera.near = 2; main.shadow.camera.far = 80;
    main.shadow.bias = -.0004;
    scene.add(main);

    const fill = new THREE.DirectionalLight(0x8ea4c4, .5);
    fill.position.set(-18, 10, -14);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd9a8, .65);
    rim.position.set(2, -6, -24);
    scene.add(rim);

    setCoreLight(new THREE.PointLight(0xe8c47c, .5, 26, 2));
    coreLight.position.set(0, 2.2, 0);
    scene.add(coreLight);

    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(55, 72),
        new THREE.MeshStandardMaterial({ color: 0x0a0b10, metalness: .85, roughness: .28, envMapIntensity: .5 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.12;
    floor.receiveShadow = true;
    scene.add(floor);

    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshBasicMaterial({ map: radialGlowTexture(), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -1.115;   // just above the floor; rings stack higher to avoid z-fighting
    scene.add(glow);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .05 });
    for (const r of [7, 10.5, 14.5, 19]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + .025, 90), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -1.085;
        scene.add(ring);
    }

    return bk;
}

/* ================================================================
   Data-flow particles
================================================================ */
function buildParticles() {
    const N1 = 260;
    const pos = new Float32Array(N1 * 3);
    const haloState = [];
    for (let i = 0; i < N1; i++) {
        haloState.push({
            ang: Math.random() * Math.PI * 2,
            dir: Math.random() < .5 ? 1 : -1,
            spd: .45 + Math.random() * .55,
            r: .4 + Math.random() * .45,
            ph: Math.random() * Math.PI * 2
        });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.userData.states = haloState;
    const mat = new THREE.PointsMaterial({
        size: .14, color: COLORS.gold, transparent: true, opacity: .55,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    setHaloPoints(new THREE.Points(geo, mat));
    haloPoints.frustumCulled = false;
    scene.add(haloPoints);

    const N2 = 620;
    const pos2 = new Float32Array(N2 * 3);
    const fluxState = [];
    for (let i = 0; i < N2; i++) {
        fluxState.push({ ph: Math.random(), spd: .18 + Math.random() * .3, a0: Math.random() * Math.PI * 2, r0: Math.random() * .32 });
    }
    const geo2 = new THREE.BufferGeometry();
    geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    geo2.userData.states = fluxState;
    const mat2 = new THREE.PointsMaterial({
        size: .1, color: 0xffd98c, transparent: true, opacity: .8,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    setFluxPoints(new THREE.Points(geo2, mat2));
    fluxPoints.frustumCulled = false;
    scene.add(fluxPoints);
}

function updateHalo(time, load, dt) {
    if (!haloPoints) return;
    const sd = MODELS[state.style];
    const st = haloPoints.geometry.userData.states;
    const arr = haloPoints.geometry.attributes.position.array;
    const Rm = sd.haloR + 1.15;
    const speedScale = .55 + load * 2.1;
    for (let i = 0; i < st.length; i++) {
        const p = st[i];
        p.ang += p.dir * p.spd * speedScale * dt;
        const tube = Math.cos(time * .7 + p.ph) * p.r;
        arr[i * 3] = Math.cos(p.ang) * (Rm + tube);
        arr[i * 3 + 1] = .55 + Math.sin(time * .9 + p.ph * 2) * .1;
        arr[i * 3 + 2] = Math.sin(p.ang) * (Rm + tube);
    }
    haloPoints.geometry.attributes.position.needsUpdate = true;
    haloPoints.material.opacity = .38 + load * .35;
}

function updateFlux(time, load) {
    if (!fluxPoints) return;
    const show = state.showData && state.exploded;
    fluxPoints.visible = show;
    if (!show) return;
    const st = fluxPoints.geometry.userData.states;
    const arr = fluxPoints.geometry.attributes.position.array;
    const active = Math.floor(80 + load * 540);
    fluxPoints.geometry.setDrawRange(0, active);
    for (let i = 0; i < active; i++) {
        const p = st[i];
        const prog = (time * p.spd * (0.6 + load) + p.ph) % 1;
        const y = .3 + prog * 8.4;
        const rad = p.r0 * (1 + prog * .5);
        const a = p.a0 + prog * 6;
        arr[i * 3] = Math.cos(a) * rad;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = Math.sin(a) * rad;
    }
    fluxPoints.geometry.attributes.position.needsUpdate = true;
}

/* ================================================================
   Ambient dust motes + cooler exhaust airflow
================================================================ */
function buildAmbient() {
    const DN = 150;
    const dp = new Float32Array(DN * 3);
    const ds = [];
    for (let i = 0; i < DN; i++) ds.push({
        a: Math.random() * Math.PI * 2,
        y: .6 + Math.random() * 9,
        r: 6 + Math.random() * 17,
        sp: .04 + Math.random() * .13,
        ph: Math.random() * 6.283,
        dy: .05 + Math.random() * .22
    });
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.userData.states = ds;
    setDustPoints(new THREE.Points(dg, new THREE.PointsMaterial({
        size: .09, color: 0xc9d2ea, transparent: true, opacity: .11,
        depthWrite: false
    })));
    dustPoints.frustumCulled = false;
    scene.add(dustPoints);

    const AN = 300;
    const ap = new Float32Array(AN * 3);
    const as_ = [];
    for (let i = 0; i < AN; i++) as_.push({
        ph: Math.random(), spd: .55 + Math.random() * .85,
        r0: Math.random(), a0: Math.random() * 6.283,
        y0: Math.random()
    });
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    ag.userData.states = as_;
    setAirPoints(new THREE.Points(ag, new THREE.PointsMaterial({
        size: .16, color: 0xbfd4ff, transparent: true, opacity: .42,
        blending: THREE.AdditiveBlending, depthWrite: false
    })));
    airPoints.frustumCulled = false;
    airPoints.visible = false;
    scene.add(airPoints);
}

function updateDust(time, dt) {
    if (!dustPoints) return;
    const ds = dustPoints.geometry.userData.states;
    const arr = dustPoints.geometry.attributes.position.array;
    for (let i = 0; i < ds.length; i++) {
        const p = ds[i];
        p.a += p.sp * dt;
        p.y += p.dy * .12 * dt;
        if (p.y > 10) p.y = .6;
        arr[i * 3] = Math.cos(p.a) * p.r;
        arr[i * 3 + 1] = p.y + Math.sin(time * .5 + p.ph) * .5;
        arr[i * 3 + 2] = Math.sin(p.a) * p.r;
    }
    dustPoints.geometry.attributes.position.needsUpdate = true;
}

function updateAirflow(time, dt) {
    if (!airPoints) return;
    const cpu = models.cpu;
    const on = state.style === 'cpu' && state.exploded && state.showData &&
        cpu && cpu.group.visible && sim.fan > .24 && cpu.fanAnchor;
    airPoints.visible = on;
    if (!on) return;
    if (!airAnchor) setAirAnchor(new THREE.Vector3());
    cpu.fanAnchor.getWorldPosition(airAnchor);
    const st = airPoints.geometry.userData.states;
    const arr = airPoints.geometry.attributes.position.array;
    const fan = Math.min(1, sim.fan);
    const count = Math.floor(80 + fan * 200);
    airPoints.geometry.setDrawRange(0, count);
    const speed = .7 + fan * 1.6;
    for (let i = 0; i < count; i++) {
        const p = st[i];
        const prog = (time * p.spd * speed + p.ph) % 1;
        const spread = (0.35 + fan * .75) * (0.45 + prog * 1.25);
        arr[i * 3] = airAnchor.x + .8 + prog * 10.5;
        arr[i * 3 + 1] = airAnchor.y + (p.y0 - .5) * 2.4 * spread;
        arr[i * 3 + 2] = airAnchor.z + Math.sin(p.a0 + prog * 2.2) * 2.6 * spread;
    }
    airPoints.geometry.attributes.position.needsUpdate = true;
}



export { radialGlowTexture, buildEnvironment, buildParticles, updateHalo, updateFlux, buildAmbient, updateDust, updateAirflow };
