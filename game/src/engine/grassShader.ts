// Update 0.2.23 — floor 2's tall grass parts round whatever walks through it (the designer's Venom Garden: snakes hunt
// in it): a patch on the grass pieces' materials (DungeonView) that bends each blade away from the nearest bodies, the
// more the higher up the blade and the nearer the body, and a little down. The bodies are set each frame (pushGrass:
// you and the nearest enemies), shared by every patched material.
import * as THREE from 'three';
import type { Enemy } from '../sim/enemies/enemy';
import { isLive, radiusOf } from '../sim/enemies/enemy';

/** Bodies that part the grass at once (you and the nearest enemies), how far past its body each reaches (m), how far
 *  a blade's tip is pushed at most (m), and how far from you an enemy may be to count (m). */
const PUSHERS = 8;
const REACH = 0.9;
const PUSH = 0.9;
const NEAR = 30;
/** A blade's height (m, its own, before it's scaled) that bends fully. */
const TIP = 1.1;

const uniforms = { uGrassPush: { value: Array.from({ length: PUSHERS }, () => new THREE.Vector4(1e5, 1e5, 1, 0)) } };

const COMMON = /* glsl */ `
uniform vec4 uGrassPush[${PUSHERS}];
`;

const PROJECT = /* glsl */ `
vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
#endif
float grassK = clamp(transformed.y / ${TIP.toFixed(2)}, 0.0, 1.0);
grassK *= grassK;
vec3 grassMove = vec3(0.0);
for (int i = 0; i < ${PUSHERS}; i++) {
  vec4 gp = uGrassPush[i];
  vec2 gd = mvPosition.xz - gp.xy;
  float gl = max(length(gd), 0.001);
  float gk = 1.0 - smoothstep(gp.z * 0.4, gp.z, gl);
  grassMove.xz += gd / gl * gk * gp.w;
  grassMove.y -= gk * gp.w * 0.45;
}
mvPosition.xyz += grassMove * grassK;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;

/** Patches `mat` (a tall grass piece's) to part. */
export function grassPatch(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = COMMON + shader.vertexShader.replace('#include <project_vertex>', PROJECT);
  };
  mat.customProgramCacheKey = () => 'grass-part';
  mat.needsUpdate = true;
}

const near: { e: Enemy; d: number }[] = [];

/** This frame's bodies: you (at `you`, your feet) and the nearest live enemies on the ground. */
export function pushGrass(enemies: readonly Enemy[], you: THREE.Vector3) {
  near.length = 0;
  for (const e of enemies) {
    if (!isLive(e) || e.pos.y > 1.5) continue;
    const d = Math.hypot(e.pos.x - you.x, e.pos.z - you.z);
    if (d < NEAR) near.push({ e, d });
  }
  near.sort((a, b) => a.d - b.d);
  const push = uniforms.uGrassPush.value;
  push[0].set(you.x, you.z, 0.4 + REACH, PUSH);
  for (let i = 1; i < PUSHERS; i++) {
    const n = near[i - 1];
    if (n) push[i].set(n.e.pos.x, n.e.pos.z, radiusOf(n.e) + REACH, PUSH);
    else push[i].set(1e5, 1e5, 1, 0);
  }
}
