// Update 0.0.15 — the Demon's three moves once their warning is over (demon.ts picks them and warns): the charge (a
// straight run that throws you aside; a wall or a column in its way stuns it), the leap (an arc to where you stood; the
// landing hurts close by and sends a quake ring rolling out), and the volley (a fan of fire orbs at you; two once it
// rages). Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { fireOrb } from '../combat/orbs';
import { startQuake } from '../combat/quakes';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';
import { pushOutOfWalls } from '../../world/navGrid';

/** Which move (Enemy.move). */
export const CHARGE = 0;
export const LEAP = 1;
export const VOLLEY = 2;
/** Above its landing by more than this (m), you're clear of the landing's blow (a ledge, a jump). */
const LAND_CLEAR = 1.5;
/** A charge ending with nothing in its way: a short stop (s). */
const RUN_OUT = 0.6;
/** A raging volley's second fan comes this long after the first (s), turned half a gap. */
const SECOND_FAN = 0.3;

const step = new Vector3();
const was = new Vector3();
const from = new Vector3();
const aim = new Vector3();
const dir = new Vector3();

/** Its walk and charge speed now (faster once it rages). */
export const pace = (d: Enemy) => (d.stage > 0 ? BOSS.v.rageSpeed : 1);

/** Off it runs along the way it faces (locked now). */
export function startCharge(d: Enemy, index: number, w: EnemyWorld) {
  d.from.copy(d.pos);
  d.aim.set(-Math.sin(d.facing), 0, -Math.cos(d.facing));
  d.struck = false;
  setPhase(d, 'charge');
  w.events.push('demonCharge', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

/** One tick of the charge. Returns 'crash' (it ran into something), 'out' (it ran its length) or 'on'. */
export function stepCharge(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): 'crash' | 'out' | 'on' {
  const v = BOSS.v;
  const dist = v.chargeSpeed * pace(d) * dt;
  was.copy(d.pos);
  d.pos.x += d.aim.x * dist;
  d.pos.z += d.aim.z * dist;
  pushOutOfWalls(w.nav.large, d.pos, radiusOf(d));
  // Pushed back against the way it runs (not just along a wall it grazes): it hit something.
  step.subVectors(d.pos, was);
  if (step.x * d.aim.x + step.z * d.aim.z < dist * 0.5) {
    setPhase(d, 'stun');
    w.events.push('demonCrash', index, d.pos.x + d.aim.x * radiusOf(d), d.pos.y + 2, d.pos.z + d.aim.z * radiusOf(d));
    return 'crash';
  }
  if (!d.struck) gore(d, index, player, w);
  if (Math.hypot(d.pos.x - d.from.x, d.pos.z - d.from.z) >= v.chargeRange) return 'out';
  return 'on';
}

/** Running into you: hurt and thrown aside, away from its line (once a charge). */
function gore(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BOSS.v;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  if (Math.hypot(dx, dz) > radiusOf(d) + BODY.radius || player.pos.y - d.pos.y > v.demonHeight * 0.8) return;
  d.struck = true;
  if (!damagePlayer(player, v.chargeDamage)) return;
  // Which side of its line you're on decides where you're thrown; mostly forward with it.
  const side = Math.sign(dx * -d.aim.z + dz * d.aim.x) || 1;
  player.vel.x += (d.aim.x * 0.7 - d.aim.z * side * 0.7) * v.chargeShove;
  player.vel.z += (d.aim.z * 0.7 + d.aim.x * side * 0.7) * v.chargeShove;
  player.vel.y = Math.max(player.vel.y, 7);
  player.grounded = false;
  w.events.push('demonGore', index, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** Off it leaps, for the free spot nearest where you stand now. False if there's nowhere to land. */
export function startLeap(d: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  d.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, d.aim)) return false;
  d.aim.y = d.pos.y;
  d.from.copy(d.pos);
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  setPhase(d, 'leap');
  w.events.push('demonLeap', index, d.pos.x, d.pos.y + 1, d.pos.z);
  return true;
}

/** One tick of the leap. Returns true once it has landed. */
export function stepLeap(d: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = BOSS.v;
  const k = Math.min(1, d.t / v.leapAir);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = d.from.y + 4 * v.leapArc * k * (1 - k);
  if (k < 1) return false;
  d.pos.copy(d.aim);
  walk(d, 0, 0, 0, w.nav.large);
  w.events.push('demonSlam', index, d.pos.x, d.pos.y, d.pos.z);
  startQuake(w.quakes, d.pos.x, d.pos.y, d.pos.z, v.quakeSpeed, v.quakeReach, v.quakeDamage, v.quakeClear);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= v.slamReach && player.pos.y - d.pos.y <= LAND_CLEAR && damagePlayer(player, v.slamDamage)) {
    const nx = dist > 1e-3 ? dx / dist : -Math.sin(d.facing);
    const nz = dist > 1e-3 ? dz / dist : -Math.cos(d.facing);
    player.vel.x += nx * v.slamShove;
    player.vel.z += nz * v.slamShove;
    player.vel.y = Math.max(player.vel.y, 6);
    player.grounded = false;
  }
  return true;
}

/** Where its orbs start: the trident's tip, in front of it at chest height. */
export function tipOf(d: Enemy, out: Vector3): Vector3 {
  const r = radiusOf(d) * 1.2;
  return out.set(d.pos.x - Math.sin(d.facing) * r, d.pos.y + BOSS.v.demonHeight * 0.5, d.pos.z - Math.cos(d.facing) * r);
}

/** A fan of fire orbs at your chest; `turn` (in gaps) shifts the fan sideways. */
export function volley(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, turn: number) {
  const v = BOSS.v;
  tipOf(d, from);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  const n = Math.max(1, Math.round(v.volleyOrbs));
  const spread = (v.volleySpread * Math.PI) / 180;
  let fired = false;
  for (let i = 0; i < n; i++) {
    const angle = (i - (n - 1) / 2 + turn) * spread;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    dir.set(aim.x * c + aim.z * s, aim.y, -aim.x * s + aim.z * c).normalize();
    fired = fireOrb(w.orbs, from, dir, v.volleySpeed, v.volleyDamage) || fired;
  }
  if (fired) w.events.push('demonVolley', index, from.x, from.y, from.z);
}

/** After its volley: a raging demon's second fan. */
export function secondFan(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  if (d.stage === 0 || d.struck || d.t < SECOND_FAN) return;
  d.struck = true;
  volley(d, index, player, w, 0.5);
}

/** How long it stands after each move (s). */
export function recoverTime(move: number): number {
  const v = BOSS.v;
  return move === LEAP ? v.leapRecover : move === VOLLEY ? v.volleyRecover : RUN_OUT;
}
