// Update 0.2.11 — floor 6 under water: a patch on the kit's materials (DungeonView) that lays the caustics over them,
// the net of sunlight the water's surface throws down, dancing (brightest on what faces up, faint on walls, under the
// haze like the rest), and sways the seaweed from its root (the higher, the more).
import type * as THREE from 'three';

const COMMON = /* glsl */ `
uniform float uSeaTime;
uniform float uSeaCaustic;
uniform float uSeaSway;
varying vec3 vSeaPos;
varying float vSeaUp;
`;

const CAUSTIC = /* glsl */ `
float seaRidge(vec2 q) { return 1.0 - abs(sin(q.x + 0.8 * sin(q.y * 0.7))); }
float seaCaustic(vec2 p, float t) {
  vec2 a = p * 0.55 + vec2(t * 0.21, t * 0.13);
  vec2 b = mat2(0.6, -0.8, 0.8, 0.6) * p * 0.7 + vec2(-t * 0.17, t * 0.19);
  float r = max(seaRidge(a), seaRidge(b.yx + 1.7));
  return pow(r, 6.0);
}
`;

const SWAY = /* glsl */ `
#ifdef SEA_SWAY
  vec3 seaRoot = vec3(0.0);
  #ifdef USE_INSTANCING
  seaRoot = instanceMatrix[3].xyz;
  #endif
  float seaK = max(0.0, transformed.y);
  float seaPh = uSeaTime * 1.3 + seaRoot.x * 0.37 + seaRoot.z * 0.29;
  transformed.x += sin(seaPh) * seaK * seaK * 0.12 * uSeaSway;
  transformed.z += cos(seaPh * 0.8) * seaK * seaK * 0.08 * uSeaSway;
#endif
`;

const WORLD = /* glsl */ `
vec4 seaWorld = vec4(transformed, 1.0);
vec3 seaN = objectNormal;
#ifdef USE_INSTANCING
seaWorld = instanceMatrix * seaWorld;
seaN = mat3(instanceMatrix) * seaN;
#endif
seaWorld = modelMatrix * seaWorld;
vSeaPos = seaWorld.xyz;
vSeaUp = normalize(mat3(modelMatrix) * seaN).y;
`;

const LIGHT = /* glsl */ `
float seaFace = 0.2 + 0.8 * smoothstep(0.1, 0.8, vSeaUp);
float seaC = seaCaustic(vSeaPos.xz + vec2(vSeaPos.y * 0.7), uSeaTime) * seaFace * uSeaCaustic;
outgoingLight += (diffuseColor.rgb * 0.7 + 0.06) * seaC;
`;

export interface SeaUniforms {
  uSeaTime: { value: number };
  uSeaCaustic: { value: number };
  uSeaSway: { value: number };
}

/** Patches `mat` (a lit standard material) with the caustics, and the sway if `sway` (seaweed). The uniforms are
 *  shared: one update moves every patched material. */
export function seaPatch(mat: THREE.Material, uniforms: SeaUniforms, sway: boolean) {
  if (sway) mat.defines = { ...mat.defines, SEA_SWAY: '' };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = COMMON + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWAY).replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLD);
    shader.fragmentShader = COMMON + CAUSTIC + shader.fragmentShader.replace('#include <opaque_fragment>', LIGHT + '#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => (sway ? 'sea-sway' : 'sea');
  mat.needsUpdate = true;
}
