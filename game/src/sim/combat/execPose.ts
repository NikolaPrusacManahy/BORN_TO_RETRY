// Update 0.1.2 — where an executed body is at a moment of its moves, and where you look (moved out of execution.ts):
// keys eased into and out of (into a slam it speeds up), laid out from where you stood and looked, or turned towards
// where it's thrown; held, its grip, its line and its middle; standing, where it's pulled; thrown, its arc. Pure.
import { Quaternion, Vector3 } from 'three';
import { EXECUTION } from '../../tuning/execution';
import type { Execution } from './execution';
import { BodyKey, heightOf, moveOf } from './execMoves';

/** The view is this far (s) ahead of the moves, so it's there as they are; it stays on each slam this long. */
const LOOK_LEAD = 0.06;
const LOOK_HOLD = 0.08;
const DEG = Math.PI / 180;

const UP = new Vector3(0, 1, 0);
const a = new Vector3();
const b = new Vector3();
const da = new Vector3();
const db = new Vector3();
const turn = new Quaternion();
const none = new Quaternion();
/** The frame's ways (`frame`'s, until the next call). */
export const R = new Vector3();
export const F = new Vector3();

const eased = (u: number, into: boolean, out: boolean) => (into && !out ? u * u : out && !into ? 1 - (1 - u) * (1 - u) : u * u * (3 - 2 * u));
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

/** The frame a key is laid out in: where you looked, turned `aim` of the way to where it's thrown (into R, F). */
export function frame(ex: Execution, k: BodyKey) {
  const yaw = ex.yaw + wrap(ex.aimYaw - ex.yaw) * (k.aim ?? 0);
  F.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  R.set(Math.cos(yaw), 0, -Math.sin(yaw));
  return yaw;
}

function local(ex: Execution, k: BodyKey, held: boolean, out: Vector3) {
  frame(ex, k);
  const g = k.grip;
  if (!g) return out.copy(held ? ex.start : ex.stand);
  return out.copy(ex.origin).addScaledVector(R, g[0]).addScaledVector(UP, g[1]).addScaledVector(F, g[2]);
}

function way(ex: Execution, k: BodyKey, out: Vector3) {
  frame(ex, k);
  const d = k.dir ?? [0, 1, 0];
  return out.set(0, 0, 0).addScaledVector(R, d[0]).addScaledVector(UP, d[1]).addScaledVector(F, d[2]).normalize();
}

/** Where the body is `t` s into the moves (at speed 1): `grip`, `dir`, `middle`; and where you look. */
export function pose(ex: Execution, t: number) {
  const move = moveOf(ex.kind);
  const height = heightOf(ex.kind);
  if (t >= move.endAt && ex.thrown) {
    // In flight: an arc from where you let go to where it lands, tumbling end over end.
    const k = Math.min(1, (t - move.endAt) / Math.max(0.05, ex.flight));
    ex.middle.lerpVectors(ex.from, ex.land, k);
    ex.middle.y += 4 * EXECUTION.v.throwHeight * (move.lob ?? 1) * k * (1 - k);
    const spin = k * Math.PI * 4;
    F.set(-Math.sin(ex.aimYaw), 0, -Math.cos(ex.aimYaw));
    ex.dir.copy(F).multiplyScalar(Math.cos(spin)).addScaledVector(UP, Math.sin(spin)).normalize();
    ex.grip.copy(ex.middle).addScaledVector(ex.dir, -height * move.half);
    return;
  }
  const keys = move.keys;
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const w = Math.max(0, Math.min(1, (t - k0.t) / (k1.t - k0.t)));
  const u = k1.glide ? w : eased(w, !!(k1.hit || k1.snap), !!(k0.hit || k0.snap));
  local(ex, k0, move.held, a);
  local(ex, k1, move.held, b);
  if (move.held) {
    ex.grip.lerpVectors(a, b, u);
    way(ex, k0, da);
    way(ex, k1, db);
    // Swung round at an even turn (a straight blend rushes through the middle of a big swing).
    turn.setFromUnitVectors(da, db);
    ex.dir.copy(da).applyQuaternion(none.identity().slerp(turn, u));
    ex.middle.copy(ex.grip).addScaledVector(ex.dir, height * move.half);
  } else {
    // Standing: where it's pulled, upright.
    ex.middle.lerpVectors(a, b, u);
    ex.middle.y = ex.stand.y + height / 2;
    ex.dir.copy(UP);
    ex.grip.copy(ex.middle);
  }
  // Where you look: eased from key to key, a little ahead, staying on each slam a moment.
  const tl = Math.min(move.endAt, t + LOOK_LEAD);
  let j = 0;
  while (j < keys.length - 2 && tl >= keys[j + 1].t) j++;
  const hold = keys[j].hit ? LOOK_HOLD : 0;
  const lw = Math.max(0, Math.min(1, (tl - keys[j].t - hold) / (keys[j + 1].t - keys[j].t - hold)));
  const s = lw * lw * (3 - 2 * lw);
  const l0 = keys[j].look;
  const l1 = keys[j + 1].look;
  const y0 = l0 ? frame(ex, keys[j]) + l0[0] * DEG : ex.yaw;
  const y1 = l1 ? frame(ex, keys[j + 1]) + l1[0] * DEG : ex.yaw;
  ex.lookYaw = y0 + wrap(y1 - y0) * s;
  ex.lookPitch = (l0 ? l0[1] * DEG : ex.pitch) * (1 - s) + (l1 ? l1[1] * DEG : ex.pitch) * s;
}
