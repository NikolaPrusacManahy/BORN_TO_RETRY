// Update 0.2.10 — the Bog Brute (floor 5's mini boss, the Monkroose; Claude's proposal as accepted). It walks at you and,
// between moves (Bog Brute pause): close up it swipes; at high water it dives under (out of reach), hunts you under the
// water, and the water rings where it'll come up (Bog Brute rise: your warning) before it bursts up under you; at low
// water it crouches (Bog Brute crouch) and leaps to where you were. Its rise and its landing hit close by and send a
// wave out across the floor (jump it). Only a hard hit staggers it. Enemy.move: 0 its swipe, 1 its rise, 2 its leap.
// Pure.
import { FOES5B } from '../../tuning/foes5b';
import { startQuake } from '../combat/quakes';
import { WADE_MIN } from '../dungeon/tide';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { BURIED } from './cactoro';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { closeIn } from './moves';
import { armed } from './tokens';

const TURN = 4;
/** Its swipe: the wind-up (s), its reach (m) and arc in front (rad). */
const SWIPE_WINDUP = 0.55;
const SWIPE_REACH = 3.2;
const ARC = 1.2;
/** Its leap's height over the line (m); close enough to come up (m). */
const LEAP_UP = 3.5;
const THERE = 1;
/** Its wave clears feet this high (m: a jump). */
const WAVE_CLEAR = 0.7;
/** It walks in to this far (m). */
const STOP = 2.6;

export function bogWindup(move: number): number {
  return move === 2 ? FOES5B.v.leapWindup : move === 1 ? FOES5B.v.diveWarn : SWIPE_WINDUP;
}

export function updateBogBrute(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES5B.v;
  const s = ENEMY_STATS[e.kind]();
  e.cooldown = Math.max(0, e.cooldown - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (armed(e) && e.cooldown <= 0) {
        if (dist <= SWIPE_REACH + s.radius * 0.5) {
          e.move = 0;
          setPhase(e, 'windup');
          w.events.push('bogSwipeWindup', index, e.pos.x, e.pos.y + v.bogHeight * 0.7, e.pos.z);
          break;
        }
        if (w.tide >= WADE_MIN) {
          w.events.push('bogDive', index, e.pos.x, w.tide, e.pos.z);
          e.pos.y = e.prev.y = BURIED;
          setPhase(e, 'burrow');
          break;
        }
        e.move = 2;
        e.aim.set(player.pos.x, 0, player.pos.z);
        setPhase(e, 'windup');
        w.events.push('bogCrouch', index, e.pos.x, e.pos.y + v.bogHeight * 0.4, e.pos.z);
        break;
      }
      closeIn(e, player, w, 'large', v.bogSpeed, STOP, TURN, dt);
      break;
    case 'burrow': {
      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      if (dist > THERE) walk(e, dx / dist, dz / dist, Math.min(dist, v.bogSwim * dt), w.nav.large);
      if (dist <= THERE || e.t >= v.diveFind || w.tide < WADE_MIN) {
        e.move = 1;
        setPhase(e, 'windup');
        w.events.push('bogRise', index, e.pos.x, Math.max(w.tide, 0.05), e.pos.z);
      }
      break;
    }
    case 'windup':
      if (e.move === 0) e.facing = turn(e.facing, toward, TURN * 0.4 * dt);
      else if (e.move === 2) e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), TURN * dt);
      if (e.t < bogWindup(e.move)) break;
      if (e.move === 0) {
        swipe(e, index, player, w);
      } else if (e.move === 1) {
        e.pos.y = e.prev.y = 0;
        e.facing = toward;
        burst(e, index, player, w, v.diveReach, v.diveDamage);
      } else {
        e.from.copy(e.pos);
        setPhase(e, 'leap');
        w.events.push('bogLeap', index, e.pos.x, e.pos.y + v.bogHeight * 0.5, e.pos.z);
      }
      break;
    case 'leap': {
      const k = Math.min(1, e.t / v.leapAir);
      e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
      e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
      e.pos.y = 4 * LEAP_UP * k * (1 - k);
      if (k >= 1) {
        e.pos.y = e.prev.y = 0;
        burst(e, index, player, w, v.slamReach, v.slamDamage);
      }
      break;
    }
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= 0.7) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Close up, in front. */
function swipe(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES5B.v;
  const s = ENEMY_STATS[e.kind]();
  w.events.push('bogSwipe', index, e.pos.x - Math.sin(e.facing) * 2, e.pos.y + v.bogHeight * 0.5, e.pos.z - Math.cos(e.facing) * 2);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
  if (Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= SWIPE_REACH + s.radius && off <= ARC && Math.abs(player.pos.y - e.pos.y) < 2.5) damagePlayer(player, v.swipeDamage, e.kind);
  e.cooldown = v.bogPause;
  setPhase(e, 'recover');
}

/** Bursting up out of the water, or landing: close by you're hurt and thrown up; a wave rolls out. */
function burst(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, reach: number, damage: number) {
  const v = FOES5B.v;
  w.events.push('bogSlam', index, e.pos.x, Math.max(w.tide, 0.05), e.pos.z);
  startQuake(w.quakes, e.pos.x, 0, e.pos.z, v.waveSpeed, v.waveReach, v.waveDamage, WAVE_CLEAR, e.kind);
  const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (d <= reach + ENEMY_STATS[e.kind]().radius && player.pos.y - e.pos.y < 2 && damagePlayer(player, damage, e.kind)) {
    player.vel.y = Math.max(player.vel.y, 6);
    player.grounded = false;
  }
  e.cooldown = v.bogPause;
  setPhase(e, 'recover');
}
