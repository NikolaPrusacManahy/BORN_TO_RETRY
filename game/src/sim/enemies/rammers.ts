// Update 0.2.11 — floor 6's rammers (the designer's fish; their moves are Claude's proposal as accepted). The Tuna (the
// Torpedo) keeps well off, level with you; when it may (its turn: tokens.ts) and sees you its tail beats fast (Tuna
// wind-up: your warning) and it charges straight through where you were, and on; into a wall it's dazed. The Dolphin
// (the Bumper) circles below you; off the floor, it slips under you, bubbles rise there (Dolphin warning) and it rams
// straight up, throwing you up towards the others. On the floor you're safe from it. Pure.
import { Vector3 } from 'three';
import { FOES6 } from '../../tuning/foes6';
import type { CollisionWorld } from '../collisionWorld';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { aimDart, chest, circleYou, dart, groundUnder, holdDepth, swimTo, waterTop } from './fishSwim';
import { seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const TURN = 5;
/** The Tuna charges only from this far (m); after a charge it rests this long (s). */
const NEAREST = 5;
const REST = 0.6;
/** The Dolphin: under you it swims this far below your chest (m); it rams up only at you this far off the floor (m),
 *  from this close under you (m, flat); it rams up to this far over where you were (m); after, it rests this long (s). */
const UNDER = 4.5;
const OFF_FLOOR = 1.5;
const BELOW = 1.2;
const OVER = 4;
const DOLPHIN_REST = 0.8;

const target = new Vector3();

export function updateTuna(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'chase':
      if (!player.dead && armed(e) && e.cooldown <= 0 && dist >= NEAREST && dist <= v.tunaRing * 1.5 && seesInAir(e, player, world)) {
        setPhase(e, 'windup');
        w.events.push('tunaWindup', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
        break;
      }
      circleYou(e, player, v.tunaRing, 0, v.tunaSpeed, dt, w, world);
      break;
    case 'windup':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * dt);
      holdDepth(e, chest(player), v.tunaSpeed, dt, w, world);
      if (e.t < v.tunaWindup) break;
      aimDart(e, target.set(player.pos.x, chest(player), player.pos.z), Math.max(3, v.tunaRange - dist));
      setPhase(e, 'charge');
      w.events.push('tunaCharge', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      break;
    case 'charge': {
      const r = dart(e, player, v.tunaCharge, dt, world, () => {
        if (!damagePlayer(player, v.tunaDamage, e.kind)) return;
        throwYou(player, e, -Math.sin(e.facing), -Math.cos(e.facing), 1, 10, 4);
        w.events.push('tunaRam', index, player.pos.x, chest(player), player.pos.z);
      });
      if (r === 'wall') {
        setPhase(e, 'stun');
        w.events.push('tunaStun', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      } else if (r === 'end') setPhase(e, 'recover');
      if (r !== 'on') e.cooldown = v.tunaGap;
      break;
    }
    case 'stun':
      if (e.t >= v.tunaStun) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= REST) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

export function updateDolphin(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6.v;
  const s = ENEMY_STATS[e.kind]();
  const top = waterTop(w);
  const off = player.pos.y - groundUnder(world, player.pos.x, player.pos.z, top);
  switch (e.phase) {
    case 'chase':
      if (!player.dead && armed(e) && e.cooldown <= 0 && off >= OFF_FLOOR) {
        const flat = swimTo(e, player.pos.x, chest(player) - UNDER, player.pos.z, v.dolphinSpeed, dt, w, world);
        if (flat <= BELOW && e.pos.y + s.height < player.pos.y) {
          e.aim.set(player.pos.x, player.pos.y, player.pos.z);
          setPhase(e, 'windup');
          w.events.push('dolphinRise', index, e.aim.x, e.aim.y, e.aim.z);
        }
        break;
      }
      circleYou(e, player, v.dolphinRing, -UNDER * 0.5, v.dolphinSpeed, dt, w, world);
      break;
    case 'windup':
      swimTo(e, e.aim.x, e.pos.y + s.height / 2, e.aim.z, v.dolphinSpeed * 0.5, dt, w, world);
      if (e.t < v.dolphinWindup) break;
      e.struck = false;
      setPhase(e, 'leap');
      w.events.push('dolphinRam', index, e.pos.x, e.pos.y + s.height, e.pos.z);
      break;
    case 'leap':
      ramUp(e, index, player, w, dt, top);
      break;
    case 'recover':
      if (e.t >= DOLPHIN_REST) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

/** Straight up through the spot it marked: through you once (thrown up), to over where you were or the water's top. */
function ramUp(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, top: number) {
  const v = FOES6.v;
  const s = ENEMY_STATS[e.kind]();
  const end = Math.min(top - s.height, e.aim.y + OVER);
  e.pos.y = Math.min(end, e.pos.y + v.dolphinRam * dt);
  const flat = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (!e.struck && flat <= s.radius + BODY.radius + 0.4 && e.pos.y + s.height >= player.pos.y && e.pos.y <= player.pos.y + BODY.height) {
    e.struck = true;
    if (damagePlayer(player, v.dolphinDamage, e.kind)) {
      player.vel.y = Math.max(player.vel.y, v.dolphinThrow);
      player.grounded = false;
      w.events.push('dolphinHit', index, player.pos.x, chest(player), player.pos.z);
    }
  }
  if (e.pos.y >= end - 1e-4) {
    e.cooldown = v.dolphinGap;
    setPhase(e, 'recover');
  }
}
