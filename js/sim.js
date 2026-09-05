/* ================================================================
   Workload scheduler + lumped thermal network
================================================================ */

import * as THREE from 'three';
import { feed } from './feed.js';
import { heatTick } from './heat.js';
import { MODELS, bootDone, models, sim, state } from './state.js';

/* emissive tint extremes for hot surfaces — deep amber at idle, pale white-hot under load */
const EMIS_COOL = new THREE.Color(0xff8f3a);
const EMIS_HOT  = new THREE.Color(0xffe8c0);

function pickWorkload() {
    const sd = MODELS[state.style];
    sim.wlIndex = (sim.wlIndex + 1 + (Math.random() * (sd.workloads.length - 1) | 0)) % sd.workloads.length;
    const wl = sd.workloads[sim.wlIndex];
    sim.uTarget = wl.u;
    sim.wlUntil = performance.now() + wl.d;
    sim.wl = wl;
    sim.memTarget = wl.m;
    sim.spikeAt = performance.now() + 3000 + Math.random() * 12000;
    sim.spikeDur = 0;
    if (bootDone && sim.wl && performance.now() - (sim._lastWlFeed || 0) > 6500) {
        sim._lastWlFeed = performance.now();
        feed('scheduler · ' + wl.n, 'info');
    }
    return wl;
}

function simStep(dt, timeNow) {
    const sd = MODELS[state.style];
    const m = models[state.style];
    const th = sd.thermal;
    const T = m.T;

    /* ---- utilisation & power scheduling ---- */
    let target = sim.uTarget;
    if (timeNow > sim.wlUntil && !state.stress) pickWorkload();

    let spikeOn = false;
    if (state.stress) {
        target = 1;
        sim.stressT += dt;
    } else if (sim.spikeDur > 0) {
        sim.spikeDur -= dt;
        target = Math.max(target, .95);
        spikeOn = true;
    } else if (timeNow > sim.spikeAt) {
        sim.spikeDur = 1.6 + Math.random() * 1.8;
        sim.spikeAt = timeNow + 5000 + Math.random() * 12000;
        sim.spikeFed = false;
        spikeOn = true;
    }

    /* ---- PL2 turbo budget ----
       spikes may exceed the base envelope only while budget remains; it
       drains during boost and slowly regenerates back at idle. */
    let turboMult = 1;
    if (!state.stress) {
        if (spikeOn && !m.throttle) {
            if (sim.turbo > 0) {
                turboMult = 1.13;
                sim.turbo -= dt / (th.turbo || 12);
                if (!sim.spikeFed && bootDone && timeNow - (sim._spikeFedAt || 0) > 12000) {
                    sim.spikeFed = true;
                    sim._spikeFedAt = timeNow;
                    feed('PL2 turbo burst · envelope raised to ' + Math.round(sd.maxW * 1.13) + ' W', 'info');
                }
                if (sim.turbo <= 0 && !sim._turboExh && bootDone && timeNow - (sim._turboFedAt || 0) > 20000) {
                    sim._turboExh = true;
                    sim._turboFedAt = timeNow;
                    feed('PL2 budget spent — power back to base envelope', 'info');
                }
            }
        } else if (sim.turbo < 1) {
            sim.turbo = Math.min(1, sim.turbo + dt / (th.turboRec || 26));
            if (sim.turbo > .95) sim._turboExh = false;
        }
    }
    const pl2 = state.stress ? (m.throttle ? 1 : th.pl2) : turboMult;

    /* thermal power-limit — continuous instead of a hard two-state cut */
    const overT = Math.max(0, T.d - sd.throttleT);
    const powerLimit = m.throttle ? Math.max(.42, Math.min(1, 1 - overT / 16)) : 1;
    target *= powerLimit;

    /* a resident workload drifts organically (±few %) instead of sitting flat */
    sim._drift = (sim._drift || 0) + dt * (.25 + sim.u * .9);
    if (!state.stress) {
        target = Math.max(0, Math.min(1, target * (1 + .05 * Math.sin(sim._drift)
            + .03 * Math.sin(sim._drift * 2.7 + 1.3))));
    }

    const k = 1 - Math.exp(-dt / .9);
    sim.u += (target + (Math.random() - .5) * .014 - sim.u) * k;
    sim.u = Math.min(1, Math.max(0, sim.u));

    const pFrac = Math.pow(sim.u, 1.35);
    sim.power = (sd.idleW + (sd.maxW - sd.idleW) * pFrac) * pl2 + (Math.random() - .5) * sd.maxW * .012;

    const mt = (sim.memTarget || .3);
    sim.mem += (mt * (.35 + .65 * sim.u) - sim.mem) * (1 - Math.exp(-dt / 1.6));
    sim.bw += (mt * (.3 + .7 * sim.u) - sim.bw) * (1 - Math.exp(-dt / 1.2));

    /* ---- lumped thermal network, explicit Euler (time-accelerated) ---- */
    const edt = Math.min(dt, .05) * 4;
    // room air drifts slowly (±0.5 °C, ~6 min period) so long runs feel alive
    const amb = th.amb + .5 * Math.sin(timeNow * 1.7e-5);
    const nat = th.kNat * Math.pow(Math.max(.1, (T.f - amb) / 10), .35);   // natural convection
    const kFa = nat + th.kFan * Math.pow(m.fanv, 1.25);                     // + forced airflow

    const qDp = (T.d - T.p) * th.kDie;
    const qPf = (T.p - T.f) * th.kPlate;
    const qFa = (T.f - amb) * kFa;
    T.d += edt * (sim.power - qDp) / th.cDie;
    T.p += edt * (qDp - qPf) / th.cPlate;
    T.f += edt * (qPf - qFa) / th.cFin;

    /* sensor read-out noise is shaped into the *displayed* temperature only,
       so the physics stay clean but the gauge reads like a real sensor */
    const jitter = (Math.random() - .5) * .12 + Math.sin(timeNow * .0023) * .08;
    sim.temp += ((T.d + jitter) - sim.temp) * (1 - Math.exp(-dt / .35));
    sim.temp = Math.round(sim.temp * 4) / 4;    // quantise to a 0.25 °C sensor LSB

    /* ---- fan / airflow controller (slewed, with idle floor) ---- */
    const fDead = 50;
    const fTgt = m.throttle ? 1 : Math.min(1, th.minFan + (1 - th.minFan) *
        Math.pow(Math.min(1, Math.max(0, (T.d - fDead) / (sd.loadT - fDead))), 1.1));
    const slew = dt * (fTgt > m.fanv ? .9 : .5);
    const fDiff = fTgt - m.fanv;
    m.fanv = Math.min(1, Math.max(th.minFan, m.fanv + Math.sign(fDiff) * Math.min(Math.abs(fDiff), slew)));
    sim.fan = m.fanv;

    /* ---- throttle hysteresis on the die junction (event spam-gated) ---- */
    if (!m.throttle && T.d > sd.throttleT) {
        m.throttle = true;
        m._thOn = timeNow;
        if (timeNow - (m._lastThFeed || 0) > 20000) {
            m._lastThFeed = timeNow;
            feed('THERMAL LIMIT — power capping engaged @ ' + T.d.toFixed(0) + '°C', 'err');
        }
    } else if (m.throttle && T.d < sd.throttleT - 6 && timeNow - (m._thOn || 0) > 6000) {
        m.throttle = false;
        if (timeNow - (m._lastThOk || 0) > 20000) {
            m._lastThOk = timeNow;
            feed('thermal limit cleared — boost restored', 'ok');
        }
    }
    sim.throttle = m.throttle;

    /* ---- derived node temperatures (surface tints, hover telemetry) ---- */
    m.nodeT.die = T.d;
    m.nodeT.plate = T.p;
    m.nodeT.fin = T.f;
    m.nodeT.pkg = amb + (T.d - amb) * .34 + (T.f - amb) * .2;
    m.nodeT.pcb = amb + (T.f - amb) * .28 + Math.min(10, sim.power * .02);
    m.nodeT.hbm = state.style === 'accel' ? amb + (T.d - amb) * .62 + sim.bw * 6 : amb + (T.d - amb) * .3;
}

/* RGB-mode hot surfaces: die hotspot field, lid glow, heat-pipe tint */
function updateThermalVisuals(dt, timeMs) {
    const sd = MODELS[state.style];
    const m = models[state.style];
    const nt = m.nodeT;
    const tSec = timeMs / 1000;
    const lvl = Math.min(1.15, Math.max(0, (nt.die - 30) / (sd.throttleT + 10 - 30)));

    for (const g of [m.hotIhs, m.hotDie, m.hotPlate]) {
        if (!g) continue;
        g.acc += dt;
        if (g.acc >= g.tick) { g.acc = 0; heatTick(g, tSec, lvl); }
    }

    const k = 1 - Math.exp(-dt / .4);
    const dieG = .14 + Math.min(.6, Math.max(0, (nt.die - 32) / 70)) * .6;
    if (m.dieMat) {
        m.dieMat.emissiveIntensity += (dieG - m.dieMat.emissiveIntensity) * k;
        // tint drifts amber → white-hot as the junction climbs toward the limit
        m.dieMat.emissive.lerpColors(EMIS_COOL, EMIS_HOT, Math.min(1, Math.max(0, (nt.die - 36) / (sd.loadT - 36))));
    }
    const plateG = .1 + Math.min(.45, Math.max(0, (nt.plate - 36) / 60)) * .42;
    const plateH = Math.min(1, Math.max(0, (nt.plate - 40) / 50));
    if (m.ihsTopMat) {
        m.ihsTopMat.emissiveIntensity += (plateG - m.ihsTopMat.emissiveIntensity) * k;
        m.ihsTopMat.emissive.lerpColors(EMIS_COOL, EMIS_HOT, plateH);
    }
    if (m.plateMat) {
        m.plateMat.emissiveIntensity += ((plateG * .8) - m.plateMat.emissiveIntensity) * k;
        m.plateMat.emissive.lerpColors(EMIS_COOL, EMIS_HOT, plateH);
    }

    const pipeH = Math.min(1, Math.max(0, (nt.fin - 48) / 42));
    for (const pm of m.pipeMats) pm.emissive.setRGB(.62 * pipeH, .1 * pipeH, .01 * pipeH);
}



export { pickWorkload, simStep, updateThermalVisuals };
