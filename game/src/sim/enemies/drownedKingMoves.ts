// Update 0.2.10 — the Drowned King's moves once their warning is over (drownedKing.ts picks them and warns), and its
// room's water. Here: which move is which, the pieces both its phases use, and its moves beneath (phase 1): under the
// water it circles you, only its fin showing; its ambush (it swims to you, the water rings where it'll come up, then it
// bursts up jaws first), its undertow (the water drags you to a ring, and it bursts up there: wade or dash out) and its
// jet (it comes up and sweeps a jet of water across you at the water's height: jump it). Its risen moves (phase 2) are
// drownedRisen.ts's. Its room's water rises to its phase's depth while it's alive and drains once it's dead
// (stepFlood). Also which floor 5 enemies are under the water (out of reach). Pure.
import { DROWNED } from '../../tuning/drowned';
import { segmentDistance2D } from '../combat/geometry';
import { WADE_MIN } from '../dungeon/tide';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { BURIED } from './cactoro';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';

/** Which move (Enemy.move). Beneath: its ambush, its undertow, its jet. Risen: its tidal wall, its surf, its geysers,
 *  its bites. Then the ones that follow: the water ringing before it comes up, sinking back under, circling under, its
 *  roar as it rises for good. */
export const LUNGE = 0;
export const UNDERTOW = 1;
export const SPOUT = 2;
export const TIDE = 3;
export const SURF = 4;
export const GEYSER = 5;
export const BITE = 6;
export const RISE = 7;
export const DIVE = 8;
export const CRUISE = 9;
export const RISEN = 10;

/** It roars this long as it rises for good (s). */
export const ROAR = 1.6;
/** Close enough to your spot to come up (m); under the water it circles at this share of its swim. */
const THERE = 1.2;
const CRUISE_PACE = 0.6;
/** Feet this far over its water are out of it: a jump clears the undertow (m). */
const OUT = 0.1;
/** Its jaws coming up: how hard they throw you (along, then up: m/s). */
const LUNGE_THROW = [10, 9] as const;
/** Higher over it than this (m), its jaws miss you. */
const OVER = 3;
/** Its jet: as wide as this (m) either side of its line, as high as this over the floor (m: jump it), from its mouth. */
const JET_WIDTH = 1;
const JET_HIGH = 1;
const JET_UP = 4;

/** Its room's water's depth in its phase (m: knee-deep beneath, deeper risen). */
export const floodOf = (stage: number) => (stage === 0 ? DROWNED.v.shallow : DROWNED.v.risenDeep);

/** Deep enough to swim under. */
export const deepEnough = (w: EnemyWorld) => w.flood >= WADE_MIN;

/** Under the water: out of reach of every blow, not drawn (only a fin shows). */
export function submerged(e: Enemy): boolean {
  if (e.kind === 'drownedKing') return e.pos.y <= -DROWNED.v.kingHeight * 0.5;
  return (e.kind === 'snapper' || e.kind === 'bogBrute') && e.pos.y <= BURIED * 0.5;
}

/** Its room's water, one tick: up to its phase's depth while it's alive (rising as it rises out of its portal),
 *  draining once it's dead. */
export function stepFlood(state: { enemies: Enemy[]; flood: number }, dt: number) {
  const king = state.enemies.find((e) => e.alive && e.kind === 'drownedKing' && e.phase !== 'dead');
  if (!king && state.flood <= 0) return;
  const want = king ? floodOf(king.stage) : 0;
  const v = DROWNED.v;
  state.flood = want > state.flood ? Math.min(want, state.flood + v.floodRate * dt) : Math.max(want, state.flood - v.drainRate * dt);
}

/** It sinks out of sight and under, to circle you one way or the other (seeded). */
export function goUnder(k: Enemy, index: number, w: EnemyWorld) {
  k.pos.y = k.prev.y = -DROWNED.v.kingHeight;
  k.move = CRUISE;
  k.near = w.rng() < 0.5 ? 1 : -1;
  setPhase(k, 'burrow');
  k.cooldown = DROWNED.v.underPause;
  w.events.push('drownedDive', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** Under the water, between moves: it circles you at Circling under, its fin cutting the water. */
export function cruise(k: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  const dx = k.pos.x - player.pos.x;
  const dz = k.pos.z - player.pos.z;
  const r = Math.max(1e-3, Math.hypot(dx, dz));
  // Round you (its way: Enemy.near's sign), and in or out to its ring.
  const side = k.near >= 0 ? 1 : -1;
  const out = Math.max(-1, Math.min(1, (v.cruiseRing - r) / 3));
  let mx = (-dz / r) * side + (dx / r) * out;
  let mz = (dx / r) * side + (dz / r) * out;
  const len = Math.hypot(mx, mz);
  mx /= len;
  mz /= len;
  k.facing = turn(k.facing, Math.atan2(-mx, -mz), v.kingTurn * 2 * dt);
  walk(k, mx, mz, v.kingSwim * CRUISE_PACE * dt, w.nav.large);
}

/** Its ambush: under the water it swims at you; there (or after Ambush hunt, or the water's gone), the water rings where
 *  it'll come up. */
export function stepHunt(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > THERE && !player.dead) walk(k, dx / dist, dz / dist, Math.min(dist, v.kingSwim * dt), w.nav.large);
  if (dist > THERE && k.t < v.hunt && deepEnough(w)) return;
  k.move = RISE;
  setPhase(k, 'windup');
  w.events.push('drownedRiseWarn', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** Up it bursts, jaws first: within Ambush reach you're bitten and thrown. Then it stays up (After coming up). */
export function rise(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DROWNED.v;
  k.pos.y = k.prev.y = 0;
  k.facing = yawTo(k, player.pos.x, player.pos.z);
  k.move = LUNGE;
  setPhase(k, 'recover');
  w.events.push('drownedRise', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  if (player.dead || dist > v.lungeReach || player.pos.y - k.pos.y > OVER) return;
  if (damagePlayer(player, v.lungeDamage, k.kind)) throwYou(player, k, dx, dz, dist, LUNGE_THROW[0], LUNGE_THROW[1]);
}

/** Its undertow, one tick: under the water it swims to its ring (Enemy.aim) while the water drags you there (while your
 *  feet are in it). True once it's time to burst up. */
export function stepUndertow(k: Enemy, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DROWNED.v;
  const tx = k.aim.x - k.pos.x;
  const tz = k.aim.z - k.pos.z;
  const there = Math.hypot(tx, tz);
  if (there > 1e-3) walk(k, tx / there, tz / there, Math.min(there, v.kingSwim * dt), w.nav.large);
  if (!player.dead && player.pos.y <= w.flood + OUT && deepEnough(w)) {
    const dx = k.aim.x - player.pos.x;
    const dz = k.aim.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    // (Right on its middle, it stops dragging.)
    if (d > 0.3) player.current.set((dx / d) * v.undertowPull, 0, (dz / d) * v.undertowPull);
  }
  return k.t >= v.undertowTime;
}

/** Up it comes for its jet. */
export function surface(k: Enemy, index: number, w: EnemyWorld) {
  k.pos.y = k.prev.y = 0;
  w.events.push('drownedSurface', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** Its jet's way now (rad: a facing): it sweeps from one side of where you were to the other (Enemy.aim.x: where it
 *  starts, aim.z: which way it sweeps). */
export const jetAngle = (k: Enemy) => k.aim.x + k.aim.z * ((DROWNED.v.spoutArc * Math.PI) / 180) * Math.min(1, k.t / DROWNED.v.spoutTime);

/** Its jet starts: from one side of you, sweeping to the other (seeded). */
export function startJet(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const half = ((DROWNED.v.spoutArc * Math.PI) / 180) / 2;
  const way = w.rng() < 0.5 ? 1 : -1;
  k.aim.set(yawTo(k, player.pos.x, player.pos.z) - way * half, 0, way);
  k.struck = false;
  setPhase(k, 'breath');
  w.events.push('drownedSpout', index, k.pos.x, JET_UP, k.pos.z);
}

/** One tick of its jet: along its way from its mouth, as far as Jet reach; you in it, your feet under its top, you're
 *  hurt and thrown along it (once a jet). True once it's done. */
export function stepJet(k: Enemy, player: PlayerState): boolean {
  const v = DROWNED.v;
  const a = jetAngle(k);
  k.facing = a;
  const r = radiusOf(k);
  const dx = -Math.sin(a);
  const dz = -Math.cos(a);
  const ax = k.pos.x + dx * r;
  const az = k.pos.z + dz * r;
  if (!k.struck && !player.dead && player.pos.y - k.pos.y < JET_HIGH && segmentDistance2D(ax, az, ax + dx * v.spoutRange, az + dz * v.spoutRange, player.pos.x, player.pos.z) <= JET_WIDTH) {
    k.struck = true;
    if (damagePlayer(player, v.spoutDamage, k.kind)) throwYou(player, k, dx, dz, 1, v.spoutShove, 5);
  }
  return k.t >= v.spoutTime;
}

/** Its moves' turning: towards you, at its turn rate times `share`. */
export function face(k: Enemy, player: PlayerState, share: number, dt: number) {
  k.facing = turn(k.facing, yawTo(k, player.pos.x, player.pos.z), DROWNED.v.kingTurn * share * dt);
}
