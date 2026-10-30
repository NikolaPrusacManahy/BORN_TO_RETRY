// Update 0.2.4 — the Dino's moves once their warning is over (dino.ts picks them and warns): its charge (the Demon's
// run with its own numbers, steering after you as it goes; a wall or a column stuns it), its bites (snaps in a row,
// each a lunge), its tail (it spins: the tail sweeps all round, low enough to jump), its stomps (each a quake ring),
// its pounce (raging: a leap to where you stand, its landing glowing on the floor) and its roar (raging, once:
// Update 0.2.4, the Velociraptor's pack: small Dinos come running from round you). Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import { startQuake } from '../combat/quakes';
import { BOSS } from '../../tuning/boss';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import type { ChargeSpec } from './demonMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, spawnEnemy, walk, yawTo } from './enemy';

/** Which move (Enemy.move). */
export const CHARGE = 0;
export const BITE = 1;
export const TAIL = 2;
export const STOMP = 3;
export const POUNCE = 4;
/** Each snap lunges this far forward at most (m); its jaws reach this far round it (degrees off its facing). */
const LUNGE = 1.6;
const JAWS = 55;
/** Its roar lasts this long (s); its pack comes in this far round you (m). */
export const ROAR_TIME = 1.4;
const CALL_OUT = 6;

const SPEC: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };
const spot = new Vector3();

/** How much quicker it is once it rages. */
export const dinoPace = (d: Enemy) => (d.stage > 0 ? DINO.v.ragePace : 1);

/** Its charge's numbers as the knobs say now (one object, refilled). */
export function dinoCharge(d: Enemy): ChargeSpec {
  const v = DINO.v;
  SPEC.speed = v.chargeSpeed * dinoPace(d);
  SPEC.range = v.chargeRange;
  SPEC.damage = v.chargeDamage;
  SPEC.shove = v.chargeShove;
  SPEC.height = v.dinoHeight;
  return SPEC;
}

/** Charging, it turns its run after you (Charge steering). */
export function steer(d: Enemy, player: PlayerState, dt: number) {
  const want = yawTo(d, player.pos.x, player.pos.z);
  const now = Math.atan2(-d.aim.x, -d.aim.z);
  const diff = Math.atan2(Math.sin(want - now), Math.cos(want - now));
  const turned = now + Math.max(-DINO.v.chargeSteer * dt, Math.min(DINO.v.chargeSteer * dt, diff));
  d.aim.set(-Math.sin(turned), 0, -Math.cos(turned));
  d.facing = turned;
}

/** One snap: a lunge at you, and its jaws close (you're hurt if they're on you). */
export function snap(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  d.facing = yawTo(d, player.pos.x, player.pos.z);
  const lunge = Math.min(LUNGE, Math.max(0, dist - radiusOf(d) - 0.8));
  if (lunge > 0) walk(d, dx / dist, dz / dist, lunge, w.nav.large);
  w.events.push('dinoBite', index, d.pos.x - Math.sin(d.facing) * radiusOf(d), d.pos.y + v.dinoHeight * 0.55, d.pos.z - Math.cos(d.facing) * radiusOf(d));
  const left = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(yawTo(d, player.pos.x, player.pos.z) - d.facing), Math.cos(yawTo(d, player.pos.x, player.pos.z) - d.facing)));
  if (left > v.biteReach + radiusOf(d) * 0.5 || off > (JAWS * Math.PI) / 180 || player.pos.y - d.pos.y > v.dinoHeight * 0.7) return;
  if (damagePlayer(player, v.biteDamage, d.kind)) throwYou(player, d, dx, dz, dist, 7, 3);
}

/** It spins: its tail sweeps all round, low (jump it). */
export function tailSweep(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  w.events.push('dinoTail', index, d.pos.x, d.pos.y + 0.3, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > v.tailReach + radiusOf(d) || player.pos.y - d.pos.y > v.tailClear) return;
  if (damagePlayer(player, v.tailDamage, d.kind)) throwYou(player, d, dx, dz, dist, 12, 5);
}

/** A stomp: a quake ring rolls out (jump it). */
export function stomp(d: Enemy, w: EnemyWorld) {
  const v = DINO.v;
  d.shots++;
  w.events.push('dinoStomp', d.shots, d.pos.x, d.pos.y, d.pos.z);
  startQuake(w.quakes, d.pos.x, d.pos.y, d.pos.z, v.quakeSpeed, v.quakeReach, v.quakeDamage, BOSS.v.quakeClear, d.kind);
}

/** Off it pounces, for the free spot nearest where you stand. False if there's nowhere to land. */
export function startPounce(d: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  d.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, d.aim)) return false;
  d.aim.y = d.pos.y;
  d.from.copy(d.pos);
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  setPhase(d, 'leap');
  w.events.push('dinoPounce', index, d.pos.x, d.pos.y + 1, d.pos.z);
  return true;
}

/** One tick of the pounce. Returns true once it has landed. */
export function stepPounce(d: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = DINO.v;
  const k = Math.min(1, d.t / v.pounceAir);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = d.from.y + 4 * v.pounceArc * k * (1 - k);
  if (k < 1) return false;
  d.pos.copy(d.aim);
  walk(d, 0, 0, 0, w.nav.large);
  w.events.push('dinoLand', index, d.pos.x, d.pos.y, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= v.pounceReach + radiusOf(d) && player.pos.y - d.pos.y <= 2.5 && damagePlayer(player, v.pounceDamage, d.kind)) throwYou(player, d, dx, dz, dist, 12, 7);
  return true;
}

/** Its roar: its pack (small Dinos) comes running from round you. */
export function roar(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  setPhase(d, 'roar');
  w.events.push('dinoRoar', index, d.pos.x, d.pos.y + v.dinoHeight * 0.8, d.pos.z);
  const n = Math.round(v.rageCactoros);
  for (let i = 0; i < n; i++) {
    const a = w.rng() * Math.PI * 2;
    spot.set(player.pos.x + Math.cos(a) * CALL_OUT, 0, player.pos.z + Math.sin(a) * CALL_OUT);
    if (!freeSpotNear(w.nav.small, spot.x, spot.z, spot)) continue;
    spot.y = d.pos.y;
    const s = spawnEnemy(w.enemies, 'dinoBlob', spot, yawTo(d, player.pos.x, player.pos.z));
    if (s >= 0) w.events.push('enemySpawn', s, spot.x, spot.y, spot.z);
  }
}

function throwYou(player: PlayerState, d: Enemy, dx: number, dz: number, dist: number, shove: number, up: number) {
  const nx = dist > 1e-3 ? dx / dist : -Math.sin(d.facing);
  const nz = dist > 1e-3 ? dz / dist : -Math.cos(d.facing);
  player.vel.x += nx * shove;
  player.vel.z += nz * shove;
  player.vel.y = Math.max(player.vel.y, up);
  player.grounded = false;
}
