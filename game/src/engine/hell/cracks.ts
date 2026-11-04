// Update 0.3.43 — Hell's stone cracked with seams of lava (MD/FLOOR10_HELL_PLAN.md: "basalt and obsidian, cracked with
// glowing seams of lava"): a patch on the walls' and paving's materials (the look's `cracks`) that adds a glow along
// cracks in the stone. The cracks are a map made in code once (cells' edges, as stone cracks: a coarse net and a fine
// one, and a slow blotch so some stretches are cracked through and some whole), laid on the world from above on
// floors and from the side on walls, so they run across the kit's pieces without seams. Hottest at the walls' feet,
// fading by 3.5 m up; on the paving, anywhere. They breathe slowly (`crackTime`, the view's clock); how bright, F1 →
// Hell → Lava in the stone (`crackGlow`). Two texture fetches a pixel, no lights: next to nothing.
import * as THREE from 'three';
import { HELL } from '../../tuning/hell';

/** The map's size (pixels) and how many of the coarse and fine cells across it; it covers this many metres. */
const SIZE = 256;
const COARSE = 5;
const FINE = 13;
export const CRACK_SPAN = 7;
/** Where the glow shows (smoothsteps over the map): along the coarse cracks and the fine (how bright those), where
 *  the blotch lets them (the fine ones in less of it); the blotch's map is the same map, larger and shifted. */
export const CRACK = { coarse: [0.78, 0.97], fine: [0.84, 0.98], fineK: 0.55, spot: [0.38, 0.66], fineSpot: [0.52, 0.82], maskScale: 0.31, maskShift: [0.37, 0.61] } as const;
const f = (x: number) => x.toFixed(3);

const uniforms = {
  uCrackMap: { value: null as THREE.Texture | null },
  uCrackColor: { value: new THREE.Color() },
  uCrackTime: { value: 0 },
};

/** The cracks' colour at full glow. */
const base = new THREE.Color();

/** The view's clock (s): the cracks breathe with it. */
export const crackTime = (t: number) => {
  uniforms.uCrackTime.value = t;
};

/** How brightly they glow (F1 → Hell → Lava in the stone). */
export const crackGlow = (k: number) => {
  uniforms.uCrackColor.value.copy(base).multiplyScalar(k);
};

let map: THREE.DataTexture | null = null;

/** A seeded hash of a cell (wrapped) to 0..1, two of them. */
const hash = (x: number, y: number, n: number, k: number) => {
  const xi = ((x % n) + n) % n;
  const yi = ((y % n) + n) % n;
  let h = (xi * 374761393 + yi * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** How far (u, v) (in cells, of `n` across) is from the nearest edge between two cells (0 on it). It wraps. */
function edge(u: number, v: number, n: number, k: number): number {
  const cx = Math.floor(u);
  const cy = Math.floor(v);
  let d1 = 1e9;
  let d2 = 1e9;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const px = cx + i + 0.15 + 0.7 * hash(cx + i, cy + j, n, k);
      const py = cy + j + 0.15 + 0.7 * hash(cx + i, cy + j, n, k + 7);
      const d = Math.hypot(px - u, py - v);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  return (d2 - d1) / 2;
}

/** Smooth noise that wraps (`n` cells across). */
function blotch(u: number, v: number, n: number): number {
  const x = Math.floor(u);
  const y = Math.floor(v);
  const fx = u - x;
  const fy = v - y;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x, y, n, 3);
  const b = hash(x + 1, y, n, 3);
  const c = hash(x, y + 1, n, 3);
  const d = hash(x + 1, y + 1, n, 3);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** The crack map, made once: red the coarse cracks, blue the fine, green the blotch (where they show). */
export function crackMap(): THREE.DataTexture {
  if (map) return map;
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const v = y / SIZE;
      // (A little wobble, so the edges aren't ruler-straight.)
      const wob = (blotch(u * 9, v * 9, 9) - 0.5) * 0.18;
      const coarse = 1 - Math.min(1, edge(u * COARSE + wob, v * COARSE - wob, COARSE, 1) / 0.12);
      const fine = 1 - Math.min(1, edge(u * FINE - wob, v * FINE + wob, FINE, 5) / 0.1);
      const spot = 0.6 * blotch(u * 3, v * 3, 3) + 0.4 * blotch(u * 6, v * 6, 6);
      data.set([Math.round(255 * coarse), Math.round(255 * spot), Math.round(255 * fine), 255], (y * SIZE + x) * 4);
    }
  map = new THREE.DataTexture(data, SIZE, SIZE);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

const VERT_COMMON = /* glsl */ `
varying vec3 vCrackW;
varying vec3 vCrackN;
`;

const VERT = /* glsl */ `
#include <project_vertex>
vec4 crackW = vec4(transformed, 1.0);
vec3 crackN = objectNormal;
#ifdef USE_INSTANCING
crackW = instanceMatrix * crackW;
crackN = mat3(instanceMatrix) * crackN;
#endif
vCrackW = (modelMatrix * crackW).xyz;
vCrackN = mat3(modelMatrix) * crackN;
`;

const FRAG_COMMON = /* glsl */ `
uniform sampler2D uCrackMap;
uniform vec3 uCrackColor;
uniform float uCrackTime;
varying vec3 vCrackW;
varying vec3 vCrackN;
`;

const FRAG = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 cn = abs(normalize(vCrackN));
  bool up = cn.y > 0.6;
  vec2 cuv = (up ? vCrackW.xz : (cn.x > cn.z ? vCrackW.zy : vCrackW.xy)) / ${CRACK_SPAN.toFixed(1)};
  vec4 cc = texture2D(uCrackMap, cuv);
  vec4 cm = texture2D(uCrackMap, cuv * ${f(CRACK.maskScale)} + vec2(${f(CRACK.maskShift[0])}, ${f(CRACK.maskShift[1])}));
  float ck = smoothstep(${f(CRACK.coarse[0])}, ${f(CRACK.coarse[1])}, cc.r) * smoothstep(${f(CRACK.spot[0])}, ${f(CRACK.spot[1])}, cm.g);
  ck += ${f(CRACK.fineK)} * smoothstep(${f(CRACK.fine[0])}, ${f(CRACK.fine[1])}, cc.b) * smoothstep(${f(CRACK.fineSpot[0])}, ${f(CRACK.fineSpot[1])}, cm.g);
  // (Hottest low down: the walls' feet and the paving; nothing on the walls' tops.)
  float cy = vCrackW.y;
  ck *= up ? 1.0 - smoothstep(1.0, 2.0, cy) : 1.0 - smoothstep(0.3, 3.5, cy);
  ck *= 0.75 + 0.25 * sin(uCrackTime * 1.3 + vCrackW.x * 0.21 + vCrackW.z * 0.17);
  totalEmissiveRadiance += uCrackColor * ck;
}
`;

/** Patches `mat` (a stone material of Hell's) to glow along its cracks in `color` (sRGB hex). */
export function crackPatch(mat: THREE.MeshStandardMaterial, color: number) {
  uniforms.uCrackMap.value = crackMap();
  base.setHex(color);
  crackGlow(HELL.v.cracks);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERT_COMMON + shader.vertexShader.replace('#include <project_vertex>', VERT);
    shader.fragmentShader = FRAG_COMMON + shader.fragmentShader.replace('#include <emissivemap_fragment>', FRAG);
  };
  mat.customProgramCacheKey = () => 'hell-cracks';
  mat.needsUpdate = true;
}

/** Is `mat` patched (for tests)? */
export const cracked = (mat: THREE.Material) => mat.customProgramCacheKey() === 'hell-cracks';
