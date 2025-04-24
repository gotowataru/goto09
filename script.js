import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 基本設定 ---------------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- テクスチャローダー ---
const textureLoader = new THREE.TextureLoader();

// --- シーン全体の背景画像の設定 ---
const backgroundImagePath = 'textures/background.png';
let backgroundTexture = null;
let faceMaterial; // ★ faceMaterial を先に宣言 (envMap設定のため) ★
let watchBackMaterial = null; // ★ watchBackMaterial も先に宣言 ★
let clockCase; // ★ clockCase も先に宣言 ★
const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x9c7b4a, metalness: 0.7, roughness: 0.4 }); // ★ sideMaterial も先に定義 ★


textureLoader.load(
    backgroundImagePath,
    (texture) => {
        scene.background = texture;
        backgroundTexture = texture;
        // 背景読み込み後に文字盤マテリアルのenvMapを更新
        if (faceMaterial) {
            faceMaterial.envMap = backgroundTexture;
            faceMaterial.needsUpdate = true;
        }
        console.log('全体背景画像読み込み成功');
    },
    undefined,
    (error) => {
        console.error('全体背景画像読み込みエラー:', error);
        scene.background = new THREE.Color(0xcccccc);
    }
);

// --- OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1;

// --- ライトの設定 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(3, 5, 5); directionalLight.castShadow = true;
scene.add(directionalLight);

// --- 時計の基本設定 ---
const clockGroup = new THREE.Group();
scene.add(clockGroup);
const clockRadius = 2;
const clockThickness = 0.3;

// --- 文字盤 (CanvasTexture) ---
const faceCanvas = document.createElement('canvas');
const faceContext = faceCanvas.getContext('2d');
const canvasSize = 256; faceCanvas.width = canvasSize; faceCanvas.height = canvasSize;
const center = canvasSize / 2; const radius = canvasSize * 0.45;

// ★★★ drawClockFace 関数の定義 (ここだけ) ★★★
function drawClockFace() {
    faceContext.fillStyle = 'white'; faceContext.fillRect(0, 0, canvasSize, canvasSize);
    faceContext.beginPath(); faceContext.arc(center, center, radius, 0, Math.PI * 2);
    faceContext.fillStyle = '#f8f8f8'; faceContext.fill(); faceContext.strokeStyle = '#333';
    faceContext.lineWidth = canvasSize * 0.02; faceContext.stroke(); faceContext.lineWidth = 1;
    faceContext.strokeStyle = '#555'; for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2; const length = (i % 5 === 0) ? radius * 0.1 : radius * 0.05;
        const startRadius = radius * 0.9; const endRadius = startRadius - length; faceContext.beginPath();
        faceContext.moveTo(center + Math.sin(angle) * startRadius, center - Math.cos(angle) * startRadius);
        faceContext.lineTo(center + Math.sin(angle) * endRadius, center - Math.cos(angle) * endRadius); faceContext.stroke();
    } faceContext.fillStyle = '#333'; faceContext.font = `bold ${canvasSize * 0.1}px Arial`;
    faceContext.textAlign = 'center'; faceContext.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2; const numRadius = radius * 0.75;
        faceContext.fillText(i.toString(), center + Math.sin(angle) * numRadius, center - Math.cos(angle) * numRadius);
    }
}
try { drawClockFace(); } catch (e) { console.error("drawClockFace エラー:", e); } // 呼び出し
const faceTexture = new THREE.CanvasTexture(faceCanvas);

// 文字盤マテリアルに光沢設定を追加
faceMaterial = new THREE.MeshStandardMaterial({ // ★ 変数宣言を削除 (上で let faceMaterial; したため) ★
    map: faceTexture,
    roughness: 0.2,          // 光沢調整
    metalness: 0.1,          // 光沢調整
    envMap: backgroundTexture, // 初期値設定
    envMapIntensity: 1.0
});
if (backgroundTexture) { faceMaterial.envMap = backgroundTexture; } // 読み込み済みなら設定

const faceGeometry = new THREE.CircleGeometry(clockRadius, 64);
const clockFace = new THREE.Mesh(faceGeometry, faceMaterial);
clockFace.position.z = clockThickness / 2 + 0.01; // 文字盤のZ位置
clockGroup.add(clockFace);


// --- 時計背面用のテクスチャ読み込み ---
const watchBackTexturePath = 'textures/watch_back.png';
textureLoader.load(
    watchBackTexturePath,
    (texture) => {
        watchBackMaterial = new THREE.MeshStandardMaterial({ map: texture });
        if (clockCase && clockCase.material && clockCase.material.length === 3) {
            clockCase.material[2] = watchBackMaterial;
            clockCase.material.needsUpdate = true;
        }
    },
    undefined,
    (error) => {
        console.error(`時計背面画像 (${watchBackTexturePath}) の読み込みエラー:`, error);
        watchBackMaterial = sideMaterial.clone();
        if (clockCase && clockCase.material && clockCase.material.length === 3) {
            clockCase.material[2] = watchBackMaterial;
            clockCase.material.needsUpdate = true;
        }
    }
);

// --- 時計のケース (枠) ---
const caseGeometry = new THREE.CylinderGeometry(clockRadius, clockRadius, clockThickness, 64);
const clockCaseMaterials = [ sideMaterial, sideMaterial.clone(), sideMaterial.clone() ]; // 仮設定
clockCase = new THREE.Mesh(caseGeometry, clockCaseMaterials); // ★ 変数宣言を削除 (上で let clockCase; したため) ★
clockCase.rotation.x = Math.PI / 2;
clockGroup.add(clockCase);

// --- ガラスカバー関連のコードは削除済み ---

// --- 針の作成 ---
const handMaterialArgs = { metalness: 0.6, roughness: 0.4 };
const handBaseZ = clockFace.position.z; // 文字盤基準

// 秒針
const secondHandLength = clockRadius * 0.85; const secondHandGeometry = new THREE.BoxGeometry(0.02, secondHandLength, 0.01);
const secondHandMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, ...handMaterialArgs });
const secondHand = new THREE.Mesh(secondHandGeometry, secondHandMaterial); secondHand.position.y = secondHandLength / 2 - 0.1;
const secondHandPivot = new THREE.Object3D(); secondHandPivot.position.z = handBaseZ + 0.01;
secondHandPivot.add(secondHand); clockGroup.add(secondHandPivot);
// 分針
const minuteHandLength = clockRadius * 0.75; const minuteHandGeometry = new THREE.BoxGeometry(0.05, minuteHandLength, 0.02);
const minuteHandMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, ...handMaterialArgs });
const minuteHand = new THREE.Mesh(minuteHandGeometry, minuteHandMaterial); minuteHand.position.y = minuteHandLength / 2 - 0.1;
const minuteHandPivot = new THREE.Object3D(); minuteHandPivot.position.z = handBaseZ + 0.02;
minuteHandPivot.add(minuteHand); clockGroup.add(minuteHandPivot);
// 時針
const hourHandLength = clockRadius * 0.5; const hourHandGeometry = new THREE.BoxGeometry(0.07, hourHandLength, 0.03);
const hourHandMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, ...handMaterialArgs });
const hourHand = new THREE.Mesh(hourHandGeometry, hourHandMaterial); hourHand.position.y = hourHandLength / 2 - 0.1;
const hourHandPivot = new THREE.Object3D(); hourHandPivot.position.z = handBaseZ + 0.03;
hourHandPivot.add(hourHand); clockGroup.add(hourHandPivot);


// --- アニメーションループ ---
// ★★★ animate 関数の定義 (ここだけ) ★★★
function animate() {
    requestAnimationFrame(animate);

    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = now.getHours() % 12 + minutes / 60;

    const secondAngle = -(seconds / 60) * Math.PI * 2;
    const minuteAngle = -(minutes / 60) * Math.PI * 2;
    const hourAngle = -(hours / 12) * Math.PI * 2;

    secondHandPivot.rotation.z = secondAngle;
    minuteHandPivot.rotation.z = minuteAngle;
    hourHandPivot.rotation.z = hourAngle;

    controls.update();
    renderer.render(scene, camera);
}

// --- ウィンドウリサイズ対応 ---
// ★★★ addEventListener の定義 (ここだけ) ★★★
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- アニメーション開始 ---
animate(); // 最初の呼び出し

// --- ↓↓↓ 末尾の重複部分は今度こそ削除しました ↓↓↓ ---