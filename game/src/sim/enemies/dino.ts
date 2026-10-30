// Update 0.2.4 — the Dino, floor 4's boss (the designer: "Boss Dino"; the floor "needs to give a hard time … smarter
// than ordinary enemies"). It walks at you; every Dino pause it picks a move by where you are (seeded) and warns: it
// paws the ground (the charge: it steers after you as it runs, and while you dash in its warning it holds its charge
// and aims again, so a dodge made too early is wasted), rears back (bites, close by), coils (its tail, when you're
// behind it) or rears up (stomps, quake rings). At Dino rage at of its health it roars (Cactoros come up round you,
// once), then pounces at you from afar and is quicker in everything. Run it into a wall or a column and it's stunned
// (hits do more). Its death show is the Demon's. Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { startCharge, stepCharge } from './demonMoves';
import { BITE, CHARGE, dinoCharge, dinoPace, POUNCE, roar, ROAR_TIME, snap, startPounce, steer, STOMP, stomp, stepPounce, TAIL, tailSweep } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** It stops walking this far from your body (m). */
const STAND_OFF = 2.5;
/** Behind it (rad off its facing): the tail. */
const BEHIND = 1.9;
/** The odds of each move (charge, bite, tail, stomp, pounce) close, between, and far. **(placeholders)** */
const ODDS_NEAR = [0.1, 0.65, 0, 0.25, 0];
const ODDS_MID = [0.5, 0, 0, 0.35, 0.15];
const ODDS_FAR = [0.6, 0, 0, 0.15, 0.25];
/** While winding up a charge it turns this much slower (a dash aside beats it). */
const CHARGE_AIM = 0.5;

const way = new Vector3();

/** The warning before `move` (s). */
export function dinoWindup(move: number): number {
  const v = DINO.v;
  return [v.chargeWindup, v.biteWindup, v.tailWindup, v.stompWindup, v.pounceWindup][move] ?? v.chargeWindup;
}

const pauseOf = (d: Enemy) => DINO.v.dinoPause / dinoPace(d);

/** How long it stands after `move`. */
function recoverOf(d: Enemy): number {
  const v = DINO.v;
  if (d.move === BITE) return v.biteGap * Math.max(0, Math.round(v.bites) - 1) + v.dinoRecover;
  if (d.move === STOMP) return v.stompGap * Math.max(0, Math.round(v.stomps) - 1) + v.dinoRecover;
  return v.dinoRecover;
}

/** The next move for where you are (seeded): its tail when you're behind it; no pounce till it rages. */
function pick(d: Enemy, dist: number, off: number, w: EnemyWorld): number {
  const v = DINO.v;
  if (dist <= v.tailReach + radiusOf(d) && off >= BEHIND) return TAIL;
  const odds = dist <= v.dinoNear ? ODDS_NEAR : dist <= v.dinoFar ? ODDS_MID : ODDS_FAR;
  let move = CHARGE;
  for (let tries = 0; tries < 4; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = m;
        break;
      }
    }
    if ((move !== POUNCE || d.stage > 0) && (move !== d.move || d.strafe < 2)) break;
    move = CHARGE;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

function warn(d: Enemy, move: number, w: EnemyWorld) {
  d.move = move;
  d.shots = 0;
  d.near = 0;
  setPhase(d, 'windup');
  w.events.push('dinoWindup', move, d.pos.x, d.pos.y + DINO.v.dinoHeight * 0.6, d.pos.z);
}

export function updateDino(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DINO.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  // Half dead: it roars (once), whatever it was about, unless it's charging or in the air.
  if (d.stage === 0 && d.hp <= ENEMY_STATS[d.kind]().hp * v.rageAt && d.phase !== 'charge' && d.phase !== 'leap' && d.phase !== 'intro') {
    d.stage = 1;
    roar(d, index, player, w);
    return;
  }
  switch (d.phase) {
    case 'roar':
      if (d.t >= ROAR_TIME) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      break;
    case 'stun':
      if (d.t >= v.dinoStun) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      break;
    case 'recover':
      if (d.move !== TAIL) d.facing = turn(d.facing, toward, v.dinoTurn * dt);
      if (d.move === BITE && d.shots < Math.round(v.bites) && d.t >= d.shots * v.biteGap) {
        d.shots++;
        snap(d, index, player, w);
      }
      if (d.move === STOMP && d.shots < Math.round(v.stomps) && d.t >= d.shots * v.stompGap) stomp(d, w);
      if (d.t >= recoverOf(d)) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      if (d.cooldown <= 0) {
        const off = Math.abs(Math.atan2(Math.sin(toward - d.facing), Math.cos(toward - d.facing)));
        warn(d, pick(d, dist, off, w), w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.dinoTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(d) + STAND_OFF)) break;
      walk(d, way.x, way.z, v.dinoSpeed * dinoPace(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      if (d.move !== TAIL) d.facing = turn(d.facing, toward, v.dinoTurn * (d.move === CHARGE ? CHARGE_AIM : 1) * dt);
      // Your dash in its charge's warning: it holds on (up to Charge hold), then aims again.
      if (d.move === CHARGE && player.dashTime > 0 && d.near < v.chargeHold) {
        d.near += dt;
        break;
      }
      if (d.t < dinoWindup(d.move) / dinoPace(d) + d.near) break;
      if (d.move === CHARGE) {
        d.facing = toward;
        startCharge(d, index, w);
        w.events.push('dinoCharge', index, d.pos.x, d.pos.y + 1, d.pos.z);
      } else if (d.move === POUNCE) {
        if (!startPounce(d, index, player, w)) setPhase(d, 'recover');
      } else {
        if (d.move === TAIL) tailSweep(d, index, player, w);
        setPhase(d, 'recover');
      }
      break;
    case 'charge': {
      steer(d, player, dt);
      const r = stepCharge(d, index, player, w, dt, dinoCharge(d));
      if (r === 'crash') w.events.push('dinoCrash', index, d.pos.x, d.pos.y + 2, d.pos.z);
      else if (r === 'out') setPhase(d, 'recover');
      break;
    }
    case 'leap':
      if (stepPounce(d, index, player, w)) setPhase(d, 'recover');
      break;
    default:
      break;
  }
}
