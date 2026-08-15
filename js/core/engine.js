// 3D 引擎初始化模块
// 负责创建 Three.js 的场景 / 相机 / 渲染器，并绑定窗口缩放事件
import * as THREE from 'three';
import { state } from './state.js';

export function initEngine(containerSelector) {
    const container = document.querySelector(containerSelector);

    // ===== 场景 =====
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x010106);
    state.scene.fog = new THREE.FogExp2(0x010108, 0.01);

    // ===== 相机（第一人称，增强银幕震撼感）=====
    state.camera = new THREE.PerspectiveCamera(
        72, // 广角（从65增至72）增强沉浸感和银幕压迫感
        window.innerWidth / window.innerHeight,
        0.1,
        600
    );
    state.camera.position.set(-10, 1.6, 12); // 更靠近银幕（从z=14改为12），左侧阶梯入口

    // ===== 渲染器（移动端性能优化）=====
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const maxPixelRatio = isMobile ? 1.5 : 2;   // 移动端限制最高1.5x

    state.renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,                    // 移动端关闭抗锯齿（省大量GPU）
        powerPreference: 'high-performance',
        stencil: false                           // 不需要模板缓冲
    });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    state.renderer.shadowMap.enabled = false;     // 默认关闭阴影（视频播放更流畅）
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 0.7;
    container.appendChild(state.renderer.domElement);

    // 窗口缩放
    window.addEventListener('resize', onWindowResize);

    return state;
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}
