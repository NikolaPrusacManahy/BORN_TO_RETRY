// M2 — weapons in the world (design §6): the one you hold, the ones lying around (the lab's stand, drops), and the
// ones in flight. You hold one at a time; picking one up drops yours at your feet. Throwing (Q, or the next attack
// once it's broken) draws it back for a moment, then sends it flying; it breaks on whatever it hits.
// Update 0.0.17 — picking one up takes it off the ground; where it goes is the weapon slots' business (slots.ts).
// Update 0.1.5 — a thrown Gold Axe (catalog.ts `RETURNS`) keeps its uses and comes back to your hand (recall.ts).
// Update 0.1.6 — only when thrown with right click (axeThrow.ts: charged, faster and harder); Q throws it to break.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { WEAPONS } from '../../tuning/weapons';
import type { Spot } from '../../world/arena';
import type { CombatEvent } from '../combat/state';
import type { PlayerState } from '../player/state';
import { RETURNS, WEAPON_STATS, WeaponKind } from './catalog';

export interface HeldWeapon {
  kind: WeaponKind;
  /** Uses left; at 0 it's broken and the next attack throws it. */
  uses: number;
  /** Time until the next swing. */
  cooldown: number;
  /** Seconds into a throw's wind-up (−1: not throwing). */
  throwing: number;
}

export interface Pickup {
  alive: boolean;
  kind: WeaponKind;
  uses: number;
  pos: Vector3;
  /** The lab stand it came from (−1: a drop). */
  stand: number;
}

export interface Stand {
  pos: Vector3;
  kind: WeaponKind;
  /** Time until it holds a weapon again (≤ 0 with one on it). */
  timer: number;
}

export interface Thrown {
  alive: boolean;
  kind: WeaponKind;
  pos: Vector3;
  vel: Vector3;
  /** Spin angle (rad, looks only) and seconds left before it falls apart. */
  spin: number;
  life: number;
  /** Update 0.1.5 — it comes back (a Gold Axe with uses left): what it's doing, its uses, its speed coming back, and
   *  what it has hit on the way back (enemy slots; dummies from 1000). Update 0.1.6 — and its throw's charge (0 … 1). */
  returns: boolean;
  power: number;
  phase: ThrownPhase;
  uses: number;
  speed: number;
  struck: number[];
  struckN: number;
  /** Update 0.2.15 — Ricochet: enemies it has turned from. */
  bounces: number;
}

/** Flying out; falling where it hit something or ran out; lying (or stuck in a wall); flying back to you. */
export type ThrownPhase = 'fly' | 'drop' | 'stuck' | 'back';

export const PICKUP_POOL = 16;
/** (Update 0.2.18 — 12: Splinter makes three of a throw.) */
export const THROWN_POOL = 12;
/** A thrown weapon falls apart after this long if it hits nothing (s). */
export const THROWN_LIFE = 2;
/** It falls a little (m/s²): a flat arc, not a lob. */
export const THROWN_GRAVITY = 4;
/** How close it must pass a target's capsule to hit it (m). (Update 0.2.16 — here from thrown.ts: Ricochet uses it.) */
export const THROWN_RADIUS = 0.35;

export function createPickups(): Pickup[] {
  return Array.from({ length: PICKUP_POOL }, () => ({ alive: false, kind: 'sword' as WeaponKind, uses: 0, pos: new Vector3(), stand: -1 }));
}

export function createThrown(): Thrown[] {
  return Array.from({ length: THROWN_POOL }, () => ({
    alive: false,
    kind: 'sword' as WeaponKind,
    pos: new Vector3(),
    vel: new Vector3(),
    spin: 0,
    life: 0,
    returns: false,
    power: 0,
    phase: 'fly' as ThrownPhase,
    uses: 0,
    speed: 0,
    struck: new Array<number>(16).fill(-1),
    struckN: 0,
    bounces: 0,
  }));
}

export function createStands(spots: readonly Spot[] = []): Stand[] {
  return spots.map((s) => ({ pos: new Vector3(s.x, s.y, s.z), kind: 'sword' as WeaponKind, timer: 0 }));
}

export function holding(kind: WeaponKind, uses: number): HeldWeapon {
  return { kind, uses, cooldown: 0, throwing: -1 };
}

/** A weapon on the ground at `at`. Reuses the oldest drop if every slot is taken. */
export function placePickup(pickups: Pickup[], kind: WeaponKind, uses: number, at: Vector3, stand = -1): Pickup {
  const p = pickups.find((q) => !q.alive) ?? pickups.find((q) => q.stand < 0) ?? pickups[0];
  p.alive = true;
  p.kind = kind;
  p.uses = uses;
  p.pos.copy(at);
  p.stand = stand;
  return p;
}

/** A drop from an enemy, with the weapon's uses. */
export function dropWeapon(pickups: Pickup[], kind: WeaponKind, at: Vector3, events: EventQueue<CombatEvent>, uses = WEAPON_STATS[kind]().uses) {
  placePickup(pickups, kind, uses, at);
  events.push('weaponDrop', 0, at.x, at.y, at.z);
}

/** Stands without a weapon count down, then hold one again. */
export function updateStands(stands: Stand[], pickups: Pickup[], events: EventQueue<CombatEvent>, dt: number) {
  stands.forEach((s, i) => {
    if (s.timer <= 0) return;
    s.timer -= dt;
    if (s.timer > 0) return;
    placePickup(pickups, s.kind, WEAPON_STATS[s.kind]().uses, s.pos, i);
    events.push('standRespawn', i, s.pos.x, s.pos.y, s.pos.z);
  });
}

/** E: takes the nearest weapon in reach off the ground. Returns it (null: none in reach). */
export function tryPickup(pickups: Pickup[], stands: Stand[], player: PlayerState, events: EventQueue<CombatEvent>): HeldWeapon | null {
  const range = WEAPONS.v.pickupRange;
  let best: Pickup | null = null;
  let bestD = range;
  for (const p of pickups) {
    if (!p.alive || Math.abs(p.pos.y - player.pos.y) > 1.5) continue;
    const d = Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z);
    if (d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  if (!best) return null;
  best.alive = false;
  if (best.stand >= 0) stands[best.stand].timer = WEAPONS.v.standRespawn;
  const kind = best.kind;
  const uses = best.uses;
  events.push('pickup', uses, best.pos.x, best.pos.y, best.pos.z);
  return holding(kind, uses);
}

/** Throws the held weapon from `eye` along `dir` (length 1). `returns`: thrown to come back (the Gold Axe's right
 *  click), charged `power` (0 … 1): faster and harder. */
export function throwWeapon(held: HeldWeapon, thrown: Thrown[], eye: Vector3, dir: Vector3, events: EventQueue<CombatEvent>, returns = false, power = 0): Thrown {
  const t = thrown.find((q) => !q.alive) ?? thrown[0];
  t.alive = true;
  t.kind = held.kind;
  t.pos.copy(eye).addScaledVector(dir, 0.6);
  t.vel.copy(dir).multiplyScalar(WEAPONS.v.throwSpeed * (1 + (WEAPONS.v.axeChargeSpeed - 1) * power));
  t.spin = 0;
  t.life = THROWN_LIFE;
  // (One already broken breaks on what it hits, as any weapon does.)
  t.returns = returns && RETURNS[held.kind] && held.uses > 0;
  t.power = power;
  t.phase = 'fly';
  t.uses = held.uses;
  t.speed = 0;
  t.struckN = 0;
  t.bounces = 0;
  events.push('throw', t.returns ? 1 : 0, t.pos.x, t.pos.y, t.pos.z);
  return t;
}
