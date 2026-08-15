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
        new THREE.MeshBasicMaterial({ color: 0x04040c, side: THREE.DoubleSide })
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

// 默认银幕内容（未上传视频时显示）
export function createDefaultScreenContent() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 748;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(512, 374, 0, 512, 374, 500);
    g.addColorStop(0, '#080818'); g.addColorStop(0.6, '#040410'); g.addColorStop(1, '#020208');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 748);
    x.fillStyle = 'rgba(50,60,100,0.2)'; x.font = 'bold 72px Arial'; x.textAlign = 'center';
    x.fillText('IMAX', 512, 360);
    x.font = '28px Arial'; x.fillStyle = 'rgba(50,60,100,0.15)';
    x.fillText('GT LASER', 512, 400);
    x.fillText('27.8 × 20.3 m', 512, 440);
    x.fillText('📹 上传视频开始播放 →', 512, 480);

    const tex = new THREE.CanvasTexture(c);
    state.refs.screenMesh.material.map = tex;
    state.refs.screenMesh.material.needsUpdate = true;
}
