// 3D-модели оружия на three.js: детали из чертежей weaponArt выдавливаются в объём с фаской,
// у каждой свой физический материал. Скин — текстура из генератора узоров.
// Превью рендерятся одним общим WebGL-контекстом в картинки и кешируются.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ARTS, Art, Mat } from '../components/weaponArt';
import { paintSkin, wearMap, FINISH_KIND, PER_PART } from './skinPainter';
import type { Finish } from '../../data/cases';
import type { WeaponModel } from '../../data/weapons';
import { PHASE_PALETTES } from '../../data/weapons';

const KNIFE = new Set(['karambit', 'butterfly', 'bayonet', 'bowie', 'stiletto']);

// Толщина детали в долях высоты чертежа
function depthOf(artKey: string, m: Mat, vh: number): number {
  if (artKey === 'gloves') return vh * (m === 'paint' ? 0.22 : 0.26);
  if (KNIFE.has(artKey)) return vh * (m === 'paint' ? 0.035 : m === 'metal' ? 0.12 : 0.1);
  const k = { paint: 0.13, metal: 0.085, poly: 0.11, dark: 0.1, chrome: 0.05 }[m];
  return vh * k;
}

// ——— геометрия (кеш по ключу рисунка) ———
const loader = new SVGLoader();
const geoCache = new Map<string, { m: Mat; geo: THREE.BufferGeometry }[]>();

function partShapes(d: string, ev?: boolean): THREE.Shape[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="#000"${ev ? ' fill-rule="evenodd"' : ''}/></svg>`;
  return loader.parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
}

function geometryFor(key: string, art: Art) {
  const hit = geoCache.get(key);
  if (hit) return hit;
  const vh = art.vb[3];
  const out = art.parts.map((p) => {
    const depth = depthOf(key, p.m, vh);
    const geo = new THREE.ExtrudeGeometry(partShapes(p.d, p.ev), {
      depth, curveSegments: 10, bevelEnabled: true,
      bevelThickness: depth * 0.28, bevelSize: Math.min(2.2, depth * 0.22), bevelSegments: 3,
    });
    geo.translate(0, 0, -depth / 2);
    // SVG смотрит вниз по Y: переворачиваем Y и Z, чтобы не сломать порядок граней
    geo.scale(1, -1, -1);
    geo.computeVertexNormals();
    return { m: p.m, geo };
  });
  geoCache.set(key, out);
  return out;
}

// ——— модели из Blender (public/models/*.glb); если не загрузились — выдавливание из чертежа ———
const gltf = new GLTFLoader();
const glbCache = new Map<string, Promise<THREE.Object3D | null>>();
function loadGlb(key: string): Promise<THREE.Object3D | null> {
  const hit = glbCache.get(key);
  if (hit) return hit;
  const base = (import.meta as any).env?.BASE_URL ?? './';
  const p = gltf.loadAsync(`${base}models/${key}.glb`).then((g) => g.scene).catch(() => null);
  glbCache.set(key, p);
  return p;
}
const MAT_NAMES: Mat[] = ['paint', 'metal', 'poly', 'dark', 'chrome'];
const matOfName = (n: string): Mat => MAT_NAMES.find((m) => n.startsWith(m)) ?? 'metal';

// ——— текстура скина ———
const texCache = new Map<string, Promise<THREE.Texture>>();

function skinTexture(art: Art, f: Finish, float: number, wearSeed: string): Promise<THREE.Texture> {
  const fb = Math.round(float * 10);
  const key = `${f.image ?? f.style}|${f.colors.join()}|${f.seed}|${art.vb.join()}|${f.word ?? ''}|${f.tier ?? 0}`; void fb;
  const hit = texCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const W = 1024, H = Math.round((1024 * art.vb[3]) / art.vb[2]);
    let c: HTMLCanvasElement;
    if (f.image) {
      const img = new Image();
      img.src = ((import.meta as any).env?.BASE_URL ?? './') + f.image;
      await img.decode();
      c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d')!.drawImage(img, 0, 0, W, H);
    } else {
      c = paintSkin(f, W, H, f.word ?? '', f.tier ?? 0);
    }
    void float; void wearSeed;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    return t;
  })();
  texCache.set(key, p);
  return p;
}

function material(m: Mat, map: THREE.Texture | null, float: number): THREE.Material {
  switch (m) {
    case 'paint': return new THREE.MeshPhysicalMaterial({ map, metalness: 0.25, roughness: 0.32 + float * 0.35, clearcoat: Math.max(0.1, 0.85 - float), clearcoatRoughness: 0.12 });
    case 'metal': return new THREE.MeshStandardMaterial({ color: 0x3d434c, metalness: 0.92, roughness: 0.3 });
    case 'poly': return new THREE.MeshStandardMaterial({ color: 0x202226, metalness: 0.05, roughness: 0.72 });
    case 'dark': return new THREE.MeshStandardMaterial({ color: 0x16171b, metalness: 0.3, roughness: 0.55 });
    case 'chrome': return new THREE.MeshStandardMaterial({ color: 0xe2e8ef, metalness: 1, roughness: 0.12 });
  }
}

export interface ModelOpts { phase?: string; float?: number; wearSeed?: string }

// Реальные модели (Sketchfab, CC BY — авторы в CREDITS.md), подготовленные в Blender: public/models/real/<key>.glb
const REAL: Record<string, string> = {
  ak: 'ak', m4: 'm4', m4s: 'm4', awp: 'awp', glock: 'glock', deagle: 'deagle', usp: 'glock', mp7: 'mp7', p90: 'p90',
  mac10: 'mac10', nova: 'nova', negev: 'negev', karambit: 'karambit', butterfly: 'butterfly', bayonet: 'bayonet',
  bowie: 'bowie', stiletto: 'stiletto', gloves1: 'gloves1', gloves2: 'gloves2', gloves3: 'gloves3',
};

// Маски окраски: прямоугольники (u0,v0,u1,v1 в боковой проекции, v сверху), где скина НЕТ — металл, рукояти
const NO_PAINT: Record<string, [number, number, number, number][]> = {
  ak: [[0.8, 0, 1, 1]], m4: [[0.82, 0, 1, 1], [0.45, 0, 0.62, 0.3]], awp: [[0.72, 0, 1, 1]],
  mp7: [[0.72, 0, 1, 0.5]], p90: [[0.9, 0, 1, 1]], mac10: [[0.62, 0, 1, 0.6]], nova: [[0.5, 0, 1, 0.45]],
  negev: [[0.78, 0, 1, 1]], karambit: [[0, 0, 0.32, 1]], butterfly: [[0.42, 0, 1, 1]],
  bayonet: [[0, 0, 0.36, 1]], bowie: [[0, 0, 0.36, 1]], stiletto: [[0, 0, 0.36, 1]],
};
const maskCache = new Map<string, THREE.Texture>();
function paintMask(realKey: string): THREE.Texture {
  const hit = maskCache.get(realKey);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128);
  g.filter = 'blur(3px)';
  g.fillStyle = '#000';
  for (const [u0, v0, u1, v1] of NO_PAINT[realKey] ?? []) g.fillRect(u0 * 256, v0 * 128, (u1 - u0) * 256, (v1 - v0) * 128);
  const t = new THREE.CanvasTexture(c); t.flipY = false;
  maskCache.set(realKey, t);
  return t;
}


// Скин на реальной модели: боковая проекция по рамке модели, смешивается с родной текстурой (детали сохраняются)
const texLoader = new THREE.TextureLoader();
const detailCache = new Map<string, THREE.Texture>();
function detailTex(name: string, color = false): THREE.Texture {
  let t = detailCache.get(name);
  if (!t) {
    t = texLoader.load(((import.meta as any).env?.BASE_URL ?? './') + 'tex/' + name);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    detailCache.set(name, t);
  }
  return t;
}
const hexColor = (h: string) => new THREE.Color(h).convertSRGBToLinear();

const wearCache = new Map<number, THREE.Texture>();
function wearTex(seed: number) {
  let t = wearCache.get(seed);
  if (!t) { t = new THREE.CanvasTexture(wearMap(seed, 256, 128)); t.flipY = false; wearCache.set(seed, t); }
  return t;
}

function skinnedMaterial(orig: THREE.MeshStandardMaterial, skin: THREE.Texture, mask: THREE.Texture, box: THREE.Box3, float: number, style: string, wearSeed: number, scheme?: Finish['scheme'], glove = false): THREE.Material {
  const kind = FINISH_KIND[style] ?? 0.4; // 0 мат … 1 металлик
  const m = new THREE.MeshPhysicalMaterial({
    map: orig.map ?? null, normalMap: orig.normalMap ?? null, normalScale: orig.normalScale?.clone(),
    roughnessMap: orig.roughnessMap ?? null, metalnessMap: orig.metalnessMap ?? null, aoMap: orig.aoMap ?? null,
    color: orig.color?.clone() ?? new THREE.Color(1, 1, 1),
    metalness: 0.15 + kind * 0.7, roughness: Math.min(1, 0.55 - kind * 0.35 + float * 0.25),
    clearcoat: kind > 0.3 ? 0.6 + (1 - float) * 0.4 : 0.1, clearcoatRoughness: 0.08 + float * 0.3,
    iridescence: style === 'hologram' ? 0.9 : 0, iridescenceIOR: 1.6,
  });
  const uMin = { value: new THREE.Vector2(box.min.x, box.min.y) };
  const uSize = { value: new THREE.Vector2(box.max.x - box.min.x, box.max.y - box.min.y) };
  const uFloat = { value: float };
  const uKind = { value: kind };
  const sc = scheme ?? { sec: '#121316', acc: '#3a3f48', secKind: 0, accKind: 2 };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uSkin: { value: skin }, uMask: { value: mask }, uWear: { value: wearTex(wearSeed) }, uMin, uSize, uFloat, uKind,
      uSec: { value: hexColor(sc.sec) }, uAcc: { value: hexColor(sc.acc) }, uSecKind: { value: sc.secKind }, uAccKind: { value: sc.accKind },
      uDetR: { value: detailTex('metal_plate_rough.jpg') }, uLeather: { value: detailTex('brown_leather_diff.jpg', true) }, uGlove: { value: glove ? 1 : 0 }, uPerPart: { value: PER_PART.has(style) ? 1 : 0 } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSkinUv;\nvarying float vRole;\nvarying float vPart;\nattribute vec4 aPart;\nuniform vec2 uMin; uniform vec2 uSize;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinUv = vec2((position.x - uMin.x) / uSize.x, 1.0 - (position.y - uMin.y) / uSize.y);\nvRole = floor(pow(aPart.r, 1.0 / 2.2) * 3.0 + 0.5); // цвет вершин экспортирован в линейном пространстве\nvPart = aPart.g;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSkinUv;\nuniform sampler2D uSkin; uniform sampler2D uMask; uniform sampler2D uWear; uniform float uFloat; uniform float uKind;\nuniform vec3 uSec; uniform vec3 uAcc; uniform float uSecKind; uniform float uAccKind; uniform sampler2D uDetR; uniform sampler2D uLeather; uniform float uGlove; uniform float uPerPart;\nvarying float vRole; varying float vPart;\nfloat gPaint; float gWorn; float gRoleMetal; float gRoleRough; float gDet;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        // узорные стили: у каждой детали свой сдвиг рисунка (как будто красили отдельно)
        vec2 suv = vSkinUv;
        if (uPerPart > 0.5) suv = fract(vSkinUv * 0.8 + vec2(fract(vPart * 37.13), fract(vPart * 19.71)));
        vec3 sk = texture2D(uSkin, suv).rgb;
        gPaint = texture2D(uMask, vSkinUv).r;
        // износ: где карта износа ниже порога — краска стёрта до металла
        float w = texture2D(uWear, vSkinUv * vec2(3.0, 2.0)).r;
        gWorn = gPaint * (1.0 - smoothstep(uFloat * 0.75 - 0.04, uFloat * 0.75 + 0.02, w));
        // микрофактура (CC0, Poly Haven): царапанный металл под краской, кожа у перчаток
        gDet = texture2D(uDetR, vSkinUv * vec2(6.0, 2.5)).r;
        float det = 0.88 + 0.24 * gDet;
        if (uGlove > 0.5) det *= 0.7 + 0.6 * dot(texture2D(uLeather, vSkinUv * vec2(3.0, 3.0)).rgb, vec3(0.333));
        // цвет по роли части: 0 рисунок, 1 второй цвет, 2 акцент, 3 металл
        vec3 roleCol = sk; gRoleMetal = -1.0; gRoleRough = -1.0;
        if (vRole > 0.5 && vRole < 1.5) { roleCol = uSec; gRoleMetal = uSecKind > 1.5 ? 0.9 : 0.1; gRoleRough = uSecKind > 0.5 ? 0.22 : 0.7; }
        else if (vRole > 1.5 && vRole < 2.5) { roleCol = uAcc; gRoleMetal = uAccKind > 1.5 ? 1.0 : 0.2; gRoleRough = uAccKind > 1.5 ? 0.18 : 0.35; }
        else if (vRole > 2.5) { roleCol = vec3(0.35, 0.37, 0.4); gRoleMetal = 0.95; gRoleRough = 0.3; }
        // детали модели как «высокие частоты»: цвет не темнеет от чёрной базы
        vec3 painted = roleCol * det * clamp(0.92 + 1.5 * (lum - 0.18), 0.55, 1.25);
        vec3 metal = vec3(0.58, 0.6, 0.63) * (0.7 + lum);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(painted, metal, gWorn), gPaint);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        float mf = gRoleMetal >= 0.0 ? gRoleMetal : metalnessFactor;
        metalnessFactor = mix(0.85, mix(mf, 0.95, gWorn), gPaint);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float rf = (gRoleRough >= 0.0 ? gRoleRough : roughnessFactor) * (0.8 + 0.4 * gDet);
        roughnessFactor = mix(0.32, mix(rf, 0.4, gWorn), gPaint);`);
  };
  m.customProgramCacheKey = () => 'skin4';
  return m;
}

const realKeyOf = (art: string) => REAL[art] ?? art;

export async function buildModel(model: WeaponModel, finish: Finish, o: ModelOpts = {}): Promise<THREE.Group> {
  const realKey = REAL[model.art];
  if (realKey) {
    const real = await loadGlb('real/' + realKey);
    if (real) return buildReal(real, model.art, finish, o);
  }
  const key = model.art in ARTS ? model.art : model.kind === 'gloves' ? 'gloves' : 'ak';
  const art = ARTS[key];
  const f: Finish = o.phase && PHASE_PALETTES[o.phase] ? { ...finish, colors: PHASE_PALETTES[o.phase] } : finish;
  const float = o.float ?? 0.08;
  const tex = await skinTexture(art, f, float, o.wearSeed ?? String(finish.seed));
  const g = new THREE.Group();
  const glb = await loadGlb(key);
  if (glb) {
    // UV из Blender уже нормированы в рамку чертежа
    const c = glb.clone(true);
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = matOfName(o.name || (o.material as THREE.Material)?.name || '');
        o.material = material(m, m === 'paint' ? tex : null, float);
      }
    });
    g.add(c);
  } else {
    // запасной вариант: выдавливание, UV = координаты чертежа
    const [vx, vy, vw, vh] = art.vb;
    const t2 = tex.clone(); t2.needsUpdate = true;
    t2.repeat.set(1 / vw, 1 / vh); t2.offset.set(-vx / vw, -vy / vh);
    for (const p of geometryFor(key, art)) g.add(new THREE.Mesh(p.geo, material(p.m, p.m === 'paint' ? t2 : null, float)));
  }
  // центр модели в начало координат
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  g.position.sub(c);
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData.size = box.getSize(new THREE.Vector3());
  return wrap;
}

async function buildReal(src: THREE.Object3D, key: string, finish: Finish, o: ModelOpts): Promise<THREE.Group> {
  const art = ARTS[key] ?? ARTS.gloves;
  const f: Finish = o.phase && PHASE_PALETTES[o.phase] ? { ...finish, colors: PHASE_PALETTES[o.phase] } : finish;
  const float = o.float ?? 0.08;
  const tex = await skinTexture(art, f, float, o.wearSeed ?? String(finish.seed));
  const c = src.clone(true);
  c.updateMatrixWorld(true);
  // общая рамка всех частей (после Blender модель — один объект, части в одном пространстве)
  const bb = new THREE.Box3();
  c.traverse((m) => { if (m instanceof THREE.Mesh) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox!); } });
  c.traverse((m) => {
    if (m instanceof THREE.Mesh) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const mask = paintMask(realKeyOf(key));
      const col = m.geometry.getAttribute('color');
      if (col && !m.geometry.getAttribute('aPart')) m.geometry.setAttribute('aPart', col);
      if (!m.geometry.getAttribute('aPart')) m.geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(m.geometry.getAttribute('position').count * 4), 4));
      const ws = Math.abs(Number.parseInt(String(o.wearSeed ?? finish.seed).replace(/\D/g, '').slice(0, 8) || '1', 10)) || finish.seed;
      const out = mats.map((mm) => skinnedMaterial(mm as THREE.MeshStandardMaterial, tex, mask, bb, float, f.style, ws, f.scheme, key.startsWith('gloves')));
      m.material = Array.isArray(m.material) ? out : out[0];
    }
  });
  const g = new THREE.Group();
  g.add(c);
  const box = new THREE.Box3().setFromObject(g);
  g.position.sub(box.getCenter(new THREE.Vector3()));
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData.size = box.getSize(new THREE.Vector3());
  return wrap;
}

// ——— сцена ———
export function makeStage(canvas?: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !canvas });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.02).texture;
  scene.environmentIntensity = 1.25;
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ec3ff, 1.1); rim.position.set(3, 1, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe2c4, 0.5); fill.position.set(2, -2, 3); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(20, 2, 1, 5000);
  return { renderer, scene, camera };
}

export function frame(camera: THREE.PerspectiveCamera, size: THREE.Vector3, aspect: number, margin = 1.12) {
  camera.aspect = aspect;
  const fov = (camera.fov * Math.PI) / 180;
  const h = Math.max(size.y, size.x / aspect) * margin;
  const dist = h / 2 / Math.tan(fov / 2) + size.z;
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  camera.near = dist / 10; camera.far = dist * 10;
  camera.updateProjectionMatrix();
}

// Поза для превью: лёгкий поворот, чтобы было видно объём
export const THUMB_POSE = { y: -0.24, x: 0.12, z: 0.0 };

// ——— превью-картинки (очередь, один контекст) ———
let stage: ReturnType<typeof makeStage> | null = null;
let failed = false;
let chain: Promise<unknown> = Promise.resolve();
const thumbCache = new Map<string, Promise<string | null>>();
const TW = 480, TH = 240;

export function thumbKey(model: WeaponModel, finish: Finish, o: ModelOpts) {
  const fb = Math.round((o.float ?? 0.08) * 10);
  return `${model.id}|${finish.style}|${finish.colors.join()}|${finish.seed}|${o.phase ?? ''}|${fb}|${fb >= 3 ? o.wearSeed ?? '' : ''}`;
}

export function renderThumb(model: WeaponModel, finish: Finish, o: ModelOpts = {}): Promise<string | null> {
  if (failed) return Promise.resolve(null);
  const k = thumbKey(model, finish, o);
  const hit = thumbCache.get(k);
  if (hit) return hit;
  const job = chain.then(async () => {
    try {
      if (!stage) {
        const c = document.createElement('canvas');
        c.width = TW; c.height = TH;
        stage = makeStage(c);
        stage.renderer.setSize(TW, TH, false);
      }
      const m = await buildModel(model, finish, o);
      m.rotation.set(THUMB_POSE.x, THUMB_POSE.y, THUMB_POSE.z);
      const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
      stage.scene.add(m);
      frame(stage.camera, size, TW / TH, 0.98);
      stage.renderer.render(stage.scene, stage.camera);
      const url = stage.renderer.domElement.toDataURL('image/webp', 0.9);
      stage.scene.remove(m);
      m.traverse((o2) => { if (o2 instanceof THREE.Mesh) (o2.material as THREE.Material).dispose(); });
      return url;
    } catch (e) {
      console.warn('3D недоступно, остаёмся на 2D', e);
      failed = true;
      return null;
    }
  });
  chain = job;
  thumbCache.set(k, job);
  return job;
}

export const webglOk = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();
