/* ================================================================
   X1-C CPU module geometry (PCB, socket, package, IHS, cooler, fan)
================================================================ */

import * as THREE from 'three';
import { addPart, boxMesh, std, topFaceMats } from './builders.js';
import { makeHeatGrid } from './heat.js';
import { createBoardMonitor } from './monitor.js';
import { COLORS } from './state.js';
import { dieTexture, ihsTexture, pcbCpuTexture } from './textures.js';

function buildCPU() {
    const model = { group: new THREE.Group(), layers: {}, parts: [], scale: 1, explodeCur: 0, fanSpin: null,
        T: { d: 30, p: 30, f: 30 }, fanv: .12, throttle: false, nodeT: { die: 30, plate: 30, fin: 30, pkg: 30, pcb: 30, hbm: 30 }, pipeMats: [] };
    const g = model.group;

    /* PCB */
    const pcbLayer = new THREE.Group();
    const pcbMap = pcbCpuTexture();
    const pcbSide = std(COLORS.pcbDark, .75, .15);
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(22, .5, 22), topFaceMats(pcbSide, new THREE.MeshStandardMaterial({ map: pcbMap, roughness: .7, metalness: .12 }), 0x0a0d0a));
    pcb.position.y = -.25;
    pcb.receiveShadow = true;
    pcb.castShadow = true;
    pcbLayer.add(pcb);

    const screwMat = std(0x6b7075, .3, .85);
    for (const sx of [-9.8, 9.8]) for (const sz of [-9.8, 9.8]) {
        const scr = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .24, 6), screwMat);
        scr.position.set(sx, .05, sz);
        pcbLayer.add(scr);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .12, 6), std(0x3a3d42, .25, .9));
        head.position.set(sx, .17, sz);
        pcbLayer.add(head);
    }

    const capMat = std(0x1c1c20, .35, .7);
    for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2;
        const r = 6.6 + Math.random() * 1.4;
        const tall = i % 5 === 0;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(tall ? .3 : .17, tall ? .3 : .17, tall ? .52 : .34, 10), capMat);
        c.position.set(Math.cos(a) * r, .26, Math.sin(a) * r);
        pcbLayer.add(c);
    }

    model.layers.pcb = pcbLayer;
    g.add(pcbLayer);
    addPart(model, 'pcb', pcbLayer, 'Carrier PCB', 'Dark motherboard · 44x MLCC decoupling capacitors around the socket.');

    /* socket load lever — open in exploded teardown, latched when assembled */
    const leverRoot = new THREE.Group();
    leverRoot.position.set(0, 0, 7.0);
    const hinge = boxMesh(.9, .6, .85, std(0x16171c, .45, .3));
    hinge.position.set(0, .3, -.5);
    leverRoot.add(hinge);
    const armGeo = new THREE.CylinderGeometry(.08, .105, 1, 12);
    armGeo.translate(0, .5, 0);                    // base at pivot, grows along +Y
    const arm = new THREE.Mesh(armGeo, std(0xc6c9ce, .22, .9));
    arm.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 12), std(0xdcdfe3, .18, .94));
    const armG = new THREE.Group();
    armG.add(arm, knob);
    leverRoot.add(armG);
    pcbLayer.add(leverRoot);
    /* quaternions at the open/closed extremes are precomputed; the per-frame
       update is a quaternion slerp + linear length — no vector allocs */
    const upAxis = new THREE.Vector3(0, 1, 0);
    model.lever = {
        arm: armG, knob,
        oLen: 2.75, cLen: 1.31,
        qOpen: new THREE.Quaternion().setFromUnitVectors(upAxis, new THREE.Vector3(0, 2.3, 1.5).normalize()),
        qClosed: new THREE.Quaternion().setFromUnitVectors(upAxis, new THREE.Vector3(0, .3, -1.28).normalize()),
        update(ex) {
            this.arm.quaternion.slerpQuaternions(this.qOpen, this.qClosed, ex);
            const dist = this.oLen + (this.cLen - this.oLen) * ex;
            this.arm.scale.setScalar(dist);
            this.knob.position.set(0, dist, 0);
        }
    };

    /* on-board diagnostics panel + status LEDs */
    const mon = createBoardMonitor(3.5, 2.05, 'X1-C');
    mon.unit.position.set(5.6, 0, 9.1);
    pcbLayer.add(mon.unit);
    model.monitor = mon;

    /* Socket */
    const socketLayer = new THREE.Group();
    const frameMat = std(COLORS.socketPl, .55, .1);
    function wall(w, h, d, x, z) {
        const m = boxMesh(w, h, d, frameMat);
        m.position.set(x, .34, z);
        socketLayer.add(m);
    }
    wall(11.9, .68, .9, 0, -5.5);
    wall(11.9, .68, .9, 0, 5.5);
    wall(.9, .68, 11.0, -5.5, 0);
    wall(.9, .68, 11.0, 5.5, 0);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(10.2, .09, 10.2), std(0xc9a45a, .35, .85));
    plate.position.y = .1;
    plate.receiveShadow = true;
    socketLayer.add(plate);
    for (const ax of [-5.55, 5.55]) for (const az of [-5.55, 5.55]) {
        const nb = new THREE.Mesh(new THREE.BoxGeometry(.5, .1, .5), std(0x2e2b31, .6, .1));
        nb.position.set(ax, .7, az);
        socketLayer.add(nb);
    }
    model.layers.socket = socketLayer;
    g.add(socketLayer);
    addPart(model, 'socket', socketLayer, 'X1 Socket', 'LGA-style socket · 484 gold contacts · push-pin frame.');

    /* Package + die + pins */
    const pkgLayer = new THREE.Group();
    const sub = boxMesh(10, .75, 10, std(COLORS.substrate, .62, .2));
    sub.position.y = .975;
    sub.receiveShadow = true;
    pkgLayer.add(sub);
    const band = boxMesh(10.02, .02, 10.02, std(0x241d16, .6, .25));
    band.position.y = 1.36;
    pkgLayer.add(band);

    const hotDie = makeHeatGrid(48, .1, .9, .1, .9, 14);
    const dieTopTex = new THREE.MeshStandardMaterial({ map: dieTexture('cpu'), roughness: .14, metalness: .9, emissive: 0xffb45c, emissiveIntensity: .5, emissiveMap: hotDie.tex });
    const die = new THREE.Mesh(new THREE.BoxGeometry(5.2, .27, 5.2), topFaceMats(std(0x9a7a33, .3, .85), dieTopTex, 0x4a3b18));
    die.position.y = 1.485;
    pkgLayer.add(die);
    model.dieMat = dieTopTex;
    model.hotDie = hotDie;

    const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .045, .62, 6), std(0xd4af37, .18, .95), 22 * 22);
    const mtx = new THREE.Matrix4(), v3 = new THREE.Vector3(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (let ix = 0; ix < 22; ix++) {
        for (let iz = 0; iz < 22; iz++) {
            v3.set(-4.62 + ix * .44, .3, -4.62 + iz * .44);
            mtx.compose(v3, q, s3);
            pins.setMatrixAt(k++, mtx);
        }
    }
    pins.castShadow = true;
    pkgLayer.add(pins);

    model.layers.pkg = pkgLayer;
    g.add(pkgLayer);
    addPart(model, 'pkg', pkgLayer, 'Package + Die', 'Organic substrate · 484 solder pins · 5 nm FinFET.');
    addPart(model, 'pkg', die, 'Compute Die', '96 AI cores · 512 TOPS INT8 · 48.6B transistors.', 'die');

    /* IHS */
    const ihsLayer = new THREE.Group();
    const hotIhs = makeHeatGrid(56, .205, .795, .205, .795, 10);  // die footprint on the lid
    const ihsMap = new THREE.MeshPhysicalMaterial({ map: ihsTexture(), roughness: .18, metalness: 1,
        clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: 1.25,
        emissive: 0xff9a33, emissiveIntensity: .4, emissiveMap: hotIhs.tex });
    const ihs = new THREE.Mesh(new THREE.BoxGeometry(9, .42, 9), topFaceMats(std(COLORS.nickel, .28, .92), ihsMap, 0x8f959b));
    ihs.position.y = 1.83;
    ihsLayer.add(ihs);
    model.ihsTopMat = ihsMap;
    model.hotIhs = hotIhs;
    const dotMat = std(0x33363c, .3, .8);
    for (const dx of [-3.4, 3.4]) for (const dz of [-3.4, 3.4]) {
        const dot = new THREE.Mesh(new THREE.CircleGeometry(.11, 14), dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(dx, 2.05, dz);
        ihsLayer.add(dot);
    }
    model.layers.ihs = ihsLayer;
    g.add(ihsLayer);
    addPart(model, 'ihs', ihsLayer, 'IHS · Heat Spreader', 'Nickel-plated copper lid · laser-etched markings · soldered to die.');

    /* Tower cooler + fan */
    const coolerLayer = new THREE.Group();
    const base = boxMesh(10.8, .5, 10.8, std(0xc2c6cb, .3, .9));
    base.position.y = 2.29;
    base.receiveShadow = true;
    coolerLayer.add(base);

    /* thermal interface material — peels away with the cooler in explode view */
    const tim = boxMesh(9.25, .06, 9.25, std(0xdad9d2, .72, .02, { transparent: true, opacity: .92 }));
    tim.position.y = 2.01;
    coolerLayer.add(tim);

    for (let i = 0; i < 21; i++) {
        const shade = .97 + (i % 3) * .012;
        const f = boxMesh(.16, 3.7, 9.8, std(0x9aa0a6 * shade, .38, .88));
        f.position.set(-5 + i * .5, 4.39, 0);
        coolerLayer.add(f);
    }
    for (const sgn of [-1, 1]) {
        const cap = boxMesh(.12, 3.7, 9.8, std(0x8a9095, .4, .85));
        cap.position.set(sgn * 5.22, 4.39, 0);
        coolerLayer.add(cap);
        for (const pz of [-2.4, 2.4]) {
            const pipeMat = std(COLORS.copper, .3, .9);
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, 4.1, 10), pipeMat);
            pipe.position.set(sgn * 5.62, 4.4, pz);
            coolerLayer.add(pipe);
            const pcapMat = std(0x8a5320, .3, .9);
            const pcap = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .08, 10), pcapMat);
            pcap.position.set(sgn * 5.62, 6.5, pz);
            coolerLayer.add(pcap);
            model.pipeMats.push(pipeMat, pcapMat);
        }
    }

    const fan = buildFanAssembly();
    fan.position.set(6.35, 4.55, 0);
    coolerLayer.add(fan);
    model.fanSpin = fan.getObjectByName('spin');
    model.fanAnchor = fan;

    model.layers.cooler = coolerLayer;
    g.add(coolerLayer);
    addPart(model, 'cooler', coolerLayer, 'Tower Cooler', 'Aluminium fin stack · 4 copper heat pipes · 120 mm PWM fan.');
    addPart(model, 'cooler', fan, '120 mm PWM Fan', 'Fluid-dynamic bearing · 600-2800 RPM · tied to thermal load.');

    return model;
}

/* Axial fan, shaft along Z; caller rotates assembly so shaft = X */
function buildFanAssembly() {
    const root = new THREE.Group();
    const spin = new THREE.Group();
    spin.name = 'spin';

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .62, 18), std(0x2a2d33, .4, .6));
    hub.rotation.x = Math.PI / 2;
    spin.add(hub);

    const bladeMat = std(0x0f1114, .25, .2);
    for (let i = 0; i < 7; i++) {
        const pivot = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.35, .13), bladeMat);
        blade.position.y = 1.72;
        blade.rotation.y = .34;
        blade.rotation.z = -.12;
        pivot.add(blade);
        pivot.rotation.z = (i / 7) * Math.PI * 2;
        spin.add(pivot);
    }
    spin.position.z = .05;

    const shroudMat = std(0x202226, .5, .2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, .2, 10, 44), shroudMat);
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, .5, 44, 1, true), std(0x18191d, .5, .2, { side: THREE.BackSide }));
    barrel.rotation.x = Math.PI / 2;
    root.add(barrel);

    const guardMat = std(0x18191d, .6, .3);
    const g1 = boxMesh(2.6, .07, .09, guardMat);
    g1.position.z = -.15;
    const g2 = boxMesh(.09, .07, 2.6, guardMat);
    g2.position.z = -.15;
    root.add(g1, g2);
    root.add(spin);
    root.rotation.y = Math.PI / 2;
    return root;
}



export { buildCPU };
