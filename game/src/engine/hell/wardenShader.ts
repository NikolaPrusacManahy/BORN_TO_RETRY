// Update 0.3.65 — what Hellwarden's body can do that its texture can't (the designer's shot list; sim/dungeon/wardenShow.ts). One program for all of
// it, so nothing compiles mid-show: bare and molten, a black crust split by glowing seams (`uMolten`: per region of its body, its skin, boots and
// gauntlets being one mesh); armor red hot as it clamps on, cooling (`uHot`); its sword dull grey till the heat comes along it (`uBlade`, `uHeat`);
// its eye sockets dark till they ignite (`uEye`: its left, its right); its mask cracked (`uCrack`); an orange rim and lava's light from under it,
// so it stands out from the sky (`uRim`). Its hit flash too, which its emissive map would otherwise black out.
import * as THREE from 'three';

export interface WardenUniforms {
  uMolten: { value: THREE.Vector3 };
  uHot: { value: THREE.Vector3 };
  uEye: { value: THREE.Vector2 };
  uEyes: { value: number };
  uCrack: { value: number };
  uBlade: { value: number };
  uHeat: { value: number };
  uBladeFrom: { value: THREE.Vector3 };
  uBladeDir: { value: THREE.Vector3 };
  uBladeLen: { value: number };
  uRim: { value: number };
  uTime: { value: number };
}

export const createWardenUniforms = (): WardenUniforms => ({
  uMolten: { value: new THREE.Vector3() },
  uHot: { value: new THREE.Vector3() },
  uEye: { value: new THREE.Vector2(1, 0) },
  uEyes: { value: 0 },
  uCrack: { value: 0 },
  uBlade: { value: 0 },
  uHeat: { value: 2 },
  uBladeFrom: { value: new THREE.Vector3() },
  uBladeDir: { value: new THREE.Vector3(0, 0, 1) },
  uBladeLen: { value: 1 },
  uRim: { value: 0.55 },
  uTime: { value: 0 },
});

const HEADER_V = /* glsl */ `
attribute float aRegion;
varying vec3 vWObj;
varying float vWRegion;
`;

const HEADER_F = /* glsl */ `
uniform vec3 uMolten;
uniform vec3 uHot;
uniform vec2 uEye;
uniform float uEyes;
uniform float uCrack;
uniform float uBlade;
uniform float uHeat;
uniform vec3 uBladeFrom;
uniform vec3 uBladeDir;
uniform float uBladeLen;
uniform float uRim;
uniform float uTime;
varying vec3 vWObj;
varying float vWRegion;
float wHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float wNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wHash(i), wHash(i + vec3(1, 0, 0)), f.x), mix(wHash(i + vec3(0, 1, 0)), wHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(wHash(i + vec3(0, 0, 1)), wHash(i + vec3(1, 0, 1)), f.x), mix(wHash(i + vec3(0, 1, 1)), wHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float wSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// The crack down its mask, through its right eye (bind-pose metres on its face).
float wMaskCrack(vec2 p) {
  float d = wSeg(p, vec2(-0.012, 2.17), vec2(-0.034, 2.128));
  d = min(d, wSeg(p, vec2(-0.034, 2.128), vec2(-0.05, 2.066)));
  d = min(d, wSeg(p, vec2(-0.05, 2.066), vec2(-0.03, 2.02)));
  d = min(d, wSeg(p, vec2(-0.03, 2.02), vec2(-0.062, 1.97)));
  d = min(d, wSeg(p, vec2(-0.034, 2.128), vec2(-0.09, 2.1)));
  d = min(d, wSeg(p, vec2(-0.03, 2.02), vec2(0.008, 1.996)));
  return d;
}
`;

const AFTER_MAP = /* glsl */ `
  float wRegion = vWRegion + 0.5;
  float wMolten = wRegion < 1.0 ? uMolten.x : wRegion < 2.0 ? uMolten.y : uMolten.z;
  float wHot = wRegion < 1.0 ? uHot.x : wRegion < 2.0 ? uHot.y : uHot.z;
  vec3 wAlbedo = diffuseColor.rgb;
  // Its sword: grey till the heat reaches this part of it.
  float wFire = 0.0;
  float wFront = 0.0;
  if (uBlade > 0.5) {
    float along = dot(vWObj - uBladeFrom, uBladeDir) / uBladeLen;
    float lit = 1.0 - smoothstep(uHeat - 0.015, uHeat + 0.015, along);
    float painted = clamp((wAlbedo.r - wAlbedo.b) * 3.0 - 0.25, 0.0, 1.0);
    diffuseColor.rgb = mix(vec3(dot(wAlbedo, vec3(0.3, 0.59, 0.11))) * 0.62, wAlbedo, lit);
    wFire = painted * lit;
    wFront = painted * (1.0 - smoothstep(0.0, 0.08, abs(along - uHeat))) * step(uHeat, 1.5);
  }
  // Its eyes (the patch of the texture only they use).
  vec2 wUv = vec2(0.0);
  #ifdef USE_MAP
    wUv = vMapUv;
  #endif
  float wEyePatch = step(0.945, wUv.x) * step(0.945, wUv.y) * uEyes;
  float wEyeLit = vWObj.x > 0.0 ? uEye.x : uEye.y;
  if (wEyePatch > 0.5) diffuseColor.rgb = mix(vec3(0.015), wAlbedo, min(1.0, wEyeLit));
  // Bare: a crust black as slag, split by seams of lava.
  float wN = wNoise(vWObj * 13.0 + vec3(0.0, uTime * 0.12, 0.0)) * 0.65 + wNoise(vWObj * 31.0 - vec3(0.0, uTime * 0.2, 0.0)) * 0.35;
  float wSeam = 1.0 - smoothstep(0.015, 0.11, abs(wN - 0.5));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.022, 0.016), wMolten);
`;

const AFTER_EMISSIVE = /* glsl */ `
  totalEmissiveRadiance += emissive * 0.5;
  // Its seams, hottest low down where the lava's just left it; the rest of its skin dull red.
  float wLow = 1.0 - smoothstep(0.0, 2.2, vWObj.y);
  totalEmissiveRadiance += wMolten * mix(vec3(0.42, 0.055, 0.012), vec3(2.6, 0.95, 0.16), wSeam) * (0.75 + 0.5 * wLow);
  totalEmissiveRadiance += wHot * vec3(1.9, 0.62, 0.12);
  totalEmissiveRadiance += wFire * vec3(1.5, 0.42, 0.06) + wFront * vec3(3.2, 2.0, 0.9);
  totalEmissiveRadiance += wEyePatch * wEyeLit * vec3(2.4, 2.3, 2.0);
  if (uCrack > 0.0 && wEyePatch < 0.5) {
    float wC = wMaskCrack(vWObj.xy);
    totalEmissiveRadiance += uCrack * (1.0 - smoothstep(0.002, 0.009, wC)) * vec3(2.4, 0.8, 0.14);
    diffuseColor.rgb *= 1.0 - uCrack * (1.0 - smoothstep(0.006, 0.016, wC)) * 0.8;
  }
  // An orange rim, and the lava's light from under it.
  float wRimK = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
  float wUp = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
  totalEmissiveRadiance += uRim * (wRimK * 0.85 + pow(clamp(0.5 - 0.5 * wUp, 0.0, 1.0), 2.0) * 0.3) * vec3(1.0, 0.36, 0.09);
`;

/** Patches `mat` in place (a body's flash still reaches it); `u` its uniforms. */
export function wardenPatch(mat: THREE.MeshStandardMaterial, u: WardenUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${HEADER_V}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWObj = position;\nvWRegion = aRegion;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEADER_F}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${AFTER_MAP}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${AFTER_EMISSIVE}`);
  };
  mat.customProgramCacheKey = () => 'warden';
  mat.needsUpdate = true;
}

/** Update 0.3.65 — (for the render tool, which has no shaders): the colour a vertex would show, and how much of it glows. */
export function wardenTint(u: WardenUniforms, region: number, along: number, into: THREE.Color): number {
  const molten = region === 0 ? u.uMolten.value.x : region === 1 ? u.uMolten.value.y : u.uMolten.value.z;
  const hot = region === 0 ? u.uHot.value.x : region === 1 ? u.uHot.value.y : u.uHot.value.z;
  if (u.uBlade.value > 0.5 && along > u.uHeat.value) {
    const l = into.r * 0.3 + into.g * 0.59 + into.b * 0.11;
    into.setRGB(l * 0.62, l * 0.62, l * 0.62);
  }
  into.r += (0.75 - into.r) * molten;
  into.g += (0.14 - into.g) * molten;
  into.b += (0.04 - into.b) * molten;
  into.r += hot * 0.8;
  into.g += hot * 0.28;
  return Math.max(molten, hot);
}
