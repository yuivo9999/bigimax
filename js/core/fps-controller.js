// 核心：第一人称游动控制器
// 消费 inputState，更新相机位置与朝向，并做边界/高度约束
// v5：移除楼梯后改为纯座椅区游动，高度跟随座椅阶梯
import * as THREE from 'three';
import { state } from './state.js';
import { HALL } from '../data/hall-config.js';
import { inputState } from '../controls/input-state.js';

// 计算默认视点：看台中间排，正对银幕
function defaultView() {
    const s = HALL.seat;
    const midRow = Math.floor(s.rows / 2);
    const z = s.frontZ + midRow * s.run + s.run / 2;
    const y = midRow * s.rise + s.eyeHeight;
    return { x: 0, y, z };
}
const _dv = defaultView();

const fps = {
    // v9：默认从看台中间排开始，正对银幕（高度跟随 45° 阶梯地面）
    position: new THREE.Vector3(_dv.x, _dv.y, _dv.z),
    yaw: 0,            // 正对银幕中心（水平无偏移）
    pitch: 0.08,       // 微微仰视感受银幕高度
    moveSpeed: 3.5,    // 游动速度 (m/s)
    lookSensitivity: 0.0012,  // v9：默认灵敏度 0.6x（再减半）
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

// 给定 z 返回地面高度（连续斜坡，无落差）
//  - z < frontZ：第一排前方（银幕前空地）→ 平地 0
//  - frontZ ≤ z ≤ 最后一级台阶末：45° 阶梯斜坡
//  - z > 末级台阶：入口平台（与最后排等高，避免落差穿模）
function floorHeightAt(z) {
    const s = HALL.seat;
    const lastTreadEnd = s.frontZ + s.rows * s.run;
    const topH = (s.rows - 1) * s.rise;
    if (z < s.frontZ) return 0;
    if (z <= lastTreadEnd) {
        return Math.min((z - s.frontZ) / s.run * s.rise, topH);
    }
    return topH;
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
    // 左右平移（修正：+X 为屏幕右方，moveX>0 应向右移动）
    const strafe = new THREE.Vector3(cosYaw, 0, -sinYaw)
        .multiplyScalar(totalMX * fps.moveSpeed * dt);

    const newPos = fps.position.clone().add(forward).add(strafe);

    // 边界约束
    const margin = 0.5;
    newPos.x = Math.max(-HALL.width / 2 + margin, Math.min(HALL.width / 2 - margin, newPos.x));
    newPos.z = Math.max(-HALL.depth / 2 + margin, Math.min(HALL.depth / 2 + 4, newPos.z));

    // 高度跟随 45° 阶梯地面（v9）：始终在地面之上，不允许穿模到地面下方
    const groundY = floorHeightAt(newPos.z);
    newPos.y = groundY + HALL.seat.eyeHeight;

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
    // 重置到看台中间排，正对银幕
    const dv = defaultView();
    fps.position.set(dv.x, dv.y, dv.z);
    fps.yaw = 0;
    fps.pitch = 0.08;

    // 立即应用到相机，确保复位即时生效（无需等待下一帧 updateFPS）
    if (state.camera) {
        state.camera.position.copy(fps.position);
        const lookDir = new THREE.Vector3(
            -Math.sin(fps.yaw) * Math.cos(fps.pitch),
            Math.sin(fps.pitch),
            -Math.cos(fps.yaw) * Math.cos(fps.pitch)
        );
        state.camera.lookAt(fps.position.clone().add(lookDir));
    }
}
