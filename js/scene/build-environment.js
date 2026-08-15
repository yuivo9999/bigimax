// 场景构建：墙体、地面、天花板、灯带
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function buildEnvironment() {
    buildWalls();
    buildFloor();
    buildCeiling();
}

// ===== 墙体（吸音布材质 + LED灯带）=====
function buildWalls() {
    const { width, height, depth } = HALL;
    const halfW = width / 2;
    const halfD = depth / 2;

    // 后墙（银幕所在墙，z = -halfD）
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.5),
        state.materials.wallFabric
    );
    backWall.position.set(0, height / 2, -halfD - 0.25);
    state.scene.add(backWall);

    // 前墙（入口，z = +halfD）
    const frontWall = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.5),
        state.materials.wallFabric
    );
    frontWall.position.set(0, height / 2, halfD + 0.25);
    state.scene.add(frontWall);

    // 左右侧墙
    [-1, 1].forEach(side => {
        const sideWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, height, depth),
            state.materials.wallFabric
        );
        sideWall.position.set(side * (halfW + 0.25), height / 2, 0);
        state.scene.add(sideWall);
    });

    addWallLightStrips();
}

// 墙面 LED 灯带（左蓝 / 右橙黄，还原照片氛围），沿整条纵深布置
function addWallLightStrips() {
    [-1, 1].forEach(side => {
        const x = side * (HALL.width / 2 - 0.4);
        const core = side < 0 ? 0x1830a0 : 0xcc6600;
        const glow = side < 0 ? 0x2040cc : 0xff9922;
        createLightStrip(x, core, glow);
    });
}

function createLightStrip(xPos, core, glow) {
    // 发光灯带（贴地，沿纵深）
    const sg = new THREE.BoxGeometry(0.07, 0.09, HALL.depth);
    const sm = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.92 });
    const s = new THREE.Mesh(sg, sm);
    s.position.set(xPos, 0.12, 0);
    state.scene.add(s);

    // 顶部灯带
    const ug = new THREE.BoxGeometry(0.05, 0.06, HALL.depth);
    const um = new THREE.MeshBasicMaterial({ color: core, transparent: true, opacity: 0.3 });
    const u = new THREE.Mesh(ug, um);
    u.position.set(xPos, HALL.height - 0.4, 0);
    state.scene.add(u);

    // 沿墙点缀若干点光（控制数量，避免性能压力）
    const count = 6;
    for (let i = 0; i < count; i++) {
        const l = new THREE.PointLight(core, 0.7, 14, 2);
        l.position.set(xPos + (xPos > 0 ? -0.4 : 0.4), 1.2, -HALL.depth / 2 + 6 + i * (HALL.depth - 12) / (count - 1));
        state.scene.add(l);
    }
}

// ===== 地毯地面（覆盖整厅，y=0）=====
function buildFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL.width, HALL.depth),
        state.materials.carpet
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    state.scene.add(floor);
}

// ===== 天花板 + 放映机窗口 =====
function buildCeiling() {
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL.width, HALL.depth),
        new THREE.MeshStandardMaterial({ color: 0x060610, roughness: 0.94, side: THREE.BackSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, HALL.height, 0);
    state.scene.add(ceiling);

    // 放映机窗口（银幕上方）
    const projWindow = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.2, metalness: 0.8 })
    );
    projWindow.position.set(0, HALL.screen.height + 2.5, -HALL.depth / 2 + 4);
    state.scene.add(projWindow);
}
