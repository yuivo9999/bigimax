// 场景构建：座椅系统（v7：低面数简化座椅）
// 设计目标：每座仅 3 个 Box（座垫 / 靠背 / 底座），纯色无纹理，
// 全部座椅共享同一组几何体和单一材质，大幅降低 GPU 内存与绘制开销。
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

// 座椅纯色（影院红，无需任何纹理贴图）
const SEAT_COLOR = 0x9a3030;

export function buildSeats() {
    const group = new THREE.Group();
    const { rows, seatsPerRow, width, depth, height, rowSpacing, aisleWidth, stepPerRow, totalSeats } = HALL.seat;

    // ===== 共享几何体 + 单一材质（全部座椅复用，极省内存）=====
    const seatMat = new THREE.MeshLambertMaterial({ color: SEAT_COLOR });
    const cushionGeo = new THREE.BoxGeometry(width * 0.82, 0.12, depth * 0.55);
    const backGeo = new THREE.BoxGeometry(width * 0.82, height * 0.52, 0.10);
    const baseGeo = new THREE.BoxGeometry(width * 0.52, height * 0.40, depth * 0.42);

    const leftSection = Math.floor(seatsPerRow * 0.42);
    const aisleGap = 2;
    let totalBuilt = 0;

    for (let row = 0; row < rows && totalBuilt < totalSeats; row++) {
        const elevation = row * stepPerRow;
        const z = 3 + row * rowSpacing;

        for (let seat = 0; seat < seatsPerRow && totalBuilt < totalSeats; seat++) {
            if (seat >= leftSection && seat < leftSection + aisleGap) continue;

            let xOffset;
            if (seat < leftSection) {
                xOffset = (seat - leftSection / 2 + 0.5) * width - aisleWidth / 2 - 0.3;
            } else {
                const adj = seat - leftSection - aisleGap;
                xOffset = (adj - (seatsPerRow - leftSection - aisleGap) / 2 + 0.5) * width + aisleWidth / 2 + 0.3;
            }

            const seatMesh = createSimpleSeat(width, depth, height, cushionGeo, backGeo, baseGeo, seatMat);
            seatMesh.position.set(xOffset, elevation, z);
            group.add(seatMesh);
            totalBuilt++;
        }
    }
    console.log(`[影厅] 已生成 ${totalBuilt} 个座椅（v7 低面数简化版）`);
    state.scene.add(group);
}

// 单个简化座椅：座垫 + 靠背 + 底座，纯色 Box，无细节纹理
function createSimpleSeat(w, d, h, cushionGeo, backGeo, baseGeo, mat) {
    const seat = new THREE.Group();

    // 座垫（略高于地面）
    const cushion = new THREE.Mesh(cushionGeo, mat);
    cushion.position.set(0, h * 0.46, d * 0.04);
    seat.add(cushion);

    // 靠背（微微后倾）
    const back = new THREE.Mesh(backGeo, mat);
    back.position.set(0, h * 0.80, -d * 0.22);
    back.rotation.x = 0.10;
    seat.add(back);

    // 底座支架（落地支撑）
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.set(0, h * 0.22, 0);
    seat.add(base);

    return seat;
}
