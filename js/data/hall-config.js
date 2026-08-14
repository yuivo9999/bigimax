// 基础影院数据配置
// 所有尺寸均来自真实 IMAX GT Laser 影厅（万达华南MALL店）
// 修改此文件即可调整影厅规格，不影响其他模块
export const HALL = {
    // 整体空间
    width: 32,            // 影厅内部宽度（米）
    depth: 42,            // 影厅内部纵深（米）
    height: 24,           // 影厅净高（米）

    // 银幕（★ 真实数据）
    screen: {
        width: 27.8,      // 银幕宽（米）—— IMAX GT 级别
        height: 20.3,     // 银幕高（米）—— 约 12 层楼
        curvature: 0.06   // 银幕弧度系数（GT 银幕轻微内凹）
    },

    // 座椅系统
    seat: {
        totalSeats: 503,  // ★ 真实总座位数
        rows: 18,         // 排数
        seatsPerRow: 30,  // 每排最大座位数
        width: 0.58,      // 单座宽
        depth: 0.58,      // 单座深
        height: 1.02,     // 座椅靠背总高
        rowSpacing: 1.08, // 排间距
        aisleWidth: 1.3,  // 中央过道宽
        stepPerRow: 0.22  // 每排阶梯抬升高度
    },

    // 侧面主通道阶梯
    stair: {
        stepHeight: 0.19, // 单级台阶高
        stepDepth: 0.34,  // 单级台阶深
        totalSteps: 26,   // 台阶总数
        width: 2.6        // 主通道宽
    }
};
