// UI：SELECT 功能菜单面板
// 点击底部 SELECT 按钮 → 屏幕中央弹出竖形功能菜单
import { state } from '../core/state.js';
import { showToast } from '../main.js';

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

    // 调整场景所有灯光强度
    if (state.scene) {
        state.scene.traverse(obj => {
            if (obj.isAmbientLight) {
                obj.intensity = on ? 0.6 : 0.18;
            } else if (obj.isPointLight) {
                if (!obj.userData.baseIntensity) obj.userData.baseIntensity = obj.intensity;
                obj.intensity = on ? obj.userData.baseIntensity * 4 : obj.userData.baseIntensity;
            } else if (obj.isDirectionalLight) {
                if (!obj.userData.baseIntensity) obj.userData.baseIntensity = obj.intensity;
                obj.intensity = on ? obj.userData.baseIntensity * 5 : obj.userData.baseIntensity;
            } else if (obj.isHemisphereLight) {
                obj.intensity = on ? 0.5 : 0.12;
            }
        });
    }

    // 调整曝光
    if (state.renderer) {
        state.renderer.toneMappingExposure = on ? 1.8 : 1.0;
    }

    showToast(on ? '💡 影厅灯光已打开' : '🌙 影厅灯光已关闭（观影模式）');
}

function handleSeatSelect() {
    const picker = document.getElementById('seatPicker');
    picker.classList.add('show');

    // 填充排数和座位选项
    const rowSel = document.getElementById('seatRowSel');
    const colSel = document.getElementById('seatColSel');
    if (rowSel.options.length <= 1) {
        for (let r = 1; r <= 18; r++) {
            const opt = document.createElement('option');
            opt.value = r; opt.textContent = `第 ${r} 排`;
            rowSel.appendChild(opt);
        }
    }
    if (colSel.options.length <= 1) {
        for (let c = 1; c <= 28; c++) {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = `${c} 号座`;
            colSel.appendChild(opt);
        }
    }
}

// 确认选座 → 移动相机到该座位
export function confirmSeatSelect() {
    const row = parseInt(document.getElementById('seatRowSel').value);
    const col = parseInt(document.getElementById('seatColSel').value);
    if (!row || !col) return;

    // 计算座位世界坐标（基于 hall-config 数据）
    import('../data/hall-config.js').then(({ HALL }) => {
        const { seat } = HALL;
        const aisleCol = Math.floor(seat.seatsPerRow / 2); // 中央过道位置

        // 座位在过道左边还是右边
        const actualCol = col >= aisleCol ? col + 1 : col;
        const halfSeats = seat.seatsPerRow / 2;

        // X: 座位横向位置
        let x;
        if (col < aisleCol) {
            x = -(halfSeats - actualCol) * seat.width - seat.aisleWidth / 2 - seat.width / 2;
        } else {
            x = (actualCol - halfSeats) * seat.width + seat.aisleWidth / 2 + seat.width / 2;
        }

        // Z: 排纵深位置（从后往前）
        const z = -HALL.depth / 2 + 5 + (row - 1) * seat.rowSpacing;

        // Y: 阶梯高度 + 人眼高度
        const y = (row - 1) * seat.stepPerRow + 1.6; // 1.6m 眼睛高度

        // 平滑移动相机
        if (state.camera) {
            state.camera.position.set(x, y, z);
            state.camera.lookAt(0, HALL.screen.height / 2, z - 10);
        }

        document.getElementById('seatPicker').classList.remove('show');
        showToast(`🎫 已到达 第${row}排 ${col}号座`);
    });
}

export { toggleMenu };
