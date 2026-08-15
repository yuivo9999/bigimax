// 场景构建：座椅系统（v6：红色绒布影院座椅，参考图2风格）
// 特点：弧形分段靠背、厚实座垫、黑色扶手+杯架、T型底座
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function buildSeats() {
    const group = new THREE.Group();
    const { rows, seatsPerRow, width, depth, height, rowSpacing, aisleWidth, stepPerRow } = HALL.seat;

    const leftSection = Math.floor(seatsPerRow * 0.42);
    const aisleGap = 2;
    let totalBuilt = 0;

    for (let row = 0; row < rows && totalBuilt < HALL.seat.totalSeats; row++) {
        const elevation = row * stepPerRow;
        const z = 3 + row * rowSpacing;

        for (let seat = 0; seat < seatsPerRow && totalBuilt < HALL.seat.totalSeats; seat++) {
            if (seat >= leftSection && seat < leftSection + aisleGap) continue;

            let xOffset;
            if (seat < leftSection) {
                xOffset = (seat - leftSection / 2 + 0.5) * width - aisleWidth / 2 - 0.3;
            } else {
                const adj = seat - leftSection - aisleGap;
                xOffset = (adj - (seatsPerRow - leftSection - aisleGap) / 2 + 0.5) * width + aisleWidth / 2 + 0.3;
            }

            const detailedSeat = createTheaterSeat(width, depth, height);
            detailedSeat.position.set(xOffset, elevation, z);
            detailedSeat.rotation.y = -0.04; // 微微朝向银幕
            group.add(detailedSeat);
            totalBuilt++;
        }
    }
    console.log(`[影厅] 已生成 ${totalBuilt} 个座位`);
    state.scene.add(group);
}

// ===== v6：影院风格座椅（参考图2：红色绒布+弧形靠背+T型底座）=====
function createTheaterSeat(w, d, h) {
    const seat = new THREE.Group();

    // ---- 座垫（厚实圆润，前缘微微上翘）----
    const cushionGeo = new THREE.BoxGeometry(w * 0.88, 0.14, d * 0.52);
    const cushion = new THREE.Mesh(cushionGeo, state.materials.seatFabric);
    cushion.position.set(0, h * 0.34, d * 0.03);
    cushion.castShadow = true;
    seat.add(cushion);

    // 座垫前缘圆角加厚条
    const frontLip = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.86, 0.08, 0.05),
        state.materials.seatFabric
    );
    frontLip.position.set(0, h * 0.35, d * 0.28);
    seat.add(frontLip);

    // ---- 靠背（v6：弧形分段设计，3段横向缝线效果）----
    const backGrp = new THREE.Group();

    // 下段靠背（最宽）
    const backLower = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.88, h * 0.22, 0.12),
        state.materials.seatFabric
    );
    backLower.position.set(0, h * 0.48, 0);
    backLower.rotation.x = 0.12; // 微微后倾
    backGrp.add(backLower);

    // 中段靠背（略窄，形成收腰）
    const backMid = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.82, h * 0.20, 0.11),
        state.materials.seatFabric
    );
    backMid.position.set(0, h * 0.68, -d * 0.04);
    backMid.rotation.x = 0.10;
    backGrp.add(backMid);

    // 上段靠背（头枕区域，最窄）
    const backUpper = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.76, h * 0.18, 0.10),
        state.materials.seatFabric
    );
    backUpper.position.set(0, h * 0.86, -d * 0.08);
    backUpper.rotation.x = 0.08;
    backGrp.add(backUpper);

    // 头枕（顶部小突起）
    const headrest = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.60, h * 0.08, 0.07),
        state.materials.seatFabric
    );
    headrest.position.set(0, h * 0.97, -d * 0.09);
    headrest.rotation.x = 0.06;
    backGrp.add(headrest);

    // 缝线装饰（深色细条，模拟真皮/绒布接缝）
    const seamMat = new THREE.MeshStandardMaterial({
        color: 0x8a1515,
        roughness: 0.85,
        metalness: 0
    });
    [0.58, 0.78].forEach(yRatio => {
        const seam = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.84, 0.008, 0.13),
            seamMat
        );
        seam.position.set(0, h * yRatio, -d * 0.02);
        seam.rotation.x = 0.11;
        backGrp.add(seam);
    });

    backGrp.position.set(0, 0, -d * 0.19);
    seat.add(backGrp);

    // ---- 扶手系统（黑色，含杯架）----
    createArmrestSystem(seat, w, d, h);

    // ---- T 型底座（黑色金属支架）----
    createTBase(seat, w, d, h);

    return seat;
}

// 扶手系统：黑色塑料扶手 + 杯架（参考图2右侧扶手样式）
function createArmrestSystem(parent, w, d, h) {
    [-1, 1].forEach(side => {
        const ax = side * w * 0.46;
        const armGrp = new THREE.Group();

        // 扶手立柱（从底座到扶手面）
        const postGeo = new THREE.BoxGeometry(0.07, h * 0.38, d * 0.22);
        const post = new THREE.Mesh(postGeo, state.materials.armrestPlastic);
        post.position.set(0, h * 0.42, d * 0.02);
        armGrp.add(post);

        // 扶手面板（宽大平面，可放手臂）
        const padGeo = new THREE.BoxGeometry(0.10, 0.04, d * 0.30);
        const pad = new THREE.Mesh(padGeo, state.materials.armrestPlastic);
        pad.position.set(0, h * 0.62, d * 0.02);
        armGrp.add(pad);

        // 扶手前端圆角
        const capGeo = new THREE.SphereGeometry(0.04, 8, 6);
        const cap = new THREE.Mesh(capGeo, state.materials.armrestPlastic);
        cap.position.set(0, h * 0.62, d * 0.17);
        cap.scale.set(1, 0.8, 1.2);
        armGrp.add(cap);

        // 杯架（在扶手内侧前方）
        const cupGrp = new THREE.Group();
        // 杯架外圈
        const cupOuter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.044, 0.040, 0.065, 16),
            state.materials.armrestPlastic
        );
        cupGrp.add(cupOuter);
        // 杯架内圈（深色）
        const cupInnerMat = new THREE.MeshStandardMaterial({ color: 0x080810, roughness: 0.92, metalness: 0.05 });
        const cupInner = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.034, 0.060, 14),
            cupInnerMat
        );
        cupGrp.add(cupInner);
        cupGrp.position.set(-side * 0.02, h * 0.64, d * 0.10);

        armGrp.add(cupGrp);
        armGrp.position.x = ax;
        parent.add(armGrp);
    });
}

// T 型金属底座（参考图2底部支架）
function createTBase(parent, w, d, h) {
    const baseGrp = new THREE.Group();

    // 中央立柱
    const centerPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, h * 0.30, 0.06),
        state.materials.metalDark
    );
    centerPost.position.set(0, h * 0.15, 0);
    baseGrp.add(centerPost);

    // 横梁（T型的横杠）
    const crossbar = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.45, 0.035, 0.05),
        state.materials.metalDark
    );
    crossbar.position.set(0, 0.02, 0);
    baseGrp.add(crossbar);

    // 左右脚掌（落地部分）
    [-1, 1].forEach(side => {
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.025, d * 0.22),
            state.materials.metalDark
        );
        foot.position.set(side * w * 0.20, 0.012, d * 0.02);
        baseGrp.add(foot);
    });

    parent.add(baseGrp);
}
