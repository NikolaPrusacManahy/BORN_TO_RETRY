// M2 — an enemy, whatever its kind (Update 0.0.12: the grunt's body and moves made shared, for the Spitter and the
// Brute): the pool, spawning, its hit capsule, taking a hit (a flinch cancels its attack; a brute only flinches from
// a hard hit), walking the floor (always ending outside walls: Update 0.0.11), turning, enemies pushing apart, and the
// player pushed out of them. Each kind's own behaviour is in grunt.ts, spitter.ts and brute.ts. Pure.
// Update 0.0.13 — the leaper's leap and the stinger's dive (a start and an aim), fliers (pushed out of walls on their
// own grid, their bodies falling when they die), and bodies at different heights not pushing each other.
// Update 0.0.15 — the Demon's phases (its charge, stunned, its roar, its entrance) and which move it winds up; a boss's
// body doesn't fall when it dies (its death show places it); a hit on a stunned boss is worth more.
// Update 0.0.17 — frozen (the snowflake bonus): it stands still, its attack paused, until the ice wears off.
// Update 0.0.18 — the Dragon's fire beam (a phase of its own) and a burst's shots; the enemy world knows every enemy
// (the beam burns them).
// Update 0.0.21 — the Dragon up in the sky (a phase of its own: it doesn't fall), its fire bombs, and how long you've
// stayed close to it. A perched enemy (a spitter on a high ledge, floor 3) stands on its ledge: it falls only to it,
// and hits don't slide it off. Update 0.1.1 — held in an execution (its own phase: the execution places it).
// Update 0.1.15 — its attack token (tokens.ts) and its angle round you (spread.ts); bodies pushing apart moved to
// bodies.ts. Update 0.1.19 — a Skeleton brought down falls to pieces to rebuild (its own phase: skeleton.ts); the
// Ninja's teleport rest.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { NavGrid, pushOutOfWalls, wallBetween } from '../../world/navGrid';
import type { CombatEvent } from '../combat/state';
import type { Orb } from '../combat/targets';
import type { Quake } from '../combat/quakes';
import type { Bomb } from '../combat/bombs';
import type { Rng } from '../../core/rng';
import type { PlayerState } from '../player/state';
import type { Flow } from './chase';
import { ENEMY_STATS, EnemyKind, flies, SizeClass } from './kinds';
import { FOES3 } from '../../tuning/foes3';

export type EnemyPhase = 'chase' | 'windup' | 'recover' | 'flinch' | 'dead' | 'leap' | 'dive' | 'charge' | 'stun' | 'roar' | 'intro' | 'breath' | 'sky' | 'held' | 'rebuild';

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
  /** Update 0.0.17 — seconds it stays frozen (0: not). */
  frozen: number;
  /** Time until it may attack again (the spitter's shots). */
  cooldown: number;
  /** Which way it circles you, +1 or −1 (the spitter), and time until it turns round. */
  strafe: number;
  strafeTime: number;
  /** Update 0.0.13 — where a leap or a dive began, where it's headed, and whether this dive has hit you. */
  from: Vector3;
  aim: Vector3;
  struck: boolean;
  /** Update 0.0.15 — a boss: the move it winds up (demon.ts), and its stage (0, then 1 once it rages). */
  move: number;
  stage: number;
  /** Update 0.0.18 — shots fired in this burst (the Dragon's fireballs). */
  shots: number;
  /** Update 0.0.21 — seconds you've stayed close (the Dragon's flame burst); the ledge it stands on (m; 0: the floor). */
  near: number;
  perch: number;
  /** Update 0.1.15 — it holds an attack token (tokens.ts), for how long (s), and how long before it may take one again. */
  token: boolean;
  tokenFor: number;
  rest: number;
  /** Update 0.1.15 — how far round the player (rad) it should move to its own angle (spread.ts; NaN: none). */
  fan: number;
  /** Update 0.1.19 — the Ninja: seconds before it can teleport away again (ninja.ts). */
  blink: number;
}

/** What an enemy's tick works with: the walk grids and the way to the player per size, the orbs, the events.
 *  Update 0.0.15 — the quake rings, and the fight's seeded RNG (the Demon picks its moves with it). */
export interface EnemyWorld {
  nav: Record<SizeClass, NavGrid>;
  flow: Record<SizeClass, Flow>;
  orbs: Orb[];
  quakes: Quake[];
  rng: Rng;
  events: EventQueue<CombatEvent>;
  enemies: Enemy[];
  bombs: Bomb[];
}

export const ENEMY_POOL = 16;
/** Knockback slide dies away at this rate (1/s). */
const SLIDE_FRICTION = 7;
/** A floor-bound body this far up (m) is in the air (a leap): walls don't push it. */
const OFF_GROUND = 0.3;
/** A falling body's gravity (m/s²). */
const FALL = 25;

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
    frozen: 0,
    cooldown: 0,
    strafe: 1,
    strafeTime: 0,
    from: new Vector3(),
    aim: new Vector3(),
    struck: false,
    move: 0,
    stage: 0,
    shots: 0,
    near: 0,
    perch: 0,
    token: false,
    tokenFor: 0,
    rest: 0,
    fan: NaN,
    blink: 0,
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
  e.frozen = 0;
  // A spitter doesn't fire the moment it arrives.
  e.cooldown = 1;
  e.strafe = i % 2 === 0 ? 1 : -1;
  e.strafeTime = 2;
  e.from.copy(at);
  e.aim.copy(at);
  e.struck = false;
  e.move = 0;
  e.stage = 0;
  e.shots = 0;
  e.near = 0;
  e.perch = 0;
  e.token = false;
  e.tokenFor = e.rest = 0;
  e.fan = NaN;
  e.blink = 0;
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
  // Frozen: nothing moves on (not even its time, so an attack waits), until the ice wears off.
  if (e.frozen > 0 && e.phase !== 'dead') {
    e.frozen = Math.max(0, e.frozen - dt);
    e.flash = Math.max(0, e.flash - dt);
    return false;
  }
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.phase === 'dead') {
    // A body in the air falls (a boss's is placed by its death show).
    if (e.pos.y > e.perch && !ENEMY_STATS[e.kind]().boss) {
      e.vel.y -= FALL * dt;
      e.pos.y = Math.max(e.perch, e.pos.y + e.vel.y * dt);
    }
    if (e.t >= ENEMY_STATS[e.kind]().deathTime) e.alive = false;
    return false;
  }
  // A walker in the air with no leap to carry it (knocked out of one) falls.
  if (!flies(e.kind) && e.phase !== 'leap' && e.phase !== 'sky' && e.phase !== 'held' && e.pos.y > e.perch) {
    e.vel.y -= FALL * dt;
    e.pos.y = Math.max(e.perch, e.pos.y + e.vel.y * dt);
    if (e.pos.y === e.perch) e.vel.y = 0;
  }
  // Perched: hits don't slide it off its ledge.
  if (e.perch > 0) e.vel.set(0, 0, 0);
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

/** Update 0.1.19 — brought down now, does it fall to pieces (to rebuild: skeleton.ts) rather than die? A Skeleton, not
 *  while in pieces or held in an execution, until its revives are used. */
export const fallsApart = (e: Enemy) => e.kind === 'skeleton' && e.phase !== 'rebuild' && e.phase !== 'held' && e.stage < Math.round(FOES3.v.skeletonRevives);

/** Damages an enemy pushed along (dirX, dirZ) (length 1). A hit at least as hard as its stagger flinches it
 *  (cancelling its attack). Returns true if it died. */
export function hitEnemy(e: Enemy, damage: number, knock: number, dirX: number, dirZ: number): boolean {
  if (!isLive(e)) return false;
  const s = ENEMY_STATS[e.kind]();
  e.flash = 0.12;
  e.hp -= e.phase === 'stun' ? damage * s.stunned : damage;
  e.vel.x += dirX * knock * s.knock;
  e.vel.z += dirZ * knock * s.knock;
  if (e.hp > 0) {
    if (damage >= s.stagger && e.phase !== 'rebuild') setPhase(e, 'flinch');
    return false;
  }
  e.hp = 0;
  // Update 0.1.19 — a Skeleton falls to pieces (and rebuilds: skeleton.ts): not dead yet.
  if (fallsApart(e)) {
    e.vel.set(0, 0, 0);
    e.shots = 0;
    setPhase(e, 'rebuild');
    return false;
  }
  e.vel.y = 0;
  // Where it died (a boss's death show starts there).
  e.from.copy(e.pos);
  e.struck = false;
  setPhase(e, 'dead');
  return true;
}
