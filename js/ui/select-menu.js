// UI：SELECT 功能菜单面板
// 点击底部 SELECT 按钮 → 屏幕中央弹出竖形功能菜单
import { state } from '../core/state.js';
import { showToast } from '../main.js';
import { resetPosition } from '../core/fps-controller.js';
import { HALL } from '../data/hall-config.js';

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
    bindMenuItem('menuSeat', handleSeatSelect);
    bindMenuItem('menuReset', handleResetView);

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

function handleSeatSelect() {    const picker = document.getElementById('seatPicker');
    picker.classList.add('show');

    // 填充排数和横向座位选项（v9：每排为一条长椅，列表示沿长椅横向位置）
    const rowSel = document.getElementById('seatRowSel');
    const colSel = document.getElementById('seatColSel');
    if (rowSel.options.length <= 1) {
        for (let r = 1; r <= HALL.seat.rows; r++) {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = `第 ${r} 排`;
            rowSel.appendChild(opt);
        }
    }
    if (colSel.options.length <= 1) {
        for (let c = 1; c <= HALL.seat.cols; c++) {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = `第 ${c} 列`;
            colSel.appendChild(opt);
        }
    }
}

// 视角复位：校正回中间座位、正对银幕的观看视角
function handleResetView() {
    resetPosition();
    showToast('🧭 视角已复位（正对银幕）');
}

// 确认选座 → 移动相机到该排长椅对应位置，正对银幕
export function confirmSeatSelect() {
    const row = parseInt(document.getElementById('seatRowSel').value);
    const col = parseInt(document.getElementById('seatColSel').value);
    if (!row || !col) return;

    const s = HALL.seat;
    const rIdx = row - 1;

    // Z: 该排中心（阶梯地面）
    const z = s.frontZ + rIdx * s.run + s.run / 2;
    // Y: 阶梯高度 + 视点高度
    const y = rIdx * s.rise + s.eyeHeight;
    // X: 沿长椅横向位置（第 1 列在左端，最后一列在右端）
    const x = (col - 1) / (s.cols - 1) * s.benchWidth - s.benchWidth / 2;

    if (state.camera) {
        state.camera.position.set(x, y, z);
        // 正对银幕中心（银幕在 z = -HALL.depth/2 + HALL.screen.zOffset）
        const screenZ = -HALL.depth / 2 + HALL.screen.zOffset;
        state.camera.lookAt(0, HALL.screen.height / 2 + 0.8, screenZ);
    }

    document.getElementById('seatPicker').classList.remove('show');
    showToast(`🎫 已到达 第${row}排 第${col}列`);
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
