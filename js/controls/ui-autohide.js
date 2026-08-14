// 控制：UI 自动隐藏
// 15 秒无操作后隐藏控制区 / 顶部栏 / IMAX 标签；任意交互立即恢复
const AUTO_HIDE_DELAY = 15000;
let hideTimer = null;

let controlsArea, topBar, badge;

export function setupAutoHide() {
    controlsArea = document.getElementById('controlsArea');
    topBar = document.getElementById('topBar');
    badge = document.getElementById('imaxBadge');

    // 任意触摸/点击恢复并显示计时器
    document.addEventListener('touchstart', resetHideTimer, { passive: true });
    document.addEventListener('mousedown', resetHideTimer);

    // 启动初始计时
    hideTimer = setTimeout(hideUI, AUTO_HIDE_DELAY);
}

function hideUI() {
    controlsArea.classList.add('hidden');
    topBar.classList.add('hidden');
    badge.classList.add('hidden');
}

export function resetHideTimer() {
    if (controlsArea) {
        controlsArea.classList.remove('hidden');
        topBar.classList.remove('hidden');
        badge.classList.remove('hidden');
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideUI, AUTO_HIDE_DELAY);
}
