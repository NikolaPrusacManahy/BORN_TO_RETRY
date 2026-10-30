// Update 0.2.4 — the Hywirl (floor 4's flier; the designer: enemies that "evade", "smarter than ordinary enemies"). A
// whirlwind spirit that keeps out of your sights: it drifts round you Hywirl circles at off, making for your back; look
// at it and it darts aside out of your aim (then a rest); some of your blows it darts away from (evade.ts). It strikes
// only from your blind side (further than Hywirl blind side off where you look): it gathers its wind (the warning: it
// howls), then rushes straight through where you are, its gust hurting you and throwing you along. Turn to face it and
// it breaks off. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import type { CollisionWorld } from '../collisionWorld';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { aimedAt, offYourLook, slideAside } from './evade';
import { keepHeight, seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';

/** Its height over the floor (m), your aim's angle it darts from (degrees), its turn rate (rad/s). */
const ALT = 2.4;
const AIM_CONE = 9;
const TURN = 8;
/** It rushes this far past you (m), at your chest's height; then rests this long before it may strike again (s). */
const PAST = 4;
const REST = 2.6;
/** Its gust catches you this close to its line (m). */
const GUST_WIDTH = 1.4;

const target = new Vector3();

export function updateHywirl(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase !== 'charge') keepHeight(e, ALT, dt);
  // Looked at: it darts out of your sights (not mid-rush).
  if (!player.dead && e.phase !== 'charge' && e.blink <= 0 && aimedAt(player, e, AIM_CONE)) {
    slideAside(e, player.pos.x, player.pos.z, v.hywirlDart, w.rng() < 0.5 ? 1 : -1);
    e.blink = v.hywirlDartRest;
    w.events.push('hywirlDart', index, e.pos.x, e.pos.y + 0.7, e.pos.z);
    if (e.phase === 'windup') setPhase(e, 'chase');
  }
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= 0.4) setPhase(e, 'chase');
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      // Faced, it breaks off.
      if (offYourLook(player, e) < ((v.hywirlBlind * 0.6) * Math.PI) / 180) {
        setPhase(e, 'chase');
        break;
      }
      if (e.t >= v.hywirlWindup) rush(e, index, player, w);
      break;
    case 'charge': {
      // Through where you were, and on past.
      const dx = e.aim.x - e.pos.x;
      const dz = e.aim.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      const step = v.gustSpeed * dt;
      walk(e, dx / Math.max(d, 1e-3), dz / Math.max(d, 1e-3), Math.min(d, step), w.nav.air);
      e.pos.y += (e.aim.y - e.pos.y) * Math.min(1, dt * 6);
      if (!e.struck && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= GUST_WIDTH && Math.abs(player.pos.y + 1 - e.pos.y) < 2) gust(e, index, player, w);
      if (d <= step + 0.05 || e.t > 2) {
        setPhase(e, 'recover');
        e.cooldown = REST;
      }
      break;
    }
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      // Behind you, out of sight, and ready: it gathers its wind.
      const blind = offYourLook(player, e) >= (v.hywirlBlind * Math.PI) / 180;
      if (e.cooldown <= 0 && blind && dist <= v.hywirlRing * 1.8 && seesInAir(e, player, world)) {
        setPhase(e, 'windup');
        w.events.push('hywirlWindup', index, e.pos.x, e.pos.y + 0.7, e.pos.z);
        break;
      }
      // Round to your back, at its ring.
      target.set(player.pos.x + Math.sin(player.yaw) * v.hywirlRing, 0, player.pos.z + Math.cos(player.yaw) * v.hywirlRing);
      const dx = target.x - e.pos.x;
      const dz = target.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5) walk(e, dx / d, dz / d, Math.min(d, s.speed * dt), w.nav.air);
      break;
    }
    default:
      break;
  }
}

/** Off it rushes, through where you are now and on past. */
function rush(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  e.aim.set(player.pos.x + (dx / d) * PAST, player.pos.y + 1, player.pos.z + (dz / d) * PAST);
  e.struck = false;
  setPhase(e, 'charge');
  w.events.push('hywirlGust', index, e.pos.x, e.pos.y, e.pos.z);
}

/** Its gust: you're hurt and thrown along its way. */
function gust(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES4.v;
  e.struck = true;
  if (!damagePlayer(player, v.gustDamage, e.kind)) return;
  const dx = e.aim.x - e.pos.x;
  const dz = e.aim.z - e.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  player.vel.x += (dx / d) * v.gustShove;
  player.vel.z += (dz / d) * v.gustShove;
  player.vel.y = Math.max(player.vel.y, 5);
  player.grounded = false;
  w.events.push('hywirlHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
}
