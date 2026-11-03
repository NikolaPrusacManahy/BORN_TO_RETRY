// Update 0.3.35 — Yokai : Okami's devastation (the designer: "he would teleport in the middle of the arena and he would
// charge up for 7 seconds -> the whole arena will be hit -> if the circle is full -> then he would use his power to throw
// the massive fireball at the arena and deal massive damage"): it's gone in fire and in the arena's middle, charging,
// a ring of fire growing out from it over the floor toward the walls (it fills by itself; every hit you land drives
// it back), roaring slowly all through it as it gathers its fire. At the end of its 7 s, the ring full, it hurls its
// massive fireball with a swing of its claw, up and down onto the arena: everywhere in it, massive damage. Not full, its charge breaks: it reels a while, and your hits do more. Pure.
import { Vector3 } from 'three';
import { OKAMI } from '../../tuning/okami';
import { dropBomb } from '../combat/bombs';
import type { NavGrid } from '../../world/navGrid';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase } from './enemy';
import { CLIPS, DEVASTATE, HURL } from './okamiShared';

/** It's gone this long before it's in the middle (s); its massive fireball leaves its hands this high (m), takes this
 *  long to come down (s), reaches this many times the arena's half (all of it), throws you this hard. */
export const VANISH = 0.45;
const RAISED = 10;
const SUN_FALL = 1.3;
const SUN_REACH = 1.6;
const SUN_SHOVE = 18;

/** Its charge: how full its ring is (0..1), its health as it last was, how many it's done, how long since. */
interface Charge {
  full: number;
  hp: number;
  count: number;
  since: number;
}
const charges = new WeakMap<Enemy, Charge>();
const chargeOf = (e: Enemy) => charges.get(e) ?? charges.set(e, { full: 0, hp: e.hp, count: 0, since: 0 }).get(e)!;

/** How full its ring is (0..1; 0 when not charging): the view draws it. */
export const okamiRing = (e: Enemy) => (e.move === DEVASTATE && e.phase === 'windup' && e.t >= VANISH ? chargeOf(e).full : 0);

/** The arena's middle and half its width (m: the walk grid's). */
export function arenaOf(nav: NavGrid, out: Vector3): number {
  if (nav.cols === 0) {
    out.set(0, 0, 0);
    return 30;
  }
  out.set(nav.minX + (nav.cols * nav.cell) / 2, 0, nav.minZ + (nav.rows * nav.cell) / 2);
  return Math.min(nav.cols, nav.rows) * nav.cell * 0.5;
}

/** Is it time for its devastation (its first once its health is low enough, then every so often)? `dt`: this tick. */
export function devastationDue(e: Enemy, hpShare: number, dt: number): boolean {
  const c = chargeOf(e);
  c.since += dt;
  return c.count === 0 ? hpShare <= OKAMI.v.devastateAt : c.since >= OKAMI.v.devastateEvery;
}

const mid = new Vector3();
const from = new Vector3();

/** Its devastation starts: gone in fire. */
export function startDevastation(e: Enemy, index: number, w: EnemyWorld) {
  const c = chargeOf(e);
  c.full = 0;
  c.hp = e.hp;
  c.count++;
  c.since = 0;
  e.move = DEVASTATE;
  e.shots = 0;
  setPhase(e, 'windup');
  w.events.push('okamiVanish', index, e.pos.x, e.pos.y + 2.5, e.pos.z);
}

export function devastation(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, done: (e: Enemy) => void) {
  const v = OKAMI.v;
  const c = chargeOf(e);
  const half = arenaOf(w.nav.large, mid);
  if (e.move === HURL) {
    // Its massive fireball: up out of its hands and down onto the arena, everywhere in it.
    const release = CLIPS[HURL].lands[0] * CLIPS[HURL].len;
    if (e.shots === 0 && e.t >= release) {
      e.shots = 1;
      from.set(e.pos.x, e.pos.y + RAISED, e.pos.z);
      dropBomb(w.bombs, from, mid, SUN_FALL, half * SUN_REACH, v.devastateDamage, SUN_SHOVE, 'okami', 'sun');
      w.events.push('okamiHurl', index, from.x, from.y, from.z);
    }
    if (e.t >= CLIPS[HURL].len + SUN_FALL) done(e);
    return;
  }
  if (e.phase === 'stun') {
    if (e.t >= v.devastateDazed) done(e);
    return;
  }
  if (e.t < VANISH) return;
  // In the middle, facing you.
  if (e.shots === 0) {
    e.shots = 1;
    e.pos.set(mid.x, 0, mid.z);
    e.prev.copy(e.pos);
    e.vel.set(0, 0, 0);
    c.hp = e.hp;
    w.events.push('okamiAppear', index, e.pos.x, e.pos.y + 2.5, e.pos.z);
    w.events.push('okamiCharge', index, e.pos.x, half, e.pos.z);
  }
  e.facing = Math.atan2(-(player.pos.x - e.pos.x), -(player.pos.z - e.pos.z));
  // Its ring: filling by itself, driven back by every hit you land.
  const hurt = Math.max(0, c.hp - e.hp);
  c.hp = e.hp;
  c.full = Math.max(0, Math.min(1, c.full + dt / Math.max(0.1, v.devastateFill) - hurt * v.devastatePush));
  if (e.t < VANISH + v.devastateCharge) return;
  if (c.full >= 1) {
    e.move = HURL;
    e.shots = 0;
    setPhase(e, 'windup');
    return;
  }
  setPhase(e, 'stun');
  w.events.push('okamiChargeBroken', index, e.pos.x, e.pos.y + 3, e.pos.z);
}
