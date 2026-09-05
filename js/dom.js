/* ================================================================
   Live telemetry panel + sparkline canvases
================================================================ */

import { MODELS, bootDone, models, sim, state } from './state.js';
import { $ } from './state.js';

let domTimer = 0, sparkTimer = 0;
const powerHist = [], tempHist = [];
const sparkW = 120, sparkH = 30;

function classifyStatus() {
    const blink = (Math.floor(performance.now() / 800) % 2) === 0;
    let kind, text, code, codeCol, tag;
    if (state.stress) { kind = 'warn'; text = 'STRESS TEST'; code = 'F1'; codeCol = '#ffd27a'; tag = 'STRESS'; }
    else if (sim.throttle) { kind = 'danger'; text = 'THERMAL LIMIT'; code = 'EA'; codeCol = '#ff8d80'; tag = 'PWR CAP'; }
    else if (sim.u > .72) { kind = 'warn'; text = 'HIGH LOAD'; code = 'A3'; codeCol = '#ffd27a'; tag = 'HIGH LD'; }
    else if (sim.u > .12) { kind = 'ready'; text = 'RUNNING'; code = '8F'; codeCol = '#7ef29a'; tag = 'RUN'; }
    else { kind = 'ready'; text = 'READY · IDLE'; code = '0F'; codeCol = '#79e79a'; tag = 'IDLE'; }
    return {
        kind, text, code, codeCol, tag,
        blink: blink && (state.stress || sim.throttle),
        temp: sim.temp, power: sim.power, fan: sim.fan, u: sim.u,
        fanName: state.style === 'accel' ? 'A' : 'F'
    };
}

function updateDOM(timeNow) {
    const sd = MODELS[state.style];
    if (timeNow - domTimer < 120) return;
    domTimer = timeNow;

    $('m-compute').innerHTML = Math.round(sim.u * sd.maxTops).toLocaleString('en-US') + '<span class="metric-unit">TOPS</span>';
    $('m-power').innerHTML = Math.round(sim.power) + '<span class="metric-unit">W</span>';
    $('m-fan').innerHTML = Math.round(sim.fan * 100) + '<span class="metric-unit">%</span>';
    const tEl = $('m-temp');
    tEl.innerHTML = sim.temp.toFixed(1) + '<span class="metric-unit">°C</span>';
    tEl.classList.toggle('hot', sim.temp > 88);

    const rows = sd.teleRows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const val = row.kind === 'core' ? sim.u : row.kind === 'mem' ? Math.max(sim.mem, sim.bw) : sim.power / sd.maxW;
        $('tr-val-' + i).textContent = row.fmt(val, sd);
        $('tr-fill-' + i).style.width = Math.min(100, Math.max(0, val * 100)) + '%';
    }

    $('wl-name').textContent = state.stress ? 'STRESS · full compute burn-in' : (sim.wl ? sim.wl.n : '---');
    $('wl-pct').textContent = state.stress ? '100%' : Math.round(sim.u * 100) + '%';

    const st = classifyStatus();
    const dot = $('status-dot'), txt = $('status-text');
    dot.className = 'status-dot ' + st.kind;
    txt.textContent = st.text;

    const m = models[state.style];
    if (bootDone && m && m.monitor) m.monitor.draw(st);
}

function drawSpark(canvas, arr, color, max) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, sparkW, sparkH);
    const n = arr.length;
    if (n < 2) return;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * sparkW;
        const y = sparkH - 2 - (arr[i] / max) * (sparkH - 4);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.lineTo(sparkW, sparkH); ctx.lineTo(0, sparkH); ctx.closePath();
    ctx.fillStyle = color.replace(')', ',0.16)').replace('rgb', 'rgba');
    ctx.fill();
}

function updateSpark(timeNow) {
    if (timeNow - sparkTimer < 400) return;
    sparkTimer = timeNow;
    const sd = MODELS[state.style];
    powerHist.push(sim.power); if (powerHist.length > 150) powerHist.shift();
    tempHist.push(sim.temp); if (tempHist.length > 150) tempHist.shift();
    drawSpark($('spark-power'), powerHist, 'rgb(127,179,255)', sd.maxW);
    drawSpark($('spark-temp'), tempHist, sim.temp > 88 ? 'rgb(255,122,107)' : 'rgb(232,196,124)', 100);
}



/* reset per-module trend buffers + paint timers (module switch) */
export function clearSparkHistory() {
    powerHist.length = 0;
    tempHist.length = 0;
    domTimer = 0;
    sparkTimer = 0;
}


export { classifyStatus, updateDOM, updateSpark };
