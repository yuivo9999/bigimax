// 扩展：尘埃粒子系统
// 模拟放映光束中的漂浮尘埃，增强空间纵深感（可独立启用/禁用）
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

let dustPoints = null;

export function addDustParticles() {
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * HALL.width * 0.9;
        pos[i * 3 + 1] = Math.random() * HALL.height * 0.85;
        pos[i * 3 + 2] = (Math.random() - 0.5) * HALL.depth * 0.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
        color: 0xaaaacc,
        size: 0.015,
        transparent: true,
        opacity: 0.2,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    dustPoints = new THREE.Points(geo, mat);
    dustPoints.userData.isDust = true;
    state.scene.add(dustPoints);
}

// 每帧调用：粒子缓慢上升
export function updateDust() {
    if (!dustPoints) return;
    const arr = dustPoints.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += 0.0006;
        if (arr[i + 1] > HALL.height * 0.85) arr[i + 1] = 0;
    }
    dustPoints.geometry.attributes.position.needsUpdate = true;
}
