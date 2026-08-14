// 场景构建：侧面阶梯主通道 + 栏杆系统
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function buildStairs() {
    buildStaircase(-HALL.width / 2 + HALL.stair.width / 2 + 0.3, true);
    buildStaircase(HALL.width / 2 - HALL.stair.width / 2 - 0.3, false);
    buildRailings();
}

// 单侧阶梯（暖色发光嵌条还原照片氛围）
function buildStaircase(centerX, isLeft) {
    const grp = new THREE.Group();
    const { stepHeight, stepDepth, totalSteps, width: stairWidth } = HALL.stair;
    const dir = isLeft ? 1 : -1;

    for (let i = 0; i < totalSteps; i++) {
        const y = i * stepHeight;
        const z = -2 + i * stepDepth;

        const step = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidth, stepHeight, stepDepth),
            state.materials.stairTile
        );
        step.position.set(centerX, y + stepHeight / 2, z);
        step.castShadow = true;
        step.receiveShadow = true;
        grp.add(step);

        // 阶梯前沿发光嵌条
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(stairWidth - 0.1, 0.015, 0.015),
            new THREE.MeshBasicMaterial({ color: 0xffbb44, transparent: true, opacity: 0.7 })
        );
        edge.position.set(centerX, y + stepHeight + 0.007, z + stepDepth / 2);
        grp.add(edge);
    }

    // 暖色聚光灯
    const spot = new THREE.SpotLight(0xffaa44, 5, 22, Math.PI / 5.5, 0.45, 1.8);
    spot.position.set(centerX + dir * 2, 8, 10);
    spot.target.position.set(centerX, 1, 4);
    grp.add(spot);
    grp.add(spot.target);

    state.scene.add(grp);
}

// 座椅区与通道之间的栏杆
function buildRailings() {
    const lb = -HALL.seat.seatsPerRow * HALL.seat.width * 0.42 / 2 - 0.8;
    const rb = HALL.seat.seatsPerRow * HALL.seat.width * 0.42 / 2 + 0.8;
    buildDetailedRailing(lb);
    buildDetailedRailing(rb);
}

function buildDetailedRailing(xCenter) {
    const rg = new THREE.Group();
    const { rows, rowSpacing, stepPerRow } = HALL.seat;

    for (let row = 1; row < rows; row += 2) {
        const y = row * stepPerRow;
        const z = 3 + row * rowSpacing;

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 1.05, 10), state.materials.metalDark);
        post.position.set(xCenter, y + 0.525, z);
        post.castShadow = true;
        rg.add(post);

        if (row > 1) {
            const prevY = (row - 2) * stepPerRow;
            const prevZ = 3 + (row - 2) * rowSpacing;
            const segLen = Math.sqrt(Math.pow(z - prevZ, 2) + Math.pow(y - prevY, 2));
            const angle = Math.atan2(y - prevY, z - prevZ);

            const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, segLen, 8), state.materials.metalBright);
            topRail.position.set(xCenter, (y + prevY) / 2 + 1.02, (z + prevZ) / 2);
            topRail.rotation.x = Math.PI / 2 + angle;
            rg.add(topRail);

            const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, segLen, 6), state.materials.metalDark);
            midRail.position.set(xCenter, (y + prevY) / 2 + 0.52, (z + prevZ) / 2);
            midRail.rotation.x = Math.PI / 2 + angle;
            rg.add(midRail);
        }
    }
    state.scene.add(rg);
}
