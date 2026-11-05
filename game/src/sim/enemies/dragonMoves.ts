// Update 0.0.18 — the Dragon's moves once their warning is over (dragon.ts picks them and warns).
// Update 0.3.49 — anew, from the Boss Design Bible ("Read the tell"), its three on the ground:
//  - Flame Sweep: fire low across the floor from one side to the other. Jump it or dash through it; a wall stops it. Its
//    head stays low after.
//  - Wing Gust: the wind pushes you back (strafe out of it) and blows rubble at you (parry it back).
//  - Tail Quake: it has turned its back; the slam sends a ring across the floor (jump it), and its back stays to you.
// Enemy.near holds the sweep's middle (yaw); Enemy.aim the far end of its line; Enemy.shots the rubble thrown. Pure.
import { Vector3 } from 'three';
import { DRAGON } from '../../tuning/dragon';
import { wallBetween } from '../../world/navGrid';
import { fireOrb } from '../combat/orbs';
import { startQuake } from '../combat/quakes';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, radiusOf, setPhase, yawTo } from './enemy';

/** Which move (Enemy.move). */
export const SWEEP = 0;
export const WING = 1;
export const TAIL = 2;
/** Phase 2's (dragonSky.ts). */
export const DIVE = 3;
export const EMBER = 4;
/** Its ultimate (dragonCore.ts): coming down to it, and the blast. */
export const CORE = 5;
export const BLAST = 6;

/** Its mouth: this share of its height up (above its hover), this share of its radius in front. */
const MOUTH_UP = 0.75;
const MOUTH_OUT = 0.9;

const mouth = new Vector3();
const dir = new Vector3();

/** Its mouth (where fire and rubble start). */
export function dragonMouth(d: Enemy, out: Vector3): Vector3 {
  const v = DRAGON.v;
  const r = radiusOf(d) * MOUTH_OUT;
  return out.set(d.pos.x - Math.sin(d.facing) * r, d.pos.y + v.hover + v.dragonHeight * MOUTH_UP, d.pos.z - Math.cos(d.facing) * r);
}

/** How far from its mouth's foot (x, z) the fire reaches along `yaw`: its reach, or the first wall. */
function sweepLength(d: Enemy, yaw: number, w: EnemyWorld): number {
  const v = DRAGON.v;
  const g = w.nav.large;
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  if (!wallBetween(g, d.pos.x, d.pos.z, d.pos.x + dx * v.sweepReach, d.pos.z + dz * v.sweepReach)) return v.sweepReach;
  let lo = 0;
  let hi = v.sweepReach;
  for (let k = 0; k < 10; k++) {
    const mid = (lo + hi) / 2;
    if (wallBetween(g, d.pos.x, d.pos.z, d.pos.x + dx * mid, d.pos.z + dz * mid)) hi = mid;
    else lo = mid;
  }
  return lo;
}

/** The line of fire along where it faces (Enemy.aim: its far end, on the floor). */
function aimSweep(d: Enemy, w: EnemyWorld): number {
  const len = sweepLength(d, d.facing, w);
  d.aim.set(d.pos.x - Math.sin(d.facing) * len, 0, d.pos.z - Math.cos(d.facing) * len);
  return len;
}

/** Warning of the sweep: where the fire will start (the view draws its line). */
export function aimSweepStart(d: Enemy, w: EnemyWorld) {
  const f = d.facing;
  d.facing = f - sweepHalf();
  aimSweep(d, w);
  d.facing = f;
}

const sweepHalf = () => (DRAGON.v.sweepArc * Math.PI) / 360;

/** The sweep starts, across where it faces now. */
export function startSweep(d: Enemy, index: number, w: EnemyWorld) {
  d.near = d.facing;
  d.facing = d.near - sweepHalf();
  setPhase(d, 'breath');
  aimSweep(d, w);
  dragonMouth(d, mouth);
  w.events.push('dragonBreath', index, mouth.x, mouth.y, mouth.z);
}

/** One tick of the sweep: the line swings across; it catches you on the floor. Returns true once it's over. */
export function stepSweep(d: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const v = DRAGON.v;
  const k = Math.min(1, d.t / Math.max(0.05, v.sweepTime));
  d.facing = d.near - sweepHalf() + 2 * sweepHalf() * k;
  const len = aimSweep(d, w);
  if (player.dead || player.pos.y > v.sweepClear) return k >= 1;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  // Along the line, and how far off it.
  const along = dx * -Math.sin(d.facing) + dz * -Math.cos(d.facing);
  const off = Math.abs(dx * Math.cos(d.facing) - dz * Math.sin(d.facing));
  if (along > 0 && along <= len && off <= v.sweepWidth + BODY.radius) damagePlayer(player, v.sweepDamage, d.kind);
  return k >= 1;
}

/** The wind starts. */
export function startGust(d: Enemy, index: number, w: EnemyWorld) {
  d.shots = 0;
  setPhase(d, 'breath');
  w.events.push('dragonWing', index, d.pos.x - Math.sin(d.facing) * 3, d.pos.y + 0.1, d.pos.z - Math.cos(d.facing) * 3);
}

/** One tick of the wind: in front of it, you're blown back; rubble flies at you. Returns true once it's over. */
export function stepGust(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DRAGON.v;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const a = yawTo(d, player.pos.x, player.pos.z) - d.facing;
  const off = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
  if (!player.dead && dist > 1e-3 && dist <= v.gustReach && off <= (v.gustArc * Math.PI) / 360) {
    player.vel.x += (dx / dist) * v.gustPush * dt;
    player.vel.z += (dz / dist) * v.gustPush * dt;
  }
  if (!player.dead && d.shots < v.rubbles && d.t >= d.shots * v.rubbleGap) throwRubble(d, index, player, w);
  return d.t >= v.gustTime;
}

/** A chunk of rubble at your chest, off the floor in front of it. */
function throwRubble(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  const r = radiusOf(d);
  // (A little to either side in turn, off its wings.)
  const side = (d.shots % 2 === 0 ? 1 : -1) * r * 0.7;
  mouth.set(d.pos.x - Math.sin(d.facing) * r + Math.cos(d.facing) * side, d.pos.y + 1.2, d.pos.z - Math.cos(d.facing) * r - Math.sin(d.facing) * side);
  dir.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(mouth).normalize();
  d.shots++;
  if (fireOrb(w.orbs, mouth, dir, v.rubbleSpeed, v.rubbleDamage, d.kind, 'rubble')) w.events.push('dragonRubble', index, mouth.x, mouth.y, mouth.z);
}

/** The slam: a ring rolls out over the floor from its tail. */
export function tailSlam(d: Enemy, index: number, w: EnemyWorld) {
  const v = DRAGON.v;
  const r = radiusOf(d);
  // (Its back is to you: its tail is behind where it faces.)
  const x = d.pos.x + Math.sin(d.facing) * r;
  const z = d.pos.z + Math.cos(d.facing) * r;
  startQuake(w.quakes, x, 0, z, v.ringSpeed, v.ringReach, v.tailDamage, v.tailClear, d.kind);
  w.events.push('dragonTail', index, x, 0.1, z);
}

/** Throws you away from (dx, dz) off it. */
export function throwOff(player: PlayerState, dx: number, dz: number, dist: number, d: Enemy, shove: number, up: number) {
  const nx = dist > 1e-3 ? dx / dist : -Math.sin(d.facing);
  const nz = dist > 1e-3 ? dz / dist : -Math.cos(d.facing);
  player.vel.x += nx * shove;
  player.vel.z += nz * shove;
  player.vel.y = Math.max(player.vel.y, up);
  player.grounded = false;
}

/** How long it stays after each ground move (s): the punish windows. */
export function dragonRecover(move: number): number {
  const v = DRAGON.v;
  if (move === SWEEP) return v.sweepRecover;
  if (move === TAIL) return v.tailExposed;
  if (move === BLAST) return v.coreRecover;
  return v.swingRecover;
}
