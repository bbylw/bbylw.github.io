/* ================================================================
   Power-on self-test sequence
================================================================ */

import * as THREE from 'three';
import { feed } from './feed.js';
import { pickWorkload } from './sim.js';
import { MODELS, bootDone, camera, cameraHome, controls, markBootDone, reduceMotion, setIntroAt, sim, state } from './state.js';
import { $ } from './state.js';

const BOOT_LINES = [
    ['NeuralChip X1 firmware v2.4.2 — POST begin', ''],
    ['SPI flash · boot signature verified', 'OK'],
    ['compute cluster bring-up · 96/96 units', 'OK'],
    ['memory init · ECC scrub', 'OK'],
    ['thermal mesh · die heat-field grids online', 'OK'],
    ['thermal sensors · 6/6 calibrated', 'OK'],
    ['cooling curve · PWM + fan tach linked', 'OK'],
    ['power telemetry · VRM phase monitor', 'OK'],
    ['board link · PCIe gen5 x16', 'OK'],
    ['system ready — workload scheduler started', 'OK']
];

function runBoot() {
    const log = $('boot-log');
    const fill = $('boot-bar-fill');
    const pct = $('boot-pct');
    let step = 0;
    let iv = null;

    const camFrom = new THREE.Vector3(44, 30, 44);
    camera.position.copy(camFrom);
    controls.enabled = false;               // hold view while booting

    pickWorkload();
    pickWorkload();
    sim.uTarget = .03;
    sim.wl = null;

    /* shared completion path: fades the overlay, unlocks the camera,
       eases back to the home view (or snaps, with reduced motion) */
    const finish = () => {
        if (bootDone) return;
        clearInterval(iv);
        $('boot').classList.add('hidden');
        markBootDone();
        feed('power-on self test complete — ' + MODELS[state.style].label + ' online', 'ok');
        if (reduceMotion) {
            camera.position.copy(cameraHome);
            controls.enabled = true;
        } else {
            setIntroAt(performance.now());
        }
    };
    const onSkipKey = (e) => {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            finish();
        }
    };
    window.addEventListener('keydown', onSkipKey, { once: true });

    iv = setInterval(() => {
        if (step >= BOOT_LINES.length) { clearInterval(iv); return; }
        const line = document.createElement('div');
        line.className = 'ln';
        line.innerHTML = BOOT_LINES[step][0] + (BOOT_LINES[step][1] ? '<span class="st">[' + BOOT_LINES[step][1] + ']</span>' : '');
        log.appendChild(line);
        step++;
        fill.style.width = Math.round(step / BOOT_LINES.length * 100) + '%';
        pct.textContent = Math.round(step / BOOT_LINES.length * 100) + '%';
        if (step === BOOT_LINES.length) setTimeout(finish, 650);
    }, 240);

    /* click-to-skip — let impatient viewers straight into the rig */
    $('boot').addEventListener('click', () => finish(), { once: true });
}



export { runBoot };
