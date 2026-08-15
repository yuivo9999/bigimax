// 全局共享状态
// 所有模块通过本文件访问 scene / camera / renderer / materials / refs
export const state = {
    scene: null,
    camera: null,
    renderer: null,
    materials: {},      // 程序化生成的材质集合
    refs: {
        screenMesh: null,    // 银幕网格对象
        videoTexture: null,  // 视频纹理
        mediaElement: null,  // 当前媒体（video 或 audio DOM 元素）
        mediaType: null,     // 'video' | 'audio'
        audioCtx: null,      // Web Audio Context（音量放大用）
        audioSource: null,   // MediaElementSourceNode
        audioPanner: null,   // PannerNode（3D 定位）
        audioGain: null      // GainNode（0-200%音量）
    },
    ui: {
        spatialAudio: false, // 立体空间音效开关
        lightsOn: true       // v9：默认开灯模式（明亮影厅）
    }
};
