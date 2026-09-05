/* ================================================================
   On-board diagnostics OLED + status LEDs
================================================================ */

import * as THREE from 'three';
import { boxMesh, std } from './builders.js';
import { state } from './state.js';
import { makeCanvas, toTexture } from './textures.js';

function createBoardMonitor(w, d, label) {
    const unit = new THREE.Group();
    const bezel = boxMesh(w, .18, d, std(0x0d0e13, .5, .25));
    bezel.position.y = .09;
    unit.add(bezel);

    const cv = makeCanvas(192, 56);
    const ctx = cv.getContext('2d');
    const tex = toTexture(cv);
    tex.anisotropy = 8;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - .3, d - .52),
        new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    scr.rotation.x = -Math.PI / 2;
    scr.position.y = .21;
    unit.add(scr);

    const ledMats = [];
    const ledGeo = new THREE.CylinderGeometry(.05, .05, .03, 14);
    for (let i = 0; i < 2; i++) {
        const lm = new THREE.MeshStandardMaterial({ color: 0x16181c, emissive: 0x2ee06a, emissiveIntensity: 0 });
        const l = new THREE.Mesh(ledGeo, lm);
        l.position.set(-w / 2 + .5 + i * .32, .26, d / 2 - .18);
        l.castShadow = true;
        unit.add(l);
        ledMats.push(lm);
    }

    return {
        unit, cv, ctx, tex, ledMats,
        draw(st) {
            const c = this.ctx;
            c.clearRect(0, 0, 192, 56);
            c.fillStyle = '#050f09';
            c.fillRect(0, 0, 192, 56);
            c.strokeStyle = 'rgba(126,242,154,.25)';
            c.lineWidth = 1.4;
            c.strokeRect(2.5, 2.5, 187, 51);
            // boot code, large
            c.font = '700 26px ui-monospace, Menlo, Consolas, monospace';
            c.textBaseline = 'top';
            c.fillStyle = st.codeCol;
            c.fillText(st.code, 10, 7);
            // die temperature, right-aligned
            c.font = '600 13px ui-monospace, Menlo, Consolas, monospace';
            c.textAlign = 'right';
            c.fillStyle = st.temp > 88 ? '#ff8d80' : '#dffbe8';
            c.fillText(st.temp.toFixed(1) + ' C', 182, 11);
            // power / fan line
            c.fillStyle = '#9fd8b2';
            c.fillText(label + '  ' + Math.round(st.power) + 'W  ' + st.fanName + ' ' + Math.round(st.fan * 100) + '%', 182, 30);
            // blinking state tag
            c.textAlign = 'left';
            c.fillStyle = st.kind === 'danger' ? '#ff8d80' : st.kind === 'warn' ? '#ffd27a' : '#79e79a';
            c.fillText(st.tag, 10, 30);
            if (st.blink) {
                c.fillStyle = 'rgba(255,120,90,.9)';
                c.fillRect(176, 42, 8, 6);
            }
            c.textBaseline = 'alphabetic';
            this.tex.needsUpdate = true;

            // status LEDs — power led colour by state, activity led flickers with load
            const ledCol = st.kind === 'danger' ? 0xff4d3f : st.kind === 'warn' ? 0xffb224 : 0x2ee06a;
            this.ledMats[0].emissive.setHex(st.blink ? 0x111111 : ledCol);
            this.ledMats[0].emissiveIntensity = st.kind === 'danger' && st.blink ? 0 : 1.6;
            this.ledMats[1].emissive.setHex(0x2ee06a);
            this.ledMats[1].emissiveIntensity = .18 + st.u * 1.5 + (Math.random() < .5 ? .1 : 0);
        }
    };
}



export { createBoardMonitor };
