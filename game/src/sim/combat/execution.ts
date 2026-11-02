// Update 0.1.1 — executions (the designer: with the Execution Power meter full, E near an enemy, "the snake as an
// example: grab its tail, the POV camera follows, smack the body on the ground, then swing it onto the ground, throw it
// away, and it one-shots it"). Until you let go you can't be hurt and the world holds still; then it's yours again
// while the body flies. The meter empties. The moves are keyframes, so the view and the tools draw the same thing; so
// is where you look (each slam seen on the floor, the throw straight ahead).
// Update 0.1.2 — every enemy's (the designer's list): the moves are data (execMoves.ts). A body is held in your hands
// or stands where it's pulled; its blows land at their times (each a freeze); it's thrown ahead, thrown at the nearest
// wall (it bursts there), or dies where it is. Pure.
// Update 0.2.2 — a standing body lifted off the floor is drawn there (the Skeleton's); a Skeleton lying in pieces can't
// be executed (it starts standing in front of you).
// Update 0.2.15 — Bloodbath (its blast reaches further) and Adrenaline (your dashes back, untouchable a while), Fate
// Cards since Update 0.2.16; and Reaper's Rhythm (the meter left half full).
// Update 0.3.1 (the designer: "when in the air, player's body falls down and hands remain up"; "when a flying enemy is
// up, we fall down and player execute the enemy off screen") — while you hold it you stay where you grabbed it, in the
// air too (no falling, no slide, dash or wall run): the moves are laid out from there, so the view is on them. Let go,
// you're free and fall as before.
// Update 0.3.8 (the designer: "Finishers that interact with environment") — a body pinned to a wall can be executed for
// free (the meter as it is): the wall finisher (execPin.ts). You're brought up to it, facing it; it heals Wall finisher
// heal; its kill was counted as it died. The throw's aim and landing moved to execThrow.ts.
import { Vector3 } from 'three';
import { CARDS } from '../../tuning/cards';
import { boost, holds } from '../cards/cards';
import { lastRites } from '../cards/buildPowers';
import { meterAfter } from '../cards/cardMoves';
import { dashMaxOf } from '../player/dash';
import { EXECUTION } from '../../tuning/execution';
import { wallBetween } from '../../world/navGrid';
import { isLive, setPhase } from '../enemies/enemy';
import { EnemyKind, MINI_BOSSES, RADIUS } from '../enemies/kinds';
import { healPlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatState } from './state';
import { BLOWS, EXEC_MOVES, EXECUTABLE, heightOf, moveOf } from './execMoves';
import { moveFor, PIN_AHEAD, PIN_HEAD, PIN_LUNGE } from './execPin';
import { F, frame, pose, R } from './execPose';
import { findWall, throwTo } from './execThrow';
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
  /** Update 0.3.8 — the wall finisher (a pinned body: execPin.ts), and where you stood before you were brought up to it. */
  pinned: boolean;
  walk: Vector3;
}

export function createExecution(): Execution {
  const v = () => new Vector3();
  return { active: false, target: -1, kind: 'snake', t: 0, origin: v(), yaw: 0, pitch: 0, aimYaw: 0, wall: Infinity, grip: v(), dir: v().set(0, 1, 0), middle: v(), lookYaw: 0, lookPitch: 0, stand: v(), start: v(), slams: 0, beat: 0, thrown: false, from: v(), land: v(), flight: 0, pinned: false, walk: v() };
}

const UP = new Vector3(0, 1, 0);
const a = new Vector3();
const b = new Vector3();

/** Seconds of your time `kind`'s moves take until it's let go (or dies), and until the body lands. */
export const heldFor = (kind: EnemyKind = 'snake') => moveOf(kind).endAt / Math.max(0.1, EXECUTION.v.speed);
export const lastsFor = (kind: EnemyKind = 'snake') => heldFor(kind) + EXECUTION.v.flight * (moveOf(kind).fly ?? 1);

/** You're held in it (no moving, no fighting, nothing hurts you; the world holds still). */
export const execHeld = (ex: Execution) => ex.active && !ex.thrown;

/** The enemy you could execute now (−1: none): the meter full, an executable one in reach (from its edge) and in front
 *  of you. Update 0.3.8 — or a body pinned to a wall, whatever the meter. */
export function execTarget(state: CombatState, player: PlayerState, yaw: number): number {
  if (state.exec.active || player.dead) return -1;
  const v = EXECUTION.v;
  const full = state.execution >= 1;
  let best = -1;
  let bestD = v.reach;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    const up = e.pos.y - player.pos.y;
    const pinned = e.alive && e.phase === 'dead' && e.pinned > 0;
    // (Fliers cruise up to 3.6 m: the first move pulls one down into your hands.)
    if (!pinned && (!full || !isLive(e) || !EXEC_MOVES[e.kind] || e.phase === 'rebuild')) continue;
    if (up < -1.5 || up > 4.5) continue;
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

/** E: if an enemy can be executed, it starts (the meter empties; not for a pinned body's). Returns true if it did. */
export function tryExecute(state: CombatState, player: PlayerState, yaw: number, pitch: number): boolean {
  const i = execTarget(state, player, yaw);
  if (i < 0) return false;
  const ex = state.exec;
  const e = state.enemies[i];
  ex.active = true;
  ex.target = i;
  ex.kind = e.kind;
  ex.pinned = e.phase === 'dead';
  const move = moveFor(ex);
  ex.t = 0;
  ex.slams = 0;
  ex.beat = 0;
  ex.thrown = false;
  ex.origin.copy(player.pos);
  ex.walk.copy(player.pos);
  ex.yaw = yaw;
  if (ex.pinned) lineUp(state, ex);
  ex.pitch = pitch;
  ex.aimYaw = ex.yaw;
  ex.wall = Infinity;
  if (move.end === 'wall') findWall(state, ex);
  ex.stand.copy(e.pos);
  ex.start.copy(e.pos);
  // (A pinned body is held by its head as it hangs.)
  if (move.held) ex.start.y += ex.pinned ? heightOf(e.kind) * PIN_HEAD : 0.1;
  if (ex.pinned) e.pinned = HELD_PINNED;
  else {
    state.execution = 0;
    setPhase(e, 'held');
  }
  e.vel.set(0, 0, 0);
  player.vel.set(0, 0, 0);
  player.sliding = player.wallRunning = false;
  player.dashTime = 0;
  player.invuln = Math.max(player.invuln, move.endAt / Math.max(0.1, EXECUTION.v.speed) + 0.2);
  pose(ex, 0);
  state.events.push('execGrab', i, ex.grip.x, ex.grip.y, ex.grip.z);
  return true;
}

/** A pinned body stays pinned this long (s) while it's executed. */
const HELD_PINNED = 1e3;

/** Update 0.3.8 — the wall finisher: where you'll stand, in front of the pinned body (the way it faces, out from the
 *  wall), facing it (you're brought there over its first moments: stepExecution). Where that's past a wall, where you
 *  are. */
function lineUp(state: CombatState, ex: Execution) {
  const e = state.enemies[ex.target];
  const x = e.pos.x - Math.sin(e.facing) * PIN_AHEAD;
  const z = e.pos.z - Math.cos(e.facing) * PIN_AHEAD;
  if (!wallBetween(state.nav.small, e.pos.x, e.pos.z, x, z)) ex.origin.set(x, ex.origin.y, z);
  ex.yaw = Math.atan2(-(e.pos.x - ex.origin.x), -(e.pos.z - ex.origin.z));
}

/** One tick: the moves go on; each slam into the floor and each blow jolts (a freeze); let go, the body flies; it dies
 *  where it lands, or where it is, and what's beside it is hurt. */
export function stepExecution(state: CombatState, dt: number, player: PlayerState) {
  const ex = state.exec;
  if (!ex.active) return;
  const v = EXECUTION.v;
  const move = moveFor(ex);
  const height = heightOf(ex.kind);
  const e = state.enemies[ex.target];
  const was = ex.t;
  // (Update 0.3.1 — held where you grabbed it. Update 0.3.8 — the wall finisher brings you up to the body first.)
  if (!ex.thrown) {
    const k = ex.pinned ? Math.min(1, ex.t / PIN_LUNGE) : 1;
    player.pos.lerpVectors(ex.walk, ex.origin, k * k * (3 - 2 * k));
    player.vel.set(0, 0, 0);
  }
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
      // (Update 0.2.2 — standing, where its feet are: lifted, it bursts where it hangs.)
      b.y = move.held ? ex.origin.y : ex.middle.y - height * 0.5;
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
  } else e.pos.set(ex.middle.x, ex.middle.y - height * 0.5, ex.middle.z);
  e.prev.copy(e.pos);
  if (ex.thrown && ex.t >= move.endAt + ex.flight) {
    b.set(ex.land.x, ex.origin.y, ex.land.z);
    finish(state, ex, b, move.end === 'wall' ? 'execBurst' : 'execLand', player);
  }
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
  // (Update 0.3.8 — a pinned body's kill was counted as it died, and the meter wasn't spent: as it is.)
  if (ex.pinned) {
    e.pinned = 0;
    e.t = 0;
  } else {
    landHit(state, hit, 1e6, 0, F.x, F.z, 'hitHeavy', 1);
    state.execution = meterAfter(state);
  }
  // (Update 0.2.12 — the designer: "executions always heals", on ARE YOU EVEN HUMAN? too.)
  // (Update 0.2.19 — not with Executioner's Deal, a Traitor Card.)
  if (!player.dead && !holds(state, 'executionersDeal')) healPlayer(player, ex.pinned ? v.pinHeal : MINI_BOSSES.includes(e.kind) ? v.healBig : v.heal);
  if (holds(state, 'adrenaline') && !player.dead) {
    player.dashCharges = dashMaxOf(player);
    player.invuln = Math.max(player.invuln, CARDS.v.adrenaline);
  }
  const reach = holds(state, 'bloodbath') ? CARDS.v.bloodbath * boost(state, 'bloodbath') : v.splashRadius;
  lastRites(state, at, ex.target);
  // (Bloodbath's wider blast shows as a ring on the floor: value, its reach.)
  if (reach > v.splashRadius) state.events.push('cardBlast', reach, at.x, 0, at.z);
  for (let i = 0; i < state.enemies.length; i++) {
    const o = state.enemies[i];
    if (i === ex.target || !isLive(o)) continue;
    const dx = o.pos.x - at.x;
    const dz = o.pos.z - at.z;
    const d = Math.hypot(dx, dz);
    if (d > reach) continue;
    hit.index = i;
    hit.point.copy(o.pos);
    landHit(state, hit, v.splashDamage, v.splashKnock, d > 1e-3 ? dx / d : F.x, d > 1e-3 ? dz / d : F.z, 'hitHeavy', 1);
  }
}
