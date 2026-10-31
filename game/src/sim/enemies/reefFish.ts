// Update 0.2.11 — floor 6's small fish (the designer's fish; their moves are Claude's proposal as accepted). The
// Clownfish come as a school: they circle you at your height, each its own way round, and when one may (its turn:
// tokens.ts) it flashes (Clownfish flash: your warning) and darts straight through you, nipping, and on out. The
// Angelfish (the Flanker) works round to your back; look at it and it peels off to your side; behind you and close it
// flashes (a sound behind you) and bites. Both faster than you. Pure.
import { Vector3 } from 'three';
import { FOES6 } from '../../tuning/foes6';
import type { CollisionWorld } from '../collisionWorld';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { aimDart, chest, circleYou, dart, fishMiddle, holdDepth, inYourEyes, swimTo } from './fishSwim';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const TURN = 8;
/** A dart goes this far past your chest (m); after it, a moment's rest (s). A school swims at heights this far apart (m). */
const PAST = 2.5;
const REST = 0.4;
const LAYERS = 0.5;
/** The Angelfish: seen within this (m) it peels off this far to your side; after a bite it backs off this long (s). */
const SEEN = 9;
const SIDE = 6;
const BACK_OFF = 0.6;
/** Within this many degrees of your look it's in front of you: it bites only from further round. */
const FRONT = 100;

const target = new Vector3();
const mid = new Vector3();

export function updateClownfish(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6.v;
  const s = ENEMY_STATS[e.kind]();
  const layer = ((index % 3) - 1) * LAYERS;
  switch (e.phase) {
    case 'chase':
      if (!player.dead && armed(e) && e.cooldown <= 0 && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= v.clownRing * 1.4) {
        setPhase(e, 'windup');
        w.events.push('clownWindup', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
        break;
      }
      circleYou(e, player, v.clownRing, layer, v.clownSpeed, dt, w, world);
      break;
    case 'windup':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * dt);
      holdDepth(e, chest(player), v.clownSpeed, dt, w, world);
      if (e.t < v.clownWindup) break;
      aimDart(e, target.set(player.pos.x, chest(player), player.pos.z), PAST);
      setPhase(e, 'dive');
      w.events.push('clownDart', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      break;
    case 'dive':
      if (dart(e, player, v.clownDart, dt, world, () => damagePlayer(player, v.clownDamage, e.kind) && w.events.push('clownBite', index, e.pos.x, e.pos.y, e.pos.z)) !== 'on') {
        e.cooldown = v.clownGap;
        setPhase(e, 'recover');
      }
      break;
    case 'recover':
      circleYou(e, player, v.clownRing, layer, v.clownSpeed, dt, w, world);
      if (e.t >= REST) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

export function updateAngelfish(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6.v;
  const s = ENEMY_STATS[e.kind]();
  const close = fishMiddle(e, mid).distanceTo(target.set(player.pos.x, chest(player), player.pos.z));
  switch (e.phase) {
    case 'chase':
      if (!player.dead && armed(e) && e.cooldown <= 0 && close <= v.angelReach && !inYourEyes(e, player, FRONT / 2)) {
        setPhase(e, 'windup');
        w.events.push('angelWindup', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
        break;
      }
      flank(e, player, w, dt, world);
      break;
    case 'windup':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * dt);
      holdDepth(e, chest(player), v.angelSpeed, dt, w, world);
      if (e.t < v.angelWindup) break;
      if (close <= v.angelReach + s.radius && damagePlayer(player, v.angelDamage, e.kind)) w.events.push('angelBite', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      e.cooldown = v.angelGap;
      setPhase(e, 'recover');
      break;
    case 'recover': {
      // Backing off a little, still facing you.
      const away = Math.atan2(e.pos.z - player.pos.z, e.pos.x - player.pos.x);
      swimTo(e, e.pos.x + Math.cos(away) * 3, chest(player), e.pos.z + Math.sin(away) * 3, v.angelSpeed * 0.6, dt, w, world);
      if (e.t >= BACK_OFF) setPhase(e, 'chase');
      break;
    }
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Round to your back; seen, off to your side (the side it's on). */
function flank(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6.v;
  const sn = Math.sin(player.yaw);
  const cs = Math.cos(player.yaw);
  let x = player.pos.x + sn * v.angelBehind;
  let z = player.pos.z + cs * v.angelBehind;
  if (inYourEyes(e, player, v.angelFaced) && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) < SEEN) {
    // (Your right is (cos, −sin): it goes to the side it's on.)
    const side = (e.pos.x - player.pos.x) * cs - (e.pos.z - player.pos.z) * sn >= 0 ? 1 : -1;
    x = player.pos.x + cs * side * SIDE;
    z = player.pos.z - sn * side * SIDE;
  }
  swimTo(e, x, chest(player), z, v.angelSpeed, dt, w, world);
}
