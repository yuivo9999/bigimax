// 控制：虚拟摇杆（移动摇杆 + 视角摇杆通用）
// 拖拽时回调 onMove(dx, dy)，dx/dy 范围 [-1, 1]
import { resetHideTimer } from './ui-autohide.js';

export function setupJoystick(baseId, stickId, onMove) {
    const base = document.getElementById(baseId);
    const stick = document.getElementById(stickId);
    const maxDist = 38; // 最大拖拽像素

    let active = false;
    let startX = 0, startY = 0;

    function handleStart(e) {
        e.preventDefault();
        active = true;
        const rect = base.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        stick.style.transition = 'none';
        resetHideTimer();
    }

    function handleMove(e) {
        if (!active) return;
        e.preventDefault();
        const t = e.touches ? e.touches[0] : e;
        let dx = t.clientX - startX;
        let dy = t.clientY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) {
            dx = dx / dist * maxDist;
            dy = dy / dist * maxDist;
        }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        onMove(dx / maxDist, dy / maxDist);
        resetHideTimer();
    }

    function handleEnd(e) {
        if (!active) return;
        e.preventDefault();
        active = false;
        stick.style.transition = 'transform 0.2s ease-out';
        stick.style.transform = 'translate(0, 0)';
        onMove(0, 0);
    }

    // 触摸事件
    base.addEventListener('touchstart', handleStart, { passive: false });
    base.addEventListener('touchmove', handleMove, { passive: false });
    base.addEventListener('touchend', handleEnd, { passive: false });
    base.addEventListener('touchcancel', handleEnd, { passive: false });

    // 鼠标事件（桌面调试）
    base.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', (e) => { if (active) handleMove(e); });
    document.addEventListener('mouseup', (e) => { if (active) handleEnd(e); });
}
