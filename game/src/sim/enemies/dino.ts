// Update 0.2.4 — floor 4's boss, the Velociraptor (the designer: "Boss Dino"; the floor "needs to give a hard time …
// smarter than ordinary enemies"; its id stays 'dino'). It walks at you; every Velociraptor pause it picks a move by
// where you are (seeded) and warns. Run it into a wall or a column and it's stunned (hits do more). Its death show is
// the Demon's.
// Update 0.2.8 — its moves anew (the designer: "move sets that were not in the game yet … make a challenging boss";
// Claude's proposal, "Build all of them"). The hunt (dinoHunt.ts): its charge (a real one scrapes the sand twice; a
// feint stops dead and pounces where you went), its sand kick (your view blurred, then it charges) and its wall launch.
// Below Velociraptor frenzy at, its frenzy (dinoFrenzy.ts): a sandstorm it stalks you in (screeched up at once, then
// every Sandstorm gap), its screech (no dash for a while, then it charges) and a pounce that pins you (pin.ts); it's
// quicker in everything. Below Velociraptor blitz at, the blitz too (dinoBlitz.ts): two afterimages, only it casts a
// shadow. Enemy.near: 1 while its charge's warning is a feint's (the blitz: its lane); Enemy.shots: scrapes or slashes;
// Enemy.strafe: the same move picked in a row; Enemy.blink: seconds till its next sandstorm. Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { startCharge, stepCharge } from './demonMoves';
import { blitzHit, blitzSlashes, slashesDone, startBlitz, stepBlitz } from './dinoBlitz';
import { screech, stalk, stormUp } from './dinoFrenzy';
import { kickTurn, sandKick, scrapes, startWallRun, stepClimb, stepWallRun } from './dinoHunt';
import { BITE, BLITZ, CHARGE, dinoCharge, dinoPace, FEINT, KICK, LUNGE, SCREECH, startPounce, steer, stepPounce, STORM, STORM_CALL, WALL } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** It stops walking this far from your body (m). */
const STAND_OFF = 2.5;
/** The odds of each move it picks (charge, kick, wall launch, screech, pounce) close, between and far: on the hunt,
 *  then in its frenzy. **(placeholders)** */
const HUNT = { near: [0.3, 0.5, 0.2, 0, 0], mid: [0.5, 0.2, 0.3, 0, 0], far: [0.5, 0, 0.5, 0, 0] };
const FRENZY = { near: [0.2, 0.3, 0.05, 0.1, 0.35], mid: [0.3, 0.05, 0.2, 0.2, 0.25], far: [0.3, 0, 0.35, 0.2, 0.15] };
/** Below Velociraptor blitz at, this share of its picks is a blitz. **(placeholder)** */
const BLITZ_SHARE = 0.35;
/** While warning of a charge it turns this much slower (a dash aside beats it). */
const CHARGE_AIM = 0.5;
/** A lunge out of the storm: it stands this share of Velociraptor recover after. */
const LUNGE_REST = 0.5;

const way = new Vector3();

/** The warning before `move` (s). */
export function dinoWindup(move: number): number {
  const v = DINO.v;
  return [v.chargeWindup, v.kickWindup, v.wallWindup, v.screechWindup, v.pounceWindup, STORM_CALL, v.blitzWindup, v.feintStop, v.lungeHiss, v.pinCue][move] ?? v.chargeWindup;
}

const pauseOf = (d: Enemy) => DINO.v.dinoPause / dinoPace(d);

/** How long it stands after `move`. */
function recoverOf(d: Enemy): number {
  const v = DINO.v;
  if (d.move === BLITZ) return v.blitzSlashGap * Math.round(v.blitzSlashes) + v.dinoRecover;
  return d.move === LUNGE ? v.dinoRecover * LUNGE_REST : v.dinoRecover;
}

/** The next move for where you are (seeded): its sandstorm whenever its gap is over (its frenzy); never one move three
 *  times running. */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const v = DINO.v;
  if (d.stage > 0 && d.blink <= 0) return STORM;
  const set = d.stage > 0 ? FRENZY : HUNT;
  const odds = dist <= v.dinoNear ? set.near : dist <= v.dinoFar ? set.mid : set.far;
  let move = CHARGE;
  for (let tries = 0; tries < 4; tries++) {
    if (d.stage > 1 && w.rng() < BLITZ_SHARE) move = BLITZ;
    else {
      let roll = w.rng();
      for (let m = 0; m < odds.length; m++) {
        roll -= odds[m];
        if (roll < 0) {
          move = m;
          break;
        }
      }
    }
    if (move !== d.move || d.strafe < 2) break;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

/** It warns of `move` (a charge: a feint, Feint chance of the time, unless `real`). */
function warn(d: Enemy, move: number, w: EnemyWorld, real = false) {
  d.move = move;
  d.shots = 0;
  d.near = move === CHARGE && !real && w.rng() < DINO.v.feintChance ? 1 : 0;
  setPhase(d, 'windup');
  w.events.push('dinoWindup', move, d.pos.x, d.pos.y + DINO.v.dinoHeight * 0.6, d.pos.z);
}

/** Its warning over: the move. */
function unleash(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, toward: number) {
  switch (d.move) {
    case CHARGE:
      if (d.near > 0) {
        // A feint: it stops dead, then pounces where you went.
        d.move = FEINT;
        setPhase(d, 'windup');
        w.events.push('dinoFeint', index, d.pos.x, d.pos.y + 1, d.pos.z);
        return;
      }
      d.facing = toward;
      startCharge(d, index, w);
      w.events.push('dinoCharge', index, d.pos.x, d.pos.y + 1, d.pos.z);
      return;
    case KICK:
      if (sandKick(d, player, w)) warn(d, CHARGE, w, true);
      else setPhase(d, 'recover');
      return;
    case WALL:
      if (!startWallRun(d, index, w)) warn(d, CHARGE, w, true);
      return;
    case SCREECH:
      screech(d, player, w);
      warn(d, CHARGE, w, true);
      return;
    case STORM:
      stormUp(d, index, w);
      setPhase(d, 'chase');
      d.cooldown = DINO.v.lungeGap;
      return;
    case BLITZ:
      startBlitz(d, index, player, w);
      return;
    default:
      // A pounce of its own, a feint's, a lunge out of the storm.
      if (!startPounce(d, player, w)) setPhase(d, 'recover');
  }
}

export function updateDino(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DINO.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  if (d.stage > 0) d.blink = Math.max(0, d.blink - dt);
  // Low enough: its frenzy (its first sandstorm at once), then its blitzes (one at once); not while it's on the move.
  const busy = d.phase === 'charge' || d.phase === 'leap' || d.phase === 'sky' || d.phase === 'intro';
  const hp = d.hp / ENEMY_STATS[d.kind]().hp;
  if (!busy && d.stage === 0 && hp <= v.frenzyAt) {
    d.stage = 1;
    d.blink = 0;
    warn(d, STORM, w);
    return;
  }
  if (!busy && d.stage === 1 && hp <= v.blitzAt) {
    d.stage = 2;
    warn(d, BLITZ, w);
    return;
  }
  switch (d.phase) {
    case 'stun':
      if (d.t >= v.dinoStun) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      break;
    case 'recover':
      if (d.move === BLITZ) {
        // Hit before its slashes are done: stunned. Else its slashes.
        if (blitzHit(d) && !slashesDone(d)) {
          setPhase(d, 'stun');
          w.events.push('dinoReel', index, d.pos.x, d.pos.y + v.dinoHeight * 0.6, d.pos.z);
          break;
        }
        blitzSlashes(d, player, w);
      } else if (d.move !== BITE) d.facing = turn(d.facing, toward, v.dinoTurn * dt);
      if (d.t >= recoverOf(d)) {
        setPhase(d, 'chase');
        d.cooldown = w.storm > 0 ? v.lungeGap : pauseOf(d);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      // In its sandstorm it stalks you, lunging out of it.
      if (w.storm > 0) {
        if (d.cooldown <= 0) warn(d, LUNGE, w);
        else stalk(d, player, w, dt);
        break;
      }
      if (d.cooldown <= 0) {
        warn(d, pick(d, dist, w), w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.dinoTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(d) + STAND_OFF)) break;
      walk(d, way.x, way.z, v.dinoSpeed * dinoPace(d) * dt, w.nav.large);
      break;
    }
    case 'windup': {
      const windup = dinoWindup(d.move) / dinoPace(d);
      if (d.move === KICK) kickTurn(d, player, windup, dt);
      else if (d.move !== BLITZ) d.facing = turn(d.facing, toward, v.dinoTurn * (d.move === CHARGE ? CHARGE_AIM : 2) * dt);
      if (d.move === CHARGE) scrapes(d, w, windup);
      if (d.t >= windup) unleash(d, index, player, w, toward);
      break;
    }
    case 'charge':
      if (d.move === WALL) stepWallRun(d, index, w, dt);
      else if (d.move === BLITZ) {
        if (blitzHit(d)) {
          setPhase(d, 'stun');
          w.events.push('dinoReel', index, d.pos.x, d.pos.y + v.dinoHeight * 0.6, d.pos.z);
        } else stepBlitz(d, w);
      } else {
        steer(d, player, dt);
        const r = stepCharge(d, index, player, w, dt, dinoCharge(d));
        if (r === 'crash') w.events.push('dinoCrash', index, d.pos.x, d.pos.y + 2, d.pos.z);
        else if (r === 'out') setPhase(d, 'recover');
      }
      break;
    case 'sky':
      stepClimb(d, player, w);
      break;
    case 'leap':
      stepPounce(d, index, player, w);
      break;
    default:
      break;
  }
}
