// Update 0.1.1 — executions (the designer: with the Execution Power meter full, E near an enemy, "the snake as an
// example: grab its tail, the POV camera follows, smack the body on the ground, then swing it onto the ground, throw it
// away, and it one-shots it"). Until you let go you can't be hurt and the world holds still; then it's yours again
// while the body flies. The meter empties. The moves are keyframes, so the view and the tools draw the same thing; so
// is where you look (each slam seen on the floor, the throw straight ahead).
// Update 0.1.2 — every enemy's (the designer's list): the moves are data (execMoves.ts). A body is held in your hands
// or stands where it's pulled; its blows land at their times (each a freeze); it's thrown ahead, thrown at the nearest
// wall (it bursts there), or dies where it is. Pure.
import { Vector3 } from 'three';
import { EXECUTION } from '../../tuning/execution';
import { wallBetween } from '../../world/navGrid';
import { isLive, setPhase } from '../enemies/enemy';
import { EnemyKind, MINI_BOSSES, RADIUS } from '../enemies/kinds';
import { healPlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatState } from './state';
import { BLOWS, EXEC_MOVES, EXECUTABLE, ExecMove, heightOf, moveOf } from './execMoves';
import { F, frame, pose, R } from './execPose';
import { emptyTargetHit, landHit } from './strike';

export { EXECUTABLE, moveOf, pose };

export interface Execution {
  /** On (from the grab until the body dies). */
  active: boolean;
  target: number;
  kind: EnemyKind;
  /** Seconds in (at Execution speed 1). */
  t: number;
  /** Where you stood and looked when it began: the moves are laid out from there. */
  origin: Vector3;
  yaw: number;
  pitch: number;
  /** Where it's thrown (towards the nearest wall, or where you looked) and how far that wall is (Infinity: none). */
  aimYaw: number;
  wall: number;
  /** The body: where your hands hold it (`grip`), the way it runs from there (length 1), and its middle. */
  grip: Vector3;
  dir: Vector3;
  middle: Vector3;
  /** Where you look (the view is turned there while you hold it). */
  lookYaw: number;
  lookPitch: number;
  /** Where it stood and where its grip was as you grabbed it; the slams and blows so far. */
  stand: Vector3;
  start: Vector3;
  slams: number;
  beat: number;
  /** Let go: where from, where it lands, and its flight (s in). */
  thrown: boolean;
  from: Vector3;
  land: Vector3;
  flight: number;
}

export function createExecution(): Execution {
  const v = () => new Vector3();
  return { active: false, target: -1, kind: 'snake', t: 0, origin: v(), yaw: 0, pitch: 0, aimYaw: 0, wall: Infinity, grip: v(), dir: v().set(0, 1, 0), middle: v(), lookYaw: 0, lookPitch: 0, stand: v(), start: v(), slams: 0, beat: 0, thrown: false, from: v(), land: v(), flight: 0 };
}

/** How far (m) to look for a wall to throw at, in how many ways. */
const WALL_REACH = 16;
const WALL_WAYS = 16;

const UP = new Vector3(0, 1, 0);
const a = new Vector3();
const b = new Vector3();

/** Seconds of your time `kind`'s moves take until it's let go (or dies), and until the body lands. */
export const heldFor = (kind: EnemyKind = 'snake') => moveOf(kind).endAt / Math.max(0.1, EXECUTION.v.speed);
export const lastsFor = (kind: EnemyKind = 'snake') => heldFor(kind) + EXECUTION.v.flight * (moveOf(kind).fly ?? 1);

/** You're held in it (no moving, no fighting, nothing hurts you; the world holds still). */
export const execHeld = (ex: Execution) => ex.active && !ex.thrown;

/** The enemy you could execute now (−1: none): the meter full, an executable one in reach (from its edge) and in front
 *  of you. */
export function execTarget(state: CombatState, player: PlayerState, yaw: number): number {
  if (state.execution < 1 || state.exec.active || player.dead) return -1;
  const v = EXECUTION.v;
  let best = -1;
  let bestD = v.reach;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    const up = e.pos.y - player.pos.y;
    // (Fliers cruise up to 3.6 m: the first move pulls one down into your hands.)
    if (!isLive(e) || !EXEC_MOVES[e.kind] || up < -1.5 || up > 4.5) continue;
    const dx = e.pos.x - player.pos.x;
    const dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz) - RADIUS[e.kind];
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
  const move = moveOf(e.kind);
  ex.active = true;
  ex.target = i;
  ex.kind = e.kind;
  ex.t = 0;
  ex.slams = 0;
  ex.beat = 0;
  ex.thrown = false;
  ex.origin.copy(player.pos);
  ex.yaw = yaw;
  ex.pitch = pitch;
  ex.aimYaw = yaw;
  ex.wall = Infinity;
  if (move.end === 'wall') findWall(state, ex);
  ex.stand.copy(e.pos);
  ex.start.copy(e.pos);
  if (move.held) ex.start.y += 0.1;
  state.execution = 0;
  setPhase(e, 'held');
  e.vel.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  player.invuln = Math.max(player.invuln, heldFor(e.kind) + 0.2);
  pose(ex, 0);
  state.events.push('execGrab', i, ex.grip.x, ex.grip.y, ex.grip.z);
  return true;
}

/** The nearest wall round you (within reach): the way to throw at it. */
function findWall(state: CombatState, ex: Execution) {
  const g = state.nav.small;
  const x0 = ex.origin.x;
  const z0 = ex.origin.z;
  for (let w = 0; w < WALL_WAYS; w++) {
    const yaw = ex.yaw + (w / WALL_WAYS) * Math.PI * 2;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (!wallBetween(g, x0, z0, x0 + fx * WALL_REACH, z0 + fz * WALL_REACH)) continue;
    let lo = 0;
    let hi = WALL_REACH;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(g, x0, z0, x0 + fx * mid, z0 + fz * mid)) hi = mid;
      else lo = mid;
    }
    if (lo < ex.wall) {
      ex.wall = lo;
      ex.aimYaw = yaw;
    }
  }
}

/** One tick: the moves go on; each slam into the floor and each blow jolts (a freeze); let go, the body flies; it dies
 *  where it lands, or where it is, and what's beside it is hurt. */
export function stepExecution(state: CombatState, dt: number, player: PlayerState) {
  const ex = state.exec;
  if (!ex.active) return;
  const v = EXECUTION.v;
  const move = moveOf(ex.kind);
  const height = heightOf(ex.kind);
  const e = state.enemies[ex.target];
  const was = ex.t;
  ex.t += dt * Math.max(0.1, v.speed);
  // The slams, as they come.
  for (const k of move.keys) {
    if (!k.hit || was >= k.t || ex.t < k.t) continue;
    ex.slams++;
    pose(ex, k.t);
    const at = a.copy(ex.grip).addScaledVector(ex.dir, height * move.half * 1.4);
    at.y = ex.origin.y;
    state.events.push('execSlam', ex.slams, at.x, at.y, at.z);
    state.hitStop.request(v.slamStop);
  }
  // The blows.
  while (ex.beat < move.beats.length && ex.t >= move.beats[ex.beat].t) {
    const beat = move.beats[ex.beat++];
    pose(ex, beat.t);
    const g = beat.at;
    frame(ex, move.keys[0]);
    const at = g ? a.copy(ex.origin).addScaledVector(R, g[0]).addScaledVector(UP, g[1]).addScaledVector(F, g[2]) : a.copy(ex.middle);
    state.events.push('execBlow', BLOWS.indexOf(beat.blow), at.x, at.y, at.z);
    if (beat.stop > 0) state.hitStop.request(beat.stop);
  }
  if (!ex.thrown && ex.t >= move.endAt) {
    pose(ex, move.endAt);
    if (move.end === 'burst') {
      b.copy(ex.middle);
      b.y = ex.origin.y;
      finish(state, ex, b, 'execBurst', player);
      return;
    }
    ex.thrown = true;
    ex.from.copy(ex.middle);
    throwTo(state, ex, move);
    state.events.push('execThrow', ex.target, ex.middle.x, ex.middle.y, ex.middle.z);
  }
  pose(ex, ex.t);
  if (move.held || ex.thrown) {
    e.pos.copy(ex.middle);
    e.pos.y -= height * 0.5;
  } else e.pos.set(ex.middle.x, ex.stand.y, ex.middle.z);
  e.prev.copy(e.pos);
  if (ex.thrown && ex.t >= move.endAt + ex.flight) {
    b.set(ex.land.x, ex.origin.y, ex.land.z);
    finish(state, ex, b, move.end === 'wall' ? 'execBurst' : 'execLand', player);
  }
}

/** Where it lands: thrown ahead, short of the first wall; or at the wall it was swung towards. Its flight (s in). */
function throwTo(state: CombatState, ex: Execution, move: ExecMove) {
  const v = EXECUTION.v;
  F.set(-Math.sin(ex.aimYaw), 0, -Math.cos(ex.aimYaw));
  const x0 = ex.origin.x;
  const z0 = ex.origin.z;
  const atWall = move.end === 'wall' && ex.wall < Infinity;
  let len = atWall ? Math.max(1.5, ex.wall - 0.5) : v.throwDistance * (move.far ?? 1);
  if (!atWall && wallBetween(state.nav.small, x0, z0, x0 + F.x * len, z0 + F.z * len)) {
    let lo = 0;
    let hi = len;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(state.nav.small, x0, z0, x0 + F.x * mid, z0 + F.z * mid)) hi = mid;
      else lo = mid;
    }
    len = Math.max(1.5, lo - 0.8);
  }
  ex.land.set(x0 + F.x * len, ex.origin.y + (atWall ? 1.1 : heightOf(ex.kind) * 0.3), z0 + F.z * len);
  const share = atWall ? Math.max(0.35, Math.min(1.3, len / v.throwDistance)) : 1;
  ex.flight = Math.max(0.05, v.flight * (move.fly ?? 1) * share * Math.max(0.1, v.speed));
}

/** It dies at `at` (your kill, but it doesn't fill the meter again), and what's beside it is hurt. Update 0.2.0 — it
 *  heals you (more for a mini boss). */
function finish(state: CombatState, ex: Execution, at: Vector3, kind: 'execLand' | 'execBurst', player: PlayerState) {
  const v = EXECUTION.v;
  ex.active = false;
  const e = state.enemies[ex.target];
  e.pos.copy(at);
  e.prev.copy(e.pos);
  state.events.push(kind, ex.target, at.x, at.y, at.z);
  F.set(-Math.sin(ex.aimYaw), 0, -Math.cos(ex.aimYaw));
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = ex.target;
  hit.point.copy(e.pos);
  landHit(state, hit, 1e6, 0, F.x, F.z, 'hitHeavy', 1);
  state.execution = 0;
  if (!player.dead) healPlayer(player, MINI_BOSSES.includes(e.kind) ? v.healBig : v.heal);
  for (let i = 0; i < state.enemies.length; i++) {
    const o = state.enemies[i];
    if (i === ex.target || !isLive(o)) continue;
    const dx = o.pos.x - at.x;
    const dz = o.pos.z - at.z;
    const d = Math.hypot(dx, dz);
    if (d > v.splashRadius) continue;
    hit.index = i;
    hit.point.copy(o.pos);
    landHit(state, hit, v.splashDamage, v.splashKnock, d > 1e-3 ? dx / d : F.x, d > 1e-3 ? dz / d : F.z, 'hitHeavy', 1);
  }
}
