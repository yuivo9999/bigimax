// 场景构建：座椅看台（v9：整排长椅 + 45° 阶梯实心地面）
// 设计目标：
//  - 每排 = 一条与银幕等宽(55.6m)的长椅（座面 + 靠背），纯色无纹理、低面数
//  - 一排排向后按 45°（run=rise）阶梯叠加，直到最后一排高度 ≈ 银幕高 4/5
//  - 每排下方用实心台阶填实（座椅不悬空），看台地面宽出墙壁一点（防漏洞）
//  - 最后一排之后是等高入口平台（避免落差穿模）
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

// 座椅纯色（影院红，无需任何纹理贴图）
const SEAT_COLOR = 0x9a3030;

export function buildSeats() {
    const group = new THREE.Group();
    const s = HALL.seat;
    const platformWidth = HALL.width + s.platformMargin * 2;   // 宽出墙壁，防漏洞
    const backHeight = (s.rows - 1) * s.rise;                  // 最后一排地面高度
    const lastTreadEnd = s.frontZ + s.rows * s.run;            // 最后一级台阶末端 z

    // 共享材质 / 几何体（全部复用，极省内存）
    const benchMat = new THREE.MeshLambertMaterial({ color: SEAT_COLOR });
    const stepMat = state.materials.carpet;                   // 复用深灰地毯作台阶
    const seatGeo = new THREE.BoxGeometry(s.benchWidth, 0.22, s.benchDepth);
    const backGeo = new THREE.BoxGeometry(s.benchWidth, s.backHeight, 0.16);
    const stepGeo = new THREE.BoxGeometry(platformWidth, 1, s.run);  // 高度用 scale.y 控制

    for (let i = 0; i < s.rows; i++) {
        const floorY = i * s.rise;
        const zCenter = s.frontZ + i * s.run + s.run / 2;

        // 实心台阶（从 y=0 填到该排地面，避免悬空/漏洞）
        if (i > 0) {
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.scale.y = floorY;
            step.position.set(0, floorY / 2, zCenter);
            group.add(step);
        }

        // 长条座椅：座面
        const seat = new THREE.Mesh(seatGeo, benchMat);
        seat.position.set(0, floorY + s.seatHeight, zCenter);
        group.add(seat);

        // 长条座椅：靠背（位于长椅后缘 +z 侧，观众面朝银幕 -z）
        const back = new THREE.Mesh(backGeo, benchMat);
        back.position.set(0, floorY + s.seatHeight + s.backHeight / 2, zCenter + s.benchDepth / 2 - 0.08);
        group.add(back);
    }

    // 顶部入口平台：最后一排之后保持同高度，避免落差穿模
    const walkDepth = (HALL.depth / 2 + 2) - lastTreadEnd;
    if (walkDepth > 0) {
        const walk = new THREE.Mesh(
            new THREE.BoxGeometry(platformWidth, backHeight, walkDepth),
            stepMat
        );
        walk.position.set(0, backHeight / 2, lastTreadEnd + walkDepth / 2);
        group.add(walk);
    }

    console.log(`[影厅] 已生成 ${s.rows} 排长椅阶梯看台（v9），最后排高 ${backHeight.toFixed(1)}m`);
    state.scene.add(group);
}
