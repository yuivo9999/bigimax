// 程序化材质与纹理生成模块
// 所有材质通过 Canvas 动态生成，无需外部图片资源
// 生成的材质存入 state.materials 供各场景构建模块调用
import * as THREE from 'three';
import { state } from '../core/state.js';

export function initMaterials() {
    const materials = state.materials;

    materials.carpet = new THREE.MeshStandardMaterial({
        map: genCarpet(),
        color: 0x8888aa,
        roughness: 0.92,
        metalness: 0.01,
        bumpMap: genCarpet(),
        bumpScale: 0.03
    });

    materials.wallFabric = new THREE.MeshStandardMaterial({
        map: genWallFabric(),
        color: 0x6666aa,
        roughness: 0.9,
        metalness: 0.02,
        bumpMap: genWallFabric(),
        bumpScale: 0.02
    });

    materials.seatFabric = new THREE.MeshStandardMaterial({
        map: genSeatFabric(),
        color: 0xaa6666,
        roughness: 0.78,
        metalness: 0.02,
        bumpMap: genSeatFabric(),
        bumpScale: 0.01
    });

    materials.stairTile = new THREE.MeshStandardMaterial({
        map: genStairTile(),
        color: 0xcc9944,
        roughness: 0.45,
        metalness: 0.15,
        bumpMap: genStairTile(),
        bumpScale: 0.02
    });

    materials.metalDark = new THREE.MeshStandardMaterial({
        color: 0x15151c, roughness: 0.28, metalness: 0.88
    });

    materials.metalBright = new THREE.MeshStandardMaterial({
        color: 0x2a2a35, roughness: 0.2, metalness: 0.92
    });

    materials.armrestPlastic = new THREE.MeshStandardMaterial({
        color: 0x1c1c24, roughness: 0.32, metalness: 0.75
    });

    return materials;
}

// ===== 地毯 =====
function genCarpet() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 80000; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        const v = 10 + Math.random() * 18;
        ctx.fillStyle = `rgb(${v},${v * 0.85},${v * 1.1})`;
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.strokeStyle = 'rgba(25,25,45,0.4)';
    ctx.lineWidth = 1;
    for (let px = 0; px < size; px += 64) {
        for (let py = 0; py < size; py += 64) {
            ctx.strokeRect(px + 2, py + 2, 60, 60);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 12);
    return tex;
}

// ===== 墙面吸音布 =====
function genWallFabric() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#08081a'); grad.addColorStop(0.5, '#0a0a1e'); grad.addColorStop(1, '#070716');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) for (let x = 0; x < size; x += 3) {
        const v = 14 + (((x + y) % 6 === 0) ? 6 : 0) + Math.random() * 4;
        ctx.fillStyle = `rgb(${v},${v * 0.95},${v * 1.15})`;
        ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = 'rgba(15,15,30,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const p = i * (size / 8);
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// ===== 座椅面料 =====
function genSeatFabric() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
    g.addColorStop(0, '#6b1818'); g.addColorStop(0.7, '#5a1414'); g.addColorStop(1, '#4a1010');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40000; i++) {
        const v = 80 + Math.random() * 40;
        ctx.fillStyle = `rgb(${v},${v * 0.2},${v * 0.2})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
    ctx.strokeStyle = 'rgba(90,20,20,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.strokeRect(8, 8, size - 16, size - 16);
    return new THREE.CanvasTexture(canvas);
}

// ===== 阶梯地砖 =====
function genStairTile() {
    const s = 256;
    const canvas = document.createElement('canvas');
    canvas.width = s; canvas.height = s;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#a06828'); g.addColorStop(0.3, '#b87a30');
    g.addColorStop(0.7, '#a86c2a'); g.addColorStop(1, '#985e22');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(60,38,12,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, s - 4, s - 4);
    const sh = ctx.createLinearGradient(0, 0, s, s);
    sh.addColorStop(0, 'rgba(255,230,150,0.12)');
    sh.addColorStop(0.5, 'rgba(255,200,100,0.04)');
    sh.addColorStop(1, 'rgba(200,150,50,0.08)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 12);
    return tex;
}
