// Update 0.5.5 — floor 10's Spore Lord's burning spores (MD/FLOOR10_HELL_PLAN.md; sim/enemies/sporeLord.ts): a puff lets out clouds round
// it that hang a while, drifting slowly your way; standing in one burns you now and then. A cloud catches fire near fire and blows: over
// lava, by a fire vent as it jets (dungeon/machinery.ts), on a line of fire, a pool of fire, a fireball flying through it, a burst near it (a
// bomb's, a Cinder Chicken's, another cloud's): you in it are hurt and thrown, and so are the enemies in it, the Spore Lord too. So lure them.
// Kept with the fight's ground (dungeon/ground.ts). Pure.
import type { Rng } from '../../core/rng';
import { FOES_HELL_B } from '../../tuning/foesHellB';
import type { ArenaBox } from '../../world/arena';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { segmentDistance2D } from './geometry';
import { blastFoes } from './hellBurst';
import type { CombatState } from './state';

/** A cloud: its middle, its floor's height, how far it reaches (m); its life left and whole (s); caught fire (it blows this tick). */
export interface SporeCloud {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  r: number;
  life: number;
  full: number;
  lit: boolean;
}
export interface Spores {
  clouds: SporeCloud[];
  /** Seconds till a cloud can burn you again. */
  burn: number;
}

export const SPORE_POOL = 10;
/** In a cloud you're burned at most this often (s); you're in it this high over its floor (m); a puff's clouds this far round (m). It drifts
 *  your way only within this (m). A cloud's blast throws you this hard (m/s), enemies this; the bursts that light one. */
const BURN_EVERY = 0.7;
const HIGH = 2.6;
const ROUND = 2.4;
const DRIFT_NEAR = 18;
const SHOVE = 9;
const KNOCK = 8;
/** Is (x, z) over one of `boxes` (ground.ts's, here so the ground can hold the clouds). */
const over = (boxes: readonly ArenaBox[], x: number, z: number) => boxes.some((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);
const SPARKS = new Set(['bombBlast', 'chickenBurst', 'sporeBlast', 'powderBlast', 'kitsuneBlast', 'sunBlast']);

export const createSpores = (): Spores => ({ clouds: Array.from({ length: SPORE_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, r: 0, life: 0, full: 1, lit: false })), burn: 0 });

export const liveClouds = (s: Spores) => s.clouds.filter((c) => c.alive).length;

/** A puff: `n` clouds round (x, z), on the floor at `y`. */
export function puffSpores(s: Spores, x: number, y: number, z: number, n: number, rng: Rng) {
  const v = FOES_HELL_B.v;
  const a0 = rng() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const c = s.clouds.find((q) => !q.alive) ?? s.clouds.reduce((a, b) => (b.life < a.life ? b : a));
    const a = a0 + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    Object.assign(c, { alive: true, x: x + Math.cos(a) * ROUND, y, z: z + Math.sin(a) * ROUND, r: v.sporeSize, life: v.sporeLast, full: v.sporeLast, lit: false });
  }
}

/** Fire at (x, z) reaching `reach`: the clouds it touches catch. */
export function igniteSpores(s: Spores, x: number, z: number, reach: number) {
  for (const c of s.clouds) if (c.alive && Math.hypot(c.x - x, c.z - z) <= c.r + reach) c.lit = true;
}

/** You're in `c`. */
const inCloud = (c: SporeCloud, p: PlayerState) => c.alive && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r && p.pos.y - c.y < HIGH && p.pos.y > c.y - 0.5;

/** One tick: the clouds drift and thin out; what's on fire near them lights them, and the lit ones blow; one round you burns you. */
export function stepSpores(state: CombatState, player: PlayerState, dt: number) {
  const s = state.ground.spores;
  if (!s.clouds.some((c) => c.alive)) return;
  const v = FOES_HELL_B.v;
  for (const c of s.clouds) {
    if (!c.alive) continue;
    c.life -= dt;
    if (c.life <= 0) {
      c.alive = false;
      continue;
    }
    const dx = player.pos.x - c.x;
    const dz = player.pos.z - c.z;
    const d = Math.hypot(dx, dz);
    if (!player.dead && d > 0.2 && d < DRIFT_NEAR) {
      c.x += (dx / d) * v.sporeDrift * dt;
      c.z += (dz / d) * v.sporeDrift * dt;
    }
    if (!c.lit) c.lit = nearFire(state, c);
  }
  // The bursts this tick light the clouds they reach.
  for (let i = 0; i < state.events.length; i++) {
    const ev = state.events.at(i);
    if (SPARKS.has(ev.kind)) igniteSpores(s, ev.x, ev.z, Math.max(0.5, ev.value));
  }
  for (const c of s.clouds) if (c.alive && c.lit) blow(state, c, player);
  s.burn = Math.max(0, s.burn - dt);
  if (s.burn > 0 || player.dead || !s.clouds.some((c) => inCloud(c, player))) return;
  if (!damagePlayer(player, v.sporeBurn, 'sporeLord')) return;
  s.burn = BURN_EVERY;
  state.events.push('sporeBurn', 0, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** Lava under it, a line of fire through it, a pool of fire in it, a fireball in it. */
function nearFire(state: CombatState, c: SporeCloud): boolean {
  const k = c.r * 0.7;
  const pits = state.ground.pits;
  if (pits.length > 0 && (over(pits, c.x, c.z) || over(pits, c.x + k, c.z) || over(pits, c.x - k, c.z) || over(pits, c.x, c.z + k) || over(pits, c.x, c.z - k))) return true;
  if (state.ground.hellfire.lines.some((l) => l.alive && segmentDistance2D(l.ax, l.az, l.bx, l.bz, c.x, c.z) <= c.r)) return true;
  if (state.puddles.some((p) => p.alive && p.fire && Math.hypot(p.x - c.x, p.z - c.z) <= c.r + p.r)) return true;
  return state.orbs.some((o) => o.alive && o.look === 'fire' && o.pos.y - c.y < HIGH + 1 && Math.hypot(o.pos.x - c.x, o.pos.z - c.z) <= c.r);
}

/** It blows: you in it hurt and thrown, the enemies in it too; gone. */
function blow(state: CombatState, c: SporeCloud, player: PlayerState) {
  const v = FOES_HELL_B.v;
  c.alive = false;
  c.lit = false;
  state.events.push('sporeBlast', c.r, c.x, c.y + 1, c.z);
  blastFoes(state, c.x, c.z, c.r + 0.5, v.sporeBlastFoes, KNOCK);
  const dx = player.pos.x - c.x;
  const dz = player.pos.z - c.z;
  const d = Math.hypot(dx, dz);
  if (player.dead || d > c.r + 0.5 || player.pos.y - c.y > HIGH + 0.5 || !damagePlayer(player, v.sporeBlast, 'sporeLord')) return;
  const len = Math.max(d, 1e-3);
  player.vel.x += (dx / len) * SHOVE;
  player.vel.z += (dz / len) * SHOVE;
  player.vel.y = Math.max(player.vel.y, 6);
  player.grounded = false;
}
