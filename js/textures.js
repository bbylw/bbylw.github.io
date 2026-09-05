/* ================================================================
   Procedural 2D canvas textures (PCB, IHS, die, HBM)
================================================================ */

import * as THREE from 'three';

function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

function toTexture(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/* Motherboard-style PCB silk screen + traces (CPU module) */
function pcbCpuTexture() {
    const S = 1024;
    const ctx = makeCanvas(S, S).getContext('2d');
    ctx.fillStyle = '#0d1f15';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = 'rgba(' + (Math.random() * 60 | 0) + ',' + (Math.random() * 90 + 40 | 0) + ',' + (Math.random() * 60 | 0) + ',0.06)';
        ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    ctx.strokeStyle = 'rgba(178,150,96,0.28)';
    for (let i = 0; i < 130; i++) {
        const a = Math.random() * Math.PI * 2;
        let x = S / 2 + Math.cos(a) * (Math.random() * 60 + 8);
        let y = S / 2 + Math.sin(a) * (Math.random() * 60 + 8);
        ctx.lineWidth = Math.random() < .25 ? 2.6 : 1.2;
        ctx.beginPath(); ctx.moveTo(x, y);
        const segs = 3 + (Math.random() * 3 | 0);
        for (let s = 0; s < segs; s++) {
            x += Math.cos(a + (Math.random() - .5) * .9) * (S / 2 + Math.random() * 40);
            y += Math.sin(a + (Math.random() - .5) * .9) * (S / 2 + Math.random() * 40);
            ctx.lineTo(Math.max(0, Math.min(S, x)), Math.max(0, Math.min(S, y)));
        }
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(235,232,222,0.85)';
    ctx.lineWidth = 4;
    rr(ctx, 220, 220, S - 440, S - 440, 34); ctx.stroke();
    ctx.lineWidth = 2;
    rr(ctx, 296, 296, S - 592, S - 592, 20); ctx.stroke();
    ctx.lineWidth = 5;
    for (const p of [[120,120],[904,120],[120,904],[904,904]]) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 34, 0, 7); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(220, 400); ctx.lineTo(220, 300); ctx.lineTo(320, 300); ctx.closePath(); ctx.stroke();
    ctx.font = '600 44px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(235,232,222,0.9)';
    ctx.fillText('NEURALCHIP', 700, 150);
    ctx.font = '600 30px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillText('X1-C · NEURAL PROCESSOR', 560, 195);
    ctx.fillText('SOCKET X1-LGA', 336, 180);
    ctx.fillText('REV C.3', 120, 980);
    ctx.fillText('512 TOPS INT8', 700, 900);
    ctx.fillStyle = 'rgba(235,232,222,0.8)';
    let bx = 700;
    for (let i = 0; i < 26; i++) { ctx.fillRect(bx, 820, 4, 46); bx += 8; }
    return toTexture(ctx.canvas);
}

/* Black accelerator-board texture */
function pcbAccelTexture() {
    const S = 1024;
    const ctx = makeCanvas(S, S).getContext('2d');
    ctx.fillStyle = '#0b0b0e';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 7000; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * .04).toFixed(3) + ')';
        ctx.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(205,175,105,0.26)';
    for (let i = 0; i < 200; i++) {
        const a = Math.random() * Math.PI * 2;
        let x = S / 2 + Math.cos(a) * (Math.random() * 90 + 20);
        let y = S / 2 + Math.sin(a) * (Math.random() * 90 + 20);
        ctx.lineWidth = Math.random() < .2 ? 2.4 : 1.1;
        ctx.beginPath(); ctx.moveTo(x, y);
        const segs = 2 + (Math.random() * 4 | 0);
        for (let s = 0; s < segs; s++) {
            x += Math.cos(a + (Math.random() - .5)) * (S / 2);
            y += Math.sin(a + (Math.random() - .5)) * (S / 2);
            ctx.lineTo(Math.max(0, Math.min(S, x)), Math.max(0, Math.min(S, y)));
        }
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(235,232,222,0.8)';
    ctx.lineWidth = 4;
    rr(ctx, 160, 160, S - 320, S - 320, 26); ctx.stroke();
    ctx.lineWidth = 5;
    for (const p of [[112,112],[912,112],[112,912],[912,912]]) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 36, 0, 7); ctx.stroke();
    }
    ctx.font = '600 44px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(235,232,222,0.9)';
    ctx.fillText('NEURALCHIP', 640, 90);
    ctx.font = '600 28px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillText('X1-A · AI ACCELERATOR', 560, 128);
    ctx.fillText('REV A.2', 90, 980);
    ctx.fillText('HBM3e · 6x32 GB', 640, 900);
    ctx.fillStyle = 'rgba(235,232,222,0.75)';
    let bx = 640;
    for (let i = 0; i < 22; i++) { ctx.fillRect(bx, 820, 4, 40); bx += 8; }
    return toTexture(ctx.canvas);
}

/* Nickel IHS top: laser-etched markings */
function ihsTexture() {
    const S = 1024;
    const ctx = makeCanvas(S, S).getContext('2d');
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(30,34,44,0.5)';
    ctx.lineWidth = 6;
    rr(ctx, 20, 20, S - 40, S - 40, 26); ctx.stroke();
    ctx.lineWidth = 2.4;
    rr(ctx, 52, 52, S - 104, S - 104, 20); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(28,32,42,0.62)';
    ctx.font = '700 300px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillText('X1', S / 2, S / 2 + 40);
    ctx.strokeStyle = 'rgba(28,32,42,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, 300, 0, 7); ctx.stroke();
    ctx.font = '600 58px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillText('NEURAL CHIP', S / 2, 190);
    ctx.fillText('X1-C · 5nm · 48.6B', S / 2, S - 120);
    ctx.font = '500 26px Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(28,32,42,0.4)';
    ctx.fillText('F336B-2088  TAIWAN  ·  (C) 2026 NEURAL CHIP', S / 2, S - 70);
    return toTexture(ctx.canvas);
}

/* Silicon die top: blocks, grid, engraved codes */
function dieTexture(kind) {
    const S = 1024;
    const ctx = makeCanvas(S, S).getContext('2d');
    ctx.clearRect(0, 0, S, S);
    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(.5, 'rgba(255,255,255,0.02)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(20,20,26,0.55)';
    ctx.lineWidth = 8;
    rr(ctx, 14, 14, S - 28, S - 28, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,20,26,0.20)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 32; i++) {
        ctx.beginPath(); ctx.moveTo(i * 32, 24); ctx.lineTo(i * 32, S - 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24, i * 32); ctx.lineTo(S - 24, i * 32); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(15,15,20,0.30)';
    ctx.fillRect(120, 120, 220, 160);
    ctx.fillRect(380, 380, 160, 160);
    ctx.fillRect(S - 300, 120, 180, 140);
    ctx.fillStyle = 'rgba(15,15,20,0.18)';
    ctx.fillRect(120, 320, 120, 100);
    ctx.textAlign = 'center';
    ctx.font = '700 120px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(22,22,30,0.55)';
    ctx.fillText(kind === 'cpu' ? 'X1-C' : 'X1-A', S / 2, 480);
    ctx.font = '600 44px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillText(kind === 'cpu' ? 'NEURAL CORE ARRAY' : 'COMPUTE DIE', S / 2, 560);
    ctx.textAlign = 'left';
    ctx.font = '500 34px Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(22,22,30,0.45)';
    ctx.fillText(kind === 'cpu' ? 'T1D6 · 0724B' : 'T2D2 · 0724A', 90, 960);
    ctx.textAlign = 'right';
    ctx.fillText('BBYLW-SILICON', S - 90, 960);
    ctx.fillStyle = 'rgba(25,25,32,0.5)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(160 + i * 26, 210, 4, 0, 7); ctx.fill(); }
    return toTexture(ctx.canvas);
}

/* HBM side label texture — brushed gold plate with dark marking bands */
function hbmSideTexture() {
    const S = 512;
    const ctx = makeCanvas(S, S).getContext('2d');
    const g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, '#b78f45');
    g.addColorStop(.5, '#d9b763');
    g.addColorStop(1, '#a87f38');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // subtle brushed noise
    for (let i = 0; i < 900; i++) {
        ctx.fillStyle = 'rgba(70,52,18,' + (Math.random() * .25).toFixed(3) + ')';
        ctx.fillRect(Math.random() * S, Math.random() * S, 1.4, 1.4);
    }
    ctx.fillStyle = 'rgba(45,32,10,0.8)';
    for (let i = 0; i < 4; i++) ctx.fillRect(0, 90 + i * 110, S, 14);
    ctx.fillStyle = 'rgba(240,222,180,0.9)';
    ctx.fillRect(0, 20, S, 8);
    ctx.font = '700 120px Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(50,36,12,0.85)';
    ctx.fillText('HBM3E', 26, 254);
    return toTexture(ctx.canvas);
}



export { makeCanvas, toTexture, rr, pcbCpuTexture, pcbAccelTexture, ihsTexture, dieTexture, hbmSideTexture };
