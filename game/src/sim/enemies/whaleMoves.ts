// Update 0.2.11 — the Old Whale's moves (whale.ts picks them): its laps and its wake, its ram, its song, its inhale,
// its breach. Pure.
import { Vector3 } from 'three';
import { WHALE } from '../../tuning/whale';
import type { CollisionWorld } from '../collisionWorld';
import { segmentDistance2D } from '../combat/geometry';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase } from './enemy';
import { chest, dart, fishMiddle, groundUnder, swimTo, waterTop } from './fishSwim';
import { ENEMY_STATS } from './kinds';
import { fishLength } from './kinds6';

/** Its moves (Enemy.move). */
export const RAM = 0;
export const SONG = 1;
export const INHALE = 2;
export const BREACH = 3;
export const ROAR = 4;
/** Its roar lasts this long (s); on its laps it aims this far round ahead (rad); its ram goes this far past you (m);
 *  its mouth swallows you this close (m, past its body); its breach drifts over you this fast (m/s). */
export const ROAR_TIME = 1.8;
const LEAD = 0.5;
const PAST = 8;
const MOUTH = 1.5;
const DRIFT = 4;

const mid = new Vector3();
const to = new Vector3();

/** Its length (m), and its mouth's spot into `out`. */
export const whaleLength = (e: Enemy) => fishLength(e.kind, ENEMY_STATS[e.kind]().height);
export function mouthOf(e: Enemy, out: Vector3): Vector3 {
  fishMiddle(e, out);
  const half = whaleLength(e) / 2;
  return out.set(out.x - Math.sin(e.facing) * half, out.y, out.z - Math.cos(e.facing) * half);
}

/** How far you are (flat) from the line of its body. */
function offBody(e: Enemy, player: PlayerState): number {
  const half = whaleLength(e) / 2;
  const fx = -Math.sin(e.facing) * half;
  const fz = -Math.cos(e.facing) * half;
  return segmentDistance2D(e.pos.x - fx, e.pos.z - fz, e.pos.x + fx, e.pos.z + fz, player.pos.x, player.pos.z);
}

/** Its laps round its room (round Enemy.from, the portal, its own way round: Enemy.strafe), halfway up the water; its
 *  wake drags you along with it. */
export function lap(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = WHALE.v;
  const ang = Math.atan2(e.pos.z - e.from.z, e.pos.x - e.from.x) + e.strafe * LEAD;
  swimTo(e, e.from.x + Math.cos(ang) * v.lapRing, waterTop(w) / 2, e.from.z + Math.sin(ang) * v.lapRing, v.whaleSpeed, dt, w, world);
  if (offBody(e, player) <= v.wakeWidth) {
    player.current.x += -Math.sin(e.facing) * v.wakePull;
    player.current.z += -Math.cos(e.facing) * v.wakePull;
  }
}

/** Its ram's lane: from its middle through your chest, on past you. */
export function aimRam(e: Enemy, player: PlayerState) {
  fishMiddle(e, mid);
  to.set(player.pos.x, chest(player), player.pos.z).sub(mid);
  const len = Math.max(1e-3, to.length());
  e.aim.copy(mid).addScaledVector(to, (len + PAST) / len);
  e.struck = false;
}

/** Ramming along its lane: through you once; into a wall it's stunned. Returns false once it's over. */
export function ram(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld): boolean {
  const v = WHALE.v;
  const r = dart(e, player, v.ramSpeed, dt, world, () => {
    if (!damagePlayer(player, v.ramDamage, e.kind)) return;
    // (Thrown off its side.)
    const side = (player.pos.x - e.pos.x) * Math.cos(e.facing) - (player.pos.z - e.pos.z) * Math.sin(e.facing) >= 0 ? 1 : -1;
    throwYou(player, e, Math.cos(e.facing) * side, -Math.sin(e.facing) * side, 1, 14, 5);
  });
  if (r === 'on') return true;
  if (r === 'wall') {
    setPhase(e, 'stun');
    w.events.push('whaleCrash', index, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
  } else setPhase(e, 'recover');
  return false;
}

/** Its song rolling out from it (as far as it's gone in this blast): catches you once in the open, not behind
 *  anything. Returns false once it's out of reach. */
export function sing(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, world: CollisionWorld): boolean {
  const v = WHALE.v;
  const reach = v.songSpeed * e.t;
  fishMiddle(e, mid);
  to.set(player.pos.x, chest(player), player.pos.z).sub(mid);
  const dist = to.length();
  if (!e.struck && reach >= dist && !player.dead) {
    e.struck = true;
    const open = dist < 1e-3 || world.rayDistance(mid, to.divideScalar(dist), dist) >= dist - 0.5;
    if (open && dist <= v.songReach && damagePlayer(player, v.songDamage, e.kind)) w.events.push('whaleSongHit', index, player.pos.x, chest(player), player.pos.z);
  }
  return reach < v.songReach;
}

/** Drawing the water in: in front of it you're pulled to its mouth; at its mouth you're swallowed (and spat out).
 *  Returns false once it's over. */
export function inhale(e: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = WHALE.v;
  const s = ENEMY_STATS[e.kind]();
  mouthOf(e, mid);
  to.set(mid.x - player.pos.x, mid.y - chest(player), mid.z - player.pos.z);
  const dist = to.length();
  const ahead = -Math.sin(e.facing) * (player.pos.x - e.pos.x) - Math.cos(e.facing) * (player.pos.z - e.pos.z) > 0;
  if (dist <= s.radius + MOUTH && !player.dead) {
    if (damagePlayer(player, v.swallowDamage, e.kind)) w.events.push('whaleSwallow', index, mid.x, mid.y, mid.z);
    throwYou(player, e, -Math.sin(e.facing), -Math.cos(e.facing), 1, 16, 3);
    setPhase(e, 'recover');
    return false;
  }
  if (ahead && dist <= v.inhaleReach) {
    const flat = Math.max(1e-3, Math.hypot(to.x, to.z));
    const pull = v.inhalePull * (1 - (0.5 * dist) / v.inhaleReach);
    player.current.x += (to.x / flat) * pull;
    player.current.z += (to.z / flat) * pull;
  }
  return e.t < v.inhaleTime;
}

/** Rising to the top, drifting over you. */
export function rise(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = WHALE.v;
  const s = ENEMY_STATS[e.kind]();
  swimTo(e, player.pos.x, waterTop(w), player.pos.z, DRIFT, dt, w, world);
  e.pos.y = Math.min(waterTop(w) - s.height, e.pos.y + ((waterTop(w) - s.height) / v.breachRise) * dt);
}

/** Where it'll crash: under you now. */
export function markCrash(e: Enemy, player: PlayerState, w: EnemyWorld, world: CollisionWorld) {
  e.aim.set(player.pos.x, groundUnder(world, player.pos.x, player.pos.z, waterTop(w)), player.pos.z);
  e.struck = false;
  w.events.push('whaleBreachWarn', WHALE.v.breachReach, e.aim.x, e.aim.y, e.aim.z);
}

/** Crashing down on its spot: what's under it is hit; landing, its shock throws whatever's near the floor. Returns false
 *  once it's down. */
export function crash(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = WHALE.v;
  const s = ENEMY_STATS[e.kind]();
  e.pos.x += Math.sign(e.aim.x - e.pos.x) * Math.min(Math.abs(e.aim.x - e.pos.x), v.breachDrop * dt);
  e.pos.z += Math.sign(e.aim.z - e.pos.z) * Math.min(Math.abs(e.aim.z - e.pos.z), v.breachDrop * dt);
  e.pos.y = Math.max(e.aim.y, e.pos.y - v.breachDrop * dt);
  if (!e.struck && offBody(e, player) <= s.radius + BODY.radius && e.pos.y <= player.pos.y + BODY.height && e.pos.y + s.height >= player.pos.y) {
    e.struck = true;
    damagePlayer(player, v.breachDamage, e.kind);
  }
  if (e.pos.y > e.aim.y + 1e-4) return true;
  w.events.push('whaleCrashDown', v.breachReach, e.aim.x, e.aim.y, e.aim.z);
  const flat = Math.hypot(player.pos.x - e.aim.x, player.pos.z - e.aim.z);
  if (!e.struck && flat <= v.breachReach && player.pos.y - e.aim.y <= v.breachFloor && damagePlayer(player, v.breachDamage, e.kind)) {
    player.vel.y = Math.max(player.vel.y, 10);
    player.grounded = false;
  }
  setPhase(e, 'stun');
  return false;
}
