// 场景构建：IMAX GT 巨型银幕（曲面 + 边框 + 白幕默认画面 + 银幕OSD）
// v6：默认显示白幕；v12：HUD（时钟+视频进度）从DOM层移到3D银幕表面
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

// ====== 银幕 OSD：在3D银幕表面显示时钟与视频进度（替代DOM overlay）======
let hudCanvas, hudCtx, hudTexture, hudMesh;

export function buildScreen() {
    const { width, height, curvature } = HALL.screen;

    // 高细分曲面银幕
    const geo = new THREE.PlaneGeometry(width, height, 64, 48);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(x / width * Math.PI * 0.13) * curvature * width);
    }
    geo.computeVertexNormals();

    // v7：纯白色材质作为基底（确保不播放时是白幕）
    // ★ toneMapped:false —— 银幕直接显示视频/白幕原始颜色，
    //   不受 ACES 色调映射压暗，避免播放视频时整个画面发灰、偏暗
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            toneMapped: false
        })
    );
    mesh.position.set(0, height / 2 + 0.8, -HALL.depth / 2 + HALL.screen.zOffset);
    state.scene.add(mesh);

    // 存入共享状态（视频模块会替换其材质贴图）
    state.refs.screenMesh = mesh;

    buildMassiveScreenFrame();
    buildScreenOSD();          // v12：银幕表面 OSD（时钟+视频时间）
}

// 厚重金属边框
function buildMassiveScreenFrame() {
    const fm = state.materials.metalDark.clone();
    fm.color.setHex(0x0c0c12);
    const t = 0.35, d = 0.4;
    const sw = HALL.screen.width, sh = HALL.screen.height;
    const bY = sh / 2 + 0.8;
    const z = -HALL.depth / 2 + HALL.screen.zOffset;

    const frames = [
        [sw + t * 2, t, 0, bY + sh / 2 + t / 2],
        [sw + t * 2, t * 1.6, 0, bY - sh / 2 - t * 0.8],
        [t, sh + t * 2.8, -sw / 2 - t / 2, bY],
        [t, sh + t * 2.8, sw / 2 + t / 2, bY]
    ];
    frames.forEach(([w, h, x, y]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm);
        m.position.set(x, y, z - 0.15);
        m.castShadow = true;
        state.scene.add(m);
    });
}

// ====== v12：银幕 OSD 叠加层（时钟 + 视频进度，渲染在3D银幕表面）======
// 用 CanvasTexture 绘制文字，贴到银幕前方极近的透明平面上
// 效果：像真实影院的字幕/OSD一样显示在视频/白幕上面
function buildScreenOSD() {
    const { width, height, curvature } = HALL.screen;

    // 高分辨率画布（与银幕比例一致，足够清晰显示文字）
    hudCanvas = document.createElement('canvas');
    hudCanvas.width = 2048;
    hudCanvas.height = Math.round(2048 * (height / width)); // 保持银幕宽高比
    hudCtx = hudCanvas.getContext('2d');

    hudTexture = new THREE.CanvasTexture(hudCanvas);
    hudTexture.colorSpace = THREE.SRGBColorSpace;
    hudTexture.minFilter = THREE.LinearFilter;
    hudTexture.magFilter = THREE.LinearFilter;

    // 与银幕同样曲面的平面，位于银幕前方 0.03m（紧贴银幕表面）
    const osdGeo = new THREE.PlaneGeometry(width * 0.96, height * 0.96, 64, 48);
    const osdPos = osdGeo.attributes.position;
    for (let i = 0; i < osdPos.count; i++) {
        const x = osdPos.getX(i);
        osdPos.setZ(i, Math.sin(x / width * Math.PI * 0.13) * curvature * width);
    }
    osdGeo.computeVertexNormals();

    hudMesh = new THREE.Mesh(
        osdGeo,
        new THREE.MeshBasicMaterial({
            map: hudTexture,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            depthWrite: false,       // 不写入深度缓冲，避免遮挡后面的视频
            toneMapped: false         // 不受色调映射影响，保持文字原始亮度
        })
    );

    // 位置：与银幕完全对齐，仅 z 轴前移 0.03m
    const screenPos = state.refs.screenMesh.position;
    hudMesh.position.set(screenPos.x, screenPos.y, screenPos.z + 0.03);

    // 默认隐藏（由功能菜单开关控制）
    hudMesh.visible = state.ui.hudEnabled;

    state.scene.add(hudMesh);
    state.refs.screenOSD = hudMesh;   // 存入共享状态供外部控制显隐

    // 初始绘制一帧（避免空白闪烁）
    drawOSD('--:--:--', '0:00 / 0:00');
}

// 绘制 OSD 内容到 Canvas（左上角时钟 + 右上角视频时间）
// v15：参考真实影院 OSD —— 小号白字、无背景填充、仅细线边框（右侧）、文字阴影保证白幕可读
function drawOSD(clockText, videoTimeText) {
    if (!hudCtx) return;
    const w = hudCanvas.width;
    const h = hudCanvas.height;

    // 清空画布（完全透明）
    hudCtx.clearRect(0, 0, w, h);

    const padding = Math.round(w * 0.02);      // 边距（约 2%）
    const fontSize = Math.round(h * 0.014);     // 字号（约屏幕高度 1.4% —— 小巧不挡画面）

    hudCtx.font = `500 ${fontSize}px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
    hudCtx.textBaseline = 'top';

    // 左上角：当前时间（纯白字 + 细阴影，无背景）
    drawOSDClock(clockText, padding, padding);

    // 右上角：视频时间（细线圆角描边框 + 白字，无填充）
    drawOSDVideoTime(videoTimeText, w - padding, padding);

    // 标记纹理需要更新
    if (hudTexture) hudTexture.needsUpdate = true;
}

// 左上角时钟：纯白色文字 + 轻微投影（在白幕上仍可辨认）
function drawOSDClock(text, x, y) {
    const fontSize = parseInt(hudCtx.font) || 28;

    // 文字阴影（半透明深色，保证白底可读）
    hudCtx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    hudCtx.shadowBlur = Math.round(fontSize * 0.5);
    hudCtx.shadowOffsetX = 0;
    hudCtx.shadowOffsetY = 0;

    // 纯白文字
    hudCtx.fillStyle = '#ffffff';
    hudCtx.fillText(text, x, y);

    // 重置阴影（避免影响后续绘制）
    hudCtx.shadowColor = 'transparent';
    hudCtx.shadowBlur = 0;
}

// 右上角视频时间：细线圆角描边框（不填充）+ 白字
function drawOSDVideoTime(text, x, y) {
    const fontSize = parseInt(hudCtx.font) || 28;
    const metrics = hudCtx.measureText(text);
    const textW = metrics.width;
    const textH = fontSize;
    const padX = Math.round(fontSize * 0.55);
    const padY = Math.round(fontSize * 0.3);
    const radius = Math.round(fontSize * 0.35);
    const strokeWidth = Math.max(1, Math.round(fontSize * 0.06));

    const labelX = x - textW - padX * 2;
    const labelY = y;
    const labelW = textW + padX * 2;
    const labelH = textH + padY * 2;

    // 仅细线描边圆角矩形（不填充背景）
    hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    hudCtx.lineWidth = strokeWidth;
    roundRect(hudCtx, labelX, labelY, labelW, labelH, radius);
    hudCtx.stroke();

    // 白色文字 + 轻微阴影
    hudCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    hudCtx.shadowBlur = Math.round(fontSize * 0.4);
    hudCtx.fillStyle = '#ffffff';
    hudCtx.fillText(text, labelX + padX, labelY + padY);

    // 重置阴影
    hudCtx.shadowColor = 'transparent';
    hudCtx.shadowBlur = 0;
}

// 通用圆角矩形辅助函数
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ★ 外部接口：更新 OSD 内容（每帧从渲染循环调用）
export function updateScreenOSD(clockText, videoTimeText) {
    drawOSD(clockText, videoTimeText);
}

// ★ 外部接口：切换 OSD 显隐（功能菜单开关调用）
export function setScreenOSDVisible(visible) {
    if (hudMesh) hudMesh.visible = visible;
}

// 银幕柔光晕
function buildScreenGlow() {
    const gm = new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            uColor: { value: new THREE.Color(0x101028) },
            uIntensity: { value: 0.12 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uIntensity;
            varying vec2 vUv;
            void main() {
                vec2 c = vUv - 0.5;
                float d = length(c);
                float a = smoothstep(0.5, 0.15, d) * uIntensity;
                gl_FragColor = vec4(uColor, a);
            }
        `
    });
    const g = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL.screen.width * 1.12, HALL.screen.height * 1.12),
        gm
    );
    g.position.copy(state.refs.screenMesh.position);
    g.position.z -= 0.25;
    state.scene.add(g);
}

// 默认银幕内容（v6：纯白幕效果，参考图4）
export function createDefaultScreenContent() {
    showWhiteScreen();
}

// v6：显示白幕（供停止按钮调用，也作为默认内容）
// 生成一张白色带轻微光泽的画布贴到银幕
export function showWhiteScreen() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 748;
    const x = c.getContext('2d');

    // 纯白基底
    x.fillStyle = '#f5f5f5';
    x.fillRect(0, 0, 1024, 748);

    // 顶部聚光灯照射光斑（3个，模拟真实影院灯光打在白幕上的效果）
    for (let i = 0; i < 3; i++) {
        const cx = 200 + i * 312;
        const sg = x.createRadialGradient(cx, 60, 0, cx, 60, 220);
        sg.addColorStop(0, 'rgba(255,255,255,0.6)');
        sg.addColorStop(0.4, 'rgba(248,248,252,0.25)');
        sg.addColorStop(1, 'rgba(220,220,225,0)');
        x.fillStyle = sg;
        x.fillRect(cx - 220, 0, 440, 320);
    }

    // 轻微边缘渐暗（银幕边框阴影感）
    const edgeGrad = x.createLinearGradient(0, 0, 50, 0);
    edgeGrad.addColorStop(0, 'rgba(160,160,170,0.18)');
    edgeGrad.addColorStop(1, 'rgba(160,160,170,0)');
    x.fillStyle = edgeGrad;
    x.fillRect(0, 0, 50, 748);

    const edgeGradR = x.createLinearGradient(1024, 0, 974, 0);
    edgeGradR.addColorStop(0, 'rgba(160,160,170,0.18)');
    edgeGradR.addColorStop(1, 'rgba(160,160,170,0)');
    x.fillStyle = edgeGradR;
    x.fillRect(974, 0, 50, 748);

    // 应用到银幕
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    // 清除旧视频纹理
    if (state.refs.videoTexture) {
        state.refs.videoTexture.dispose();
        state.refs.videoTexture = null;
    }

    state.refs.screenMesh.material.map = tex;
    state.refs.screenMesh.material.color.setHex(0xffffff);
    state.refs.screenMesh.material.needsUpdate = true;
}
