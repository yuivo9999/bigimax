// 媒体：影院立体空间音效（Web Audio 3D 定位音频）
// 开启时：声音从银幕位置发出，第一人称在影厅不同位置听到不同方位/距离感
// 关闭时：还原原始直出声音（source 直接连 destination）
import * as THREE from 'three';
import { state } from '../core/state.js';

// 临时向量，避免每帧 new
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();

// 初始化音频图（视频加载完成后调用）
export async function initSpatialAudio(video) {
    if (!video) return;

    // 复用/重建 AudioContext
    if (state.refs.audioCtx) {
        try { state.refs.audioCtx.close(); } catch (e) {}
    }

    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new Ctx();

        // 媒体源（每个 video 元素只能创建一次）
        const source = audioCtx.createMediaElementSource(video);

        // 3D 空间定位节点 —— 声音从银幕位置发出
        const panner = audioCtx.createPanner();
        panner.panningModel = 'HRTF';        // 头部相关传输函数，空间感最佳
        panner.distanceModel = 'inverse';
        panner.refDistance = 6;              // 银幕有一定距离基准
        panner.maxDistance = 120;
        panner.rolloffFactor = 1.1;          // 距离衰减
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 360;

        // 总音量增益（支持 0~200%）
        const gain = audioCtx.createGain();
        gain.gain.value = 1;

        // 固定链路：source → panner → gain → destination
        source.connect(panner);
        panner.connect(gain);
        gain.connect(audioCtx.destination);

        // 银幕位置（世界坐标）
        const HALL = (await _importHall()).HALL;
        const sx = 0;
        const sy = HALL.screen.height / 2;
        const sz = -HALL.depth / 2 + 3;     // 银幕 Z 位置（与 build-screen 一致）
        setPannerPos(panner, sx, sy, sz);

        // 存入共享状态
        state.refs.audioCtx = audioCtx;
        state.refs.audioSource = source;
        state.refs.audioPanner = panner;
        state.refs.audioGain = gain;

        // 按当前开关状态连接
        reconnectAudio();

        // 若音频上下文被挂起（自动播放策略），尝试恢复
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
        console.warn('立体空间音效不可用：', e);
        // 退化：保留原始声音
        state.refs.audioCtx = null;
    }
}

// 切换空间音效开关 → 重新连接音频图
export function setSpatialEnabled(on) {
    state.ui.spatialAudio = on;
    reconnectAudio();

    if (state.refs.audioCtx && state.refs.audioCtx.state === 'suspended') {
        state.refs.audioCtx.resume();
    }
}

// 每帧更新听者（相机）位置与朝向 → 实现第一人称声音方位感
export function updateSpatialListener(camera) {
    if (!state.ui.spatialAudio) return;
    const ctx = state.refs.audioCtx;
    const listener = ctx && ctx.listener;
    if (!ctx || !listener || !camera) return;

    const p = camera.position;
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion); // 前方向
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);    // 上方向

    if (listener.positionX) {
        // 现代 API
        const t = ctx.currentTime;
        listener.positionX.setValueAtTime(p.x, t);
        listener.positionY.setValueAtTime(p.y, t);
        listener.positionZ.setValueAtTime(p.z, t);
        listener.forwardX.setValueAtTime(_fwd.x, t);
        listener.forwardY.setValueAtTime(_fwd.y, t);
        listener.forwardZ.setValueAtTime(_fwd.z, t);
        listener.upX.setValueAtTime(_up.x, t);
        listener.upY.setValueAtTime(_up.y, t);
        listener.upZ.setValueAtTime(_up.z, t);
    } else {
        // 兼容旧 API
        listener.setPosition(p.x, p.y, p.z);
        listener.setOrientation(_fwd.x, _fwd.y, _fwd.z, _up.x, _up.y, _up.z);
    }
}

// 设置音量（0~2，即 0%~200%）
export function setSpatialVolume(v) {
    const video = state.refs.mediaElement;
    const gain = state.refs.audioGain;
    if (!video) return;

    if (state.ui.spatialAudio && gain) {
        // 经增益节点放大，video 自身保持满音量
        video.volume = 1;
        gain.gain.value = v;
    } else {
        // 原始直出：video 自身音量（浏览器上限 100%）
        if (gain) gain.gain.value = 1;
        video.volume = Math.min(1, v);
    }
}

// ---- 内部工具 ----

function reconnectAudio() {
    const ctx = state.refs.audioCtx;
    const source = state.refs.audioSource;
    if (!ctx || !source) return;

    try { source.disconnect(); } catch (e) {}

    if (state.ui.spatialAudio) {
        // 经 panner 定位
        source.connect(state.refs.audioPanner);
    } else {
        // 原始直出
        source.connect(ctx.destination);
    }
}

function setPannerPos(panner, x, y, z) {
    if (panner.positionX) {
        panner.positionX.value = x;
        panner.positionY.value = y;
        panner.positionZ.value = z;
    } else {
        panner.setPosition(x, y, z);
    }
}

// 动态导入 hall-config（避免顶层循环依赖）
async function _importHall() {
    return await import('../data/hall-config.js');
}
