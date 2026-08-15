// UI：SELECT 功能菜单面板
// 点击底部 SELECT 按钮 → 屏幕中央弹出竖形功能菜单
import { state } from '../core/state.js';
import { showToast, toggleHud, toggleFullscreen } from '../main.js';

export function initSelectMenu() {
    const menu = document.getElementById('selectMenu');
    const overlay = document.getElementById('menuOverlay');
    const btn = document.getElementById('selectBtn');

    // 打开/关闭菜单
    btn.addEventListener('click', () => toggleMenu(true));
    overlay.addEventListener('click', () => toggleMenu(false));

    // 绑定各功能按钮
    bindMenuItem('menuVideo', handleOpenVideo);
    bindMenuItem('menuAudio', handleAudioToggle);
    bindMenuItem('menuLights', handleLightsToggle);
    bindMenuItem('menuFullscreen', handleFullscreen);
    bindMenuItem('menuHud', handleHudToggle);

    // 绑定灵敏度滑块（不关闭菜单）
    setupSensitivitySlider();
}

function toggleMenu(show) {
    const menu = document.getElementById('selectMenu');
    const overlay = document.getElementById('menuOverlay');
    if (show) {
        menu.classList.add('show');
        overlay.classList.add('show');
    } else {
        menu.classList.remove('show');
        overlay.classList.remove('show');
    }
}
window.closeSelectMenu = () => toggleMenu(false);

function bindMenuItem(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => { handler(); toggleMenu(false); });
}

// ---- 功能实现 ----

function handleOpenVideo() {
    document.getElementById('videoInput').click();
    showToast('📹 请选择视频或音频文件');
}

function handleAudioToggle() {
    const on = !state.ui.spatialAudio;
    const btn = document.getElementById('menuAudio');
    const icon = btn.querySelector('.menu-icon');
    icon.textContent = on ? '🔊' : '🔇';
    btn.querySelector('.menu-label').textContent = on ? '立体音效：开' : '立体音效：关';

    // 真正的 3D 空间音效开关（声音从银幕位置发出，随第一人称位置变化）
    import('../media/audio-spatial.js').then(({ setSpatialEnabled }) => {
        setSpatialEnabled(on);
    });

    showToast(on ? '🔊 影院立体空间音效已开启' : '🔇 已还原原始声音');
}

function handleLightsToggle() {
    state.ui.lightsOn = !state.ui.lightsOn;
    const on = state.ui.lightsOn;
    const btn = document.getElementById('menuLights');
    const icon = btn.querySelector('.menu-icon');
    icon.textContent = on ? '💡' : '🌙';
    btn.querySelector('.menu-label').textContent = on ? '影厅灯光：开' : '影厅灯光：关';

    // 调用灯光模块的切换函数（顶部聚光灯 / 暗场）
    import('../scene/lighting.js').then(({ setLightsOn }) => {
        setLightsOn(on);
    });

    showToast(on ? '💡 影厅灯光已打开（顶部聚光灯）' : '🌙 影厅灯光已关闭（观影模式）');
}

// 全屏模式：横屏沉浸式观看（隐藏浏览器/系统状态栏）
function handleFullscreen() {
    toggleFullscreen();
    showToast('⛶ 横屏全屏模式已切换');
}

// 顶部信息显示开关（时钟 + 视频进度）
function handleHudToggle() {
    const on = toggleHud();
    const btn = document.getElementById('menuHud');
    btn.querySelector('.menu-icon').textContent = on ? '🕒' : '🕓';
    btn.querySelector('.menu-label').textContent = on ? '顶部信息：开' : '顶部信息：关';
    showToast(on ? '🕒 顶部信息已开启（时钟/进度）' : '🕓 顶部信息已关闭');
}

// 视角灵敏度滑块（不关闭菜单，实时生效）
function setupSensitivitySlider() {
    const slider = document.getElementById('sensSlider');
    const valEl = document.getElementById('sensValue');
    if (!slider || !valEl) return;

    // 滑块值映射：UI显示倍速(0.5x~4x) → 实际灵敏度(0.001~0.008)
    // 默认值 2 → 对应灵敏度 0.002（减半后的默认值）
    const baseSens = 0.001;

    slider.addEventListener('input', () => {
        const mult = parseFloat(slider.value);       // 0.5 ~ 4
        const sens = baseSens * mult;                // 0.0005 ~ 0.008
        valEl.textContent = mult.toFixed(1) + 'x';

        import('../core/fps-controller.js').then(({ setLookSensitivity }) => {
            setLookSensitivity(sens);
        });
    });

    // 初始化显示
    valEl.textContent = parseFloat(slider.value).toFixed(1) + 'x';
}

export { toggleMenu };
