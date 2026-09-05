/* ================================================================
   Small mesh / material / part helpers
================================================================ */

import * as THREE from 'three';

function std(color, rough, metal, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
        color, roughness: rough, metalness: metal
    }, extra || {}));
}

function boxMesh(w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    return m;
}

function topFaceMats(sideMat, topMap, bottomColor) {
    return [sideMat, sideMat, topMap, std(bottomColor, .8, .05), sideMat, sideMat];
}

function addPart(model, layerKey, group, name, spec, node) {
    const b = new THREE.Box3().setFromObject(group);
    const center = b.getCenter(new THREE.Vector3());
    const size = b.getSize(new THREE.Vector3());
    model.parts.push({ name, spec, group, layerKey, center, size, node: node || layerKey });
    group.userData.partName = name;
}



export { std, boxMesh, topFaceMats, addPart };
