// Update 0.3.51 — The Swarm's big worms (the Boss Design Bible, Boss 2: "the Eye is the boss; the worms are the problem"):
// thick ones, out of the floor, each something to hit (combat/strike.ts), apart from its heap. Two kinds.
// Burrow Ambush: the floor bulges under your feet (it follows you till just before), then one bursts up there, hurting you if
// it catches you on the floor, hangs in the air a moment (hit it: it takes a piece of The Swarm's bar), and goes back down.
// Tethered Shield: they rise round its eye and stand, feeding its shield, till they're killed.
// A small pool, no garbage. Pure.
import { SWARM } from '../../tuning/swarm';
import { freeSpotNear } from './chase';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { EnemyWorld } from './enemy';
import { Vector3 } from 'three';

export interface Wormling {
  alive: boolean;
  /** A tether (it stands by its eye), or a burrower. */
  tether: boolean;
  /** Seconds since its tell started (a burrower waits its turn below 0). */
  t: number;
  x: number;
  z: number;
  /** How high its head is now (m), and its health. */
  top: number;
  hp: number;
  flash: number;
  /** It's burst, and it's bitten you. */
  burst: boolean;
  struck: boolean;
  /** Killed: how long ago (s; it falls away), −1: living. */
  dead: number;
}

export const WORMLING_POOL = 8;
/** Its body for hits: this wide (m). */
export const WORMLING_RADIUS = 0.55;
/** It bursts up this fast (s to its full height), this high (m); goes back down this fast; lies dying this long (s). */
const RISE = 0.14;
export const WORMLING_TOP = 3.4;
const SINK = 0.35;
const FALLS = 0.7;

export const createWormlings = (): Wormling[] => Array.from({ length: WORMLING_POOL }, () => ({ alive: false, tether: false, t: 0, x: 0, z: 0, top: 0, hp: 0, flash: 0, burst: false, struck: false, dead: -1 }));
export const wormlingsIn = (w: object): Wormling[] => (w as { wormlings?: Wormling[] }).wormlings ?? [];

function free(list: Wormling[]): Wormling | null {
  return list.find((q) => !q.alive) ?? null;
}

/** A burrower, its tell starting `delay` s from now. */
export function burrow(list: Wormling[], delay: number, player: PlayerState) {
  const q = free(list);
  if (!q) return;
  q.alive = true;
  q.tether = false;
  q.t = -delay;
  q.x = player.pos.x;
  q.z = player.pos.z;
  q.top = 0;
  q.hp = SWARM.v.burrowHp;
  q.flash = 0;
  q.burst = q.struck = false;
  q.dead = -1;
}

const spot = new Vector3();

/** A tether at (x, z), on floor it can stand on. */
export function tether(list: Wormling[], x: number, z: number, w: EnemyWorld) {
  const q = free(list);
  if (!q) return;
  spot.set(x, 0, z);
  freeSpotNear(w.nav.small, x, z, spot);
  q.alive = true;
  q.tether = true;
  q.t = 0;
  q.x = spot.x;
  q.z = spot.z;
  q.top = 0;
  q.hp = SWARM.v.tetherHp;
  q.flash = 0;
  q.burst = false;
  q.struck = false;
  q.dead = -1;
}

/** The tethers standing. */
export const tethersUp = (list: readonly Wormling[]) => list.reduce((n, q) => n + (q.alive && q.tether && q.dead < 0 ? 1 : 0), 0);

export function clearWormlings(list: Wormling[]) {
  for (const q of list) q.alive = false;
}

/** How long before it bursts a burrower's bulge stops following you (s), from its tell's start. */
const burstAt = () => SWARM.v.burrowWindup;
const lockAt = () => SWARM.v.burrowWindup - SWARM.v.burrowLock;

/** Is it a tell on the floor now? (the view: the ripple, how far through its tell, 0..1; −1: not). */
export function bulge(q: Wormling): number {
  if (!q.alive || q.tether || q.dead >= 0 || q.burst || q.t < 0) return -1;
  return Math.min(1, q.t / burstAt());
}

/** Every big worm a tick. `index`: The Swarm's slot, `eye` its eye: what's killed takes a piece of its bar. */
export function stepWormlings(list: Wormling[], player: PlayerState, w: EnemyWorld, index: number, dt: number) {
  const v = SWARM.v;
  for (const q of list) {
    if (!q.alive) continue;
    q.t += dt;
    q.flash = Math.max(0, q.flash - dt);
    if (q.dead >= 0) {
      q.dead += dt;
      q.top = Math.max(0, q.top - (dt * WORMLING_TOP) / FALLS);
      if (q.dead >= FALLS) q.alive = false;
      continue;
    }
    if (q.tether) {
      q.top = Math.min(WORMLING_TOP * 1.2, (q.t / (RISE * 3)) * WORMLING_TOP);
      continue;
    }
    if (q.t < 0) continue;
    // Its bulge follows you, then stops: step off it.
    if (q.t < lockAt()) {
      q.x = player.pos.x;
      q.z = player.pos.z;
    }
    if (q.t < burstAt()) continue;
    if (!q.burst) {
      q.burst = true;
      w.events.push('swarmBurst', index, q.x, 0.1, q.z);
    }
    const up = q.t - burstAt();
    if (up < RISE) q.top = (up / RISE) * WORMLING_TOP;
    else if (up < RISE + v.burrowHang) q.top = WORMLING_TOP;
    else {
      q.top = WORMLING_TOP * (1 - (up - RISE - v.burrowHang) / SINK);
      if (q.top <= 0) {
        q.alive = false;
        continue;
      }
    }
    // Its bite, as it comes up through where you stand: on the floor, it catches you.
    if (!q.struck && up < RISE * 2 && !player.dead && player.pos.y <= v.burrowClear && Math.hypot(player.pos.x - q.x, player.pos.z - q.z) <= v.burrowReach + BODY.radius) {
      q.struck = true;
      if (damagePlayer(player, v.burrowDamage, 'swarm')) {
        player.vel.y = Math.max(player.vel.y, 6);
        player.grounded = false;
        w.events.push('swarmBite', index, player.pos.x, player.pos.y + 1, player.pos.z);
      }
    }
  }
}

/** A blow on big worm `i`: true if it's killed. */
export function hitWormling(list: Wormling[], i: number, damage: number): boolean {
  const q = list[i];
  if (!q.alive || q.dead >= 0) return false;
  q.flash = 0.12;
  q.hp -= damage;
  if (q.hp > 0) return false;
  q.dead = 0;
  return true;
}

/** Is it there to hit? (above the floor, living.) */
export const wormlingUp = (q: Wormling) => q.alive && q.dead < 0 && q.top > 0.3;

