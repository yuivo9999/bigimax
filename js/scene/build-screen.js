// 场景构建：IMAX GT 巨型银幕（曲面 + 边框 + 光晕 + 默认画面）
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

export function buildScreen() {
    const { width, height, curvature } = HALL.screen;

    // 高细分曲面银幕
    const geo = new THREE.PlaneGeometry(width, height, 48, 36);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(x / width * Math.PI * 0.13) * curvature * width);
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(
        geo,
        // v5：默认白幕效果（不播放视频时显示白色银幕，像真实影院）
        new THREE.MeshBasicMaterial({ color: 0xe8e8e8, side: THREE.DoubleSide })
    );
    mesh.position.set(0, height / 2 + 0.8, -HALL.depth / 2 + HALL.screen.zOffset);
    state.scene.add(mesh);

    // 存入共享状态（视频模块会替换其材质贴图）
    state.refs.screenMesh = mesh;

    buildMassiveScreenFrame();
    buildScreenGlow();
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

// 默认银幕内容（v5：白幕效果，不播放视频时显示白色银幕）
export function createDefaultScreenContent() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 748;
    const x = c.getContext('2d');

    // 白幕基底（模拟真实影院白色银幕的轻微光泽感）
    const g = x.createLinearGradient(0, 0, 0, 748);
    g.addColorStop(0, '#f0f0f0');     // 顶部微亮
    g.addColorStop(0.3, '#e8e8e8');   // 上部
    g.addColorStop(0.5, '#dddddd');   // 中心微暗（银幕中心凹陷感）
    g.addColorStop(0.7, '#e8e8e8');   // 下部
    g.addColorStop(1, '#f2f2f2');     // 底部微亮
    x.fillStyle = g;
    x.fillRect(0, 0, 1024, 748);

    // 银幕顶部聚光灯照射效果（3个光斑，模拟图3顶部灯光）
    for (let i = 0; i < 3; i++) {
        const cx = 256 + i * 256; // 三个光斑均匀分布
        const sg = x.createRadialGradient(cx, 80, 0, cx, 80, 180);
        sg.addColorStop(0, 'rgba(255,255,255,0.35)');
        sg.addColorStop(0.5, 'rgba(240,240,245,0.15)');
        sg.addColorStop(1, 'rgba(200,200,200,0)');
        x.fillStyle = sg;
        x.fillRect(cx - 180, 0, 360, 280);
    }

    // 轻微边框阴影（银幕边缘微暗）
    const edgeShadow = x.createLinearGradient(0, 0, 40, 0);
    edgeShadow.addColorStop(0, 'rgba(120,120,130,0.25)');
    edgeShadow.addColorStop(1, 'rgba(120,120,130,0)');
    x.fillStyle = edgeShadow;
    x.fillRect(0, 0, 40, 748);

    const edgeShadowR = x.createLinearGradient(1024, 0, 984, 0);
    edgeShadowR.addColorStop(0, 'rgba(120,120,130,0.25)');
    edgeShadowR.addColorStop(1, 'rgba(120,120,130,0)');
    x.fillStyle = edgeShadowR;
    x.fillRect(984, 0, 40, 748);

    const tex = new THREE.CanvasTexture(c);
    state.refs.screenMesh.material.map = tex;
    state.refs.screenMesh.material.needsUpdate = true;
}
