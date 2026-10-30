// Update 0.2.4 — the Cactoro (floor 4; the designer: enemies that "evade" and are "hard to kill", not tankier). It
// travels under the sand (out of reach of every blow: evade.ts), makes for a spot behind you (Cactoro comes up behind),
// and the sand bulges there for Cactoro rise (your warning: turn round, step away) before it bursts up in a ring of
// spines. Then it stands Cactoro stays up, turning to you (now you can hit it), and digs in again. Swing at it while
// it's up and it may duck back under (Cactoro duck chance, then a rest). Pure.
import { FOES4 } from '../../tuning/foes4';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Under the sand: its feet this far below the floor (m; its whole body hidden, its capsule out of every blow's way). */
export const BURIED = -2.5;
/** It gives up getting behind you after this long under the sand (s) and comes up where it is. */
const HUNT_FOR = 4;
/** Close enough to its spot (m). */
const THERE = 0.7;
/** Its spines throw you back this hard (m/s). */
const SHOVE = 8;

/** Its spot behind you (where you face away from), into `out` (x, z). */
export function behind(player: PlayerState, back: number, out: { x: number; z: number }) {
  out.x = player.pos.x + Math.sin(player.yaw) * back;
  out.z = player.pos.z + Math.cos(player.yaw) * back;
  return out;
}

const spot = { x: 0, z: 0 };

export function updateCactoro(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  e.blink = Math.max(0, e.blink - dt);
  switch (e.phase) {
    case 'chase':
      // (Just arrived: under the sand at once.)
      dig(e, index, w);
      break;
    case 'burrow': {
      if (player.dead) break;
      behind(player, v.cactoroBehind, spot);
      const dx = spot.x - e.pos.x;
      const dz = spot.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > THERE) walk(e, dx / d, dz / d, Math.min(d, v.cactoroDig * dt), w.nav.small);
      if (d <= THERE || e.t >= HUNT_FOR) {
        // The sand bulges where it'll come up.
        setPhase(e, 'windup');
        w.events.push('cactoroRise', index, e.pos.x, 0.05, e.pos.z);
      }
      break;
    }
    case 'windup':
      if (e.t < v.cactoroRise) break;
      e.pos.y = e.prev.y = 0;
      e.facing = yawTo(e, player.pos.x, player.pos.z);
      spines(e, index, player, w, v.spinesReach, v.spinesDamage);
      setPhase(e, 'recover');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'recover');
      break;
    case 'recover':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 6 * dt);
      if (e.t >= v.cactoroUp) dig(e, index, w);
      break;
    default:
      break;
  }
}

/** Under the sand it goes. */
export function dig(e: Enemy, index: number, w: EnemyWorld) {
  w.events.push('cactoroDig', index, e.pos.x, 0.3, e.pos.z);
  e.pos.y = e.prev.y = BURIED;
  setPhase(e, 'burrow');
}

/** A ring of spines as it comes up: close by, you're hurt and thrown back. */
export function spines(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, reach: number, damage: number) {
  w.events.push('cactoroSpines', index, e.pos.x, e.pos.y + 0.6, e.pos.z);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > reach + ENEMY_STATS[e.kind]().radius || player.pos.y - e.pos.y > reach || !damagePlayer(player, damage, e.kind)) return;
  player.vel.x += (d > 1e-3 ? dx / d : 1) * SHOVE;
  player.vel.z += (d > 1e-3 ? dz / d : 0) * SHOVE;
  player.vel.y = Math.max(player.vel.y, 4);
  player.grounded = false;
}
