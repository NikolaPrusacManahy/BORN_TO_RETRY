// Update 0.2.11 — floor 6's mini boss the Manta Ray (the designer's; its moves are Claude's proposal as accepted). It
// glides over you, circling above your head. When it may (its turn: tokens.ts) it picks: over you, the blanket (its
// shadow marks the spot on the floor, then it drops straight down on it, crushing what's under it, and lies there a
// moment: hits do more); you behind it, its barb (its tail rises, then whips: it poisons); otherwise its gust (its
// wings rise, then beat: shoving you away). Pure.
import { Vector3 } from 'three';
import { FOES6B } from '../../tuning/foes6b';
import type { CollisionWorld } from '../collisionWorld';
import { BODY } from '../player/body';
import { damagePlayer, poisonPlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { chest, fishMiddle, groundUnder, swimTo, waterTop } from './fishSwim';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** Its moves (Enemy.move). */
export const BLANKET = 0;
export const BARB = 1;
export const GUST = 2;
const TURN = 2.5;
/** It circles this far round over you (m), this fast round (rad/s); it's over you within this (m, flat). */
const SWAY = 2.5;
const SWAY_RATE = 0.8;
const OVER = 3;
/** The barb hurts this much as it whips (the poison does the rest); behind it is this far round from its front (rad). */
const BARB_HIT = 8;
const BEHIND = 1.9;
const REST = 0.8;

const target = new Vector3();
const mid = new Vector3();

/** How long its `move` winds up (s). */
export function mantaWindup(move: number): number {
  const v = FOES6B.v;
  return move === BLANKET ? v.mantaWarn : move === BARB ? v.mantaBarbWindup : v.mantaGustWindup;
}

export function updateManta(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6B.v;
  const s = ENEMY_STATS[e.kind]();
  const flat = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'chase': {
      const a = e.t * SWAY_RATE * e.strafe;
      swimTo(e, player.pos.x + Math.cos(a) * SWAY, chest(player) + v.mantaHover, player.pos.z + Math.sin(a) * SWAY, v.mantaSpeed, dt, w, world);
      if (player.dead || !armed(e) || e.cooldown > 0) break;
      const dist = fishMiddle(e, mid).distanceTo(target.set(player.pos.x, chest(player), player.pos.z));
      e.move = behind(e, player) && dist <= v.mantaBarbReach ? BARB : flat <= OVER ? BLANKET : dist <= v.mantaGustReach ? GUST : -1;
      if (e.move < 0) break;
      if (e.move === BLANKET) {
        e.aim.set(player.pos.x, groundUnder(world, player.pos.x, player.pos.z, waterTop(w)), player.pos.z);
        w.events.push('mantaShadow', v.mantaRadius, e.aim.x, e.aim.y, e.aim.z);
      } else w.events.push(e.move === BARB ? 'mantaBarbWindup' : 'mantaGustWindup', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
      setPhase(e, 'windup');
      break;
    }
    case 'windup':
      if (e.move === BLANKET) swimTo(e, e.aim.x, e.pos.y + s.height / 2, e.aim.z, v.mantaSpeed, dt, w, world);
      else e.facing = turn(e.facing, e.move === BARB ? yawTo(e, player.pos.x, player.pos.z) + Math.PI : yawTo(e, player.pos.x, player.pos.z), TURN * dt);
      if (e.t < mantaWindup(e.move)) break;
      if (e.move === BLANKET) {
        e.struck = false;
        setPhase(e, 'dive');
        break;
      }
      strike(e, index, player, w);
      break;
    case 'dive':
      drop(e, player, w, dt);
      break;
    case 'stun':
      if (e.t >= v.mantaDown) setPhase(e, 'chase');
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

/** You behind it (its tail's side). */
function behind(e: Enemy, player: PlayerState): boolean {
  const off = yawTo(e, player.pos.x, player.pos.z) - e.facing;
  return Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) >= BEHIND;
}

/** Its barb or its gust, landing now. */
function strike(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES6B.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = fishMiddle(e, mid).distanceTo(target.set(player.pos.x, chest(player), player.pos.z));
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  if (e.move === BARB) {
    w.events.push('mantaBarb', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
    if (dist <= v.mantaBarbReach + s.radius && behind(e, player) && damagePlayer(player, BARB_HIT, e.kind)) poisonPlayer(player, v.mantaPoison, v.mantaPoisonTime, e.kind);
  } else {
    w.events.push('mantaGust', index, e.pos.x, e.pos.y + s.height / 2, e.pos.z);
    if (dist <= v.mantaGustReach && !player.dead) throwYou(player, e, dx, dz, Math.hypot(dx, dz), v.mantaGust, 2);
  }
  e.cooldown = v.mantaGap;
  setPhase(e, 'recover');
}

/** Straight down on its spot: crushing you once if you're under it as it comes; then it lies on the floor. */
function drop(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES6B.v;
  const s = ENEMY_STATS[e.kind]();
  e.pos.y = Math.max(e.aim.y, e.pos.y - v.mantaDrop * dt);
  const flat = Math.hypot(player.pos.x - e.aim.x, player.pos.z - e.aim.z);
  if (!e.struck && flat <= v.mantaRadius && e.pos.y <= player.pos.y + BODY.height && e.pos.y + s.height >= player.pos.y) {
    e.struck = true;
    if (damagePlayer(player, v.mantaDamage, e.kind)) player.vel.y = Math.min(player.vel.y, -6);
  }
  if (e.pos.y > e.aim.y + 1e-4) return;
  w.events.push('mantaDrop', v.mantaRadius, e.aim.x, e.aim.y, e.aim.z);
  e.cooldown = v.mantaGap;
  setPhase(e, 'stun');
}
