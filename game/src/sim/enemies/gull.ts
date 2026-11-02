// Update 0.3.15 — floor 6's Thieving Gull (the unused Pigeon). It circles high over you, hovers a moment (its warning),
// then swoops through where your chest was. If it catches you it snatches Gull steals of your coins (with none to take,
// it pecks instead: Gull peck) and flies off with them, climbing: kill it within Gull escape and it drops them (where it
// dies they spill on the ground); otherwise it's gone, and so are they. Comes in pairs (wavePlan.ts). A hit
// flinches it and stops a swoop. Pure.
import { Vector3 } from 'three';
import { FOES_COVE } from '../../tuning/foesCove';
import type { CollisionWorld } from '../collisionWorld';
import { burstCoins } from '../combat/coins';
import { AIM_HEIGHT } from '../combat/turret';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, keepHeight, middle, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';

/** It circles this high (m), this far off (m); hovers this long before a swoop (s); swoops this far past you (m), down to
 *  this low (m); catches you this near (m); flees this much faster than it flies, up to this high (m); rests this long
 *  after a swoop that missed (s); a swoop lasts this long at most (s). */
const ALT = 4.5;
const RING = 6;
const HOVER = 0.45;
const OVERSHOOT = 3;
const LOWEST = 0.8;
const CATCH = 1.2;
const FLEE = 1.3;
const FLEE_ALT = 8;
const REST = 2.2;
const SWOOP_FOR = 2;

const mid = new Vector3();
const dir = new Vector3();

export function updateGull(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES_COVE.v;
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= ENEMY_STATS.gull().flinch) setPhase(e, e.shots > 0 ? 'charge' : 'chase');
      break;
    case 'recover':
      keepHeight(e, ALT, dt);
      circle(e, player, w, v.gullSpeed, 0, toward, dt);
      if (e.t >= REST) setPhase(e, 'chase');
      break;
    case 'chase':
      keepHeight(e, ALT, dt);
      if (player.dead) break;
      circle(e, player, w, v.gullSpeed, dist < RING ? RING : 0, toward, dt);
      if (e.cooldown <= 0 && Math.abs(e.pos.y - ALT) < 0.8 && seesInAir(e, player, world)) {
        setPhase(e, 'windup');
        w.events.push('gullDive', index, e.pos.x, e.pos.y + 0.5, e.pos.z);
      }
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, 10 * dt);
      if (e.t < HOVER) break;
      middle(e, e.from);
      e.aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
      dir.subVectors(e.aim, e.from).normalize();
      e.aim.addScaledVector(dir, OVERSHOOT);
      if (e.aim.y < LOWEST && dir.y < -1e-3) e.aim.addScaledVector(dir, (LOWEST - e.aim.y) / dir.y);
      e.struck = false;
      setPhase(e, 'dive');
      break;
    case 'dive':
      swoop(e, player, w, dt);
      break;
    case 'charge':
      flee(e, player, w, dt);
      break;
  }
}

/** Through where your chest was: catching you on the way, it snatches (or pecks). */
function swoop(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const h = ENEMY_STATS.gull().height / 2;
  middle(e, mid);
  dir.subVectors(e.aim, mid);
  const left = dir.length();
  const step = Math.min(left, v.gullDive * dt);
  if (left > 1e-4) dir.divideScalar(left);
  e.pos.set(mid.x + dir.x * step, mid.y + dir.y * step - h, mid.z + dir.z * step);
  e.facing = yawTo(e, e.aim.x, e.aim.z);
  middle(e, mid);
  if (!e.struck && !player.dead && Math.hypot(player.pos.x - mid.x, player.pos.y + AIM_HEIGHT - mid.y, player.pos.z - mid.z) < CATCH) {
    e.struck = true;
    const purse = w.money ?? 0;
    if (purse > 0) {
      const n = Math.min(purse, Math.round(v.gullSteal));
      w.money = purse - n;
      e.shots = n;
      w.events.push('gullSteal', n, mid.x, mid.y, mid.z);
      setPhase(e, 'charge');
      return;
    }
    damagePlayer(player, v.gullDamage, 'gull');
  }
  if (left - step <= 1e-3 || e.t >= SWOOP_FOR) {
    e.cooldown = REST;
    setPhase(e, 'recover');
  }
}

/** Away with your coins, climbing; gone if it gets away. */
function flee(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  keepHeight(e, FLEE_ALT, dt);
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  e.pos.x += (dx / d) * v.gullSpeed * FLEE * dt;
  e.pos.z += (dz / d) * v.gullSpeed * FLEE * dt;
  e.facing = turn(e.facing, Math.atan2(-dx, -dz), 6 * dt);
  if (e.t < v.gullEscape) return;
  w.events.push('gullEscape', e.shots, e.pos.x, e.pos.y, e.pos.z);
  e.shots = 0;
  e.alive = false;
}

/** Killed carrying your coins: it drops them (once), spilling on the ground under it. */
export function gullDrops(e: Enemy, _index: number, w: EnemyWorld) {
  if (e.shots <= 0) return;
  w.events.push('gullDrop', e.shots, e.pos.x, e.pos.y, e.pos.z);
  if (w.coins) w.money = (w.money ?? 0) + burstCoins(w.coins, mid.set(e.pos.x, 0, e.pos.z), e.shots, w.rng);
  e.shots = 0;
}
