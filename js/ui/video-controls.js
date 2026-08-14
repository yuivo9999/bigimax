// UI：视频播放控制器面板（START 按钮）
// 完整播放器导航栏：进度条 / 播放暂停停止 / 快进快退30s / 倍速 / 音量0-200% / 画面比例 / 跳过片尾循环
import * as THREE from 'three';
import { state } from '../core/state.js';
import { showToast } from '../main.js';

// 视频播放状态
const playerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,          // 0-2 (0-200%)
    playbackRate: 1.0,
    aspectMode: 'fit',     // fit | fill | crop | stretch
    skipEndSeconds: 5,     // 跳过片尾秒数
    loopEnabled: true
};

export function initVideoControls() {
    const btn = document.getElementById('startBtn');
    const panel = document.getElementById('videoControlPanel');
    const overlay = document.getElementById('videoOverlay');

    btn.addEventListener('click', () => togglePanel(true));
    overlay.addEventListener('click', () => togglePanel(false));

    // 绑定所有控制按钮
    bindControls();

    // 进度条拖拽
    setupProgressBar();

    // 音量滑块
    setupVolumeSlider();

    // 倍速按钮组
    setupSpeedButtons();

    // 画面比例按钮组
    setupAspectButtons();

    // 跳过片尾设置
    setupSkipEndSetting();
}

function togglePanel(show) {
    const panel = document.getElementById('videoControlPanel');
    const overlay = document.getElementById('videoOverlay');
    if (show) {
        panel.classList.add('show');
        overlay.classList.add('show');
        updateDisplay(); // 刷新显示
    } else {
        panel.classList.remove('show');
        overlay.classList.remove('show');
    }
}
window.closeVideoPanel = () => togglePanel(false);

// ---- 控制绑定 ----

function bindControls() {
    // 播放/暂停
    document.getElementById('vcPlayPause').addEventListener('click', togglePlayPause);
    // 停止
    document.getElementById('vcStop').addEventListener('click', stopVideo);
    // 快退30s
    document.getElementById('vcRewind').addEventListener('click', () => seekRelative(-30));
    // 快进30s
    document.getElementById('vcForward').addEventListener('click', () => seekRelative(30));
}

function togglePlayPause() {
    const video = state.refs.mediaElement;
    if (!video) {
        showToast('⚠️ 请先上传视频');
        return;
    }
    if (video.paused) {
        video.play().catch(() => {});
        playerState.isPlaying = true;
        updatePlayButton();
        showToast('▶️ 播放中');
    } else {
        video.pause();
        playerState.isPlaying = false;
        updatePlayButton();
        showToast('⏸ 已暂停');
    }
}

function stopVideo() {
    const video = state.refs.mediaElement;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    playerState.isPlaying = false;
    updatePlayButton();
    updateDisplay();
    showToast('⏹ 已停止');
}

function seekRelative(delta) {
    const video = state.refs.mediaElement;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    updateDisplay();
}

// ---- 进度条 ----

let progressDragging = false;

function setupProgressBar() {
    const bar = document.getElementById('vcProgress');
    const fill = document.getElementById('vcProgressFill');
    const handle = document.getElementById('vcProgressHandle');

    const onMove = (clientX) => {
        const rect = bar.getBoundingClientRect();
        let pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        fill.style.width = (pct * 100) + '%';
        handle.style.left = (pct * 100) + '%';

        const video = state.refs.mediaElement;
        if (video && video.duration) {
            video.currentTime = pct * video.duration;
            updateDisplay();
        }
    };

    bar.addEventListener('pointerdown', (e) => {
        progressDragging = true;
        onMove(e.clientX);
        e.preventDefault();
    });

    document.addEventListener('pointermove', (e) => {
        if (progressDragging) onMove(e.clientX);
    });

    document.addEventListener('pointerup', () => {
        progressDragging = false;
    });
}

// ---- 音量滑块 ----

function setupVolumeSlider() {
    const slider = document.getElementById('vcVolumeSlider');
    const valEl = document.getElementById('vcVolumeValue');

    slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        playerState.volume = v;
        valEl.textContent = Math.round(v * 100) + '%';

        // 通过空间音效模块设置音量（支持 0~200%）
        import('../media/audio-spatial.js').then(({ setSpatialVolume }) => {
            setSpatialVolume(v);
        });

        // 更新图标
        const icon = document.getElementById('vcVolumeIcon');
        icon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔈' : v <= 1 ? '🔉' : '🔊';
    });
}

// ---- 倍速按钮 ----

function setupSpeedButtons() {
    const speeds = [0.1, 0.5, 1, 1.5, 2.5, 3.5];
    speeds.forEach(s => {
        const btn = document.getElementById(`vcSpd${s}`);
        if (btn) {
            btn.addEventListener('click', () => setPlaybackRate(s));
        }
    });
}

function setPlaybackRate(rate) {
    playerState.playbackRate = rate;
    const video = state.refs.mediaElement;
    if (video) video.playbackRate = rate;

    // 更新按钮激活状态
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`vcSpd${rate}`);
    if (activeBtn) activeBtn.classList.add('active');

    showToast(`⏱ ${rate}x 倍速`);
}

// ---- 画面比例 ----

function setupAspectButtons() {
    const modes = ['fit', 'fill', 'crop', 'stretch'];
    modes.forEach(m => {
        const btn = document.getElementById(`vcAsp${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) {
            btn.addEventListener('click', () => setAspectRatio(m));
        }
    });
}

function setAspectRatio(mode) {
    playerState.aspectMode = mode;

    // 更新按钮状态
    document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`vcAsp${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activeBtn) activeBtn.classList.add('active');

    // 应用到银幕 mesh 的 UV 变换（通过 shader 或 texture 矩阵）
    applyAspectRatioToScreen(mode);

    const labels = { fit: '适应(Fit)', fill: '铺满(Fill)', crop: '裁切(Crop)', stretch: '拉伸(Stretch)' };
    showToast(`🖼 ${labels[mode]}`);
}

function applyAspectRatioToScreen(mode) {
    const mesh = state.refs.screenMesh;
    if (!mesh || !mesh.material) return;

    // 音频模式无画面，画面比例不适用
    if (state.refs.mediaType === 'audio') {
        showToast('🎵 当前为音频播放，无画面比例可调');
        return;
    }

    // 通过调整 texture.repeat 和 offset 来实现不同模式
    const tex = mesh.material.map;
    if (!tex || !(tex instanceof THREE.VideoTexture)) return;

    const screenRatio = HALL_SCREEN_RATIO; // 银幕宽高比 ~1.37

    switch (mode) {
        case 'fit':
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.repeat.set(1, 1);
            tex.offset.set(0, 0);
            break;
        case 'fill':
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.repeat.set(1, 1);
            tex.offset.set(0, 0);
            // Fill: 材质层面保持原始，视觉上铺满银幕
            break;
        case 'crop':
            // 裁切不变形：保持比例，裁掉超出部分
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.repeat.set(1.15, 1.15); // 轻微放大以允许边缘裁切
            tex.offset.set(-0.075, -0.075);
            break;
        case 'stretch':
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.repeat.set(1, 1);
            tex.offset.set(0, 0);
            // Stretch: 直接拉伸填满，Three.js 默认就是拉伸
            break;
    }
    tex.needsUpdate = true;
}

// 银幕比例常量（从 hall-config 计算）
const HALL_SCREEN_RATIO = 27.8 / 20.3; // ~1.37

// ---- 跳过片尾设置 ----

function setupSkipEndSetting() {
    const input = document.getElementById('vcSkipInput');
    const saveBtn = document.getElementById('vcSkipSave');

    input.value = playerState.skipEndSeconds;

    saveBtn.addEventListener('click', () => {
        const val = parseInt(input.value);
        if (isNaN(val) || val < 0) {
            showToast('⚠️ 请输入有效秒数');
            return;
        }
        playerState.skipEndSeconds = val;
        playerState.loopEnabled = true;
        showToast(`✅ 片尾跳过 ${val}s 循环已设置`);
    });
}

// ---- 显示更新 ----

export function updateDisplay() {
    const video = state.refs.mediaElement;
    if (!video) return;

    const cur = formatTime(video.currentTime || 0);
    const dur = formatTime(video.duration || 0);

    const timeEl = document.getElementById('vcTimeDisplay');
    if (timeEl) timeEl.textContent = `${cur} / ${dur}`;

    // 更新进度条
    if (video.duration && !progressDragging) {
        const pct = (video.currentTime / video.duration) * 100;
        const fill = document.getElementById('vcProgressFill');
        const handle = document.getElementById('vcProgressHandle');
        if (fill) fill.style.width = pct + '%';
        if (handle) handle.style.left = pct + '%';
    }

    // 更新播放/暂停图标
    updatePlayButton();
}

function updatePlayButton() {
    const btn = document.getElementById('vcPlayPause');
    if (!btn) return;
    const video = state.refs.mediaElement;
    const playing = video && !video.paused && !video.ended;
    playerState.isPlaying = playing;
    btn.innerHTML = playing ? '<span class="vc-ico">⏸</span>暂停' : '<span class="vc-ico">▶</span>播放';
}

function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    return `${m}:${s.toString().padStart(2,'0')}`;
}

// ---- 循环检测（在渲染循环中调用）----

export function checkLoopAndSeek() {
    const video = state.refs.mediaElement;
    if (!video || !playerState.loopEnabled || !playerState.skipEndSeconds) return;

    if (video.duration && video.currentTime >= video.duration - playerState.skipEndSeconds) {
        video.currentTime = 0;
        showToast('🔄 视频循环播放');
    }
}

// ---- 外部调用：上传视频后刷新面板 ----

export function onMediaLoaded() {
    updateDisplay();
    // 默认音量
    const slider = document.getElementById('vcVolumeSlider');
    if (slider) slider.value = playerState.volume;
}
