// 控制：UI 自动隐藏
// 控制区（方向键 / 摇杆 / 复位按钮）无操作 3 秒后隐藏，任意触摸立即恢复
// 底部 SELECT/START 按钮无操作 10 秒后隐藏，仅点击其所在位置（底部感应区）才恢复
// 顶部 IMAX 标题与右上角红色 IMAX 标识：始终显示，永不隐藏

const CONTROL_HIDE_DELAY = 3000;   // 方向键 / 摇杆 / 复位按钮 等
const BOTTOM_HIDE_DELAY = 10000;   // 底部 SELECT / START 按钮

let controlsArea, bottomButtons, bottomRevealZone;
let controlTimer = null;
let bottomTimer = null;

export function setupAutoHide() {
    controlsArea = document.getElementById('controlsArea');
    bottomButtons = document.getElementById('bottomButtons');
    bottomRevealZone = document.getElementById('bottomRevealZone');

    // 任意交互（摇杆/方向键/屏幕任意处）→ 只恢复控制区，不影响底部按钮
    document.addEventListener('touchstart', showControls, { passive: true });
    document.addEventListener('mousedown', showControls);

    // 底部感应区：按钮隐藏后，点击其所在位置才唤回 SELECT/START
    if (bottomRevealZone) {
        const onReveal = (e) => {
            if (e.cancelable) e.preventDefault();
            revealBottom();
        };
        bottomRevealZone.addEventListener('touchstart', onReveal, { passive: false });
        bottomRevealZone.addEventListener('mousedown', onReveal);
    }

    startTimers();
}

function startTimers() {
    clearTimeout(controlTimer);
    clearTimeout(bottomTimer);
    controlTimer = setTimeout(hideControls, CONTROL_HIDE_DELAY);
    bottomTimer = setTimeout(hideBottom, BOTTOM_HIDE_DELAY);
}

function hideControls() {
    if (controlsArea) controlsArea.classList.add('hidden');
}

function hideBottom() {
    if (bottomButtons) bottomButtons.classList.add('hidden');
    // 激活底部感应区，等待用户点击其位置来唤回按钮
    if (bottomRevealZone) bottomRevealZone.classList.add('active');
}

// 任意触摸 → 只恢复控制区（不恢复底部按钮），并重启控制区计时
function showControls() {
    if (controlsArea) controlsArea.classList.remove('hidden');
    clearTimeout(controlTimer);
    controlTimer = setTimeout(hideControls, CONTROL_HIDE_DELAY);
}

// 点击底部感应区 → 唤回 SELECT/START，并重启底部计时
function revealBottom() {
    if (bottomButtons) bottomButtons.classList.remove('hidden');
    if (bottomRevealZone) bottomRevealZone.classList.remove('active');
    clearTimeout(bottomTimer);
    bottomTimer = setTimeout(hideBottom, BOTTOM_HIDE_DELAY);
}

// 兼容旧接口：任意触摸只恢复控制区（不恢复底部按钮）
export function resetHideTimer() {
    showControls();
}
