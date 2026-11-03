// M1 step 6 — the Feel Lab's targets: training dummies (posts that wobble and slide back), orb turrets, and the
// orbs they fire. Plain data; the rules live in dummy.ts, turret.ts and orbs.ts.
import { Vector3 } from 'three';
import { TARGETS } from '../../tuning/combat';
import type { Spot } from '../../world/arena';
import type { Cause } from '../player/state';

/** Collision sizes (m): a target is a vertical capsule from its base up `height`. */
export const TARGET_SHAPES = {
  dummy: { radius: 0.35, height: 1.8 },
  turret: { radius: 0.5, height: 1.9, muzzleHeight: 1.55 },
} as const;

export interface Dummy {
  home: Vector3;
  /** Slide away from home after a knock (x, z; y unused) and its speed. */
  offset: Vector3;
  offsetVel: Vector3;
  /** Lean (x: around x, z: around z, radians) and its speed. */
  tilt: Vector3;
  tiltVel: Vector3;
  hp: number;
  broken: boolean;
  /** Time until a broken dummy is back. */
  respawn: number;
  /** Counts down after a hit, for the white flash. */
  flash: number;
}

export interface Turret {
  pos: Vector3;
  hp: number;
  broken: boolean;
  respawn: number;
  /** Time until it may start its next shot. */
  cooldown: number;
  /** Time left glowing before it fires (0 = not warning). */
  telegraph: number;
  flash: number;
}

export interface Orb {
  alive: boolean;
  pos: Vector3;
  vel: Vector3;
  damage: number;
  /** Seconds left before it fizzles. */
  life: number;
  /** Update 0.1.14 — who fired it. */
  by: Cause | null;
  /** Update 0.2.4 — a glowing orb, a Tribal's spear or a Cactoro's spine (how it's drawn). */
  /** (Update 0.2.10 — 'water': floor 5's Glubs' bolts. Update 0.3.18 — floor 8's: 'laser', a blaster bolt; 'missile',
   *  the Bee mech's. Update 0.3.22 — 'axe': floor 7's Axe Thrower's, spinning.) */
  // (Update 0.3.33 — floor 8's: shuriken, kunai, arrows, the Sensei's ki.)
  look: 'fire' | 'spear' | 'spine' | 'carrot' | 'water' | 'laser' | 'missile' | 'axe' | 'shuriken' | 'kunai' | 'arrow' | 'ki';
  /** Update 0.3.18 — it turns after you this fast (rad/s; 0: straight: the Bee mech's missiles home). */
  home: number;
  /** Update 0.3.3 — punched back (parry.ts): it hits enemies, not you. */
  parried: boolean;
}

export const ORB_POOL = 24;
export const ORB_LIFE = 6;

export function createDummy(s: Spot): Dummy {
  return { home: new Vector3(s.x, s.y, s.z), offset: new Vector3(), offsetVel: new Vector3(), tilt: new Vector3(), tiltVel: new Vector3(), hp: TARGETS.v.dummyHp, broken: false, respawn: 0, flash: 0 };
}

export function createTurret(s: Spot): Turret {
  return { pos: new Vector3(s.x, s.y, s.z), hp: TARGETS.v.turretHp, broken: false, respawn: 0, cooldown: TARGETS.v.turretInterval, telegraph: 0, flash: 0 };
}

export function createOrbs(): Orb[] {
  return Array.from({ length: ORB_POOL }, () => ({ alive: false, pos: new Vector3(), vel: new Vector3(), damage: 0, life: 0, by: null, look: 'fire' as Orb['look'], parried: false, home: 0 }));
}

/** The bottom and top of a dummy's capsule axis right now. */
export function dummyAxis(d: Dummy, bottom: Vector3, top: Vector3) {
  const r = TARGET_SHAPES.dummy.radius;
  bottom.set(d.home.x + d.offset.x, d.home.y + r, d.home.z + d.offset.z);
  top.set(bottom.x, d.home.y + TARGET_SHAPES.dummy.height - r, bottom.z);
}

export function turretAxis(t: Turret, bottom: Vector3, top: Vector3) {
  const r = TARGET_SHAPES.turret.radius;
  bottom.set(t.pos.x, t.pos.y + r, t.pos.z);
  top.set(t.pos.x, t.pos.y + TARGET_SHAPES.turret.height - r, t.pos.z);
}
