// ======== 主入口：协调各模块，启动体验（含逐步诊断） ========
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
import { buildScreen, createDefaultScreenContent, updateScreenOSD, setScreenOSDVisible } from './scene/build-screen.js';
import { buildSeats } from './scene/build-seats.js';
import { setupLighting, setLightsOn } from './scene/lighting.js';

// 控制
import { setupJoystick } from './controls/touch-joystick.js';
import { setupDPad } from './controls/dpad-controls.js';
import { setupAutoHide, resetHideTimer } from './controls/ui-autohide.js';

// 媒体
import { setupMediaUpload } from './media/video-screen.js';

// 扩展
import { addDustParticles, updateDust } from './extensions/particles.js';

// UI 面板
import { initSelectMenu } from './ui/select-menu.js';
import { initVideoControls, updateDisplay as updateVCDisplay, checkLoopAndSeek, onMediaLoaded } from './ui/video-controls.js';

// 媒体：空间音效
import { updateSpatialListener } from './media/audio-spatial.js';

import { state } from './core/state.js';
import { inputState } from './controls/input-state.js';

// 顶部 HUD 开关状态（与 state.ui.hudEnabled 同步）
let hudEnabled = state.ui.hudEnabled;

// ======== 诊断：在加载画面显示当前步骤 ========
function diag(step, detail) {
    var el = document.getElementById('loadingText');
    var sub = document.getElementById('loadingSubtext');
    if (el) el.textContent = step;
    if (sub) sub.textContent = detail || '';
    console.log('[IMAX] ' + step + (detail ? ' — ' + detail : ''));
}

function diagError(step, err) {
    var msg = '❌ ' + step + ' 失败: ' + (err && err.message ? err.message : String(err));
    diag(msg, '请截图发回此信息');
    // 在加载画面追加红色错误块（确保可见）
    var ls = document.getElementById('loadingScreen');
    if (ls) {
        var eb = document.createElement('div');
        eb.style.cssText = 'margin-top:20px;padding:14px 18px;background:#3a0a0a;border:1px solid #ff4444;border-radius:8px;color:#ff6b6b;font-size:13px;line-height:1.7;max-width:85%;text-align:left;word-break:break-all;';
        eb.innerHTML = '<b>初始化失败</b><br>' + msg.replace(/❌ /, '') + '<br><br><span style="font-size:11px;color:#999;">请按 F12 打开开发者工具 → Console 标签查看完整错误</span>';
        ls.appendChild(eb);
        // 停止转圈动画
        var loader = ls.querySelector('.loader');
        if (loader) loader.style.animation = 'none';
    }
    console.error('[IMAX ERROR]', msg, err);
    throw err; // 仍然抛出，让调用者知道失败了
}

init();

async function init() {
    try {
        diag('✅ 模块加载完成', 'Three.js r' + THREE.REVISION + ' · 开始构建场景...');

        // 1. 引擎
        try { initEngine('#canvas-container'); }
        catch (e) { diagError('引擎初始化', e); }
        diag('✅ 1/7 引擎就绪', 'WebGL 渲染器已创建');

        // 2. 材质 + 场景
        try { initMaterials(); }
        catch (e) { diagError('材质生成', e); }
        diag('✅ 2/7 材质就绪', '程序化纹理已生成');

        try { buildEnvironment(); }
        catch (e) { diagError('环境构建', e); }
        try { buildScreen(); }
        catch (e) { diagError('银幕构建', e); }
        try { buildSeats(); }
        catch (e) { diagError('座椅构建', e); }
        try { setupLighting(); }
        catch (e) { diagError('灯光设置', e); }
        // v9：默认开灯模式（明亮影厅）
        try { setLightsOn(true); state.ui.lightsOn = true; }
        catch (e) { /* 容忍 */ }
        diag('✅ 3/7 场景构建完成', '环境·银幕·座椅·灯光');

        try { createDefaultScreenContent(); }
        catch (e) { diagError('默认内容', e); }
        try { addDustParticles(); }
        catch (e) { diagError('粒子系统', e); }

        // 3. 控制器
        try { initFPS(); }
        catch (e) { diagError('FPS控制器', e); }
        setupTouchControls();
        try { setupDPad(); }
        catch (e) { diagError('方向键', e); }
        try { setupAutoHide(); }
        catch (e) { diagError('自动隐藏', e); }
        try { setupMediaUpload('videoInput'); }
        catch (e) { diagError('媒体上传', e); }
        diag('✅ 4/7 控制器就绪', '摇杆·方向键·媒体上传');

        // 视角复位按钮（右侧视角摇杆上方）
        try {
            const rb = document.getElementById('resetViewBtn');
            if (rb) rb.addEventListener('click', () => {
                resetPosition();
                showToast('🧭 视角已复位（正对银幕）');
            });
        } catch (e) { /* 容忍 */ }

        // 4. UI 面板
        try { initSelectMenu(); }
        catch (e) { diagError('SELECT菜单', e); }
        try { initVideoControls(); }
        catch (e) { diagError('视频控制面板', e); }

        // v12：HUD 已改为3D银幕表面渲染，DOM hud-top 不再使用（保留HTML作降级备用）
        try {
            const domHud = document.getElementById('hudTop');
            if (domHud) domHud.classList.add('hidden');   // 始终隐藏DOM版
        } catch (e) { /* 容忍 */ }

        diag('✅ 5/7 UI 面板就绪', 'SELECT菜单 · START控制面板');

        // 6. 启动渲染循环
        lastTime = performance.now();
        animate();
        diag('✅ 6/7 渲染循环已启动', '即将进入影厅...');

        // 标记初始化成功
        window.__imaxLoaded = true;

        // 7. 隐藏加载画面
        setTimeout(function () {
            var ls = document.getElementById('loadingScreen');
            if (ls) ls.classList.add('hidden');
            showToast('👆 使用下方摇杆在影厅中自由游动');
            showToast('⬇️ SELECT 选座 / START 播放控制');
        }, 1500);

        diag('✅ 7/7 全部完成', 'IMAX GT 影厅已就绪');

    } catch (e) {
        // 如果是 diagError 抛出的，上面已经显示了错误
        if (!window.__imaxLoaded) {
            diagError('未知步骤', e);
        }
    }
}

// 触摸摇杆绑定
function setupTouchControls() {
    setupJoystick('moveJoystickBase', 'moveStick', function (dx, dy) {
        inputState.moveX = dx;
        inputState.moveZ = -dy;
    });
    setupJoystick('lookJoystickBase', 'lookStick', function (dx, dy) {
        // v6：右摇杆视角控制（左右取反，上下正常）
        inputState.lookX = -dx;   // 左右方向取反
        inputState.lookY = dy;    // 上下方向恢复正常（v5的-dy导致上下反了）
    });
}

// Toast 提示（全局可调用）
var toastTimer = null;
export function showToast(msg) {
    var toast = document.getElementById('hintToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2500);
}
window.showToast = showToast;

// ======== 顶部 HUD（v12：渲染在3D银幕表面，非DOM overlay）======

export function toggleHud() {
    hudEnabled = !hudEnabled;
    state.ui.hudEnabled = hudEnabled;
    setScreenOSDVisible(hudEnabled);
    return hudEnabled;
}

function formatClock(d) {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function formatHudTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
}

// 缓存当前时钟文字（每秒更新一次，避免每帧格式化）
let lastClockText = '--:--:--';

// 时钟每秒刷新 → 绘制到3D银幕OSD画布
setInterval(() => {
    if (!hudEnabled) return;
    lastClockText = formatClock(new Date());
}, 1000);

// 在渲染循环中刷新银幕OSD（合并时钟+视频时间一起绘制）
function updateHudVideoTime() {
    if (!hudEnabled) return;
    const me = state.refs.mediaElement;
    let videoText = '0:00 / 0:00';
    if (me) {
        videoText = `${formatHudTime(me.currentTime || 0)} / ${formatHudTime(me.duration || 0)}`;
    }
    // v12：绘制到3D银幕表面，而非DOM元素
    updateScreenOSD(lastClockText, videoText);
}

// ======== 横屏全屏沉浸模式 ========
export function toggleFullscreen() {
    const doc = document;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!fsEl) {
        const el = doc.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) {
            try { req.call(el); }
            catch (e) { console.warn('[IMAX] 进入全屏失败', e); }
        } else {
            showToast('⚠️ 当前浏览器不支持全屏（iOS Safari 请改用系统全屏）');
        }
    } else {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exit) { try { exit.call(doc); } catch (e) { /* 忽略 */ } }
    }
}

function syncFullscreenLabel() {
    const btn = document.getElementById('menuFullscreen');
    if (!btn) return;
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    btn.querySelector('.menu-icon').textContent = on ? '🔳' : '🔲';
    btn.querySelector('.menu-label').textContent = on ? '退出全屏' : '全屏模式';
}
document.addEventListener('fullscreenchange', syncFullscreenLabel);
document.addEventListener('webkitfullscreenchange', syncFullscreenLabel);

// 横屏时尽量自动进入全屏（沉浸式）；竖屏退出全屏
window.addEventListener('orientationchange', () => {
    const landscape = window.innerWidth > window.innerHeight;
    const doc = document;
    if (landscape) {
        const el = doc.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req && !doc.fullscreenElement && !doc.webkitFullscreenElement) {
            try { req.call(el); } catch (e) { /* 需用户手势，静默忽略 */ }
        }
    } else {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exit && (doc.fullscreenElement || doc.webkitFullscreenElement)) {
            try { exit.call(doc); } catch (e) { /* 忽略 */ }
        }
    }
});

// ======== 渲染主循环 ========
var lastTime = 0;
function animate() {
    requestAnimationFrame(animate);

    var now = performance.now();
    var dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    updateFPS(dt);
    updateDust();

    var tex = state.refs.videoTexture;
    var mediaElem = state.refs.mediaElement;
    if (tex && mediaElem && mediaElem.tagName === 'VIDEO' && !mediaElem.paused) tex.needsUpdate = true;

    if (mediaElem && !mediaElem.paused) {
        checkLoopAndSeek();
        updateVCDisplay();
    }

    updateHudVideoTime();

    updateSpatialListener(state.camera);

    state.renderer.render(state.scene, state.camera);
}
