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

    // ===== 相机（第一人称）=====
    state.camera = new THREE.PerspectiveCamera(
        65, // 广角增强沉浸感
        window.innerWidth / window.innerHeight,
        0.1,
        600
    );
    state.camera.position.set(-9, 1.65, 14); // 默认站在左侧入口阶梯

    // ===== 渲染器 =====
    state.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
    });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.shadowMap.enabled = true;
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
