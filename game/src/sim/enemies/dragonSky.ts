// Update 0.0.21 — the Dragon's second phase (the designer: it flies into the air and bombs the ground).
// Update 0.3.49 — anew, from the Boss Design Bible: phase 2 is in the sky. It circles a way off you (Sky height, Sky
// distance), and every pause:
//  - Dive Bomb: a shadow grows on you (it follows you all through the tell), a screech; then it locks on and dives there:
//    dash aside at the last moment. It sticks in the ground (Dive stuck), then chains its Tail Quake.
//  - Ember Rain: it hovers, its chest pulsing; fireballs fall, the first on you, each leaving a burning pool.
//  - or it comes down and chains its Flame Sweep into its Wing Gust, quicker than before.
// Then back up. Enemy.cooldown: till its next move up there; Enemy.aim: where it'll land; Enemy.shots: embers dropped;
// Enemy.strafe: the same move picked in a row. Pure.
import { Vector3 } from 'three';
import { DRAGON } from '../../tuning/dragon';
import { dropBomb } from '../combat/bombs';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { DIVE, dragonMouth, EMBER, SWEEP, throwOff } from './dragonMoves';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';

/** The odds of each move up there (Dive Bomb, Ember Rain, down to sweep). **(placeholders)** */
const ODDS = [0.45, 0.3, 0.25];
const MOVES = [DIVE, EMBER, SWEEP];

const mouth = new Vector3();
const spot = new Vector3();

/** Up it goes, screaming only as phase 2 starts (`scream`). */
export function takeOff(d: Enemy, index: number, w: EnemyWorld, scream: boolean) {
  setPhase(d, 'sky');
  d.cooldown = DRAGON.v.ragePause;
  if (!scream) return;
  dragonMouth(d, mouth);
  w.events.push('dragonScream', index, mouth.x, mouth.y, mouth.z);
}

/** Toward `to` (m up) at its climb's rate. */
export function climb(d: Enemy, to: number, dt: number) {
  const v = DRAGON.v;
  const rate = v.skyAlt / Math.max(0.1, v.skyRise);
  d.pos.y += Math.max(-rate * dt, Math.min(rate * dt, to - d.pos.y));
}

/** One tick circling up there: facing you, a little way off. Returns the move to warn of when it's time (−1: not yet). */
export function stepSky(d: Enemy, player: PlayerState, w: EnemyWorld, dt: number): number {
  const v = DRAGON.v;
  climb(d, v.skyAlt, dt);
  hover(d, player, w, dt);
  if (d.cooldown > 0 || player.dead || d.pos.y < v.skyAlt - 0.01) return -1;
  return pick(d, w);
}

/** Facing you, a little way off you. */
function hover(d: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DRAGON.v;
  d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), v.dragonTurn * dt);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > v.skyKeep + 0.5) walk(d, dx / dist, dz / dist, Math.min(v.skyDrift * dt, dist - v.skyKeep), w.nav.large);
}

/** The next move up there (seeded); never the same three times running. */
function pick(d: Enemy, w: EnemyWorld): number {
  let move = DIVE;
  for (let tries = 0; tries < 3; tries++) {
    let roll = w.rng();
    for (let m = 0; m < ODDS.length; m++) {
      roll -= ODDS[m];
      if (roll < 0) {
        move = MOVES[m];
        break;
      }
    }
    if (move !== d.move || d.strafe < 2) break;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

/** A tick of its dive's tell: up there, its shadow on you (Enemy.aim follows you). */
export function stepDiveTell(d: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  hover(d, player, w, dt);
  d.aim.set(player.pos.x, 0, player.pos.z);
}

/** One tick of its dive, straight at where it locked on. Returns true the tick it lands. */
export function stepDive(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DRAGON.v;
  // (All the way by its time: the tick it lands, k is 1.)
  const k = Math.min(1, dt / Math.max(dt, v.diveFall - d.t));
  d.pos.x += (d.aim.x - d.pos.x) * k;
  d.pos.y += (d.aim.y - d.pos.y) * k;
  d.pos.z += (d.aim.z - d.pos.z) * k;
  if (k < 1) return false;
  d.pos.y = 0;
  w.events.push('dragonSlam', index, d.pos.x, 0.1, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= v.diveRadius + BODY.radius && player.pos.y - d.pos.y <= v.dragonHeight && damagePlayer(player, v.diveDamage, d.kind)) throwOff(player, dx, dz, dist, d, v.diveShove, 6);
  return true;
}

/** Its dive starts: locked on where you are, on floor it can stand on. */
export function startDive(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  spot.set(player.pos.x, 0, player.pos.z);
  if (freeSpotNear(w.nav.large, player.pos.x, player.pos.z, spot)) d.aim.set(spot.x, 0, spot.z);
  else d.aim.set(player.pos.x, 0, player.pos.z);
  setPhase(d, 'dive');
  dragonMouth(d, mouth);
  w.events.push('dragonDive', index, mouth.x, mouth.y, mouth.z);
}

/** One tick of its rain, hovering. Returns true once the last has dropped. */
export function stepEmbers(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DRAGON.v;
  hover(d, player, w, dt);
  if (player.dead || d.shots >= v.embers) return true;
  if (d.t < d.shots * v.emberGap) return false;
  // The first on you; the rest anywhere near you.
  const a = w.rng() * Math.PI * 2;
  const r = d.shots === 0 ? 0 : v.emberSpread * Math.sqrt(w.rng());
  spot.set(player.pos.x + Math.cos(a) * r, 0, player.pos.z + Math.sin(a) * r);
  d.shots++;
  dragonMouth(d, mouth);
  if (dropBomb(w.bombs, mouth, spot, v.bombFall, v.bombRadius, v.bombDamage, v.bombShove, d.kind, 'ember')) {
    w.events.push('dragonFireball', index, mouth.x, mouth.y, mouth.z);
    w.events.push('dragonBomb', index, mouth.x, mouth.y, mouth.z);
  }
  return false;
}
