// Update 0.2.10 — the Jelly (floor 5, the Pink Blob; a floater over the water, on the fliers' grid). It drifts at you,
// bobbing; once you're in its reach it glows (Jelly glow: your warning) and shocks the water round it. Out of the water
// (dry, on a ledge, at low water) its shock reaches you only close by (Jelly shock, dry); wading at high water it runs
// through the water to you from far off (Jelly shock, wading): the high ground is safe. Pure.
import { FOES5 } from '../../tuning/foes5';
import { WADE_MIN } from '../dungeon/tide';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { flyCloser, keepHeight } from './fly';
import { ENEMY_STATS } from './kinds';

/** It floats this high (m) and bobs this much (m) this fast (rad/s). */
const ALT = 0.7;
const BOB = 0.15;
const BOB_RATE = 2.2;
const TURN = 4;
/** It rests this long after a shock (s), and drifts no closer than this (m). */
const RECOVER = 0.6;
const CLOSE = 1.6;

/** You're wading: in water deep enough, at its level or under (the room's water: `tide`). */
export const wadingIn = (player: PlayerState, tide: number) => tide >= WADE_MIN && player.grounded && player.pos.y < tide - 0.05;

/** How far its shock reaches you now (m). */
export const shockReach = (player: PlayerState, tide: number) => (wadingIn(player, tide) ? FOES5.v.jellyFar : FOES5.v.jellyNear);

export function updateJelly(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  e.cooldown = Math.max(0, e.cooldown - dt);
  keepHeight(e, Math.max(w.tide, 0) + ALT + BOB * Math.sin(e.t * BOB_RATE + index), dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (e.cooldown <= 0 && dist <= shockReach(player, w.tide) * 0.9 && Math.abs(player.pos.y - e.pos.y) < 3) {
        setPhase(e, 'windup');
        w.events.push('jellyGlow', index, e.pos.x, e.pos.y + v.jellyHeight * 0.5, e.pos.z);
        break;
      }
      if (dist > CLOSE) flyCloser(e, player, w, v.jellySpeed, toward, dt);
      else e.facing = turn(e.facing, toward, TURN * dt);
      break;
    case 'windup':
      if (e.t < v.jellyGlow) break;
      {
        const reach = shockReach(player, w.tide);
        // (value: how far it reached, for the ring.)
        w.events.push('jellyShock', reach, e.pos.x, Math.max(w.tide, 0.05), e.pos.z);
        if (Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= reach && Math.abs(player.pos.y - e.pos.y) < 3) damagePlayer(player, v.jellyDamage, e.kind);
      }
      e.cooldown = v.jellyGap;
      setPhase(e, 'recover');
      break;
    case 'recover':
      if (e.t >= RECOVER) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}
