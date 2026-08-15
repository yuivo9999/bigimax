// 场景构建：灯光系统（双模式：暗场观影 / 开灯浏览）
// 关灯 = 极低环境光，保留暗场氛围
// 开灯 = 顶部聚光灯阵列均匀照亮全厅（不影响银幕区域）
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

// 存储灯光引用，供 SELECT 菜单开关切换
const lights = {
    ambient: null,           // 基础环境光
    ceilingSpots: [],        // 顶部聚光灯数组（开灯模式）
    screenFill: null         // 银幕方向微弱补光
};

export function setupLighting() {
    // ===== 基础环境光（始终存在）=====
    lights.ambient = new THREE.AmbientLight(0x0a0a18, 0.15);
    state.scene.add(lights.ambient);

    // 银幕方向极微弱补光（让暗场下银幕轮廓隐约可见）
    lights.screenFill = new THREE.DirectionalLight(0x181830, 0.04);
    lights.screenFill.position.set(0, 8, 20);
    state.scene.add(lights.screenFill);

    // ===== 顶部聚光灯阵列（开灯时激活）=====
    // 模拟真实影厅天花板嵌入式射灯，均匀覆盖整个影厅空间
    const spotPositions = [
        // 中轴线 3 盏
        { x: 0, z: -8 }, { x: 0, z: 2 }, { x: 0, z: 12 },
        // 左侧 3 盏
        { x: -HALL.width * 0.28, z: -4 }, { x: -HALL.width * 0.28, z: 6 },
        { x: -HALL.width * 0.22, z: 16 },
        // 右侧 3 盏
        { x: HALL.width * 0.28, z: -4 }, { x: HALL.width * 0.28, z: 6 },
        { x: HALL.width * 0.22, z: 16 }
    ];

    spotPositions.forEach((pos, i) => {
        const spot = new THREE.SpotLight(0xffeedd, 0, 45, Math.PI / 4.5, 0.35, 1.2);
        spot.position.set(pos.x, HALL.height - 1.5, pos.z);
        spot.target.position.set(pos.x, 0, pos.z);
        spot.castShadow = false; // 开灯模式下不需要阴影（节省性能）
        spot.visible = false;   // 默认关闭（暗场模式）

        state.scene.add(spot);
        state.scene.add(spot.target);
        lights.ceilingSpots.push(spot);
    });

    // 存入状态供外部访问
    state.refs.lights = lights;
}

// 切换灯光模式（由 select-menu.js 调用）
export function setLightsOn(on) {
    if (!lights.ambient) return;

    if (on) {
        // ===== 开灯模式：顶部聚光灯全开 + 环境光增强 =====
        lights.ambient.intensity = 0.55;
        lights.ambient.color.setHex(0xd8dce8);   // 冷白色调

        lights.ceilingSpots.forEach(spot => {
            spot.visible = true;
            spot.intensity = 2.8;               // 每盏聚光灯亮度
        });

        lights.screenFill.intensity = 0.15;

        // 曝光提升
        if (state.renderer) state.renderer.toneMappingExposure = 1.6;

    } else {
        // ===== 关灯模式：暗场观影 =====
        lights.ambient.intensity = 0.15;
        lights.ambient.color.setHex(0x0a0a18);

        lights.ceilingSpots.forEach(spot => {
            spot.visible = false;
            spot.intensity = 0;
        });

        lights.screenFill.intensity = 0.04;

        if (state.renderer) state.renderer.toneMappingExposure = 0.7;
    }
}
