// ======== 主入口：协调各模块，启动体验 ========
import * as THREE from 'three';

// 核心
import { initEngine } from './core/engine.js';
import { initFPS, updateFPS, resetPosition } from './core/fps-controller.js';

// 数据
import { HALL } from './data/hall-config.js';

// 材质
import { initMaterials } from './materials/textures.js';

// 场景
import { buildEnvironment } from './scene/build-environment.js';
import { buildScreen, createDefaultScreenContent } from './scene/build-screen.js';
import { buildSeats } from './scene/build-seats.js';
import { buildStairs } from './scene/build-stairs.js';
import { setupLighting } from './scene/lighting.js';

// 控制
import { setupJoystick } from './controls/touch-joystick.js';
import { setupDPad } from './controls/dpad-controls.js';
import { setupAutoHide, resetHideTimer } from './controls/ui-autohide.js';

// 媒体
import { setupMediaUpload } from './media/video-screen.js';

// 扩展
import { addDustParticles, updateDust } from './extensions/particles.js';

// UI 面板
import { initSelectMenu, confirmSeatSelect } from './ui/select-menu.js';
import { initVideoControls, updateDisplay as updateVCDisplay, checkLoopAndSeek, onMediaLoaded } from './ui/video-controls.js';

// 媒体：空间音效
import { updateSpatialListener } from './media/audio-spatial.js';

import { state } from './core/state.js';
import { inputState } from './controls/input-state.js';

init();

function init() {
    // 1. 引擎
    initEngine('#canvas-container');

    // 2. 材质 + 场景
    initMaterials();
    buildEnvironment();
    buildScreen();
    buildSeats();
    buildStairs();
    setupLighting();
    createDefaultScreenContent();
    addDustParticles();

    // 3. 控制器
    initFPS();
    setupTouchControls();
    setupDPad();
    setupAutoHide();
    setupMediaUpload('videoInput');

    // 4. UI 面板
    initSelectMenu();
    initVideoControls();

    // 5. 选座确认按钮绑定
    document.getElementById('seatConfirmBtn').addEventListener('click', () => {
        confirmSeatSelect();
        resetHideTimer();
    });

    // 6. 隐藏加载画面
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        showToast('👆 使用下方摇杆在影厅中自由走动');
        showToast('⬇️ SELECT / START 打开功能菜单');
    }, 2000);

    // 7. 渲染循环
    lastTime = performance.now();
    animate();
}

// 触摸摇杆绑定
function setupTouchControls() {
    setupJoystick('moveJoystickBase', 'moveStick', (dx, dy) => {
        inputState.moveX = dx;
        inputState.moveZ = -dy; // 屏幕向上为负，对应前进
    });
    setupJoystick('lookJoystickBase', 'lookStick', (dx, dy) => {
        inputState.lookX = dx;
        inputState.lookY = dy;
    });
}

// Toast 提示（全局可调用）
let toastTimer = null;
export function showToast(msg) {
    const toast = document.getElementById('hintToast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
window.showToast = showToast;

// ======== 渲染主循环 ========
let lastTime = 0;
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    updateFPS(dt);
    updateDust();

    const tex = state.refs.videoTexture;
    const mediaElem = state.refs.mediaElement;
    // 仅视频需要每帧刷新 VideoTexture
    if (tex && mediaElem && mediaElem.tagName === 'VIDEO' && !mediaElem.paused) tex.needsUpdate = true;

    // 媒体控制面板：循环检测 + 显示刷新（视频/音频通用）
    if (mediaElem && !mediaElem.paused) {
        checkLoopAndSeek();
        updateVCDisplay();
    }

    // 立体空间音效：每帧更新听者位置（第一人称声音方位感）
    updateSpatialListener(state.camera);

    state.renderer.render(state.scene, state.camera);
}
