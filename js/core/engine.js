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
    state.camera.position.set(0, 3.4, 11.6); // v5：中间座位默认视角，正对银幕

    // ===== 渲染器（v5：恢复大部分画质设置，仅阴影保持关闭以节省性能）=====
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const maxPixelRatio = isMobile ? 2 : 3;   // v5：放宽像素比限制（原1.5太低影响清晰度）

    state.renderer = new THREE.WebGLRenderer({
        antialias: true,                       // v5：恢复抗锯齿（保持画面平滑）
        powerPreference: 'high-performance',
        stencil: true                          // v5：恢复模板缓冲
    });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    state.renderer.shadowMap.enabled = false;     // 默认关闭阴影（视频播放更流畅）
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 1.2;  // v5：默认更亮（原0.7太暗）
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
