// M2 — an enemy, whatever its kind (Update 0.0.12: the grunt's body and moves made shared, for the Spitter and the
// Brute): the pool, spawning, its hit capsule, taking a hit (a flinch cancels its attack; a brute only flinches from
// a hard hit), walking the floor (always ending outside walls: Update 0.0.11), turning, enemies pushing apart, and the
// player pushed out of them. Each kind's own behaviour is in grunt.ts, spitter.ts and brute.ts. Pure.
// Update 0.0.13 — the leaper's leap and the stinger's dive (a start and an aim), fliers (pushed out of walls on their
// own grid, their bodies falling when they die), and bodies at different heights not pushing each other.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { NavGrid, pushOutOfWalls, wallBetween } from '../../world/navGrid';
import type { CollisionWorld, MoveResult } from '../collisionWorld';
import type { CombatEvent } from '../combat/state';
import type { Orb } from '../combat/targets';
import type { PlayerState } from '../player/state';
import type { Flow } from './chase';
import { ENEMY_STATS, EnemyKind, flies, SizeClass } from './kinds';

export type EnemyPhase = 'chase' | 'windup' | 'recover' | 'flinch' | 'dead' | 'leap' | 'dive';

export interface Enemy {
  /** The slot is in use (a live enemy, or a body still lying there). */
  alive: boolean;
  kind: EnemyKind;
  /** Feet, and where they were at the last tick's start (the view interpolates). */
  pos: Vector3;
  prev: Vector3;
  /** Knockback slide (x, z); it dies away. */
  vel: Vector3;
  /** Facing (rad); 0 faces −z, like the player's yaw. */
  facing: number;
  hp: number;
  phase: EnemyPhase;
  /** Seconds in the current phase. */
  t: number;
  /** Counts down after a hit, for the white flash. */
  flash: number;
  /** Time until it may attack again (the spitter's shots). */
  cooldown: number;
  /** Which way it circles you, +1 or −1 (the spitter), and time until it turns round. */
  strafe: number;
  strafeTime: number;
  /** Update 0.0.13 — where a leap or a dive began, where it's headed, and whether this dive has hit you. */
  from: Vector3;
  aim: Vector3;
  struck: boolean;
}

/** What an enemy's tick works with: the walk grids and the way to the player per size, the orbs, the events. */
export interface EnemyWorld {
  nav: Record<SizeClass, NavGrid>;
  flow: Record<SizeClass, Flow>;
  orbs: Orb[];
  events: EventQueue<CombatEvent>;
}

export const ENEMY_POOL = 16;
/** Knockback slide dies away at this rate (1/s). */
const SLIDE_FRICTION = 7;
/** A floor-bound body this far up (m) is in the air (a leap): walls don't push it. */
const OFF_GROUND = 0.3;
/** A falling body's gravity (m/s²). */
const FALL = 25;
/** Bodies further apart in height than this (m) don't push each other. */
const LEVELS_APART = 1.5;

export function createEnemies(): Enemy[] {
  return Array.from({ length: ENEMY_POOL }, () => ({
    alive: false,
    kind: 'grunt' as EnemyKind,
    pos: new Vector3(),
    prev: new Vector3(),
    vel: new Vector3(),
    facing: 0,
    hp: 0,
    phase: 'chase' as EnemyPhase,
    t: 0,
    flash: 0,
    cooldown: 0,
    strafe: 1,
    strafeTime: 0,
    from: new Vector3(),
    aim: new Vector3(),
    struck: false,
  }));
}

/** An enemy of `kind` in a free slot at `at`, facing `facing`. Returns its index, or −1 if the pool is full. */
export function spawnEnemy(enemies: Enemy[], kind: EnemyKind, at: Vector3, facing: number): number {
  const i = enemies.findIndex((e) => !e.alive);
  if (i < 0) return -1;
  const e = enemies[i];
  e.alive = true;
  e.kind = kind;
  e.pos.copy(at);
  e.prev.copy(at);
  e.vel.set(0, 0, 0);
  e.facing = facing;
  e.hp = ENEMY_STATS[kind]().hp;
  e.phase = 'chase';
  e.t = 0;
  e.flash = 0;
  // A spitter doesn't fire the moment it arrives.
  e.cooldown = 1;
  e.strafe = i % 2 === 0 ? 1 : -1;
  e.strafeTime = 2;
  e.from.copy(at);
  e.aim.copy(at);
  e.struck = false;
  return i;
}

/** Fighting (not dead, and in use). */
export const isLive = (e: Enemy) => e.alive && e.phase !== 'dead';

export const radiusOf = (e: Enemy) => ENEMY_STATS[e.kind]().radius;

/** Walls push it: always a flier (on its own grid), a walker only on the ground. */
export const grounded = (e: Enemy) => flies(e.kind) || e.pos.y < OFF_GROUND;

/** The bottom and top of its hit capsule's axis. */
export function enemyAxis(e: Enemy, bottom: Vector3, top: Vector3) {
  const s = ENEMY_STATS[e.kind]();
  bottom.set(e.pos.x, e.pos.y + s.radius, e.pos.z);
  top.set(e.pos.x, e.pos.y + Math.max(s.radius, s.height - s.radius), e.pos.z);
}

/** The yaw that faces from `e` towards (x, z). */
export const yawTo = (e: Enemy, x: number, z: number) => Math.atan2(-(x - e.pos.x), -(z - e.pos.z));

/** Turns `from` towards `to` (radians) by at most `step`. */
export function turn(from: number, to: number, step: number): number {
  let d = to - from;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return from + Math.max(-step, Math.min(step, d));
}

export function setPhase(e: Enemy, p: EnemyPhase) {
  e.phase = p;
  e.t = 0;
}

/** Moves on the floor along (dx, dz) (length 1) by `dist`, then out of any wall it ran into. */
export function walk(e: Enemy, dx: number, dz: number, dist: number, nav: NavGrid) {
  e.pos.x += dx * dist;
  e.pos.z += dz * dist;
  pushOutOfWalls(nav, e.pos, radiusOf(e));
}

/** The start of every enemy's tick: timers, its body's time, out of walls, the knockback slide. Returns false if it
 *  has nothing more to do this tick (a body lying there, or a free slot). */
export function beginTick(e: Enemy, nav: NavGrid, dt: number): boolean {
  if (!e.alive) return false;
  e.prev.copy(e.pos);
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.phase === 'dead') {
    // A body in the air falls.
    if (e.pos.y > 0) {
      e.vel.y -= FALL * dt;
      e.pos.y = Math.max(0, e.pos.y + e.vel.y * dt);
    }
    if (e.t >= ENEMY_STATS[e.kind]().deathTime) e.alive = false;
    return false;
  }
  // A walker in the air with no leap to carry it (knocked out of one) falls.
  if (!flies(e.kind) && e.phase !== 'leap' && e.pos.y > 0) {
    e.vel.y -= FALL * dt;
    e.pos.y = Math.max(0, e.pos.y + e.vel.y * dt);
    if (e.pos.y === 0) e.vel.y = 0;
  }
  if (grounded(e)) pushOutOfWalls(nav, e.pos, radiusOf(e));
  const slide = Math.hypot(e.vel.x, e.vel.z);
  if (slide > 0.01) {
    walk(e, e.vel.x / slide, e.vel.z / slide, slide * dt, nav);
    e.vel.multiplyScalar(Math.exp(-SLIDE_FRICTION * dt));
  }
  return true;
}

/** Can it hit the player from here: within `level` m of its height and no wall in between? */
export function inLine(e: Enemy, player: PlayerState, nav: NavGrid, level: number): boolean {
  return Math.abs(player.pos.y - e.pos.y) < level && !wallBetween(nav, e.pos.x, e.pos.z, player.pos.x, player.pos.z);
}

/** Damages an enemy pushed along (dirX, dirZ) (length 1). A hit at least as hard as its stagger flinches it
 *  (cancelling its attack). Returns true if it died. */
export function hitEnemy(e: Enemy, damage: number, knock: number, dirX: number, dirZ: number): boolean {
  if (!isLive(e)) return false;
  const s = ENEMY_STATS[e.kind]();
  e.flash = 0.12;
  e.hp -= damage;
  e.vel.x += dirX * knock * s.knock;
  e.vel.z += dirZ * knock * s.knock;
  if (e.hp > 0) {
    if (damage >= s.stagger) setPhase(e, 'flinch');
    return false;
  }
  e.hp = 0;
  e.vel.y = 0;
  setPhase(e, 'dead');
  return true;
}

/** Live enemies push each other apart (they never stand inside one another), and none is pushed into a wall. */
export function separateEnemies(enemies: Enemy[], nav: Record<SizeClass, NavGrid>) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!isLive(a)) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!isLive(b) || Math.abs(a.pos.y - b.pos.y) > LEVELS_APART) continue;
      const min = radiusOf(a) + radiusOf(b);
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      // The heavier gives way less.
      const wa = radiusOf(b) / min;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      a.pos.x -= nx * (min - d) * wa;
      a.pos.z -= nz * (min - d) * wa;
      b.pos.x += nx * (min - d) * (1 - wa);
      b.pos.z += nz * (min - d) * (1 - wa);
    }
  }
  for (const e of enemies) if (isLive(e) && grounded(e)) pushOutOfWalls(nav[ENEMY_STATS[e.kind]().size], e.pos, radiusOf(e));
}

const shove = new Vector3();
/** Passes over the enemies when pushing the player out (squeezed between two, one push can land in the other). */
const PUSH_PASSES = 3;

/** The player can't walk through an enemy: pushed out of any it overlaps, through the collision world (so never into
 *  a wall). */
export function pushPlayerOut(player: PlayerState, enemies: Enemy[], world: CollisionWorld, radius: number, out: MoveResult) {
  for (let pass = 0; pass < PUSH_PASSES; pass++) {
    for (const e of enemies) {
      if (!isLive(e)) continue;
      const min = radiusOf(e) + radius;
      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= min || player.pos.y > e.pos.y + ENEMY_STATS[e.kind]().height || player.pos.y + 1 < e.pos.y) continue;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      shove.set(nx * (min - d), 0, nz * (min - d));
      world.movePlayer(player.pos, shove, player.sliding, out);
    }
  }
}
