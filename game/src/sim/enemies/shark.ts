// Update 0.2.11 — floor 6's mini boss the Shark (the designer's; its moves are Claude's proposal as accepted), the
// fastest thing down here. It circles you, tighter every second; when it may (its turn: tokens.ts) and sees you it
// turns on you (Shark wind-up: your warning) and lunges through where you are. Hit it hard enough as it comes (a punch
// on the nose) and it's stunned; into a wall too. Some bites hold you (the death roll): it shakes you until it lets go,
// or until you've hit it hard enough to break free. Below Frenzy at it frenzies: faster, shorter warnings. Enemy.near:
// its circle (m); Enemy.shots: its health when the lunge (or the roll) began; Enemy.move: 1 while it rolls you. Pure.
import { Vector3 } from 'three';
import { FOES6B } from '../../tuning/foes6b';
import { HEALTH } from '../../tuning/health';
import type { CollisionWorld } from '../collisionWorld';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { aimDart, chest, circleYou, dart, holdDepth } from './fishSwim';
import { seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const TURN = 7;
/** Its circle never gets tighter than this (m); a lunge goes this far past you (m); after one it rests this long (s). */
const TIGHTEST = 4;
const ROLLING = 1;
const PAST = 4;
const REST = 0.5;

const target = new Vector3();

/** Frenzied: its health below Frenzy at. */
export const frenzied = (e: Enemy) => e.hp <= ENEMY_STATS[e.kind]().hp * FOES6B.v.sharkFrenzy;

export function updateShark(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6B.v;
  const s = ENEMY_STATS[e.kind]();
  const k = frenzied(e) ? v.sharkFrenzyBy : 1;
  if (e.near <= 0) e.near = v.sharkRing;
  switch (e.phase) {
    case 'chase': {
      e.near = Math.max(TIGHTEST, e.near - v.sharkClose * dt);
      const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
      if (!player.dead && armed(e) && e.cooldown <= 0 && dist <= e.near + 3 && seesInAir(e, player, world)) {
        e.shots = e.hp;
        setPhase(e, 'windup');
        w.events.push('sharkWindup', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
        break;
      }
      circleYou(e, player, e.near, 0, v.sharkSpeed * k, dt, w, world);
      break;
    }
    case 'windup':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * k * dt);
      holdDepth(e, chest(player), v.sharkSpeed, dt, w, world);
      if (e.t < v.sharkWindup / k) break;
      aimDart(e, target.set(player.pos.x, chest(player), player.pos.z), PAST);
      setPhase(e, 'charge');
      w.events.push('sharkLunge', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      break;
    case 'charge':
      lunge(e, index, player, w, dt, world, k);
      break;
    case 'grab':
      roll(e, index, player, w);
      break;
    case 'stun':
      if (e.t >= v.sharkStun) back(e);
      break;
    case 'recover':
      if (e.t >= REST) back(e);
      break;
    case 'flinch':
      // (A blow hard enough to stagger it breaks its roll too.)
      if (e.move === ROLLING) {
        e.move = 0;
        w.events.push('sharkFree', index, player.pos.x, chest(player), player.pos.z);
        stun(e, index, w);
      } else if (e.t >= s.flinch) back(e);
      break;
    default:
      break;
  }
}

/** Back to circling, from its widest. */
function back(e: Enemy) {
  e.near = FOES6B.v.sharkRing;
  setPhase(e, 'chase');
}

function stun(e: Enemy, index: number, w: EnemyWorld) {
  e.cooldown = FOES6B.v.sharkGap;
  setPhase(e, 'stun');
  w.events.push('sharkStun', index, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
}

/** Its lunge: a punch on the nose stuns it; through you it bites (or takes hold); a wall stuns it. */
function lunge(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld, k: number) {
  const v = FOES6B.v;
  if (e.shots - e.hp >= v.sharkNose) {
    stun(e, index, w);
    return;
  }
  const r = dart(e, player, v.sharkLunge * k, dt, world, () => {
    if (w.rng() < v.sharkRoll && !player.dead) {
      // (The death roll: you held where it caught you.)
      e.aim.copy(player.pos);
      e.shots = e.hp;
      e.cooldown = 0;
      e.move = ROLLING;
      setPhase(e, 'grab');
      w.events.push('sharkRoll', index, player.pos.x, chest(player), player.pos.z);
    } else if (damagePlayer(player, v.sharkDamage, e.kind)) {
      throwYou(player, e, -Math.sin(e.facing), -Math.cos(e.facing), 1, 9, 3);
      w.events.push('sharkBite', index, player.pos.x, chest(player), player.pos.z);
    }
  });
  if (e.phase !== 'charge') return;
  if (r === 'wall') stun(e, index, w);
  else if (r === 'end') {
    e.cooldown = v.sharkGap;
    setPhase(e, 'recover');
  }
}

/** The death roll: you're held; a shake every Hurt invincibility; hit it hard enough and you're free (it's stunned),
 *  or it lets you go at the end. */
function roll(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES6B.v;
  player.pos.copy(e.aim);
  player.vel.set(0, 0, 0);
  if (e.shots - e.hp >= v.sharkBreak || player.dead) {
    if (!player.dead) w.events.push('sharkFree', index, player.pos.x, chest(player), player.pos.z);
    e.move = 0;
    stun(e, index, w);
    return;
  }
  if (e.cooldown <= 0) {
    e.cooldown = HEALTH.v.hurtInvuln;
    if (damagePlayer(player, v.sharkShake, e.kind)) w.events.push('sharkShake', index, player.pos.x, chest(player), player.pos.z);
  }
  if (e.t < v.sharkRollTime) return;
  throwYou(player, e, -Math.sin(e.facing), -Math.cos(e.facing), 1, 8, 3);
  e.move = 0;
  e.cooldown = v.sharkGap;
  setPhase(e, 'recover');
}
