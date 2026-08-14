// 第一人称控制器共享输入状态
// 触摸摇杆 / 方向键 / 键盘 都修改同一份状态，由 fps-controller 统一消费
export const inputState = {
    moveX: 0,  // 左右平移 (-1 左 ~ +1 右)
    moveZ: 0,  // 前后移动 (-1 前 ~ +1 后)
    lookX: 0,  // 视角水平旋转 (-1 ~ +1)
    lookY: 0   // 视角垂直旋转 (-1 ~ +1)
};
