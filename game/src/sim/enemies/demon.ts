// Update 0.0.15 — the Demon, the first boss (the designer: build it as pitched, bigger). It walks at you; every Demon
// pause it picks a move by how far you are (seeded) and warns: it lowers its head and glows red (the charge), crouches
// and glows orange (the leap), or raises its trident and glows (the volley). The moves are in demonMoves.ts. It never
// flinches; run it into a wall or a column and it's stunned (hits do more). At Rage at of its health it roars (bossRoom.ts
// calls grunts), then warns quicker, pauses less, moves faster, follows a charge with a leap and fires two fans.
// Killed, it rises, hangs in the air, sinks to the ground and bursts (its look flickers white: bossView.ts). Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { CHARGE, LEAP, VOLLEY, pace, recoverTime, secondFan, startCharge, startLeap, stepCharge, stepLeap, volley } from './demonMoves';
import { doomTime, ENEMY_STATS } from './kinds';

/** It stops walking this close to you (m: its body is wide). */
const STAND_OFF = 5;
/** While winding up a charge it turns this much slower (a dash to the side beats it). */
const CHARGE_AIM = 0.6;
/** Chances of each move (charge, leap, volley) by how far you are. **(placeholders)** */
const FAR = 16;
const NEAR = 7;
const ODDS_FAR = [0.45, 0.15, 0.4];
const ODDS_MID = [0.3, 0.35, 0.35];
const ODDS_NEAR = [0.15, 0.55, 0.3];

const way = new Vector3();

/** The warning before `move` (s), quicker once it rages. */
export function windupOf(d: Enemy, move: number): number {
  const v = BOSS.v;
  const base = move === CHARGE ? v.chargeWindup : move === LEAP ? v.leapWindup : v.volleyWindup;
  return base * (d.stage > 0 ? v.rageWindup : 1);
}

const pauseOf = (d: Enemy) => BOSS.v.demonPause * (d.stage > 0 ? BOSS.v.ragePause : 1);

/** The next move for how far you are (seeded); never the same one three times running. */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const odds = dist > FAR ? ODDS_FAR : dist > NEAR ? ODDS_MID : ODDS_NEAR;
  let roll = w.rng();
  let move = VOLLEY;
  for (let m = 0; m < odds.length; m++) {
    roll -= odds[m];
    if (roll < 0) {
      move = m;
      break;
    }
  }
  // Enemy.strafe counts the same move in a row.
  if (move === d.move && d.strafe >= 2) move = (move + 1 + Math.floor(w.rng() * 2)) % 3;
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

function warn(d: Enemy, move: number, w: EnemyWorld) {
  d.move = move;
  setPhase(d, 'windup');
  w.events.push('demonWindup', move, d.pos.x, d.pos.y + BOSS.v.demonHeight * 0.6, d.pos.z);
}

export function updateDemon(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = BOSS.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  // Half dead: it roars (once), whatever it was about, unless it's in the air or running.
  if (d.stage === 0 && d.hp <= v.demonHp * v.rageAt && d.phase !== 'leap' && d.phase !== 'charge' && d.phase !== 'intro') {
    d.stage = 1;
    setPhase(d, 'roar');
    w.events.push('demonRoar', index, d.pos.x, d.pos.y + v.demonHeight * 0.7, d.pos.z);
    return;
  }
  switch (d.phase) {
    case 'intro':
      break;
    case 'roar':
      if (d.t >= v.roarTime) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      break;
    case 'stun':
      if (d.t >= v.chargeStun) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      break;
    case 'recover':
      d.facing = turn(d.facing, toward, v.demonTurn * dt);
      if (d.move === VOLLEY) secondFan(d, index, player, w);
      if (d.t >= recoverTime(d.move)) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      if (d.cooldown <= 0) {
        warn(d, pick(d, dist, w), w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.demonTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= STAND_OFF)) break;
      walk(d, way.x, way.z, v.demonSpeed * pace(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      d.facing = turn(d.facing, toward, v.demonTurn * (d.move === CHARGE ? CHARGE_AIM : 1) * dt);
      if (d.t < windupOf(d, d.move)) break;
      if (d.move === CHARGE) startCharge(d, index, w);
      else if (d.move === LEAP) {
        if (!startLeap(d, index, player, w)) {
          setPhase(d, 'chase');
          d.cooldown = pauseOf(d) * 0.5;
        }
      } else {
        volley(d, index, player, w, 0);
        d.struck = false;
        setPhase(d, 'recover');
      }
      break;
    case 'charge': {
      const how = stepCharge(d, index, player, w, dt);
      if (how === 'out') {
        // Raging, a charge that ran out goes straight into a leap.
        if (d.stage > 0 && !player.dead) warn(d, LEAP, w);
        else setPhase(d, 'recover');
      }
      break;
    }
    case 'leap':
      if (stepLeap(d, index, player, w)) setPhase(d, 'recover');
      break;
    default:
      break;
  }
}

/** A dead Demon's show: up from where it died, hanging, then sinking to the ground; at the end its body bursts
 *  ('bossBurst'; Enemy.struck marks it). Update 0.0.18 — the Dragon's too. */
export function doomDemon(d: Enemy, index: number, w: EnemyWorld) {
  if (d.struck) return;
  const v = BOSS.v;
  const top = d.from.y + v.doomLift;
  const t = d.t;
  if (t < v.doomRise) {
    const k = t / v.doomRise;
    d.pos.y = d.from.y + (top - d.from.y) * (1 - (1 - k) * (1 - k));
  } else if (t < v.doomRise + v.doomHang) d.pos.y = top;
  else if (t < doomTime()) {
    const k = (t - v.doomRise - v.doomHang) / v.doomDrop;
    d.pos.y = top * (1 - k * k * (3 - 2 * k));
  } else {
    d.pos.y = 0;
    d.struck = true;
    w.events.push('bossBurst', index, d.pos.x, d.pos.y + ENEMY_STATS[d.kind]().height * 0.5, d.pos.z);
  }
}
