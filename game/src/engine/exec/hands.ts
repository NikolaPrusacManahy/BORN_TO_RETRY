// Update 0.1.2 — an execution's hands worked out each frame (handMoves.ts): for each hand, the two keys it's between,
// each turned into a pose's target in the world (where it is, and the way its line, knuckles or palm go), and how far
// between them it is. Points on the body come from its bones as they're drawn (bones.ts); once it's let go (or dead),
// the hands keep where it last was instead of chasing it.
import * as THREE from 'three';
import type { Execution } from '../../sim/combat/execution';
import type { Side } from '../viewmodel/guard';
import type { HandAt, HandKey, HandMode } from './handMoves';
import { boneOf } from './bones';

/** One side of a hand's blend: how it is, where (world), the way (world, length 1), how far along its rope (arms' own
 *  view, m). */
export interface HandSub {
  mode: HandMode;
  at: THREE.Vector3;
  way: THREE.Vector3;
  slide: number;
}
export interface HandTarget {
  a: HandSub;
  b: HandSub;
  /** 0 … 1: from `a` to `b`. */
  u: number;
}

/** The body as drawn this frame: its root, and the line it's held by (its end, the way it runs: world). */
export interface Drawn {
  root: THREE.Object3D | null;
  tip: THREE.Vector3;
  line: THREE.Vector3;
}

/** A tail-like grip is held this far in from its end (m), so its end shows. */
const TIP = 0.08;

const sub = (): HandSub => ({ mode: 'guard', at: new THREE.Vector3(), way: new THREE.Vector3(0, 0, -1), slide: 0 });
export const handTargets = (): Record<Side, HandTarget> => ({ L: { a: sub(), b: sub(), u: 0 }, R: { a: sub(), b: sub(), u: 0 } });

const R = new THREE.Vector3();
const F = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const camRight = new THREE.Vector3();
const camUp = new THREE.Vector3();
const camBack = new THREE.Vector3();
const v = new THREE.Vector3();

/** Where each key's hands were last worked out while it was held (per key list: for after it's let go). */
const kept = new Map<readonly HandKey[], { at: THREE.Vector3[]; way: THREE.Vector3[]; ok: boolean[] }>();

/** A new execution: nothing kept yet. */
export function resetHands() {
  for (const k of kept.values()) k.ok.fill(false);
}

/** Both hands at `t` s into `keys` (`held`: the body is still in your hands). Returns false once they're done. */
export function handsAt(keys: readonly HandKey[] | undefined, t: number, ex: Execution, held: boolean, drawn: Drawn, camera: THREE.Camera, out: Record<Side, HandTarget>): boolean {
  if (!keys || t >= keys[keys.length - 1].t) {
    out.L.a.mode = out.L.b.mode = out.R.a.mode = out.R.b.mode = 'guard';
    return false;
  }
  let store = kept.get(keys);
  if (!store) {
    store = { at: keys.flatMap(() => [new THREE.Vector3(), new THREE.Vector3()]), way: keys.flatMap(() => [new THREE.Vector3(), new THREE.Vector3()]), ok: keys.flatMap(() => [false, false]) };
    kept.set(keys, store);
  }
  F.set(-Math.sin(ex.yaw), 0, -Math.cos(ex.yaw));
  R.set(Math.cos(ex.yaw), 0, -Math.sin(ex.yaw));
  camera.updateMatrixWorld();
  camRight.setFromMatrixColumn(camera.matrixWorld, 0);
  camUp.setFromMatrixColumn(camera.matrixWorld, 1);
  camBack.setFromMatrixColumn(camera.matrixWorld, 2);
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  const w = Math.max(0, Math.min(1, (t - keys[i].t) / (keys[i + 1].t - keys[i].t)));
  for (const side of ['L', 'R'] as const) {
    resolve(keys[i][side], i * 2 + (side === 'L' ? 0 : 1), side, t, ex, held, drawn, camera, store, out[side].a);
    resolve(keys[i + 1][side], (i + 1) * 2 + (side === 'L' ? 0 : 1), side, t, ex, held, drawn, camera, store, out[side].b);
    out[side].u = w * w * (3 - 2 * w);
  }
  return true;
}

/** The bone is in a piece that's come off (folded away: it's where it was). */
function folded(root: THREE.Object3D, name: string | undefined): boolean {
  for (let b = name && name !== '@grip' ? boneOf(root, name) : null; b && b !== root; b = b.parent) if (b.scale.x < 0.01) return true;
  return false;
}

function resolve(h: HandAt, slot: number, side: Side, t: number, ex: Execution, held: boolean, drawn: Drawn, camera: THREE.Camera, store: { at: THREE.Vector3[]; way: THREE.Vector3[]; ok: boolean[] }, out: HandSub) {
  out.mode = h.mode;
  out.slide = h.slide ?? 0;
  if (h.mode === 'guard') return;
  const onBody = !!h.on || (!!h.to && !h.way);
  if (onBody && (!held || !drawn.root || folded(drawn.root, h.on)) && store.ok[slot]) {
    out.at.copy(store.at[slot]);
    out.way.copy(store.way[slot]);
    return;
  }
  // Where.
  if (h.on === '@grip') out.at.copy(drawn.tip).addScaledVector(drawn.line, TIP);
  else if (h.on) {
    const bone = drawn.root ? boneOf(drawn.root, h.on) : null;
    if (bone) bone.getWorldPosition(out.at);
    else out.at.copy(ex.middle);
    const o = h.off;
    if (o) out.at.addScaledVector(camRight, o[0]).addScaledVector(camUp, o[1]).addScaledVector(camBack, o[2]);
  } else {
    const m = h.me ?? [0, 1.4, 0.4];
    out.at.copy(ex.origin).addScaledVector(R, m[0]).addScaledVector(UP, m[1]).addScaledVector(F, m[2]);
  }
  if (h.shake) out.at.addScaledVector(camRight, Math.sin(t * 63) * h.shake).addScaledVector(camUp, Math.sin(t * 79 + 1) * h.shake);
  // The way.
  if (h.way) out.way.set(0, 0, 0).addScaledVector(R, h.way[0]).addScaledVector(UP, h.way[1]).addScaledVector(F, h.way[2]).normalize();
  else if (h.to === '@grip') out.way.copy(drawn.line);
  else if (h.to) {
    const bone = drawn.root ? boneOf(drawn.root, h.to) : null;
    if (bone) out.way.copy(bone.getWorldPosition(v)).sub(out.at).normalize();
  } else if (h.mode === 'palm') out.way.copy(camRight).multiplyScalar(side === 'L' ? 1 : -1);
  else out.way.copy(out.at).sub(camera.getWorldPosition(v)).normalize();
  // Circling with what it whirls: towards it, round.
  if (h.whirl && h.to && drawn.root) {
    const bone = boneOf(drawn.root, h.to);
    if (bone) {
      v.copy(bone.getWorldPosition(v)).sub(out.at).setY(0);
      if (v.lengthSq() > 1e-6) out.at.addScaledVector(v.normalize(), h.whirl);
    }
  }
  if (onBody && held && drawn.root) {
    store.at[slot].copy(out.at);
    store.way[slot].copy(out.way);
    store.ok[slot] = true;
  }
}
