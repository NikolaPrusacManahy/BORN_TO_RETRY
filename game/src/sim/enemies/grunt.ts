// M2 — the Grunt (design §9: a melee chaser in groups, fodder). It runs at you and stops in reach; winds up for the
// full warning time (its swing starts, it flashes, it growls), turning only slowly so a sideways dash dodges; then
// swings: only if you're still in reach and in front does it land. A hit flinches it (cancelling a wind-up) and
// knocks it back. Pure: it moves on the floor.
// Update 0.0.11 (the designer: grunts ran into walls forever and got stuck in blocks) — it finds its way round walls
// (chase.ts), never swings through one or at you up on a block, and whatever moves it (running, knockback, other
// grunts) ends with it pushed back out of any wall (world/navGrid.ts).
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { ENEMIES } from '../../tuning/enemies';
import { NavGrid, pushOutOfWalls, wallBetween } from '../../world/navGrid';
import type { CollisionWorld, MoveResult } from '../collisionWorld';
import type { CombatEvent } from '../combat/state';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir, Flow } from './chase';

export type GruntPhase = 'chase' | 'windup' | 'recover' | 'flinch' | 'dead';

export interface Grunt {
  /** The slot is in use (a live grunt, or a body still lying there). */
  alive: boolean;
  /** Feet, and where they were at the last tick's start (the view interpolates). */
  pos: Vector3;
  prev: Vector3;
  /** Knockback slide (x, z); it dies away. */
  vel: Vector3;
  /** Facing (rad); 0 faces −z, like the player's yaw. */
  facing: number;
  hp: number;
  phase: GruntPhase;
  /** Seconds in the current phase. */
  t: number;
  /** Counts down after a hit, for the white flash. */
  flash: number;
}

export const GRUNT_POOL = 12;
/** Its hit capsule's radius (m); the height is ENEMIES.gruntHeight. */
export const GRUNT_RADIUS = 0.45;
/** Knockback slide dies away at this rate (1/s). */
const SLIDE_FRICTION = 7;

const way = new Vector3();

export function createGrunts(): Grunt[] {
  return Array.from({ length: GRUNT_POOL }, () => ({ alive: false, pos: new Vector3(), prev: new Vector3(), vel: new Vector3(), facing: 0, hp: 0, phase: 'chase' as GruntPhase, t: 0, flash: 0 }));
}

/** A grunt in a free slot at `at`, facing `facing`. Returns its index, or −1 if the pool is full. */
export function spawnGrunt(grunts: Grunt[], at: Vector3, facing: number): number {
  const i = grunts.findIndex((g) => !g.alive);
  if (i < 0) return -1;
  const g = grunts[i];
  g.alive = true;
  g.pos.copy(at);
  g.prev.copy(at);
  g.vel.set(0, 0, 0);
  g.facing = facing;
  g.hp = ENEMIES.v.gruntHp;
  g.phase = 'chase';
  g.t = 0;
  g.flash = 0;
  return i;
}

/** Fighting (not dead, and in use). */
export const isLive = (g: Grunt) => g.alive && g.phase !== 'dead';

/** The bottom and top of its hit capsule's axis. */
export function gruntAxis(g: Grunt, bottom: Vector3, top: Vector3) {
  bottom.set(g.pos.x, g.pos.y + GRUNT_RADIUS, g.pos.z);
  top.set(g.pos.x, g.pos.y + ENEMIES.v.gruntHeight - GRUNT_RADIUS, g.pos.z);
}

/** The yaw that faces from `g` towards (x, z). */
const yawTo = (g: Grunt, x: number, z: number) => Math.atan2(-(x - g.pos.x), -(z - g.pos.z));

/** Turns `from` towards `to` (radians) by at most `step`. */
function turn(from: number, to: number, step: number): number {
  let d = to - from;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return from + Math.max(-step, Math.min(step, d));
}

/** Moves on the floor along (dx, dz) (length 1) by `dist`, then out of any wall it ran into. */
function walk(g: Grunt, dx: number, dz: number, dist: number, nav: NavGrid) {
  g.pos.x += dx * dist;
  g.pos.z += dz * dist;
  pushOutOfWalls(nav, g.pos, GRUNT_RADIUS);
}

/** Can it hit the player from here: level with it and no wall in between? */
function canReach(g: Grunt, player: PlayerState, nav: NavGrid): boolean {
  return Math.abs(player.pos.y - g.pos.y) < ENEMIES.v.gruntHeight * 0.75 && !wallBetween(nav, g.pos.x, g.pos.z, player.pos.x, player.pos.z);
}

/** One tick of a grunt's fight with the player. `nav` and `flow`: the floor's walls and the way to the player. */
export function updateGrunt(g: Grunt, index: number, player: PlayerState, nav: NavGrid, flow: Flow, events: EventQueue<CombatEvent>, dt: number) {
  if (!g.alive) return;
  const v = ENEMIES.v;
  g.prev.copy(g.pos);
  g.t += dt;
  g.flash = Math.max(0, g.flash - dt);
  if (g.phase === 'dead') {
    if (g.t >= v.gruntDeathTime) g.alive = false;
    return;
  }
  // Never left inside a wall (spawned into one, or shoved by another grunt).
  pushOutOfWalls(nav, g.pos, GRUNT_RADIUS);
  // The knockback slide.
  const slide = Math.hypot(g.vel.x, g.vel.z);
  if (slide > 0.01) {
    walk(g, g.vel.x / slide, g.vel.z / slide, slide * dt, nav);
    g.vel.multiplyScalar(Math.exp(-SLIDE_FRICTION * dt));
  }
  const dx = player.pos.x - g.pos.x;
  const dz = player.pos.z - g.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(g, player.pos.x, player.pos.z);
  switch (g.phase) {
    case 'flinch':
      if (g.t >= v.gruntFlinch) setPhase(g, 'chase');
      break;
    case 'recover':
      if (g.t >= v.gruntRecover) setPhase(g, 'chase');
      break;
    case 'chase': {
      if (player.dead) {
        g.facing = turn(g.facing, toward, v.gruntTurn * dt);
        break;
      }
      if (dist <= v.gruntReach * 0.9 && canReach(g, player, nav)) {
        g.facing = turn(g.facing, toward, v.gruntTurn * dt);
        setPhase(g, 'windup');
        events.push('gruntWindup', index, g.pos.x, g.pos.y + v.gruntHeight * 0.6, g.pos.z);
        break;
      }
      const how = chaseDir(flow, nav, g.pos, player.pos.x, player.pos.z, way);
      // No way closer (you're up on a block): it waits below, watching you.
      if (how === 'none') {
        g.facing = turn(g.facing, toward, v.gruntTurn * dt);
        break;
      }
      // Running straight at you it stops in reach; round a wall it faces the way it runs.
      const step = how === 'straight' ? Math.min(v.gruntSpeed * dt, Math.max(0, dist - v.gruntReach * 0.9)) : v.gruntSpeed * dt;
      g.facing = turn(g.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), v.gruntTurn * dt);
      walk(g, way.x, way.z, step, nav);
      break;
    }
    case 'windup':
      g.facing = turn(g.facing, toward, v.gruntWindupTurn * dt);
      if (g.t >= v.gruntWindup) {
        strike(g, index, player, dist, toward, nav, events);
        setPhase(g, 'recover');
      }
      break;
  }
}

/** The swing lands only if the player is in reach, in front, roughly level with it and not behind a wall. */
function strike(g: Grunt, index: number, player: PlayerState, dist: number, toward: number, nav: NavGrid, events: EventQueue<CombatEvent>) {
  const v = ENEMIES.v;
  events.push('gruntStrike', index, g.pos.x, g.pos.y + v.gruntHeight * 0.5, g.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - g.facing), Math.cos(toward - g.facing)));
  if (dist > v.gruntReach || off > (v.gruntArc * Math.PI) / 180 || !canReach(g, player, nav)) return;
  if (!damagePlayer(player, v.gruntDamage)) return;
  // Shoved away from it, and a little up.
  const len = Math.max(dist, 1e-3);
  player.vel.x += ((player.pos.x - g.pos.x) / len) * v.gruntShove;
  player.vel.z += ((player.pos.z - g.pos.z) / len) * v.gruntShove;
  player.vel.y = Math.max(player.vel.y, 3);
  player.grounded = false;
}

function setPhase(g: Grunt, p: GruntPhase) {
  g.phase = p;
  g.t = 0;
}

/** Damages a grunt pushed along (dirX, dirZ) (length 1). Flinches it (cancelling a wind-up). Returns true if it died. */
export function hitGrunt(g: Grunt, damage: number, knock: number, dirX: number, dirZ: number): boolean {
  if (!isLive(g)) return false;
  g.flash = 0.12;
  g.hp -= damage;
  g.vel.x += dirX * knock * ENEMIES.v.gruntKnock;
  g.vel.z += dirZ * knock * ENEMIES.v.gruntKnock;
  if (g.hp > 0) {
    setPhase(g, 'flinch');
    return false;
  }
  g.hp = 0;
  setPhase(g, 'dead');
  return true;
}

/** Live grunts push each other apart (they never stand inside one another), and none is pushed into a wall. */
export function separateGrunts(grunts: Grunt[], nav: NavGrid) {
  const min = GRUNT_RADIUS * 2;
  for (let i = 0; i < grunts.length; i++) {
    const a = grunts[i];
    if (!isLive(a)) continue;
    for (let j = i + 1; j < grunts.length; j++) {
      const b = grunts[j];
      if (!isLive(b)) continue;
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const push = (min - d) / 2;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      a.pos.x -= nx * push;
      a.pos.z -= nz * push;
      b.pos.x += nx * push;
      b.pos.z += nz * push;
    }
  }
  for (const g of grunts) if (isLive(g)) pushOutOfWalls(nav, g.pos, GRUNT_RADIUS);
}

const shove = new Vector3();

/** Passes over the grunts when pushing the player out (squeezed between two, one push can land in the other). */
const PUSH_PASSES = 3;

/** The player can't walk through a grunt: pushed out of any it overlaps, through the collision world (so never into
 *  a wall). */
export function pushPlayerOut(player: PlayerState, grunts: Grunt[], world: CollisionWorld, radius: number, out: MoveResult) {
  for (let pass = 0; pass < PUSH_PASSES; pass++) pushOnce(player, grunts, world, radius, out);
}

function pushOnce(player: PlayerState, grunts: Grunt[], world: CollisionWorld, radius: number, out: MoveResult) {
  const min = GRUNT_RADIUS + radius;
  for (const g of grunts) {
    if (!isLive(g)) continue;
    const dx = player.pos.x - g.pos.x;
    const dz = player.pos.z - g.pos.z;
    const d = Math.hypot(dx, dz);
    if (d >= min || player.pos.y > g.pos.y + ENEMIES.v.gruntHeight || player.pos.y + 1 < g.pos.y) continue;
    const nx = d > 1e-4 ? dx / d : 1;
    const nz = d > 1e-4 ? dz / d : 0;
    shove.set(nx * (min - d), 0, nz * (min - d));
    world.movePlayer(player.pos, shove, player.sliding, out);
  }
}
