// Update 0.2.10 — the Urchin (floor 5, the Green Spiky Blob). It creeps at you, its spikes in; close enough, it curls
// up with its spikes out (Urchin curl: your warning) and rolls straight at where you were, throwing you aside if it
// rolls into you, until it stops (its roll's time, or a wall). It stays spiked Urchin stays spiked, then its spikes go
// in for Urchin open: now you can hit it. Hit it with its spikes out and it takes nothing; you take its thorns
// (evade.ts, CombatState.thorns). Enemy.stage: 1 while its spikes are out. Pure.
import { FOES5 } from '../../tuning/foes5';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { closeIn } from './moves';
import { armed } from './tokens';

const TURN = 6;
/** Rolling slower than this share of its speed, it's hit something and stops. */
const STUCK = 0.35;

export function updateUrchin(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      e.stage = 0;
      if (player.dead) break;
      if (armed(e) && dist <= v.urchinTrigger && inLine(e, player, w.nav.small, 1)) {
        e.stage = 1;
        setPhase(e, 'windup');
        w.events.push('urchinCurl', index, e.pos.x, e.pos.y + v.urchinHeight * 0.5, e.pos.z);
        break;
      }
      closeIn(e, player, w, 'small', v.urchinSpeed, 1.5, TURN, dt);
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.urchinWindup) break;
      e.struck = false;
      setPhase(e, 'charge');
      w.events.push('urchinRoll', index, e.pos.x, e.pos.y + v.urchinHeight * 0.5, e.pos.z);
      break;
    case 'charge': {
      const step = v.urchinRoll * dt;
      const x0 = e.pos.x;
      const z0 = e.pos.z;
      walk(e, -Math.sin(e.facing), -Math.cos(e.facing), step, w.nav.small);
      const moved = Math.hypot(e.pos.x - x0, e.pos.z - z0);
      if (!e.struck && dist <= s.radius + 0.6 && Math.abs(player.pos.y - e.pos.y) < 1.4) {
        e.struck = true;
        w.events.push('urchinHit', index, e.pos.x, e.pos.y + v.urchinHeight * 0.5, e.pos.z);
        if (damagePlayer(player, v.urchinDamage, e.kind)) {
          // Thrown aside, off its line.
          const side = (player.pos.x - e.pos.x) * Math.cos(e.facing) - (player.pos.z - e.pos.z) * Math.sin(e.facing) >= 0 ? 1 : -1;
          player.vel.x += Math.cos(e.facing) * side * v.urchinShove;
          player.vel.z += -Math.sin(e.facing) * side * v.urchinShove;
          player.vel.y = Math.max(player.vel.y, 3);
          player.grounded = false;
        }
      }
      if (e.t >= v.urchinRollTime || (e.t > 0.1 && moved < step * STUCK)) {
        setPhase(e, 'recover');
        w.events.push('urchinStop', index, e.pos.x, e.pos.y + v.urchinHeight * 0.5, e.pos.z);
      }
      break;
    }
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * 0.5 * dt);
      // Spiked, then open.
      if (e.stage === 1 && e.t >= v.urchinSpiked) {
        e.stage = 0;
        e.t = 0;
        w.events.push('urchinOpen', index, e.pos.x, e.pos.y + v.urchinHeight * 0.5, e.pos.z);
      } else if (e.stage === 0 && e.t >= v.urchinOpen) setPhase(e, 'chase');
      break;
    case 'flinch':
      e.stage = 0;
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Its spikes are out: blows do nothing to it, and hurt you. */
export const spiked = (e: Enemy) => e.kind === 'urchin' && e.stage === 1;
