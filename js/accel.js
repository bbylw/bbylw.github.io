/* ================================================================
   X1-A accelerator geometry (carrier, interposer, die, HBM, cold plate)
================================================================ */

import * as THREE from 'three';
import { addPart, boxMesh, std, topFaceMats } from './builders.js';
import { makeHeatGrid } from './heat.js';
import { createBoardMonitor } from './monitor.js';
import { COLORS } from './state.js';
import { dieTexture, hbmSideTexture, pcbAccelTexture } from './textures.js';

function buildAccel() {
    const model = { group: new THREE.Group(), layers: {}, parts: [], scale: 1, explodeCur: 0, fanSpin: null,
        T: { d: 30, p: 30, f: 30 }, fanv: .12, throttle: false, nodeT: { die: 30, plate: 30, fin: 30, pkg: 30, pcb: 30, hbm: 30 }, pipeMats: [] };
    const g = model.group;

    /* Carrier */
    const carrierLayer = new THREE.Group();
    const map = pcbAccelTexture();
    const sideMat = std(COLORS.boardBlack, .7, .2);
    const board = new THREE.Mesh(new THREE.BoxGeometry(20, .5, 20), topFaceMats(sideMat, new THREE.MeshStandardMaterial({ map, roughness: .66, metalness: .2 }), 0x070708));
    board.position.y = -.25;
    board.receiveShadow = true;
    board.castShadow = true;
    carrierLayer.add(board);

    const screwMat = std(0x4a4e55, .35, .85);
    for (const sx of [-9.2, 9.2]) for (const sz of [-9.2, 9.2]) {
        const scr = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .22, 6), screwMat);
        scr.position.set(sx, .03, sz);
        carrierLayer.add(scr);
    }

    const chokeMat = std(0x101013, .5, .4);
    const bulkMat = std(0x1a1a1f, .45, .6);
    const smallMat = std(0x232329, .4, .55);
    const SIDE = 8.2;
    for (const sgn of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
            const t = -5.4 + i * 2.7;
            const ch = boxMesh(.85, .42, .95, chokeMat);
            ch.position.set(sgn * SIDE, .2, t);
            carrierLayer.add(ch);
            const ch2 = boxMesh(.95, .42, .85, chokeMat);
            ch2.position.set(t, .2, sgn * SIDE);
            carrierLayer.add(ch2);
        }
        for (let i = 0; i < 7; i++) {
            const t = -5.7 + i * 1.9;
            const bc = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .55, 12), bulkMat);
            bc.position.set(sgn * (SIDE + .9), .32, t);
            carrierLayer.add(bc);
            const sc = boxMesh(.42, .16, .24, smallMat);
            sc.position.set(t, .2, sgn * (SIDE + .9));
            carrierLayer.add(sc);
        }
    }
    model.layers.carrier = carrierLayer;
    g.add(carrierLayer);
    addPart(model, 'carrier', carrierLayer, 'Carrier Board', 'SXM-class carrier · VRM phases around the module.');

    /* on-board diagnostics panel + status LEDs */
    const mon = createBoardMonitor(3.6, 2.1, 'X1-A');
    mon.unit.position.set(6.2, 0, 8.4);
    mon.unit.rotation.y = .35;
    carrierLayer.add(mon.unit);
    model.monitor = mon;

    /* Module: interposer + die + HBM */
    const modLayer = new THREE.Group();
    const interposer = boxMesh(12.4, 1.0, 12.4, std(0x1b1510, .6, .2));
    interposer.position.y = .5;
    interposer.receiveShadow = true;
    modLayer.add(interposer);
    const topRing = boxMesh(12.42, .02, 12.42, std(0x2a2016, .55, .3));
    topRing.position.y = 1.01;
    modLayer.add(topRing);

    const hotDie = makeHeatGrid(52, .1, .9, .1, .9, 13);
    const dieTop = new THREE.MeshStandardMaterial({ map: dieTexture('accel'), roughness: .13, metalness: .92, emissive: 0xffb45c, emissiveIntensity: .55, emissiveMap: hotDie.tex });
    const die = new THREE.Mesh(new THREE.BoxGeometry(6.6, .75, 6.6), topFaceMats(std(0x7a6230, .35, .8), dieTop, 0x2a2110));
    die.position.y = 1.375;
    die.castShadow = true;
    modLayer.add(die);
    model.dieMat = dieTop;
    model.hotDie = hotDie;

    /* thermal interface block above the die — tops out level with the HBM caps */
    const timBlock = boxMesh(6.62, .7, 6.62, std(0xd7d6cf, .72, .02, { transparent: true, opacity: .92 }));
    timBlock.position.y = 2.1;
    modLayer.add(timBlock);

    const hbmBody = std(COLORS.hbm, .4, .25);
    const hbmLabel = new THREE.MeshStandardMaterial({ map: hbmSideTexture(), roughness: .38, metalness: .55 });
    const stackW = 2.15, stackZ = 2.15, stackH = 1.3;
    const hbmRoot = new THREE.Group();
    for (const sgn of [-1, 1]) {
        const cx = sgn * 4.75;
        for (let i = -1; i <= 1; i++) {
            const cz = i * 2.62;
            // each stack is its own hoverable part (body + cap + marking plates)
            const sg = new THREE.Group();
            sg.position.set(cx, 0, cz);
            const stack = boxMesh(stackW, stackH, stackZ, hbmBody);
            stack.position.set(0, 1 + stackH / 2, 0);
            sg.add(stack);
            const cap = boxMesh(stackW + .06, .06, stackZ + .06, std(0x202024, .4, .3));
            cap.position.set(0, 1 + stackH + .03, 0);
            sg.add(cap);
            // gold marking plate on the outward-facing x side of every stack
            const xPlate = new THREE.Mesh(new THREE.BoxGeometry(.02, .44, 1.7), hbmLabel);
            xPlate.position.set(sgn * (stackW / 2 + .011), 1.6, 0);
            sg.add(xPlate);
            // plus plates on the outermost z faces of each column
            if (i !== 0) {
                const zPlate = new THREE.Mesh(new THREE.BoxGeometry(1.7, .44, .02), hbmLabel);
                zPlate.position.set(0, 1.6, Math.sign(i) * (stackZ / 2 + .011));
                sg.add(zPlate);
            }
            hbmRoot.add(sg);
            const col = sgn < 0 ? 'A' : 'B';
            const row = i === -1 ? '1' : i === 0 ? '2' : '3';
            addPart(model, 'module', sg, 'HBM3e · Stack ' + col + row,
                '32 GB HBM3e · 1.2 TB/s · 8-high DRAM · 3.6 GHz I/O.', 'hbm');
        }
    }
    modLayer.add(hbmRoot);
    model.layers.module = modLayer;
    g.add(modLayer);
    addPart(model, 'module', modLayer, '2.5D Module', 'Silicon interposer · compute die · 6x HBM3e stacks.');
    addPart(model, 'module', die, 'Compute Die', 'Large-area logic die · 82.3B transistors · 4096 TOPS INT8.', 'die');

    /* Cold plate + fins */
    const coolerLayer = new THREE.Group();
    const hotPlate = makeHeatGrid(48, .24, .76, .24, .76, 9);   // die footprint seen through the plate
    const plateMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a6, roughness: .22, metalness: .95,
        clearcoat: .4, clearcoatRoughness: .22, envMapIntensity: 1.25,
        emissive: 0xff9a33, emissiveIntensity: .34, emissiveMap: hotPlate.tex });
    const plate = boxMesh(12.8, .55, 12.8, plateMat);
    plate.position.y = 2.725;
    plate.receiveShadow = true;
    coolerLayer.add(plate);
    model.plateMat = plateMat;
    model.hotPlate = hotPlate;
    for (let i = 0; i < 21; i++) {
        const shade = .97 + (i % 3) * .013;
        const f = boxMesh(.15, 3.4, 11.6, std(0x9aa0a6 * shade, .4, .86));
        f.position.set(-5.9 + i * .59, 4.7, 0);
        coolerLayer.add(f);
    }
    for (const pz of [-6.05, 6.05]) {
        const pipeMat = std(COLORS.copper, .3, .92);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 12.6, 12), pipeMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(0, 3.28, pz);
        coolerLayer.add(pipe);
        model.pipeMats.push(pipeMat);
    }
    /* corner screws of the cold plate, proud of the fin tops */
    const scrMat = std(0xb9bec4, .25, .92);
    for (const sx of [-5.35, 5.35]) {
        for (const sz of [-5.35, 5.35]) {
            const scr = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .2, 18), scrMat);
            scr.position.set(sx, 6.46, sz);
            scr.castShadow = true;
            coolerLayer.add(scr);
            const slot = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .22, 6), std(0x2a2c30, .4, .6));
            slot.position.set(sx, 6.47, sz);
            coolerLayer.add(slot);
        }
    }
    model.layers.cooler = coolerLayer;
    g.add(coolerLayer);
    addPart(model, 'cooler', coolerLayer, 'Cold Plate + Fins', 'Copper cold plate over die & HBM · aluminium fin stack · passive.');

    return model;
}



export { buildAccel };
