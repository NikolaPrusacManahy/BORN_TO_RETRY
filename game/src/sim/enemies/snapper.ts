// Update 0.2.10 — the Snapper (floor 5, the Fish blob). At high water it swims under it (out of reach of every blow;
// only its fin shows: drownedFx.ts) to where you stand, and the water rings there for Snapper rise (your warning: step
// away) before it comes up biting; then it stays up Snapper stays up (now you can hit it) and dives again. At low water
// it flops after you on the floor, gathers and lunges. Pure.
// Update 0.3.10 — its melee blow can be parried (combat/meleeParry.ts).
import { FOES5 } from '../../tuning/foes5';
import { WADE_MIN } from '../dungeon/tide';
import { damagePlayer } from '../player/health';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import { BURIED } from './cactoro';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { closeIn } from './moves';

const TURN = 8;
/** Close enough to your spot to come up (m); it gives up hunting after this long and comes up where it is (s). */
const THERE = 0.8;
const HUNT_FOR = 4;
/** A lunge lasts this long (s); after one on the floor it rests this long (s). */
const LUNGE_TIME = 0.32;
const RECOVER = 0.9;
/** It lunges from this far (m). */
const LUNGE_FROM = 4;
/** Its bite throws you up a little (m/s). */
const TOSS = 3;

export function updateSnapper(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES5.v;
  const s = ENEMY_STATS[e.kind]();
  const deep = w.tide >= WADE_MIN;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (deep) {
        dive(e, index, w);
        break;
      }
      if (dist <= LUNGE_FROM && inLine(e, player, w.nav.small, 1.5)) {
        e.move = 0;
        setPhase(e, 'windup');
        w.events.push('snapperWindup', index, e.pos.x, e.pos.y + v.snapperHeight * 0.5, e.pos.z);
        break;
      }
      closeIn(e, player, w, 'small', v.snapperSpeed, 1.2, TURN, dt);
      break;
    case 'burrow': {
      // The water's gone: it's left on the floor.
      if (!deep) {
        e.pos.y = e.prev.y = 0;
        setPhase(e, 'chase');
        break;
      }
      if (player.dead) break;
      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      if (dist > THERE) walk(e, dx / dist, dz / dist, Math.min(dist, v.snapperSwim * dt), w.nav.small);
      if (dist <= THERE || e.t >= HUNT_FOR) {
        e.move = 1;
        setPhase(e, 'windup');
        w.events.push('snapperRise', index, e.pos.x, w.tide, e.pos.z);
      }
      break;
    }
    case 'windup':
      // Coming up from under the water.
      if (e.move === 1) {
        if (e.t < v.snapperRise) break;
        e.pos.y = e.prev.y = 0;
        e.facing = toward;
        bite(e, index, player, w);
        setPhase(e, 'recover');
        break;
      }
      e.facing = turn(e.facing, toward, TURN * 0.5 * dt);
      if (e.t < v.snapperWindup) break;
      e.struck = false;
      setPhase(e, 'charge');
      w.events.push('snapperLunge', index, e.pos.x, e.pos.y + v.snapperHeight * 0.5, e.pos.z);
      break;
    case 'charge':
      walk(e, -Math.sin(e.facing), -Math.cos(e.facing), v.snapperLunge * dt, w.nav.small);
      if (!e.struck && dist <= s.radius + 0.7 && Math.abs(player.pos.y - e.pos.y) < 1.5) {
        e.struck = true;
        w.events.push('snapperBite', index, e.pos.x, e.pos.y + v.snapperHeight * 0.5, e.pos.z);
        damagePlayer(player, v.snapperBite, e.kind);
      }
      if (e.t >= LUNGE_TIME) setPhase(e, 'recover');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'recover');
      break;
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= (e.move === 1 ? v.snapperUp : RECOVER)) {
        e.move = 0;
        setPhase(e, 'chase');
      }
      break;
    default:
      break;
  }
}

/** Under the water it goes. */
function dive(e: Enemy, index: number, w: EnemyWorld) {
  w.events.push('snapperDive', index, e.pos.x, w.tide, e.pos.z);
  e.pos.y = e.prev.y = BURIED;
  setPhase(e, 'burrow');
}

/** Up out of the water, jaws first: close by, you're bitten and tossed. */
function bite(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES5.v;
  w.events.push('snapperBite', index, e.pos.x, e.pos.y + v.snapperHeight * 0.5, e.pos.z);
  const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (d > v.snapperReach || player.pos.y - e.pos.y > 1.6 || !meleeHit(player, w, e, index, v.snapperBite)) return;
  player.vel.y = Math.max(player.vel.y, TOSS);
  player.grounded = false;
}
