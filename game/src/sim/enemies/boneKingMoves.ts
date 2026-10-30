// Update 0.2.3 — the Bone King's moves once their warning is over (boneKing.ts picks them and warns): skeletons thrown at
// you one after another (each a bomb with a skeleton's look: sim/combat/bombs.ts, its spot glowing where it'll land),
// the jump-smash (to where you stand, twice: each landing hurts close by and sends a quake ring rolling out), the
// grab (sim/combat/grab.ts), the skeletons it calls up out of the floor (its second life, once), and its final blast
// (charged where it stands, as far as half the room's floor; once). Its fall to pieces and rebuilding (its second
// life), and its death (it crumbles where it stands). Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import { BOSS } from '../../tuning/boss';
import { FOES3 } from '../../tuning/foes3';
import { dropBomb } from '../combat/bombs';
import { startGrab } from '../combat/grab';
import { startQuake } from '../combat/quakes';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, spawnEnemy, walk, yawTo } from './enemy';
import { doomTime, ENEMY_STATS } from './kinds';

/** Which move (Enemy.move). */
export const THROW = 0;
export const SMASH = 1;
export const GRAB = 2;
export const SUMMON = 3;
export const BLAST = 4;
/** Its once-only moves (Enemy.deeds). */
export const SUMMONED = 1;
export const BLASTED = 2;
/** Update 0.2.7 (the designer: "can summon another set of skeleton after the massive explosion cast"). */
export const SUMMONED_AGAIN = 4;
/** Calling up its skeletons takes this long (s): it roars, arms up. */
export const SUMMON_WINDUP = 1.2;
/** The floor trembles this often while the blast charges (s). */
const RUMBLE = 0.3;
/** Above a landing or the blast by more than this (m), you're clear of it. */
const CLEAR = 2.5;
/** Its pieces (Enemy.shots while rebuilding): just fallen, lying, rising. */
const FALLEN = 0;
const LYING = 1;
const RISING = 2;
/** Where its skeletons come up: this far out from its body (m), and never nearer you than this. */
const SUMMON_OUT = 3;
const SUMMON_CLEAR = 3;

const hand = new Vector3();
const spot = new Vector3();

/** Its right hand raised, where a skeleton leaves it. */
function handOf(k: Enemy, out: Vector3): Vector3 {
  const h = BONE_KING.v.kingHeight;
  const r = radiusOf(k);
  // (Its right: the model faces you, so your left.)
  return out.set(k.pos.x - Math.sin(k.facing) * r * 0.6 + Math.cos(k.facing) * r * 0.7, k.pos.y + h * 0.85, k.pos.z - Math.cos(k.facing) * r * 0.6 - Math.sin(k.facing) * r * 0.7);
}

/** One skeleton thrown at where you stand; counts it (Enemy.shots). */
export function throwSkeleton(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BONE_KING.v;
  k.shots++;
  handOf(k, hand);
  spot.set(player.pos.x, k.pos.y, player.pos.z);
  if (dropBomb(w.bombs, hand, spot, v.throwFall, v.throwRadius, v.throwDamage, v.throwShove, k.kind, 'bones')) w.events.push('kingThrow', index, hand.x, hand.y, hand.z);
}

/** After the first, the rest of them, one every Throw gap. */
export function moreThrows(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BONE_KING.v;
  if (player.dead || k.shots >= Math.round(v.throws) || k.t < k.shots * v.throwGap) return;
  throwSkeleton(k, index, player, w);
}

/** Up it jumps, for the free spot nearest where you stand now. False if there's nowhere to land. */
export function startJump(k: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  k.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, k.aim)) return false;
  k.aim.y = k.pos.y;
  k.from.copy(k.pos);
  k.facing = yawTo(k, k.aim.x, k.aim.z);
  setPhase(k, 'leap');
  w.events.push('kingJump', index, k.pos.x, k.pos.y + 1, k.pos.z);
  return true;
}

/** One tick of a jump. Returns true once it has landed (it smashes the floor). */
export function stepJump(k: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const v = BONE_KING.v;
  const t = Math.min(1, k.t / v.smashAir);
  k.pos.x = k.from.x + (k.aim.x - k.from.x) * t;
  k.pos.z = k.from.z + (k.aim.z - k.from.z) * t;
  k.pos.y = k.from.y + 4 * v.smashArc * t * (1 - t);
  if (t < 1) return false;
  k.pos.copy(k.aim);
  walk(k, 0, 0, 0, w.nav.large);
  k.shots++;
  w.events.push('kingSmash', k.shots, k.pos.x, k.pos.y, k.pos.z);
  startQuake(w.quakes, k.pos.x, k.pos.y, k.pos.z, v.quakeSpeed, v.quakeReach, v.quakeDamage, BOSS.v.quakeClear, k.kind);
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= v.smashReach + radiusOf(k) && player.pos.y - k.pos.y <= CLEAR && damagePlayer(player, v.smashDamage, k.kind)) shove(player, dx, dz, dist, k, v.smashShove, 6);
  return true;
}

/** Its reach closes: within Grab reach of its body, in front of it and not above it, you're caught. */
export function tryGrab(k: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = BONE_KING.v;
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const off = Math.abs(Math.atan2(Math.sin(Math.atan2(-dx, -dz) - k.facing), Math.cos(Math.atan2(-dx, -dz) - k.facing)));
  if (player.dead || Math.hypot(dx, dz) - radiusOf(k) > v.grabReach || off > Math.PI * 0.4 || player.pos.y - k.pos.y > CLEAR) return false;
  setPhase(k, 'grab');
  startGrab(w, index, player);
  return true;
}

/** Its skeletons come up out of the floor round it (they rise as a fallen one rebuilds), never right by you. */
export function summon(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BONE_KING.v;
  k.deeds |= k.deeds & SUMMONED ? SUMMONED_AGAIN : SUMMONED;
  w.events.push('kingSummon', index, k.pos.x, k.pos.y + v.kingHeight * 0.8, k.pos.z);
  const n = Math.round(v.summon);
  const base = yawTo(k, player.pos.x, player.pos.z);
  for (let i = 0; i < n; i++) {
    const a = base + Math.PI + ((i - (n - 1) / 2) * Math.PI * 2) / Math.max(3, n);
    spot.set(k.pos.x - Math.sin(a) * (radiusOf(k) + SUMMON_OUT), 0, k.pos.z - Math.cos(a) * (radiusOf(k) + SUMMON_OUT));
    if (Math.hypot(spot.x - player.pos.x, spot.z - player.pos.z) < SUMMON_CLEAR) spot.set(k.pos.x * 2 - spot.x, 0, k.pos.z * 2 - spot.z);
    if (!freeSpotNear(w.nav.small, spot.x, spot.z, spot)) continue;
    spot.y = k.pos.y;
    const s = spawnEnemy(w.enemies, 'skeleton', spot, yawTo(k, player.pos.x, player.pos.z));
    if (s < 0) continue;
    const e = w.enemies[s];
    // Lying in pieces, just about to rise; its own revive still to come (rising counts one).
    setPhase(e, 'rebuild');
    e.shots = LYING;
    e.t = FOES3.v.skeletonDown;
    e.stage = -1;
    e.facing = yawTo(e, player.pos.x, player.pos.z);
    w.events.push('enemySpawn', s, spot.x, spot.y, spot.z);
  }
}

/** Its final blast starts charging: its reach, half the room's floor (as a circle round it). */
export function startBlast(k: Enemy, index: number, w: EnemyWorld) {
  const v = BONE_KING.v;
  k.deeds |= BLASTED;
  setPhase(k, 'blast');
  const g = w.nav.small;
  let free = 0;
  for (let i = 0; i < g.blocked.length; i++) if (!g.blocked[i]) free++;
  // (A bare grid has no floor to measure: a 30 m room.)
  const area = free > 0 ? free * g.cell * g.cell : 900;
  k.near = Math.sqrt((v.blastShare * area) / Math.PI);
  k.strafeTime = 0;
  w.events.push('kingCharge', index, k.pos.x, k.pos.y + 0.1, k.pos.z);
}

/** One tick of the charge: the floor trembles; at its end, the blast. Returns true once it has gone off. */
export function stepBlast(k: Enemy, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = BONE_KING.v;
  k.strafeTime -= dt;
  if (k.strafeTime <= 0 && k.t < v.blastCharge) {
    k.strafeTime = RUMBLE;
    w.events.push('kingRumble', Math.min(1, k.t / v.blastCharge), k.pos.x, k.pos.y, k.pos.z);
  }
  if (k.t < v.blastCharge) return false;
  w.events.push('kingBlast', k.near, k.pos.x, k.pos.y + 0.1, k.pos.z);
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= k.near && player.pos.y - k.pos.y <= CLEAR * 2 && damagePlayer(player, v.blastDamage, k.kind)) shove(player, dx, dz, dist, k, v.blastShove, 8);
  return true;
}

/** Brought down the first time: it lies in pieces (nothing hurts it), then rebuilds (its bar filling again) and stands
 *  in its second life. Returns true once it stands. */
export function stepRebuild(k: Enemy, index: number, w: EnemyWorld): boolean {
  const v = BONE_KING.v;
  const full = ENEMY_STATS[k.kind]().hp;
  if (k.shots === FALLEN) {
    k.shots = LYING;
    k.hp = 0;
    w.events.push('kingCollapse', index, k.pos.x, k.pos.y + 1, k.pos.z);
  }
  if (k.shots === LYING && k.t >= v.kingDown) {
    k.shots = RISING;
    w.events.push('kingRise', index, k.pos.x, k.pos.y + 1, k.pos.z);
  }
  if (k.shots === RISING) k.hp = full * Math.min(1, (k.t - v.kingDown) / Math.max(0.1, v.kingRise));
  if (k.t < v.kingDown + v.kingRise) return false;
  k.stage = 1;
  k.hp = full;
  k.shots = 0;
  setPhase(k, 'chase');
  w.events.push('kingRoar', index, k.pos.x, k.pos.y + v.kingHeight * 0.85, k.pos.z);
  return true;
}

/** Its death: it crumbles where it stands (its death clip), and its bones burst at the end of the show. */
export function doomKing(k: Enemy, index: number, w: EnemyWorld) {
  if (k.struck || k.t < doomTime()) return;
  k.struck = true;
  w.events.push('bossBurst', index, k.pos.x, k.pos.y + ENEMY_STATS[k.kind]().height * 0.3, k.pos.z);
}

function shove(player: PlayerState, dx: number, dz: number, dist: number, k: Enemy, speed: number, up: number) {
  const nx = dist > 1e-3 ? dx / dist : -Math.sin(k.facing);
  const nz = dist > 1e-3 ? dz / dist : -Math.cos(k.facing);
  player.vel.x += nx * speed;
  player.vel.z += nz * speed;
  player.vel.y = Math.max(player.vel.y, up);
  player.grounded = false;
}
