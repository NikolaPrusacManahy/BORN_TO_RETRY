// Update 0.1.1 — executions (the designer: with the Execution Power meter full, E near an enemy, "the snake as an
// example: grab its tail, the POV camera follows, smack the body on the ground, then swing it onto the ground, throw it
// away, and it one-shots it"). The snake's: your hands seize its tail and lift it; overhead, then SLAM into the floor in
// front of you; swung up round your right, SLAM on your right; wound back, and thrown far ahead (short of a wall), where
// it dies, and what's beside it is hurt. Until you let go you can't be hurt and the world holds still; then it's yours
// again while the body flies. The meter empties. The moves are keyframes (`KEYS`), so the view and the tools draw the
// same thing; so is where you look (each slam seen on the floor, the throw straight ahead). Pure.
import { Quaternion, Vector3 } from 'three';
import { EXECUTION } from '../../tuning/execution';
import { FOES2 } from '../../tuning/foes2';
import { wallBetween } from '../../world/navGrid';
import { isLive, setPhase } from '../enemies/enemy';
import type { EnemyKind } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

/** The kinds you can execute (more to come). */
export const EXECUTABLE: readonly EnemyKind[] = ['snake'];

export interface Execution {
  /** On (from the grab until the body lands). */
  active: boolean;
  target: number;
  kind: EnemyKind;
  /** Seconds in (at Execution speed 1). */
  t: number;
  /** Where you stood and looked when it began: the moves are laid out from there. */
  origin: Vector3;
  yaw: number;
  pitch: number;
  /** The body: its tail in your hands (`grip`), the way it lies from there (tail → head, length 1), and its middle. */
  grip: Vector3;
  dir: Vector3;
  middle: Vector3;
  /** Where you look (the view is turned there while you hold it). */
  lookYaw: number;
  lookPitch: number;
  /** Where it stood and where its tail was as you grabbed it; the slams made so far; where it's thrown from and lands. */
  stand: Vector3;
  start: Vector3;
  slams: number;
  thrown: boolean;
  from: Vector3;
  land: Vector3;
}

export function createExecution(): Execution {
  const v = () => new Vector3();
  return { active: false, target: -1, kind: 'snake', t: 0, origin: v(), yaw: 0, pitch: 0, grip: v(), dir: v().set(0, 1, 0), middle: v(), lookYaw: 0, lookPitch: 0, stand: v(), start: v(), slams: 0, thrown: false, from: v(), land: v() };
}

/** A keyframe: its time (s), where your hands hold the tail and the way the body lies, each as (right, up, ahead) of
 *  where you stood; where you look (degrees: left of where you looked, above the horizon; null: where you looked);
 *  `hit`: the body slams into the floor here. */
interface Key {
  t: number;
  grip: [number, number, number] | null;
  dir: [number, number, number];
  look: [number, number] | null;
  hit?: boolean;
}

/** The snake's moves. (null grip: where its tail was.) Raised in front of you, so you see it come down; swung round on
 *  your right (the left hand holds the tail's end, so a body out to the left would cross your arms), never through your
 *  head. */
export const KEYS: readonly Key[] = [
  { t: 0, grip: null, dir: [0, 1, 0], look: null },
  { t: 0.22, grip: [0.25, 1.35, 0.9], dir: [0, -1, 0.15], look: [0, -12] },
  { t: 0.38, grip: [0.2, 1.8, 0.85], dir: [0.1, 0.95, 0.25], look: [0, 16] },
  { t: 0.5, grip: [0.15, 0.75, 1.0], dir: [0, -0.85, 0.53], look: [0, -32], hit: true },
  { t: 0.68, grip: [0.25, 1.65, 0.8], dir: [0.65, 0.55, 0.5], look: [-10, 4] },
  { t: 0.84, grip: [0.1, 1.8, 0.8], dir: [0.15, 0.95, 0.2], look: [0, 16] },
  { t: 1, grip: [0.35, 0.75, 0.9], dir: [0.61, -0.76, 0.2], look: [-12, -32], hit: true },
  { t: 1.15, grip: [0.35, 1.7, 0.45], dir: [0.75, 0.3, -0.6], look: [-18, 0] },
  { t: 1.3, grip: [0.2, 1.6, 1.15], dir: [0, 0.15, 1], look: [0, -3] },
];
const RELEASE = KEYS[KEYS.length - 1].t;
/** When the moves let go (s in, at speed 1). */
export const LET_GO_AT = RELEASE;
/** The body's middle from its tail (a share of the snake's size). */
export const HALF = 0.42;
/** The view is this far (s) ahead of the moves, so it's there as they are; it stays on each slam this long. */
const LOOK_LEAD = 0.06;
const LOOK_HOLD = 0.08;
const DEG = Math.PI / 180;

const R = new Vector3();
const F = new Vector3();
const UP = new Vector3(0, 1, 0);
const a = new Vector3();
const b = new Vector3();
const da = new Vector3();
const db = new Vector3();
const turn = new Quaternion();
const none = new Quaternion();

/** Seconds of your time an execution's moves take until you let go, and until the body lands. */
export const heldFor = () => RELEASE / Math.max(0.1, EXECUTION.v.speed);
export const lastsFor = () => heldFor() + EXECUTION.v.flight;

/** You're held in it (no moving, no fighting, nothing hurts you; the world holds still). */
export const execHeld = (ex: Execution) => ex.active && !ex.thrown;

/** The enemy you could execute now (−1: none): the meter full, an executable one in reach and in front of you. */
export function execTarget(state: CombatState, player: PlayerState, yaw: number): number {
  if (state.execution < 1 || state.exec.active || player.dead) return -1;
  const v = EXECUTION.v;
  let best = -1;
  let bestD = v.reach;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || !EXECUTABLE.includes(e.kind) || Math.abs(e.pos.y - player.pos.y) > 1.5) continue;
    const dx = e.pos.x - player.pos.x;
    const dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    const off = Math.abs(Math.atan2(Math.sin(Math.atan2(-dx, -dz) - yaw), Math.cos(Math.atan2(-dx, -dz) - yaw)));
    if (d > bestD || off > (v.targetArc * Math.PI) / 180) continue;
    best = i;
    bestD = d;
  }
  return best;
}

/** E: if an enemy can be executed, it starts (the meter empties). Returns true if it did. */
export function tryExecute(state: CombatState, player: PlayerState, yaw: number, pitch: number): boolean {
  const i = execTarget(state, player, yaw);
  if (i < 0) return false;
  const ex = state.exec;
  const e = state.enemies[i];
  ex.active = true;
  ex.target = i;
  ex.kind = e.kind;
  ex.t = 0;
  ex.slams = 0;
  ex.thrown = false;
  ex.origin.copy(player.pos);
  ex.yaw = yaw;
  ex.pitch = pitch;
  ex.stand.copy(e.pos);
  ex.start.copy(e.pos);
  ex.start.y += 0.1;
  state.execution = 0;
  setPhase(e, 'held');
  e.vel.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  player.invuln = Math.max(player.invuln, heldFor() + 0.2);
  pose(ex, 0);
  state.events.push('execGrab', i, ex.grip.x, ex.grip.y, ex.grip.z);
  return true;
}

const eased = (u: number, into: boolean, out: boolean) => (into && !out ? u * u : out && !into ? 1 - (1 - u) * (1 - u) : u * u * (3 - 2 * u));

/** Where the body is `t` s into the moves (at speed 1): `grip`, `dir`, `middle`. */
export function pose(ex: Execution, t: number) {
  F.set(-Math.sin(ex.yaw), 0, -Math.cos(ex.yaw));
  R.set(Math.cos(ex.yaw), 0, -Math.sin(ex.yaw));
  const half = FOES2.v.snakeHeight * HALF;
  if (t >= RELEASE && ex.thrown) {
    // In flight: an arc from where you let go to where it lands, tumbling end over end.
    const k = Math.min(1, (t - RELEASE) / Math.max(0.05, EXECUTION.v.flight * Math.max(0.1, EXECUTION.v.speed)));
    ex.middle.lerpVectors(ex.from, ex.land, k);
    ex.middle.y += 4 * EXECUTION.v.throwHeight * k * (1 - k);
    const spin = k * Math.PI * 4;
    ex.dir.copy(F).multiplyScalar(Math.cos(spin)).addScaledVector(UP, Math.sin(spin)).normalize();
    ex.grip.copy(ex.middle).addScaledVector(ex.dir, -half);
    return;
  }
  let i = 0;
  while (i < KEYS.length - 2 && t >= KEYS[i + 1].t) i++;
  const k0 = KEYS[i];
  const k1 = KEYS[i + 1];
  const u = eased(Math.max(0, Math.min(1, (t - k0.t) / (k1.t - k0.t))), !!k1.hit, !!k0.hit);
  local(ex, k0.grip, a);
  local(ex, k1.grip, b);
  ex.grip.lerpVectors(a, b, u);
  da.set(0, 0, 0).addScaledVector(R, k0.dir[0]).addScaledVector(UP, k0.dir[1]).addScaledVector(F, k0.dir[2]).normalize();
  db.set(0, 0, 0).addScaledVector(R, k1.dir[0]).addScaledVector(UP, k1.dir[1]).addScaledVector(F, k1.dir[2]).normalize();
  // Swung round at an even turn (a straight blend rushes through the middle of a big swing).
  turn.setFromUnitVectors(da, db);
  ex.dir.copy(da).applyQuaternion(none.identity().slerp(turn, u));
  ex.middle.copy(ex.grip).addScaledVector(ex.dir, half);
  // Where you look: eased from key to key, a little ahead, staying on each slam a moment.
  const tl = Math.min(RELEASE, t + LOOK_LEAD);
  let j = 0;
  while (j < KEYS.length - 2 && tl >= KEYS[j + 1].t) j++;
  const hold = KEYS[j].hit ? LOOK_HOLD : 0;
  const w = Math.max(0, Math.min(1, (tl - KEYS[j].t - hold) / (KEYS[j + 1].t - KEYS[j].t - hold)));
  const s = w * w * (3 - 2 * w);
  const l0 = KEYS[j].look;
  const l1 = KEYS[j + 1].look;
  ex.lookYaw = ex.yaw + ((l0 ? l0[0] * DEG : 0) * (1 - s) + (l1 ? l1[0] * DEG : 0) * s);
  ex.lookPitch = (l0 ? l0[1] * DEG : ex.pitch) * (1 - s) + (l1 ? l1[1] * DEG : ex.pitch) * s;
}

function local(ex: Execution, g: [number, number, number] | null, out: Vector3) {
  if (!g) return out.copy(ex.start);
  return out.copy(ex.origin).addScaledVector(R, g[0]).addScaledVector(UP, g[1]).addScaledVector(F, g[2]);
}

/** One tick: the moves go on; each slam into the floor jolts (a freeze); let go, the body flies; landing, it dies and
 *  what's beside it is hurt. */
export function stepExecution(state: CombatState, dt: number) {
  const ex = state.exec;
  if (!ex.active) return;
  const v = EXECUTION.v;
  const e = state.enemies[ex.target];
  const was = ex.t;
  ex.t += dt * Math.max(0.1, v.speed);
  // The slams, as they come.
  for (const k of KEYS) {
    if (!k.hit || was >= k.t || ex.t < k.t) continue;
    ex.slams++;
    pose(ex, k.t);
    const at = a.copy(ex.grip).addScaledVector(ex.dir, FOES2.v.snakeHeight * HALF * 1.4);
    at.y = ex.origin.y;
    state.events.push('execSlam', ex.slams, at.x, at.y, at.z);
    state.hitStop.request(v.slamStop);
  }
  if (!ex.thrown && ex.t >= RELEASE) {
    pose(ex, RELEASE);
    ex.thrown = true;
    ex.from.copy(ex.middle);
    throwTo(state, ex);
    state.events.push('execThrow', ex.target, ex.middle.x, ex.middle.y, ex.middle.z);
  }
  pose(ex, ex.t);
  e.pos.copy(ex.middle);
  e.pos.y -= FOES2.v.snakeHeight * 0.5;
  e.prev.copy(e.pos);
  if (ex.thrown && ex.t >= RELEASE + v.flight * Math.max(0.1, v.speed)) land(state, ex);
}

/** Where it lands: Throw distance ahead, short of the first wall. */
function throwTo(state: CombatState, ex: Execution) {
  const v = EXECUTION.v;
  const g = state.nav.small;
  let len = v.throwDistance;
  const x0 = ex.origin.x;
  const z0 = ex.origin.z;
  if (wallBetween(g, x0, z0, x0 + F.x * len, z0 + F.z * len)) {
    let lo = 0;
    let hi = len;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(g, x0, z0, x0 + F.x * mid, z0 + F.z * mid)) hi = mid;
      else lo = mid;
    }
    len = Math.max(1.5, lo - 0.8);
  }
  ex.land.set(x0 + F.x * len, ex.origin.y + FOES2.v.snakeHeight * 0.3, z0 + F.z * len);
}

/** It lands: dead (your kill, but it doesn't fill the meter again), and what's beside it is hurt. */
function land(state: CombatState, ex: Execution) {
  const v = EXECUTION.v;
  ex.active = false;
  const e = state.enemies[ex.target];
  e.pos.set(ex.land.x, ex.origin.y, ex.land.z);
  e.prev.copy(e.pos);
  state.events.push('execLand', ex.target, ex.land.x, ex.origin.y, ex.land.z);
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = ex.target;
  hit.point.copy(e.pos);
  landHit(state, hit, 1e6, 0, F.x, F.z, 'hitHeavy', 1);
  state.execution = 0;
  for (let i = 0; i < state.enemies.length; i++) {
    const o = state.enemies[i];
    if (i === ex.target || !isLive(o)) continue;
    const dx = o.pos.x - ex.land.x;
    const dz = o.pos.z - ex.land.z;
    const d = Math.hypot(dx, dz);
    if (d > v.splashRadius) continue;
    hit.index = i;
    hit.point.copy(o.pos);
    landHit(state, hit, v.splashDamage, v.splashKnock, d > 1e-3 ? dx / d : F.x, d > 1e-3 ? dz / d : F.z, 'hitHeavy', 1);
  }
}
