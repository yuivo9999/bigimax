// 场景构建：灯光系统
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function setupLighting() {
    // 极低环境光 —— 保留暗场氛围
    state.scene.add(new THREE.AmbientLight(0x0a0a18, 0.18));

    // 银幕方向微弱补光
    const fill = new THREE.DirectionalLight(0x202040, 0.08);
    fill.position.set(0, 10, 15);
    state.scene.add(fill);

    // 半球光
    state.scene.add(new THREE.HemisphereLight(0x0a0a25, 0x030308, 0.12));

    // 左墙蓝色氛围补充
    const blue = new THREE.PointLight(0x1830a0, 1.5, 35, 2);
    blue.position.set(-HALL.width / 2 + 2.5, 5, 6);
    state.scene.add(blue);

    // 右墙橙黄氛围（对应照片暖光）
    const warm = new THREE.PointLight(0xee8822, 2.0, 35, 2);
    warm.position.set(HALL.width / 2 - 2.5, 4, 8);
    state.scene.add(warm);
}
