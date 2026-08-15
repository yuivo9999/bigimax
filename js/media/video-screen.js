// 媒体：银幕视频 / 音频播放
// 用户上传本地视频 → 映射为银幕材质贴图；上传本地音频 → 银幕显示「音频」文字
// 两者均接入立体空间音效（Web Audio 3D 定位）
import * as THREE from 'three';
import { state } from '../core/state.js';
import { showToast } from '../main.js';

export function setupMediaUpload(inputId) {
    const input = document.getElementById(inputId);
    input.addEventListener('change', (e) => handleMediaUpload(e));
}

function handleMediaUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('statusText');
    const isAudio = file.type.startsWith('audio/');

    statusEl.textContent = isAudio ? '⏳ 加载音频...' : '⏳ 加载视频...';
    statusEl.className = 'status-text';

    // 清理旧媒体
    if (state.refs.mediaElement) {
        state.refs.mediaElement.pause();
        URL.revokeObjectURL(state.refs.mediaElement.src);
    }

    // 根据类型创建媒体元素
    const media = document.createElement(isAudio ? 'audio' : 'video');
    media.src = URL.createObjectURL(file);
    media.loop = true;
    media.muted = false;            // 允许声音
    media.volume = 1.0;
    if (!isAudio) {
        media.playsInline = true;
    }

    media.onloadeddata = () => {
        statusEl.textContent = '▶️ ' + file.name.slice(0, 16);
        statusEl.className = 'status-text video-playing';

        state.refs.mediaElement = media;
        state.refs.mediaType = isAudio ? 'audio' : 'video';

        if (isAudio) {
            // 音频：银幕显示「音频」文字（无视频贴图）
            if (state.refs.videoTexture) { state.refs.videoTexture.dispose(); state.refs.videoTexture = null; }
            const tex = createAudioScreenContent();
            state.refs.screenMesh.material.map = tex;
            state.refs.screenMesh.material.color.setHex(0xffffff);
            state.refs.screenMesh.material.needsUpdate = true;
            state.renderer.toneMappingExposure = 1.0;
        } else {
            // 视频：银幕显示视频画面
            if (state.refs.videoTexture) state.refs.videoTexture.dispose();
            const tex = new THREEVideoTexture(media);
            state.refs.videoTexture = tex;
            state.refs.screenMesh.material.map = tex;
            state.refs.screenMesh.material.color.setHex(0xffffff);
            state.refs.screenMesh.material.needsUpdate = true;
            state.renderer.toneMappingExposure = 1.1;
        }

        // 通知视频控制面板刷新
        import('./ui/video-controls.js').then(({ onMediaLoaded }) => onMediaLoaded());

        // 初始化立体空间音效音频图
        import('./audio-spatial.js').then(({ initSpatialAudio }) => {
            initSpatialAudio(media);
            import('./audio-spatial.js').then(({ setSpatialVolume }) => {
                setSpatialVolume(parseFloat(document.getElementById('vcVolumeSlider').value) || 1);
            });
        });

        if (isAudio) {
            showToast(`🔊 ${file.name} 已开始音频播放`);
        } else {
            showToast(`🎬 ${file.name} 已加载到银幕`);
        }
    };

    media.onerror = () => {
        statusEl.textContent = '❌ 媒体加载失败';
        showToast('❌ 文件无法读取');
    };

    // 触发加载
    media.load();
}

// 视频纹理（v5：恢复高质量设置，保持视频播放清晰度）
function THREEVideoTexture(video) {
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;   // v5：恢复 Mipmap（更清晰的缩放）
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = state.renderer.capabilities.getMaxAnisotropy(); // v5：恢复最大各向异性（斜看清晰）
    tex.generateMipmaps = true;                       // v5：恢复 Mipmap 生成
    return tex;
}

// 音频播放时的银幕文字：「音频」（宋体，两字间留空隙）
function createAudioScreenContent() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 748;
    const x = c.getContext('2d');

    // 深色背景（与默认银幕一致）
    const g = x.createRadialGradient(512, 374, 0, 512, 374, 500);
    g.addColorStop(0, '#080818');
    g.addColorStop(0.6, '#040410');
    g.addColorStop(1, '#020208');
    x.fillStyle = g;
    x.fillRect(0, 0, 1024, 748);

    // 宋体（SimSun / Songti），两字间留空隙
    x.fillStyle = 'rgba(225,225,240,0.92)';
    x.font = 'bold 210px "SimSun", "Songti SC", "STSong", "宋体", serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';

    const chars = ['音', '频'];
    const fontSize = 210;
    const gap = fontSize * 0.34;               // 字间距（让两字不挤在一起）
    const totalW = fontSize * 2 + gap;
    const startX = 512 - totalW / 2 + fontSize / 2;

    chars.forEach((ch, i) => {
        x.fillText(ch, startX + i * (fontSize + gap), 374);
    });

    // 下方小字提示
    x.fillStyle = 'rgba(120,130,160,0.35)';
    x.font = '26px "SimSun", serif';
    x.fillText('♪ 正在播放音频', 512, 540);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = state.renderer.capabilities.getMaxAnisotropy();
    return tex;
}
