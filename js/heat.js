/* ================================================================
   Spatial die-heat-field sim → emissive texture
================================================================ */

import * as THREE from 'three';
import { makeCanvas, rr } from './textures.js';

function makeHeatGrid(N, x0, x1, z0, z1, nCl) {
    const g = {
        N, x0, x1, z0, z1,
        heat: new Float32Array(N * N),
        buf: new Float32Array(N * N),
        acc: 0, tick: .09,
        clusters: [],
        tex: null
    };
    for (let i = 0; i < nCl; i++) {
        g.clusters.push({
            x: x0 + Math.random() * (x1 - x0),
            z: z0 + Math.random() * (z1 - z0),
            w: .5 + Math.random() * .8,
            ph: Math.random() * 6.283,
            sp: .7 + Math.random() * 2.2,
            r: .055 + Math.random() * .1
        });
    }
    const c = makeCanvas(N, N);
    g.ctx = c.getContext('2d');
    g.img = g.ctx.createImageData(N, N);
    g.pix = g.img.data;
    g.canvas = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    g.tex = t;
    g.writeHeat = function () { renderHeat(g); };
    return g;
}

function renderHeat(g) {
    const pix = g.pix;
    const heat = g.heat;
    for (let i = 0, p = 0; i < heat.length; i++, p += 4) {
        const v = heat[i] > 1 ? 1 : heat[i];
        const e = (v * v * (3 - 2 * v));          // smoothstep, keeps centres bright
        const y = Math.round(255 * e);
        pix[p] = y; pix[p + 1] = y; pix[p + 2] = y;
        pix[p + 3] = 255;
    }
    g.ctx.putImageData(g.img, 0, 0);
    g.tex.needsUpdate = true;
}

function heatTick(g, timeSec, load) {
    const N = g.N, heat = g.heat, buf = g.buf;
    if (load < .012) {
        // cool idle: skip injection, just decay + settle
        for (let i = 0; i < heat.length; i++) heat[i] *= .93;
        g.writeHeat();
        return;
    }
    for (const cl of g.clusters) {
        const fl = .35 + .65 * (0.5 + 0.5 * Math.sin(timeSec * cl.sp + cl.ph));
        const jit = .55 + .45 * Math.sin(timeSec * 1.7 + cl.ph * 3.1);
        const q = cl.w * load * fl * jit;
        const cx = Math.min(N - 2, Math.max(1, (cl.x * N) | 0));
        const cz = Math.min(N - 2, Math.max(1, (cl.z * N) | 0));
        const rr = Math.max(1, Math.round(cl.r * N));
        for (let dz = -rr; dz <= rr; dz++) {
            for (let dx = -rr; dx <= rr; dx++) {
                const d2 = (dx * dx + dz * dz) / (rr * rr);
                if (d2 > 1) continue;
                heat[(cz + dz) * N + (cx + dx)] += q * (1 - d2) * .55;
            }
        }
    }
    for (let pass = 0; pass < 3; pass++) {
        for (let z = 1; z < N - 1; z++) {
            const row = z * N;
            for (let x = 1; x < N - 1; x++) {
                const i = row + x;
                const s = (heat[i - N] + heat[i + N] + heat[i - 1] + heat[i + 1]) * .25;
                buf[i] = heat[i] + (s - heat[i]) * .3;
            }
        }
        heat.set(buf);
    }
    for (let i = 0; i < heat.length; i++) heat[i] *= .965;
    g.writeHeat();
}



export { makeHeatGrid, renderHeat, heatTick };
