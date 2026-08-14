// 控制：十字方向键（D-Pad）移动
// 多个按键同时按下时累加，松开时扣除，支持斜向移动
import { inputState } from './input-state.js';
import { resetHideTimer } from './ui-autohide.js';

const DIR_MAP = {
    forward:  { x: 0, z: -1 },
    backward: { x: 0, z: 1 },
    left:     { x: -1, z: 0 },
    right:    { x: 1, z: 0 }
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
