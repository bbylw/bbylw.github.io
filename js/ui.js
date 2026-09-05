/* ================================================================
   Panels, control buttons, keyboard, hover inspection
================================================================ */

import * as THREE from 'three';
import { clearSparkHistory } from './dom.js';
import { feed } from './feed.js';
import { pickWorkload } from './sim.js';
import { MODELS, backend, bboxLines, bootDone, camera, cameraHome, cameraTargetHome, controls, models, reduceMotion, renderer, sim, state, tipEl, tipName, tipSpec } from './state.js';
import { $ } from './state.js';

function setStyle(styleKey, silent) {
    if (state.style === styleKey && !silent) return;
    state.style = styleKey;
    const sd = MODELS[styleKey];

    $('brand-model').textContent = sd.brandModel;
    $('info-title').innerHTML = sd.title;
    $('info-subtitle').textContent = sd.subtitle;
    $('spec-hint').textContent = sd.label;

    const sr = $('spec-rows');
    sr.innerHTML = '';
    sd.specs.forEach((pair) => {
        const row = document.createElement('div');
        row.className = 'spec-row';
        const n = document.createElement('span'); n.className = 'spec-name'; n.textContent = pair[0];
        const v = document.createElement('span'); v.className = 'spec-val'; v.textContent = pair[1];
        row.appendChild(n); row.appendChild(v);
        sr.appendChild(row);
    });

    const tr = $('tele-rows');
    tr.innerHTML = '';
    sd.teleRows.forEach((r, i) => {
        const div = document.createElement('div');
        div.className = 'tele-row';
        const top = document.createElement('div');
        top.className = 'tele-top';
        const n = document.createElement('span'); n.className = 'tt-name'; n.textContent = r.name;
        const v = document.createElement('span'); v.className = 'tt-val'; v.id = 'tr-val-' + i; v.textContent = '--';
        top.appendChild(n); top.appendChild(v);
        const bar = document.createElement('div'); bar.className = 'bar';
        const fill = document.createElement('div');
        fill.className = 'bar-fill' + (r.kind === 'pwr' ? ' pwr' : '');
        fill.id = 'tr-fill-' + i;
        bar.appendChild(fill);
        div.appendChild(top); div.appendChild(bar);
        tr.appendChild(div);
    });

    $('btn-cpu').classList.toggle('active', styleKey === 'cpu');
    $('btn-accel').classList.toggle('active', styleKey === 'accel');
    $('m-fan-label').textContent = sd.fanLabel;

    const mod = models[styleKey];
    if (mod) { mod.throttle = false; mod.fanv = sd.thermal.minFan; }
    sim.wl = null;
    sim.wlIndex = -1;
    sim.stressT = 0;
    sim.uTarget = sim.u * .4;
    sim.throttle = false;
    pickWorkload();
    pickWorkload();

    // sparkline history belongs to one module's telemetry scale — start fresh
    clearSparkHistory();

    // drop any stale hover from the previous module
    state.hovered = null;
    if (bboxLines) bboxLines.visible = false;
    tipEl.classList.remove('visible');

    if (!silent) {
        feed('module mounted · ' + sd.label + ' · ' + (styleKey === 'cpu' ? '512 TOPS · 250 W' : '4096 TOPS · 700 W'), 'info');
    }
}

/* Activate controls on pointerdown (instant response, no lost clicks on janky
   frames) instead of waiting for mouseup + click. The synthetic click that
   follows a press is swallowed; keyboard/AT activation (no prior pointerdown)
   still goes through the click listener untouched. */
function bindPress(el, fn) {
    let armed = false;
    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        armed = true;
        fn();
    });
    el.addEventListener('click', (e) => {
        if (!armed) return;                 // keyboard or assistive-tech activation
        armed = false;
        e.preventDefault();
        e.stopPropagation();
    });
    el.addEventListener('pointerleave', () => { armed = false; });
    el.addEventListener('pointercancel', () => { armed = false; });
}

function setupUI() {
    const setBtn = (id, on) => $(id).classList.toggle('active', on);

    const togRotate = () => {
        state.autoRotate = !state.autoRotate;
        controls.autoRotate = state.autoRotate;
        setBtn('btn-rotate', state.autoRotate);
    };
    const togExplode = () => {
        state.exploded = !state.exploded;
        setBtn('btn-explode', state.exploded);
        feed(state.exploded ? 'exploded view — layer stack separated' : 'stack reassembled', 'info');
    };
    const togWire = () => {
        if (!state.wireframe && backend === 'webgpu') {
            /* three r185's WebGPU backend throws (setIndexBuffer on a null GPUBuffer)
               when material.wireframe is enabled, killing the render loop — so on the
               WebGPU path we hand the session over to WebGL2 and re-engage wireframe
               there after the reload instead of freezing the page. */
            sessionStorage.setItem('x1.wantWire', '1');
            feed('wireframe view needs the WebGL backend — switching…', 'warn');
            const u = new URL(location.href);
            u.searchParams.set('renderer', 'webgl');
            setTimeout(() => { location.href = u.href; }, 450);
            return;
        }
        state.wireframe = !state.wireframe;
        setBtn('btn-wireframe', state.wireframe);
        setWireframe(state.wireframe);
    };
    const togData = () => {
        state.showData = !state.showData;
        setBtn('btn-data', state.showData);
    };
    const togStress = () => {
        state.stress = !state.stress;
        setBtn('btn-stress', state.stress);
        if (state.stress) { sim.stressT = 0; feed('stress test engaged — 100% compute burn', 'warn'); }
        else feed('stress test released', 'ok');
    };
    const doReset = () => {
        state.exploded = false;
        state.autoRotate = !reduceMotion;      // respect reduced-motion preference
        state.wireframe = false;
        setBtn('btn-explode', false);
        setBtn('btn-rotate', state.autoRotate);
        setBtn('btn-wireframe', false);         // wireframe is turned off on reset too
        controls.autoRotate = state.autoRotate; // keep controls in sync with the toggle
        setWireframe(false);
        camera.position.copy(cameraHome);
        controls.target.copy(cameraTargetHome);
        state.hovered = null;
        bboxLines.visible = false;
        tipEl.classList.remove('visible');
        feed('view reset', 'info');
    };

    bindPress($('btn-cpu'), () => setStyle('cpu'));
    bindPress($('btn-accel'), () => setStyle('accel'));
    bindPress($('btn-rotate'), togRotate);
    bindPress($('btn-explode'), togExplode);
    bindPress($('btn-wireframe'), togWire);
    bindPress($('btn-data'), togData);
    bindPress($('btn-stress'), togStress);
    bindPress($('btn-reset'), doReset);

    /* keyboard shortcuts — same paths as the buttons (work after boot) */
    window.addEventListener('keydown', (e) => {
        if (!bootDone || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === '1') { setStyle('cpu'); e.preventDefault(); }
        else if (k === '2') { setStyle('accel'); e.preventDefault(); }
        else if (k === 'x' || k === 'e') { togExplode(); e.preventDefault(); }
        else if (k === 'w') { togWire(); e.preventDefault(); }
        else if (k === 'd') { togData(); e.preventDefault(); }
        else if (k === 's') { togStress(); e.preventDefault(); }
        else if (k === 'a') { togRotate(); e.preventDefault(); }
        else if (k === 'r') { doReset(); e.preventDefault(); }
    });

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let movePending = false;
    let downX = 0, downY = 0;

    renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
    renderer.domElement.addEventListener('pointermove', (e) => {
        if (movePending) return;
        movePending = true;
        requestAnimationFrame(() => {
            movePending = false;
            ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
            ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(ndc, camera);
            const group = models[state.style].group;
            if (!group.visible) return;
            const hits = raycaster.intersectObject(group, true);
            let picked = null;
            for (const h of hits) { picked = climb(h.object); if (picked) break; }
            setHover(picked);
        });
    });
    renderer.domElement.addEventListener('pointerup', (e) => {
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist < 5 && state.hovered) feed('inspect · ' + state.hovered.name, 'info');
    });

    // stop chasing a part the cursor has left (drag-off, touch, alt-tab, …)
    const clearHover = () => {
        if (state.hovered || bboxLines.visible) {
            state.hovered = null;
            bboxLines.visible = false;
            tipEl.classList.remove('visible');
        }
    };
    renderer.domElement.addEventListener('pointerleave', clearHover);
    renderer.domElement.addEventListener('pointercancel', clearHover);
}

function climb(obj) {
    let o = obj;
    while (o) {
        if (o.userData && o.userData.partName) return o;
        o = o.parent;
    }
    return null;
}

/* scratch vectors reused by the per-frame hover-follow, avoids GC churn */
const _wc = new THREE.Vector3(), _p = new THREE.Vector3();

function setHover(partObj) {
    if (state.hovered && state.hovered.group !== partObj) {
        state.hovered = null;
        bboxLines.visible = false;
        tipEl.classList.remove('visible');
    }
    if (!partObj) return;
    const part = models[state.style].parts.find(p => p.group === partObj);
    if (!part) return;
    state.hovered = part;
}

/* part-layer -> thermal node label, used by live hover telemetry */
const NODE_BY_LAYER = {
    cpu: { pcb: 'pcb', socket: 'pcb', pkg: 'pkg', die: 'die', ihs: 'plate', cooler: 'fin' },
    accel: { carrier: 'pcb', module: 'pkg', die: 'die', cooler: 'fin' }
};

function liveLine(part) {
    const style = state.style;
    const m = models[style];
    if (!m || !m.nodeT) return '';
    const nt = m.nodeT;
    const node = (NODE_BY_LAYER[style] && NODE_BY_LAYER[style][part.node]) || part.node;
    let t, vals;
    switch (node) {
        case 'die': t = nt.die; vals = 'die ' + nt.die.toFixed(1) + '°C · ' + Math.round(sim.power) + ' W'; break;
        case 'plate': t = nt.plate; vals = (style === 'cpu' ? 'IHS lid' : 'cold plate') + ' ' + nt.plate.toFixed(1) + '°C'; break;
        case 'fin': t = nt.fin; vals = 'fins ' + nt.fin.toFixed(1) + '°C · ' +
            (style === 'cpu' ? Math.round(500 + sim.fan * 2300) + ' RPM' : 'airflow ' + Math.round(sim.fan * 100) + '%'); break;
        case 'pcb': t = nt.pcb; vals = 'board ' + nt.pcb.toFixed(1) + '°C · ' + Math.round(sim.power) + ' W'; break;
        case 'pkg': t = nt.pkg; vals = 'package ' + nt.pkg.toFixed(1) + '°C'; break;
        case 'hbm': t = nt.hbm; vals = 'HBM ' + nt.hbm.toFixed(1) + '°C · ' + Math.round(sim.bw * 100) + '% bw'; break;
        default: return '';
    }
    if (vals == null) return '';
    const hot = t > 85;
    return '<div class="tip-live">' + (hot ? '<b class="hot">●</b>' : '<b>●</b>') + ' live · <span' + (hot ? ' class="hot"' : '') + '>' + vals + '</span></div>';
}

function updateHover() {
    const hover = state.hovered;
    if (!hover) {
        if (bboxLines) bboxLines.visible = false;
        tipEl.classList.remove('visible');
        return;
    }
    _wc.copy(hover.center);
    hover.group.localToWorld(_wc);
    bboxLines.visible = true;
    bboxLines.position.copy(_wc);
    bboxLines.scale.set(hover.size.x + .12, hover.size.y + .12, hover.size.z + .12);
    tipName.textContent = hover.name;
    tipSpec.innerHTML = hover.spec + liveLine(hover);
    _p.copy(_wc).project(camera);
    if (_p.z > 1) { tipEl.classList.remove('visible'); return; }   // anchor is behind the camera
    tipEl.classList.add('visible');
    // place above the anchor, clamped to the viewport; flip below when there is no headroom
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    const cx = (_p.x + 1) / 2 * window.innerWidth;
    const cy = (-_p.y + 1) / 2 * window.innerHeight;
    let tx = cx - tw / 2, ty = cy - th - 14;
    if (ty < 10) ty = cy + 18;
    tx = Math.max(10, Math.min(tx, window.innerWidth - tw - 10));
    ty = Math.max(10, Math.min(ty, window.innerHeight - th - 10));
    tipEl.style.transform = 'translate(' + tx.toFixed(0) + 'px,' + ty.toFixed(0) + 'px)';
}

function setWireframe(on) {
    for (const key in models) {
        if (!models[key].group) continue;
        models[key].group.traverse((o) => {
            if (o.isMesh && o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of mats) m.wireframe = on;
            }
        });
    }
}



export { setStyle, setupUI, setWireframe, updateHover };
