// Update 0.2.4 — floor 4's boss, the Velociraptor (the designer: "Boss Dino"; the floor "needs to give a hard time …
// smarter than ordinary enemies"; its id stays 'dino'). It walks at you; every Velociraptor pause it picks a move by
// where you are (seeded) and warns. Run it into a wall or a column and it's stunned (hits do more). Its death show is
// the Demon's.
// Update 0.2.8 — its moves anew (the designer: "move sets that were not in the game yet").
// Update 0.3.60 — by the Boss Design Bible, "Trust your ears" (spec MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md): its Sickle Pounce
// (dinoMoves.ts), its Stalk & Ambush and Tail Lash (dinoHunt.ts), and its charge still. In phase 2 it's quicker, its eyes burning; its
// Pack Call (while they live, it only ambushes), its Feint, and its Apex Hunt (dinoApex.ts). Enemy.shots: scrapes; Enemy.near: how far
// round you it feints; Enemy.strafe: the same move picked in a row. Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { startCharge, stepCharge } from './charge';
import { stepApex, startApex } from './dinoApex';
import { callPack, comeOut, packAlive, scrapes, stalkUnseen, startAmbush, startFeint, startTail, stepAmbushRun, stepFeint, stepTail, vanish } from './dinoHunt';
import { AMBUSH, APEX, BITE, CHARGE, dinoCharge, dinoPace, EMERGE, FEINT, LUNGE, PACK, ROAR, SICKLE, startPounce, steer, stepPounce, TAIL } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { ultimateDue } from './ultimate';

/** It stops walking this far from your body (m). */
const STAND_OFF = 2.5;
/** The odds of each move it picks (charge, pounce, tail, ambush, feint) close, between and far: its first phase, then its second.
 *  **(placeholders)** */
const ONE = { near: [0, 0.45, 0.45, 0.1, 0], mid: [0.2, 0.5, 0, 0.3, 0], far: [0.35, 0.3, 0, 0.35, 0] };
const TWO = { near: [0, 0.3, 0.35, 0.1, 0.25], mid: [0.1, 0.3, 0, 0.3, 0.3], far: [0.2, 0.2, 0, 0.4, 0.2] };
const PICKED = [CHARGE, SICKLE, TAIL, AMBUSH, FEINT];
/** While warning of a charge it turns this much slower (a dash aside beats it). */
const CHARGE_AIM = 0.5;
/** Its roar as phase 2 starts, its bark's second (share of its tell); side-on, this far round from you (rad). */
const ROAR_FOR = 1;
const BARK_AGAIN = 0.5;
const SIDE_ON = Math.PI / 2;
/** A feint's real pounce: `Enemy.struck` says its short hiss. */

const way = new Vector3();

/** The warning before `move` (s). */
export function dinoWindup(move: number, _stage = 0, short = false): number {
  const v = DINO.v;
  if (move === CHARGE) return v.chargeWindup;
  if (move === EMERGE) return v.emergeFor;
  if (move === ROAR) return ROAR_FOR;
  if (move === BITE) return v.pinCue;
  if (move === SICKLE && short) return v.feintHiss;
  return v.tell;
}

const pauseOf = (d: Enemy) => DINO.v.dinoPause / dinoPace(d);

/** How long it stands after `move`. */
function recoverOf(_d: Enemy): number {
  return DINO.v.dinoRecover;
}

/** How long it's down. */
function stunOf(d: Enemy): number {
  const v = DINO.v;
  switch (d.move) {
    case APEX:
      return v.apexStun;
    case SICKLE:
      return v.skidOpen;
    case TAIL:
      return v.tailDizzy;
    case EMERGE:
      return v.tripFor;
    default:
      return v.dinoStun;
  }
}

/** The next move for where you are (seeded): while its pack lives, it only ambushes; in phase 2 its call as its gap's over; never one
 *  move three times running. */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const v = DINO.v;
  if (packAlive(w)) return AMBUSH;
  if (d.stage > 0 && d.raptor!.callIn <= 0) return PACK;
  const set = d.stage > 0 ? TWO : ONE;
  const odds = dist <= v.dinoNear ? set.near : dist <= v.dinoFar ? set.mid : set.far;
  let move = SICKLE;
  for (let tries = 0; tries < 4; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = PICKED[m];
        break;
      }
    }
    if (move !== d.move || d.strafe < 2) break;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

/** It warns of `move`. A Sickle Pounce (and a Feint's, once it's round) with a hiss, a Feint with none: listen, don't look. */
function warn(d: Enemy, move: number, index: number, player: PlayerState, w: EnemyWorld, short = false) {
  d.move = move;
  d.shots = 0;
  d.struck = short;
  setPhase(d, 'windup');
  if (move === AMBUSH) {
    startAmbush(d, index, player, w);
    return;
  }
  // (Its Feint's crouch is silent.)
  if (move === SICKLE) w.events.push('dinoHiss', short ? 1 : 0, d.pos.x, d.pos.y + DINO.v.dinoHeight * 0.5, d.pos.z);
  else if (move === PACK) w.events.push('dinoBark', 0, d.pos.x, d.pos.y + DINO.v.dinoHeight * 0.8, d.pos.z);
  else if (move === TAIL) w.events.push('dinoFlick', 0, d.pos.x, d.pos.y + 1.5, d.pos.z);
  else if (move === ROAR) w.events.push('dinoRoar', index, d.pos.x, d.pos.y + DINO.v.dinoHeight * 0.85, d.pos.z);
  else if (move === CHARGE) w.events.push('dinoWindup', move, d.pos.x, d.pos.y + DINO.v.dinoHeight * 0.6, d.pos.z);
}

export function updateDino(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DINO.v;
  const b = d.raptor!;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  b.callIn = Math.max(0, b.callIn - dt);
  // Low enough: phase 2 (a roar, its eyes burning), not while it's on the move or out of sight.
  const hp = d.hp / ENEMY_STATS[d.kind]().hp;
  if (d.stage === 0 && hp <= v.frenzyAt && (d.phase === 'chase' || d.phase === 'recover' || d.phase === 'stun')) {
    d.stage = 1;
    warn(d, ROAR, index, player, w);
    return;
  }
  // Its ultimate's clock runs from phase 2 on, whatever it's doing.
  const due = d.stage > 0 && d.phase !== 'blast' && d.move !== ROAR && ultimateDue(d.ult, v.apexEvery, dt);
  switch (d.phase) {
    case 'stun':
      if (d.t >= stunOf(d)) {
        b.flipped = false;
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      break;
    case 'recover':
      if (d.move !== BITE) d.facing = turn(d.facing, toward, v.dinoTurn * dt);
      if (d.t >= recoverOf(d)) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      if (due) {
        startApex(d, index, w);
        break;
      }
      if (d.cooldown <= 0) {
        warn(d, pick(d, dist, w), index, player, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.dinoTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(d) + STAND_OFF)) break;
      walk(d, way.x, way.z, v.dinoSpeed * dinoPace(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      windup(d, index, player, w, dt, toward);
      break;
    case 'charge':
      if (d.move === AMBUSH) {
        if (stepAmbushRun(d, dt, w)) {
          vanish(d, player);
          setPhase(d, 'burrow');
        }
      } else if (d.move === FEINT) {
        if (stepFeint(d, player, w)) warn(d, SICKLE, index, player, w, true);
      } else {
        steer(d, player, dt);
        const r = stepCharge(d, index, player, w, dt, dinoCharge(d));
        if (r === 'crash') w.events.push('dinoCrash', index, d.pos.x, d.pos.y + 2, d.pos.z);
        else if (r === 'out') setPhase(d, 'recover');
      }
      break;
    case 'burrow':
      stalkUnseen(d, index, Math.min(1, d.t / v.ambushFor), player, w, dt);
      if (d.t >= v.ambushFor) {
        comeOut(d, player, w);
        d.move = EMERGE;
        d.flash = 0;
        setPhase(d, 'windup');
        w.events.push('dinoEmerge', index, d.pos.x, d.pos.y + 1.5, d.pos.z);
      }
      break;
    case 'dive':
      if (stepTail(d, player)) setPhase(d, 'stun');
      break;
    case 'leap':
      stepPounce(d, index, player, w, dt);
      break;
    case 'blast':
      if (stepApex(d, index, player, w, dt)) setPhase(d, 'recover');
      break;
    default:
      break;
  }
}

function windup(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, toward: number) {
  const v = DINO.v;
  const tell = dinoWindup(d.move, d.stage, d.struck) / (d.move === EMERGE ? 1 : dinoPace(d));
  switch (d.move) {
    case CHARGE:
      d.facing = turn(d.facing, toward, v.dinoTurn * CHARGE_AIM * dt);
      scrapes(d, w, tell);
      if (d.t >= tell) {
        d.facing = toward;
        startCharge(d, index, w);
        w.events.push('dinoCharge', index, d.pos.x, d.pos.y + 1, d.pos.z);
      }
      return;
    case SICKLE:
      d.facing = turn(d.facing, toward, v.dinoTurn * 2 * dt);
      if (d.t >= tell && !startPounce(d, player, w)) setPhase(d, 'recover');
      return;
    case FEINT:
      // (The very same crouch, and not a sound.)
      d.facing = turn(d.facing, toward, v.dinoTurn * 2 * dt);
      if (d.t >= tell) startFeint(d, index, player, w);
      return;
    case TAIL:
      d.facing = turn(d.facing, toward + SIDE_ON, v.dinoTurn * 3 * dt);
      if (d.t >= tell) startTail(d, index, w);
      return;
    case PACK:
      d.facing = turn(d.facing, toward, v.dinoTurn * dt);
      if (!d.struck && d.t >= tell * BARK_AGAIN) {
        d.struck = true;
        w.events.push('dinoBark', 1, d.pos.x, d.pos.y + v.dinoHeight * 0.8, d.pos.z);
      }
      if (d.t >= tell) {
        callPack(d, index, player, w);
        setPhase(d, 'recover');
      }
      return;
    case EMERGE:
      d.facing = toward;
      // Hit as it shows: it trips.
      if (d.flash > 0) {
        setPhase(d, 'stun');
        w.events.push('dinoTrip', index, d.pos.x, d.pos.y + 1.5, d.pos.z);
        return;
      }
      if (d.t < tell) return;
      d.move = LUNGE;
      if (!startPounce(d, player, w)) setPhase(d, 'recover');
      return;
    case ROAR:
      if (d.t >= tell) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d);
      }
      return;
    default:
      if (d.t >= tell) setPhase(d, 'recover');
  }
}
