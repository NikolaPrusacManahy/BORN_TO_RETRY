// Update 0.3.53 — the Bone King's body as a place (the Boss Design Bible: "Its own body is a platform you climb"). Slammed
// down, its arm is a ramp from the floor up to its shoulder and a skull within reach; grown into its Colossus, the same arm
// reaches a walkway across its shoulders, with the glowing vertebra behind them. Where those are, as shares of its height:
// the rules use these, the physics takes the boxes (`boxes`, once `dirty`: engine/run.ts) and the view poses the model to
// them (engine/boss/kingPose.ts). What its other moves leave about: the hands it bursts from the floor, the cage. Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import { type ArenaBox, rampBetween } from '../../world/arena';
import type { Enemy } from './enemy';

/** Its body, shares of its height, its arm down: its shoulder up, out to its right, forward; its hand on the floor, forward,
 *  out to its right; how wide the walkway on its arm. */
export const SHOULDER_UP = 0.34;
export const SHOULDER_SIDE = 0.15;
export const SHOULDER_FORWARD = 0.08;
export const HAND_FORWARD = 0.62;
export const HAND_SIDE = 0.16;
const ARM_WIDE = 0.3;
/** The walkway across its shoulders, its Colossus's: wide, deep. */
const BACK_WIDE = 0.5;
const BACK_DEEP = 0.2;
/** Its shoulder's perch, its arm down in a slam (a share of its height). */
const PERCH = 0.26;
const THICK = 0.5;
/** Its vertebra: forward of its middle, and above the walkway; its radius (shares of its height). */
const SPINE_FORWARD = 0.01;
const SPINE_UP = 0.04;
const SPINE_R = 0.05;
/** The foot of its skull: standing, its arm down (shares of its height). */
const SKULL_STAND = 0.72;
const SKULL_LOW = 0.5;

export interface KingCage {
  /** Its ring is out: closing, or shut. */
  on: boolean;
  closed: boolean;
  /** You're shut in it. */
  trapped: boolean;
  x: number;
  z: number;
  /** Seconds since it closed. */
  t: number;
}

export interface KingBody {
  /** Its size now (times its height). */
  grow: number;
  /** What you can stand on of it now, and that those have changed. */
  boxes: ArenaBox[];
  dirty: boolean;
  /** Its arm is down (the view's pose; the skull's height). */
  armDown: boolean;
  /** The room's middle, where it stood first. */
  midX: number;
  midZ: number;
  midSet: boolean;
  /** Where its hands burst (or the dust is), and the seconds since they did (−1: not up). */
  spotX: number;
  spotZ: number;
  hands: number;
  cage: KingCage;
  /** Its shattered bones' first spoke (yaw). */
  spoke: number;
  /** Blows landed on its skull and spine since last counted (the feedback). */
  skullHit: number;
  spineHit: number;
}

export const createKingBody = (): KingBody => ({
  grow: 1,
  boxes: [],
  dirty: false,
  armDown: false,
  midX: 0,
  midZ: 0,
  midSet: false,
  spotX: 0,
  spotZ: 0,
  hands: -1,
  cage: { on: false, closed: false, trapped: false, x: 0, z: 0, t: 0 },
  spoke: 0,
  skullHit: 0,
  spineHit: 0,
});

/** Its height now (m). */
export const kingTall = (k: Enemy) => BONE_KING.v.kingHeight * (k.king?.grow ?? 1);

/** Its shoulder, its arm down (its right; its height `h`). */
export function shoulderAt(k: Enemy, h: number, out: Vector3): Vector3 {
  const fx = -Math.sin(k.facing);
  const fz = -Math.cos(k.facing);
  return out.set(k.pos.x + fx * SHOULDER_FORWARD * h - fz * SHOULDER_SIDE * h, k.pos.y + SHOULDER_UP * h, k.pos.z + fz * SHOULDER_FORWARD * h + fx * SHOULDER_SIDE * h);
}

/** Its hand on the floor, its arm down. */
export function handDownAt(k: Enemy, h: number, out: Vector3): Vector3 {
  const fx = -Math.sin(k.facing);
  const fz = -Math.cos(k.facing);
  return out.set(k.pos.x + fx * HAND_FORWARD * h - fz * HAND_SIDE * h, k.pos.y, k.pos.z + fz * HAND_FORWARD * h + fx * HAND_SIDE * h);
}

const s = new Vector3();
const a = new Vector3();
const end = new Vector3();

/** Where (x, z) is along its arm lying down: `along` 0 at its hand to 1 at its shoulder, `across` from its line (m). */
export function alongArm(k: Enemy, h: number, x: number, z: number, out: { along: number; across: number; wide: number; y: number }) {
  shoulderAt(k, h, s);
  handDownAt(k, h, a);
  const dx = s.x - a.x;
  const dz = s.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  out.along = ((x - a.x) * ux + (z - a.z) * uz) / len;
  out.across = Math.abs((x - a.x) * uz - (z - a.z) * ux);
  out.wide = (ARM_WIDE * h) / 2;
  // (Its ramp tops out at the edge of its perch.)
  out.y = k.pos.y + Math.max(0, Math.min(1, out.along / (1 - (PERCH * h) / 2 / len))) * (s.y - k.pos.y);
  return out;
}

const box = (x: number, y: number, z: number, w: number, d: number, yaw: number): ArenaBox => ({ x, y, z, w, h: THICK, d, kind: 'block', quat: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)] });

/** Its arm is a ramp now, to a perch on its shoulder (a slam) or a walkway across its shoulders (its Colossus). */
export function layArm(k: Enemy, colossus: boolean) {
  const b = k.king;
  if (!b) return;
  const h = kingTall(k);
  shoulderAt(k, h, s);
  handDownAt(k, h, a);
  const fx = -Math.sin(k.facing);
  const fz = -Math.cos(k.facing);
  const top = s.y - THICK / 2;
  // (It reaches what's at its top at that one's edge, level with it: no step up.)
  const run = Math.hypot(s.x - a.x, s.z - a.z) || 1;
  const edge = ((colossus ? BACK_DEEP : PERCH) * h) / 2;
  end.set(s.x - ((s.x - a.x) / run) * edge, s.y, s.z - ((s.z - a.z) / run) * edge);
  b.boxes = [rampBetween(a, end, ARM_WIDE * h, THICK)];
  if (colossus) b.boxes.push(box(k.pos.x + fx * SHOULDER_FORWARD * h, top, k.pos.z + fz * SHOULDER_FORWARD * h, BACK_WIDE * h, BACK_DEEP * h, k.facing));
  else b.boxes.push(box(s.x, top, s.z, PERCH * h, PERCH * h, k.facing));
  b.armDown = true;
  b.dirty = true;
}

/** Its arm's up: nothing of it to stand on. */
export function liftArm(k: Enemy) {
  const b = k.king;
  if (!b) return;
  b.armDown = false;
  if (b.boxes.length === 0) return;
  b.boxes = [];
  b.dirty = true;
}

/** The foot of its skull (m). */
export const skullY = (k: Enemy) => k.pos.y + kingTall(k) * (k.king?.armDown ? SKULL_LOW : SKULL_STAND);

/** Its vertebra's middle, through its Colossus. */
export function spineAt(k: Enemy, out: Vector3): Vector3 {
  const h = kingTall(k);
  return out.set(k.pos.x - Math.sin(k.facing) * SPINE_FORWARD * h, k.pos.y + (SHOULDER_UP + SPINE_UP) * h, k.pos.z - Math.cos(k.facing) * SPINE_FORWARD * h);
}

/** Its vertebra's radius (m). */
export const spineRadius = (k: Enemy) => SPINE_R * kingTall(k);

/** A blow from this high (m) comes from up on its body. */
export const spineFrom = (k: Enemy) => k.pos.y + (SHOULDER_UP * kingTall(k)) - 0.5;
