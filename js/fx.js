/* ================================================================
   Post-processing (r185 addons) — cinematic bloom for the WebGL path.
   EffectComposer in the addons builds WebGL render targets, so the
   WebGPU path renders directly (no composer) by design.
================================================================ */

import * as THREE from 'three';
import { EffectComposer } from '../vendor/three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from '../vendor/three/addons/postprocessing/OutputPass.js';
import { RenderPass } from '../vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/addons/postprocessing/UnrealBloomPass.js';

export function createComposer(renderer, scene, camera) {
    if (!renderer || renderer.isWebGPURenderer) return null;
    if ((location.search || '').toLowerCase().indexOf('fx=off') >= 0) return null;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // strength / radius / threshold — tuned so only emissives, the core glow
    // and hot surfaces bloom instead of washing the whole scene out.
    // overridable for A/B: ?fxbloom=strength,radius,threshold
    let bloom = [.35, .6, .9];
    const m = (location.search || '').toLowerCase().match(/fxbloom=([\d.]+),([\d.]+),([\d.]+)/);
    if (m) bloom = [+m[1], +m[2], +m[3]];
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        bloom[0], bloom[1], bloom[2]
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    // app.js eases bloom strength with thermal load (manual fxbloom stays fixed)
    composer.bloomPass = bloomPass;
    composer.bloomBase = bloom[0];
    composer.bloomFixed = !!m;
    return composer;
}
