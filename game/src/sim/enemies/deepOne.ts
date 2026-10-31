// Update 0.2.10 — the Deep One (floor 5's mini boss, the big Alien; Claude's proposal as accepted). It walks at you and,
// between moves (Deep One pause), either claws you close up or lashes a tentacle along a line at you: the line glows
// from it out to its reach (Lash wind-up: your warning), and if you're still on it when it lashes (and not dashing) it
// catches you and drags you in, then slams you. Only a hard hit staggers it. Enemy.move: 0 its claws, 1 its lash.
// Pure.
import { FOES5B } from '../../tuning/foes5b';
import { segmentDistance2D } from '../combat/geometry';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { closeIn } from './moves';
import { armed } from './tokens';

const TURN = 4;
/** While winding up it turns this much slower; its claws' arc in front (rad). */
const WINDUP_TURN = 0.3;
const ARC = 1.2;
/** Dragged this close, you're slammed (m); the slam throws you back this hard (m/s). */
const IN_REACH = 2.6;
const SHOVE = 11;
/** It walks in to this far before a move (m). */
const STOP = 2.4;

export function deepWindup(move: number): number {
  return move === 1 ? FOES5B.v.lashWindup : FOES5B.v.clawWindup;
}

export function updateDeepOne(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES5B.v;
  const s = ENEMY_STATS[e.kind]();
  e.cooldown = Math.max(0, e.cooldown - dt);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      if (player.dead) break;
      if (armed(e) && e.cooldown <= 0) {
        if (dist <= v.clawReach + s.radius) {
          e.move = 0;
          setPhase(e, 'windup');
          w.events.push('deepClawWindup', index, e.pos.x, e.pos.y + v.deepHeight * 0.7, e.pos.z);
          break;
        }
        if (dist <= v.lashRange && inLine(e, player, w.nav.large, 2)) {
          e.move = 1;
          e.facing = toward;
          // Its line: from it out to its reach, the way you are now.
          e.aim.set(e.pos.x - Math.sin(e.facing) * v.lashRange, 0, e.pos.z - Math.cos(e.facing) * v.lashRange);
          setPhase(e, 'windup');
          w.events.push('deepLashWindup', index, e.pos.x, e.pos.y + v.deepHeight * 0.6, e.pos.z);
          break;
        }
      }
      closeIn(e, player, w, 'large', v.deepSpeed, STOP, TURN, dt);
      break;
    case 'windup':
      if (e.move === 0) e.facing = turn(e.facing, toward, TURN * WINDUP_TURN * dt);
      if (e.t < deepWindup(e.move)) break;
      if (e.move === 0) claw(e, index, player, w);
      else lash(e, index, player, w);
      break;
    case 'charge': {
      // Dragging you in.
      if (dist <= IN_REACH || e.t >= v.lashPull || player.dead) {
        w.events.push('deepSlam', index, player.pos.x, player.pos.y + 1, player.pos.z);
        if (damagePlayer(player, v.lashDamage, e.kind) && dist > 1e-3) {
          player.vel.x = (dx / dist) * SHOVE;
          player.vel.z = (dz / dist) * SHOVE;
          player.vel.y = Math.max(player.vel.y, 4);
          player.grounded = false;
        }
        e.cooldown = v.deepPause;
        setPhase(e, 'recover');
        break;
      }
      e.facing = toward;
      player.vel.x = (-dx / Math.max(dist, 1e-3)) * v.lashDrag;
      player.vel.z = (-dz / Math.max(dist, 1e-3)) * v.lashDrag;
      player.vel.y = Math.max(player.vel.y, 1);
      player.grounded = false;
      break;
    }
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= 0.6) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Its claws, close up, in front. */
function claw(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES5B.v;
  const s = ENEMY_STATS[e.kind]();
  w.events.push('deepClaw', index, e.pos.x - Math.sin(e.facing) * 2, e.pos.y + v.deepHeight * 0.5, e.pos.z - Math.cos(e.facing) * 2);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(yawTo(e, player.pos.x, player.pos.z) - e.facing), Math.cos(yawTo(e, player.pos.x, player.pos.z) - e.facing)));
  if (dist <= v.clawReach + s.radius && off <= ARC && Math.abs(player.pos.y - e.pos.y) < 2.5) damagePlayer(player, v.clawDamage, e.kind);
  e.cooldown = v.deepPause;
  setPhase(e, 'recover');
}

/** Its lash down its line: on it (and not dashing), you're caught. */
function lash(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES5B.v;
  const off = segmentDistance2D(e.pos.x, e.pos.z, e.aim.x, e.aim.z, player.pos.x, player.pos.z);
  const caught = !player.dead && off <= v.lashWidth && Math.abs(player.pos.y - e.pos.y) < 2.5 && player.dashTime <= 0;
  w.events.push(caught ? 'deepCatch' : 'deepLash', index, e.aim.x, e.pos.y + 1, e.aim.z);
  if (caught) {
    setPhase(e, 'charge');
    return;
  }
  e.cooldown = v.deepPause;
  setPhase(e, 'recover');
}
