// Update 0.0.18 — the Frog (the designer: mid range). It hops about at a middle distance from you: further than Frog
// range (or out of sight) it comes closer, closer than Frog too close it hops away, circling between. With you in sight
// and its tongue ready, its throat puffs for the warning (it glows, it croaks), then its tongue shoots out in a straight
// line at where you were: in its way, you're hurt and pulled to it. Its aim is fixed for the end of the warning (Frog
// aim lock): step off the line then. A hit flinches it and cancels the lash. Pure.
import { Vector3 } from 'three';
import { FOES2 } from '../../tuning/foes2';
import { wallBetween } from '../../world/navGrid';
import { segmentDistance } from '../combat/geometry';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { closeIn, keepRing } from './moves';
import { armed } from './tokens';

const TURN = 9;
/** After a lash, before it moves (s): the tongue shows this long. */
export const TONGUE_TIME = 0.3;

const mouth = new Vector3();
const a = new Vector3();
const b = new Vector3();

export function updateFrog(f: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES2.v;
  const dist = Math.hypot(player.pos.x - f.pos.x, player.pos.z - f.pos.z);
  const toward = yawTo(f, player.pos.x, player.pos.z);
  switch (f.phase) {
    case 'flinch':
      if (f.t >= 0.3) setPhase(f, 'chase');
      break;
    case 'recover':
      if (f.t >= TONGUE_TIME + 0.2) setPhase(f, 'chase');
      break;
    case 'chase': {
      if (player.dead) break;
      const sees = inLine(f, player, w.nav.small, 3);
      if (sees && dist <= v.frogFar && f.cooldown <= 0 && armed(f)) {
        setPhase(f, 'windup');
        w.events.push('frogWindup', index, f.pos.x, f.pos.y + v.frogHeight * 0.6, f.pos.z);
        break;
      }
      if (!sees || dist > v.frogFar) closeIn(f, player, w, 'small', v.frogSpeed, v.frogFar * 0.8, TURN, dt);
      else keepRing(f, player, w, 'small', v.frogSpeed, v.frogNear, TURN, dt);
      break;
    }
    case 'windup':
      if (f.t < v.frogWindup * (1 - v.frogLock)) f.facing = turn(f.facing, toward, TURN * dt);
      if (f.t >= v.frogWindup) lash(f, index, player, w);
      break;
  }
}

/** Its tongue's root (in front of its mouth). */
export function mouthOf(f: Enemy, out: Vector3): Vector3 {
  return out.set(f.pos.x - Math.sin(f.facing) * 0.5, f.pos.y + FOES2.v.frogHeight * 0.45, f.pos.z - Math.cos(f.facing) * 0.5);
}

/** The tongue shoots along the way it faces, to its reach (or a wall); in its way, you're hurt and pulled in. */
function lash(f: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES2.v;
  f.cooldown = v.frogCooldown;
  mouthOf(f, mouth);
  const dx = -Math.sin(f.facing);
  const dz = -Math.cos(f.facing);
  f.aim.set(mouth.x + dx * v.frogReach, player.pos.y + 1, mouth.z + dz * v.frogReach);
  f.aim.y = Math.max(mouth.y - 0.5, Math.min(mouth.y + 2, f.aim.y));
  f.struck = false;
  setPhase(f, 'recover');
  w.events.push('frogTongue', index, f.aim.x, f.aim.y, f.aim.z);
  a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
  b.set(player.pos.x, player.pos.y + BODY.height - BODY.radius, player.pos.z);
  if (segmentDistance(mouth, f.aim, a, b) > v.frogWidth + BODY.radius || wallBetween(w.nav.small, f.pos.x, f.pos.z, player.pos.x, player.pos.z)) return;
  f.struck = true;
  if (!damagePlayer(player, v.frogDamage, f.kind)) return;
  const len = Math.max(1e-3, Math.hypot(player.pos.x - f.pos.x, player.pos.z - f.pos.z));
  player.vel.x -= ((player.pos.x - f.pos.x) / len) * v.frogPull;
  player.vel.z -= ((player.pos.z - f.pos.z) / len) * v.frogPull;
  player.vel.y = Math.max(player.vel.y, 2.5);
  player.grounded = false;
}
