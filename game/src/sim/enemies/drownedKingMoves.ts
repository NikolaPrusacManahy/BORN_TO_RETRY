// Update 0.2.10 — the Drowned King's moves once their warning is over (drownedKing.ts picks them and warns), and its
// room's water. Its room's water rises to its phase's depth while it's alive and drains once it's dead (stepFlood). Also
// which floor 5 enemies are under the water (out of reach). Pure.
// Update 0.3.58 — by the Boss Design Bible, "Master the parry" (spec MD_UPDATES/U0358_DROWNED_KING_BIBLE.md): here, which move is
// which, what its phases share, and its Fin Dive: only its fin shows, circling you, speeding up; the fin disappears: dash; it bursts
// up under you, jaws first, and it's in the air and open. Its Jaw Launch and Frenzy Combo: drownedJaws.ts. Its Riptide and its surf:
// drownedRisen.ts. Its Maw of Many: drownedMaw.ts. Its ambush, its undertow and its jet are gone (the undertow lives on as its
// Riptide's tell, and its ambush's ring as the Fin Dive's).
import { DROWNED } from '../../tuning/drowned';
import { WADE_MIN } from '../dungeon/tide';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { BURIED } from './cactoro';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';

/** Which move (Enemy.move): its Jaw Launch, its Fin Dive (circling), its Frenzy Combo; risen, its Riptide, its surf; its Maw of Many.
 *  Then the ones that follow: bursting up and in the air, its fin gone, sinking back under, circling under, its roar as it rises for
 *  good. */
export const JAWS = 0;
export const FIN = 1;
export const FRENZY = 2;
export const RIPTIDE = 3;
export const SURF = 4;
export const MAW = 5;
export const LUNGE = 6;
export const RISE = 7;
export const DIVE = 8;
export const CRUISE = 9;
export const RISEN = 10;

/** Update 0.3.59 — in its show its crown's out of the water from this stage (sim/dungeon/drownedShow.ts). */
export const SHOW_CROWN = 21;

/** It roars this long as it rises for good (s). */
export const ROAR = 1.6;
/** Under the water it circles at this share of its swim. */
const CRUISE_PACE = 0.6;
/** Feet this far over its water are out of it (m). */
export const OUT = 0.1;
/** Its jaws coming up: how hard they throw you (along, then up: m/s). */
const LUNGE_THROW = [10, 9] as const;
/** Higher over it than this (m), its jaws miss you. */
const OVER = 3;
/** Its fin gone, it goes for under you this many times its swim. */
const GONE_SWIM = 3;

/** Risen, its tells and blows come this many times as fast. */
export const paceOf = (k: Enemy) => (k.stage > 0 ? DROWNED.v.ragePace : 1);
/** How fast it swims. */
export const swimOf = (k: Enemy) => (k.stage > 0 ? DROWNED.v.risenSwim : DROWNED.v.kingSwim);

/** Its room's water's depth in its phase (m: knee-deep beneath, deeper risen). */
export const floodOf = (stage: number) => (stage === 0 ? DROWNED.v.shallow : DROWNED.v.risenDeep);

/** Deep enough to swim under. */
export const deepEnough = (w: EnemyWorld) => w.flood >= WADE_MIN;

/** Under the water: out of reach of every blow, not drawn (only a fin shows). */
export function submerged(e: Enemy): boolean {
  if (e.kind === 'drownedKing') return e.pos.y <= -DROWNED.v.kingHeight * 0.5 && !(e.phase === 'intro' && e.move >= SHOW_CROWN);
  return (e.kind === 'snapper' || e.kind === 'bogBrute') && e.pos.y <= BURIED * 0.5;
}

/** Your feet in its water. */
export const feetIn = (player: PlayerState, w: EnemyWorld) => player.pos.y <= w.flood + OUT && deepEnough(w);

/** Its room's water, one tick: up to its phase's depth while it's alive (rising as it rises out of its portal),
 *  draining once it's dead. */
export function stepFlood(state: { enemies: Enemy[]; flood: number }, dt: number) {
  const king = state.enemies.find((e) => e.alive && e.kind === 'drownedKing' && e.phase !== 'dead');
  if (!king && state.flood <= 0) return;
  const want = king ? floodOf(king.stage) : 0;
  const v = DROWNED.v;
  state.flood = want > state.flood ? Math.min(want, state.flood + v.floodRate * dt) : Math.max(want, state.flood - v.drainRate * dt);
}

/** It sinks out of sight and under: to circle you one way or the other (seeded), or, risen or having knocked you into the water, on
 *  into its Fin Dive. */
export function goUnder(k: Enemy, index: number, w: EnemyWorld) {
  k.pos.y = k.prev.y = -DROWNED.v.kingHeight;
  k.near = w.rng() < 0.5 ? 1 : -1;
  w.events.push('drownedDive', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
  if (k.drowned?.finNow) {
    k.drowned.finNow = false;
    finGone(k, index, w);
    return;
  }
  k.move = k.stage > 0 ? FIN : CRUISE;
  setPhase(k, 'burrow');
  k.cooldown = DROWNED.v.underPause;
}

/** Under the water: it circles you at Circling under, its fin cutting the water; `pace`: its share of its swim. */
export function cruise(k: Enemy, player: PlayerState, w: EnemyWorld, dt: number, pace = CRUISE_PACE) {
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
  walk(k, mx, mz, swimOf(k) * pace * dt, w.nav.large);
}

/** Its Fin Dive starts: already under the water, the fin cuts the surface and goes round you. */
export function startFin(k: Enemy, index: number, w: EnemyWorld) {
  k.move = FIN;
  setPhase(k, 'burrow');
  w.events.push('drownedFinCut', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** How long its fin goes round you (s). */
export const finFor = (k: Enemy) => DROWNED.v.finFor / (k.stage > 0 ? 2 * DROWNED.v.ragePace : 1);

/** One tick of its fin going round you, speeding up; then it's gone. */
export function stepFin(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  const long = finFor(k);
  const u = Math.min(1, k.t / long);
  cruise(k, player, w, dt, CRUISE_PACE + (CRUISE_PACE * v.finFast - CRUISE_PACE) * u * u);
  if (k.t >= long) finGone(k, index, w);
}

/** Its fin disappears. */
function finGone(k: Enemy, index: number, w: EnemyWorld) {
  k.move = RISE;
  setPhase(k, 'windup');
  w.events.push('drownedFinGone', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** How long from its fin going to its burst, and how long of that it follows you (s). */
export const goneFor = (k: Enemy) => DROWNED.v.finGone / paceOf(k);
export const lockAt = (k: Enemy) => DROWNED.v.finLock / paceOf(k);

/** Its fin gone, one tick: it goes for under you; then the water rings where it'll come up, and it's set. True: up it bursts. */
export function stepGone(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  if (k.t < lockAt(k)) {
    const dx = player.pos.x - k.pos.x;
    const dz = player.pos.z - k.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-3) walk(k, dx / dist, dz / dist, Math.min(dist, swimOf(k) * GONE_SWIM * dt), w.nav.large);
    if (k.t + dt >= lockAt(k)) w.events.push('drownedRiseWarn', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
  }
  return k.t >= goneFor(k);
}

/** Up it bursts, jaws first: within Fin Dive reach you're bitten and thrown. Then it's in the air, open. */
export function rise(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DROWNED.v;
  k.pos.y = k.prev.y = 0;
  k.facing = yawTo(k, player.pos.x, player.pos.z);
  k.move = LUNGE;
  setPhase(k, 'leap');
  w.events.push('drownedRise', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  if (player.dead || dist > v.lungeReach || player.pos.y - k.pos.y > OVER) return;
  if (damagePlayer(player, v.lungeDamage, k.kind)) throwYou(player, k, dx, dz, dist, LUNGE_THROW[0], LUNGE_THROW[1]);
}

/** One tick in the air. True once it's landed. */
export function stepLeap(k: Enemy, index: number, w: EnemyWorld): boolean {
  const v = DROWNED.v;
  const u = Math.min(1, k.t / v.finAir);
  k.pos.y = 4 * v.finUp * u * (1 - u);
  if (u < 1) return false;
  k.pos.y = 0;
  w.events.push('drownedLand', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
  return true;
}

/** Its moves' turning: towards you, at its turn rate times `share`. */
export function face(k: Enemy, player: PlayerState, share: number, dt: number) {
  k.facing = turn(k.facing, yawTo(k, player.pos.x, player.pos.z), DROWNED.v.kingTurn * share * dt);
}
