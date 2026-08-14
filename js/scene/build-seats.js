// 场景构建：座椅系统（含杯架 / 扶手 / 折叠机构细节）
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function buildSeats() {
    const group = new THREE.Group();
    const { rows, seatsPerRow, width, depth, height, rowSpacing, aisleWidth, stepPerRow } = HALL.seat;

    const leftSection = Math.floor(seatsPerRow * 0.42); // 中央过道左侧座位数
    const aisleGap = 2;                                 // 过道占用的座位数
    let totalBuilt = 0;

    for (let row = 0; row < rows && totalBuilt < HALL.seat.totalSeats; row++) {
        const elevation = row * stepPerRow;
        const z = 3 + row * rowSpacing;

        for (let seat = 0; seat < seatsPerRow && totalBuilt < HALL.seat.totalSeats; seat++) {
            if (seat >= leftSection && seat < leftSection + aisleGap) continue; // 跳过过道

            let xOffset;
            if (seat < leftSection) {
                xOffset = (seat - leftSection / 2 + 0.5) * width - aisleWidth / 2 - 0.3;
            } else {
                const adj = seat - leftSection - aisleGap;
                xOffset = (adj - (seatsPerRow - leftSection - aisleGap) / 2 + 0.5) * width + aisleWidth / 2 + 0.3;
            }

            const detailedSeat = createDetailedSeat(width, depth, height);
            detailedSeat.position.set(xOffset, elevation, z);
            detailedSeat.rotation.y = -0.05; // 微微朝向银幕
            group.add(detailedSeat);
            totalBuilt++;
        }
    }
    console.log(`[影厅] 已生成 ${totalBuilt} 个座位`);
    state.scene.add(group);
}

// 创建单个精细座椅
function createDetailedSeat(w, d, h) {
    const seat = new THREE.Group();

    // 座垫
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.11, d * 0.48), state.materials.seatFabric);
    cushion.position.set(0, h * 0.37, d * 0.04);
    cushion.castShadow = true;
    seat.add(cushion);

    // 座垫前缘加厚
    const cushionFront = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.07, 0.04), state.materials.seatFabric);
    cushionFront.position.set(0, h * 0.37, d * 0.28);
    seat.add(cushionFront);

    // 靠背
    const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.54, 0.09), state.materials.seatFabric);
    back.position.set(0, h * 0.67, -d * 0.21);
    back.rotation.x = -0.14;
    back.castShadow = true;
    seat.add(back);

    // 头枕
    const head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.14, 0.07), state.materials.seatFabric);
    head.position.set(0, h * 0.97, -d * 0.19);
    head.castShadow = true;
    seat.add(head);

    // 头枕侧翼
    [-1, 1].forEach(side => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.04, h * 0.1, 0.06), state.materials.seatFabric);
        wing.position.set(side * w * 0.38, h * 0.96, -d * 0.18);
        seat.add(wing);
    });

    // 扶手 + 杯架
    createArmrest(seat, -w * 0.43, w, d, h);
    createArmrest(seat, w * 0.43, w, d, h);
    createCupHolder(seat, w * 0.33, d, h);

    // 底部机械结构
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, 0.045, d * 0.38), state.materials.metalDark);
    base.position.set(0, 0.022, 0);
    base.castShadow = true;
    seat.add(base);

    const frontLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, h * 0.37, 8), state.materials.metalDark);
    frontLeg.position.set(0, h * 0.185, d * 0.14);
    frontLeg.castShadow = true;
    seat.add(frontLeg);

    return seat;
}

// 扶手（含立柱 + 面板 + 端部）
function createArmrest(parent, xPos, seatW, seatD, seatH) {
    const grp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, seatH * 0.36, seatD * 0.32), state.materials.armrestPlastic);
    post.position.set(0, seatH * 0.47, -seatD * 0.02);
    post.castShadow = true;
    grp.add(post);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.035, seatD * 0.26), state.materials.armrestPlastic);
    pad.position.set(0, seatH * 0.65, -seatD * 0.02);
    grp.add(pad);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), state.materials.armrestPlastic);
    cap.position.set(0, seatH * 0.65, seatD * 0.1);
    grp.add(cap);

    grp.position.x = xPos;
    parent.add(grp);
}

// 杯架
function createCupHolder(parent, xPos, seatD, seatH) {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.06, 12), state.materials.armrestPlastic));

    const innerMat = new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.9, metalness: 0.1 });
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.032, 0.055, 12), innerMat));

    grp.position.set(xPos, seatH * 0.68, seatD * 0.06);
    parent.add(grp);
}
