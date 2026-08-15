// 核心：第一人称走动控制器
// 消费 inputState，更新相机位置与朝向，并做边界/高度约束
import * as THREE from 'three';
import { state } from './state.js';
import { HALL } from '../data/hall-config.js';
import { inputState } from '../controls/input-state.js';

const fps = {
    position: new THREE.Vector3(-10, 1.6, 12), // 更靠近银幕，左侧阶梯入口
    yaw: 0.15,        // 水平角度（微微偏右看向银幕中心）
    pitch: 0.12,      // 垂直角度（微微仰视，感受银幕高度）
    moveSpeed: 3.5,    // 走动速度 (m/s)
    lookSensitivity: 0.002,  // 视角灵敏度（原0.004减半，更平滑）
    keyboard: {}      // 键盘状态（桌面调试用）
};

export function initFPS() {
    // 绑定键盘
    document.addEventListener('keydown', (e) => { fps.keyboard[e.code] = true; });
    document.addEventListener('keyup', (e) => { fps.keyboard[e.code] = false; });
    return fps;
}

// 外部可调用：设置视角灵敏度（供 SELECT 菜单滑块使用）
export function setLookSensitivity(value) {
    fps.lookSensitivity = Math.max(0.0005, Math.min(0.01, value));
}

export function getLookSensitivity() {
    return fps.lookSensitivity;
}

export function updateFPS(dt) {
    // 键盘输入叠加
    let kx = 0, kz = 0;
    if (fps.keyboard['KeyW'] || fps.keyboard['ArrowUp']) kz += 1;   // W/↑ 前进
    if (fps.keyboard['KeyS'] || fps.keyboard['ArrowDown']) kz -= 1;   // S/↓ 后退
    if (fps.keyboard['KeyA'] || fps.keyboard['ArrowLeft']) kx -= 1;  // A/← 左移
    if (fps.keyboard['KeyD'] || fps.keyboard['ArrowRight']) kx += 1;  // D/→ 右移

    const totalMX = Math.max(-1, Math.min(1, inputState.moveX + kx));
    const totalMZ = Math.max(-1, Math.min(1, inputState.moveZ + kz));

    // 视角旋转（灵敏度已减半）
    fps.yaw += inputState.lookX * fps.lookSensitivity * 60;
    fps.pitch -= inputState.lookY * fps.lookSensitivity * 60;
    fps.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, fps.pitch));

    const sinYaw = Math.sin(fps.yaw);
    const cosYaw = Math.cos(fps.yaw);

    // 前进 / 后退（相对视角方向）
    // totalMZ > 0 → 向银幕前进（-Z 方向在屏幕空间是"前方"）
    const forward = new THREE.Vector3(-sinYaw, 0, -cosYaw)
        .multiplyScalar(totalMZ * fps.moveSpeed * dt);
    // 左右平移
    const strafe = new THREE.Vector3(-cosYaw, 0, sinYaw)
        .multiplyScalar(totalMX * fps.moveSpeed * dt);

    const newPos = fps.position.clone().add(forward).add(strafe);

    // 边界约束
    const margin = 0.5;
    newPos.x = Math.max(-HALL.width / 2 + margin, Math.min(HALL.width / 2 - margin, newPos.x));
    newPos.z = Math.max(-HALL.depth / 2 + margin, Math.min(HALL.depth / 2 + 4, newPos.z));

    // 高度跟随地面（座椅区随阶梯抬升，侧面通道匹配阶梯）
    const inSideChannel = Math.abs(newPos.x) > HALL.width / 2 - 4;
    if (inSideChannel) {
        const stairStep = Math.max(0, (newPos.z + 2) / HALL.stair.stepDepth);
        newPos.y = stairStep * HALL.stair.stepHeight + 1.65;
    } else {
        const rowFromZ = Math.max(0, (newPos.z - 3) / HALL.seat.rowSpacing);
        newPos.y = rowFromZ * HALL.seat.stepPerRow + 1.65;
    }

    fps.position.copy(newPos);

    // 应用相机
    state.camera.position.copy(fps.position);
    const lookDir = new THREE.Vector3(
        -sinYaw * Math.cos(fps.pitch),
        Math.sin(fps.pitch),
        -cosYaw * Math.cos(fps.pitch)
    );
    state.camera.lookAt(fps.position.clone().add(lookDir));
}

export function resetPosition() {
    fps.position.set(-10, 1.6, 12);
    fps.yaw = 0.15;
    fps.pitch = 0.12;
}
