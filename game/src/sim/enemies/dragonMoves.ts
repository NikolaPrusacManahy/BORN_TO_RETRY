// Update 0.0.18 — the Dragon's five moves once their warning is over (dragon.ts picks them and warns): the fire beam
// (a straight line of fire from its mouth that slowly follows you; it stops at a wall or the floor, hurts you while
// you're in it and burns away any enemy in its line, its own side too), the fireballs (a burst at you, one after
// another), the claws (a swoop at you: the Demon's charge with its own numbers; a wall or a column stuns it), the wing
// swing (a wide sweep in front that blows you away) and the tail swing (it spins: the tail sweeps all round it, low
// enough to jump). Pure.
import { Vector3 } from 'three';
import { DRAGON } from '../../tuning/dragon';
import { wallBetween } from '../../world/navGrid';
import { fireOrb } from '../combat/orbs';
import { segmentDistance } from '../combat/geometry';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { ChargeSpec } from './charge';
import { Enemy, EnemyWorld, hitEnemy, isLive, radiusOf, setPhase, turn, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Which move (Enemy.move). */
export const BREATH = 0;
export const FIREBALLS = 1;
export const CLAWS = 2;
export const WING = 3;
export const TAIL = 4;
/** Update 0.0.21 — its flame burst (when you've stayed close too long). */
export const BURST = 5;
/** A swoop ending with nothing in its way: a short stop (s). */
const RUN_OUT = 0.6;
/** Its mouth: this share of its height up (above its hover), this share of its radius in front. */
const MOUTH_UP = 0.75;
const MOUTH_OUT = 0.9;

const SWOOP: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };
const mouth = new Vector3();
const dir = new Vector3();
const a = new Vector3();
const b = new Vector3();

/** Its flight and swoop speed now (faster once it rages). */
export const dragonPace = (d: Enemy) => (d.stage > 0 ? DRAGON.v.rageSpeed : 1);

/** Its mouth (where the beam and the fireballs start). */
export function dragonMouth(d: Enemy, out: Vector3): Vector3 {
  const v = DRAGON.v;
  const r = radiusOf(d) * MOUTH_OUT;
  return out.set(d.pos.x - Math.sin(d.facing) * r, d.pos.y + v.hover + v.dragonHeight * MOUTH_UP, d.pos.z - Math.cos(d.facing) * r);
}

/** The swoop's numbers as the knobs say now (one object, refilled). */
export function swoopSpec(d: Enemy): ChargeSpec {
  const v = DRAGON.v;
  SWOOP.speed = v.clawSpeed * dragonPace(d);
  SWOOP.range = v.clawRange;
  SWOOP.damage = v.clawDamage;
  SWOOP.shove = v.clawShove;
  SWOOP.height = v.dragonHeight;
  return SWOOP;
}

/** The beam starts: it breathes fire. */
export function startBreath(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  setPhase(d, 'breath');
  aimBeam(d, player, w);
  w.events.push('dragonBreath', index, mouth.x, mouth.y, mouth.z);
}

/** One tick of the beam: it turns slowly after you, burns what's in its line. Returns true once it's over. */
export function stepBreath(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DRAGON.v;
  d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), v.beamTurn * dt);
  aimBeam(d, player, w);
  // You, in its line.
  a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
  b.set(player.pos.x, player.pos.y + BODY.height - BODY.radius, player.pos.z);
  if (segmentDistance(mouth, d.aim, a, b) <= v.beamWidth + BODY.radius) damagePlayer(player, v.beamDamage, d.kind);
  // Anything else in its line burns away (no coins: you didn't kill it).
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    if (i === index || !isLive(e) || ENEMY_STATS[e.kind]().boss) continue;
    const s = ENEMY_STATS[e.kind]();
    const r = radiusOf(e);
    a.set(e.pos.x, e.pos.y + r, e.pos.z);
    b.set(e.pos.x, e.pos.y + Math.max(r, s.height - r), e.pos.z);
    if (segmentDistance(mouth, d.aim, a, b) > v.beamWidth + r) continue;
    hitEnemy(e, e.hp, 0, 0, 0);
    w.events.push('burnt', i, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
  }
  return d.t >= v.beamTime;
}

/** The beam's line: from its mouth the way it faces, tipped down at your chest; to its reach, the floor, or the first
 *  wall (Enemy.aim holds its end; the mouth is left in `mouth`). Update 0.0.20 — also while it charges (the view draws
 *  the warning line along it). */
export function aimBeam(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  dragonMouth(d, mouth);
  const flat = Math.max(1, Math.hypot(player.pos.x - mouth.x, player.pos.z - mouth.z));
  const pitch = Math.atan2(player.pos.y + AIM_HEIGHT - mouth.y, flat);
  const c = Math.cos(pitch);
  dir.set(-Math.sin(d.facing) * c, Math.sin(pitch), -Math.cos(d.facing) * c);
  let len = v.beamRange;
  if (dir.y < -1e-3) len = Math.min(len, mouth.y / -dir.y);
  const g = w.nav.large;
  if (wallBetween(g, mouth.x, mouth.z, mouth.x + dir.x * len, mouth.z + dir.z * len)) {
    // The first wall along it (halving in on it).
    let lo = 0;
    let hi = len;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(g, mouth.x, mouth.z, mouth.x + dir.x * mid, mouth.z + dir.z * mid)) hi = mid;
      else lo = mid;
    }
    len = lo;
  }
  d.aim.copy(mouth).addScaledVector(dir, len);
}

/** The beam's start, for the view (its end is Enemy.aim). */
export const beamFrom = (d: Enemy, out: Vector3) => dragonMouth(d, out);

/** One fireball at your chest from its mouth; counts it (Enemy.shots). */
export function fireball(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  d.shots++;
  dragonMouth(d, mouth);
  dir.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(mouth).normalize();
  if (fireOrb(w.orbs, mouth, dir, v.fireSpeed, v.fireDamage, d.kind)) w.events.push('dragonFireball', index, mouth.x, mouth.y, mouth.z);
}

/** After the first fireball, the rest of the burst, one every Fireball gap. */
export function moreFireballs(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  if (player.dead || d.shots >= v.fireballs || d.t < d.shots * v.fireGap) return;
  fireball(d, index, player, w);
}

/** The wing sweeps the arc in front of it: caught, you're hurt and blown away. */
export function wingSwing(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  w.events.push('dragonWing', index, d.pos.x - Math.sin(d.facing) * 3, d.pos.y + 0.1, d.pos.z - Math.cos(d.facing) * 3);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = Math.atan2(-dx, -dz);
  const off = Math.abs(Math.atan2(Math.sin(toward - d.facing), Math.cos(toward - d.facing)));
  if (dist > v.wingReach + radiusOf(d) || off > (v.wingArc * Math.PI) / 360 || player.pos.y - d.pos.y > v.dragonHeight) return;
  if (damagePlayer(player, v.wingDamage, d.kind)) throwOff(player, dx, dz, dist, d, v.wingShove, 4);
}

/** Update 0.0.21 — it bursts into flame: within Burst reach round it you're hurt and thrown far (run). */
export function flameBurst(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  w.events.push('dragonBurst', index, d.pos.x, d.pos.y + 0.1, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > v.burstRadius + radiusOf(d) || player.pos.y - d.pos.y > v.dragonHeight) return;
  if (damagePlayer(player, v.burstDamage, d.kind)) throwOff(player, dx, dz, dist, d, v.burstShove, 7);
}

/** It spins: the tail sweeps all round it, low (jump it). */
export function tailSwing(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DRAGON.v;
  w.events.push('dragonTail', index, d.pos.x, d.pos.y + 0.1, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > v.tailReach + radiusOf(d) || player.pos.y - d.pos.y > v.tailClear) return;
  if (damagePlayer(player, v.tailDamage, d.kind)) throwOff(player, dx, dz, dist, d, v.tailShove, 5);
}

function throwOff(player: PlayerState, dx: number, dz: number, dist: number, d: Enemy, shove: number, up: number) {
  const nx = dist > 1e-3 ? dx / dist : -Math.sin(d.facing);
  const nz = dist > 1e-3 ? dz / dist : -Math.cos(d.facing);
  player.vel.x += nx * shove;
  player.vel.z += nz * shove;
  player.vel.y = Math.max(player.vel.y, up);
  player.grounded = false;
}

/** How long it stays after each move (s). */
export function dragonRecover(move: number): number {
  const v = DRAGON.v;
  if (move === BREATH) return v.beamRecover;
  if (move === FIREBALLS) return v.fireGap * Math.max(0, v.fireballs - 1) + 0.5;
  if (move === CLAWS) return RUN_OUT;
  return v.swingRecover;
}
