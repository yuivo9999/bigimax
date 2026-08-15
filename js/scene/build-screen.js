// 场景构建：IMAX GT 巨型银幕（曲面 + 边框 + 白幕默认画面）
// v6：默认显示白幕（参考图4），停止播放时也恢复白幕
import * as THREE from 'three';
import { state } from '../core/state.js';
import { HALL } from '../data/hall-config.js';

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

    // v6：纯白色材质作为基底（确保不播放时是白幕）
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    mesh.position.set(0, height / 2 + 0.8, -HALL.depth / 2 + HALL.screen.zOffset);
    state.scene.add(mesh);

    // 存入共享状态（视频模块会替换其材质贴图）
    state.refs.screenMesh = mesh;

    buildMassiveScreenFrame();
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
