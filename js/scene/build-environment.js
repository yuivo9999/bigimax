// 场景构建：墙体、地面、天花板、灯带
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function buildEnvironment() {
    buildWalls();
    buildFloor();
    buildCeiling();
}

// ===== 墙体（含吸音布纹理 + LED灯带）=====
function buildWalls() {
    const { width, height, depth } = HALL;

    // 后墙
    const backGeo = new THREE.BoxGeometry(width, height, 0.5);
    const backWall = new THREE.Mesh(backGeo, state.materials.wallFabric);
    backWall.position.set(0, height / 2, depth / 2 + 4);
    backWall.receiveShadow = true;
    state.scene.add(backWall);

    // 左右侧墙
    [-1, 1].forEach(side => {
        const sideGeo = new THREE.BoxGeometry(0.5, height, depth);
        const sideWall = new THREE.Mesh(sideGeo, state.materials.wallFabric);
        sideWall.position.set(side * (width / 2 + 0.25), height / 2, (depth - 8) / 2);
        sideWall.receiveShadow = true;
        state.scene.add(sideWall);
    });

    addWallLightStrips();
}

// 墙面 LED 灯带（左蓝 / 右橙黄，还原照片氛围）
function addWallLightStrips() {
    createLightStrip(-HALL.width / 2 + 0.4, 0x1830a0, 0x2040cc);
    createLightStrip(HALL.width / 2 - 0.4, 0xcc6600, 0xff9922);
    createUpperLightStrip(-HALL.width / 2 + 0.4, 0x102060, 0.25);
    createUpperLightStrip(HALL.width / 2 - 0.4, 0xaa5500, 0.25);
}

function createLightStrip(xPos, core, glow) {
    const sg = new THREE.BoxGeometry(0.07, 0.09, HALL.depth);
    const sm = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.92 });
    const s = new THREE.Mesh(sg, sm);
    s.position.set(xPos, 0.12, (HALL.depth - 8) / 2 - 2);
    state.scene.add(s);
    for (let i = 0; i < 8; i++) {
        const l = new THREE.PointLight(core, 0.8, 10, 2);
        l.position.set(xPos + (xPos > 0 ? -0.4 : 0.4), 0.6, -6 + i * 5.5);
        state.scene.add(l);
    }
}

function createUpperLightStrip(xPos, color, opacity) {
    const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.06, HALL.depth),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    s.position.set(xPos, HALL.height - 0.4, (HALL.depth - 8) / 2 - 2);
    state.scene.add(s);
}

// ===== 地毯地面 =====
function buildFloor() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL.width, HALL.depth + 6),
        state.materials.carpet
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (HALL.depth - 8) / 2 - 3);
    floor.receiveShadow = true;
    state.scene.add(floor);
}

// ===== 天花板 + 放映机窗口 =====
function buildCeiling() {
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL.width, 18),
        new THREE.MeshStandardMaterial({ color: 0x060610, roughness: 0.94, side: THREE.BackSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, HALL.height, -1);
    state.scene.add(ceiling);

    // 放映机窗口（银幕上方）
    const projWindow = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.2, metalness: 0.8 })
    );
    projWindow.position.set(0, HALL.screen.height + 2.5, -HALL.depth / 2 + 4);
    state.scene.add(projWindow);
}
