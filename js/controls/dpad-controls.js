// 控制：十字方向键（D-Pad）移动
// 已修正方向映射：▲前进(向银幕) ▼后退 ◀左移 ▶右移
import { inputState } from './input-state.js';
import { resetHideTimer } from './ui-autohide.js';

// 方向映射（已修正：屏幕上方=向银幕方向）
const DIR_MAP = {
    forward:  { x: 0, z: 1 },   // ▲ 向银幕前进（+z方向在FPS中对应朝前）
    backward: { x: 0, z: -1 },  // ▼ 远离银幕后退
    left:     { x: -1, z: 0 },  // ◀ 左平移
    right:    { x: 1, z: 0 }    // ▶ 右平移
};

export function setupDPad() {
    const buttons = document.querySelectorAll('.dpad-btn[data-dir]');
    buttons.forEach(btn => {
        const mapping = DIR_MAP[btn.dataset.dir];
        if (!mapping) return;

        const press = (e) => {
            e.preventDefault();
            btn.classList.add('active');
            inputState.moveX += mapping.x;
            inputState.moveZ += mapping.z;
            resetHideTimer();
        };
        const release = (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            inputState.moveX -= mapping.x;
            inputState.moveZ -= mapping.z;
        };

        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release);

        // 鼠标（桌面调试）
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', () => {
            if (btn.classList.contains('active')) release({ preventDefault() {} });
        });
    });
}
