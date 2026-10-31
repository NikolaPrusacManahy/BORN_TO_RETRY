// Update 0.2.10 — floor 5's boss, the Drowned King (the Fish, huge and crowned; spec MD_UPDATES/U0210_DROWNED_TEMPLE.md),
// reworked in the same update (the designer: "frustrating and challenging … use the water … make him different in phase
// 1 & 2"; the moves are Claude's). Its room floods knee-deep as it rises out of its portal, and down it goes.
// **Beneath** (phase 1) it's under the water, out of reach, circling you (its fin shows); every Under between moves it
// strikes from there (seeded, by how close you are): its ambush, its undertow or its jet (drownedKingMoves.ts). Only
// after each does it stay up a while: hit it then. **Risen** (below Risen at, up between its moves): it roars, rises for
// good and raises the water (deeper: you wade slower), calls its brood once (bossRoom.ts), and wades at you: its tidal
// wall, its surf, its geysers, its bites (drownedRisen.ts). Enemy.shots: bites or geysers done; Enemy.near: which way
// it circles beneath (±1), its wall's gap risen; Enemy.strafeTime: the last move it picked, Enemy.strafe: how many times
// in a row. Pure.
import { Vector3 } from 'three';
import { DROWNED } from '../../tuning/drowned';
import type { CombatEvent } from '../combat/state';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { stepCharge } from './demonMoves';
import { BITE, cruise, DIVE, face, GEYSER, goUnder, LUNGE, RISE, rise, RISEN, ROAR, SPOUT, startJet, stepHunt, stepJet, stepUndertow, SURF, surface, TIDE, UNDERTOW } from './drownedKingMoves';
import { bite, raiseTide, startSurf, steerSurf, stepGeysers, stepTide, surfSpec } from './drownedRisen';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Risen, it stops wading this far from your body (m). */
const STAND_OFF = 2;
/** The odds of each move it picks, close and far: beneath (its ambush, undertow, jet), risen (its tidal wall, surf,
 *  geysers, bites). **(placeholders)** */
const BENEATH = { moves: [LUNGE, UNDERTOW, SPOUT], near: [0.5, 0.2, 0.3], far: [0.25, 0.35, 0.4] };
const RISEN_ODDS = { moves: [TIDE, SURF, GEYSER, BITE], near: [0.2, 0.1, 0.25, 0.45], far: [0.4, 0.35, 0.25, 0] };
/** Its second bite's warning is this share of the first; winding up to surf it turns this much slower. */
const AGAIN = 0.5;
const SURF_AIM = 0.5;
const BITE_AIM = 0.6;

const way = new Vector3();

/** The warning before `move` (s). */
export function drownedWindup(move: number): number {
  const v = DROWNED.v;
  switch (move) {
    case RISE:
      return v.lungeWarn;
    case UNDERTOW:
      return v.undertowTime;
    case SPOUT:
      return v.spoutWindup;
    case TIDE:
      return v.tideWindup;
    case SURF:
      return v.surfWindup;
    case GEYSER:
      return v.geyserGap * Math.round(v.geysers);
    case BITE:
      return v.biteWindup;
    case DIVE:
      return v.diveWindup;
    case RISEN:
      return ROAR;
    default:
      return 1;
  }
}

/** Each move's warning, heard and seen (its undertow's is at its ring: `start`). */
const WARNINGS: Partial<Record<number, CombatEvent>> = { [SPOUT]: 'drownedSpoutWindup', [TIDE]: 'drownedTideWindup', [SURF]: 'drownedSurfWindup', [GEYSER]: 'drownedGeyserCall', [BITE]: 'drownedBiteWindup', [RISEN]: 'drownedRisen' };

/** The next move for its phase and how close you are (seeded); never one move three times running. */
function pick(k: Enemy, dist: number, w: EnemyWorld): number {
  const set = k.stage === 0 ? BENEATH : RISEN_ODDS;
  const odds = dist <= DROWNED.v.kingNear ? set.near : set.far;
  let move = set.moves[0];
  for (let tries = 0; tries < 4; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = set.moves[m];
        break;
      }
    }
    if (move !== k.strafeTime || k.strafe < 2) break;
  }
  // (Still the same a third time: the next it may pick.)
  const from = set.moves.indexOf(move);
  for (let m = from + 1; m < from + odds.length && move === k.strafeTime && k.strafe >= 2; m++) if (odds[m % odds.length] > 0) move = set.moves[m % odds.length];
  k.strafe = move === k.strafeTime ? k.strafe + 1 : 1;
  k.strafeTime = move;
  return move;
}

function warn(k: Enemy, move: number, index: number, w: EnemyWorld) {
  k.move = move;
  k.shots = 0;
  setPhase(k, 'windup');
  const event = WARNINGS[move];
  if (event) w.events.push(event, index, k.pos.x, k.pos.y + DROWNED.v.kingHeight * 0.6, k.pos.z);
}

/** It starts `move`. */
function start(k: Enemy, move: number, index: number, player: PlayerState, w: EnemyWorld) {
  switch (move) {
    case LUNGE:
      // (Hunting you under the water: its fin comes at you.)
      k.move = LUNGE;
      setPhase(k, 'burrow');
      return;
    case UNDERTOW:
      k.aim.set(player.pos.x, 0, player.pos.z);
      k.move = UNDERTOW;
      setPhase(k, 'windup');
      w.events.push('drownedUndertow', index, k.aim.x, Math.max(w.flood, 0.05), k.aim.z);
      return;
    case SPOUT:
      surface(k, index, w);
      break;
    case TIDE:
      raiseTide(k, player, w);
      break;
    default:
      break;
  }
  warn(k, move, index, w);
}

export function updateDrownedKing(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  // Low enough, and up between its moves: it rises for good (its brood with it: bossRoom.ts).
  const hp = k.hp / ENEMY_STATS[k.kind]().hp;
  if (k.stage === 0 && hp <= DROWNED.v.risenAt && (k.phase === 'recover' || k.phase === 'chase')) {
    k.stage = 1;
    k.pos.y = k.prev.y = 0;
    warn(k, RISEN, index, w);
    return;
  }
  if (k.stage === 0) beneath(k, index, player, w, dt);
  else risen(k, index, player, w, dt);
}

/** Phase 1: under the water, striking from it. */
function beneath(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  switch (k.phase) {
    case 'chase':
      // (The show's over: down it goes.)
      warn(k, DIVE, index, w);
      break;
    case 'burrow':
      if (k.move === LUNGE) {
        stepHunt(k, index, player, w, dt);
        break;
      }
      cruise(k, player, w, dt);
      if (k.cooldown <= 0 && !player.dead) start(k, pick(k, Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z), w), index, player, w);
      break;
    case 'windup': {
      const windup = drownedWindup(k.move);
      if (k.move === DIVE) {
        k.pos.y = -v.kingHeight * 0.5 * Math.min(1, k.t / windup) ** 2;
        if (k.t >= windup) goUnder(k, index, w);
        break;
      }
      if (k.move === UNDERTOW) {
        if (stepUndertow(k, player, w, dt)) rise(k, index, player, w);
        break;
      }
      if (k.move === SPOUT) face(k, player, 1, dt);
      if (k.t < windup) break;
      if (k.move === RISE) rise(k, index, player, w);
      else if (k.move === SPOUT) startJet(k, index, player, w);
      break;
    }
    case 'breath':
      if (stepJet(k, player)) {
        k.move = SPOUT;
        setPhase(k, 'recover');
      }
      break;
    case 'recover':
      face(k, player, 1, dt);
      if (k.t >= (k.move === SPOUT ? v.spoutUp : v.lungeUp)) warn(k, DIVE, index, w);
      break;
    default:
      break;
  }
}

/** Phase 2: up for good, commanding the water. */
function risen(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  const dist = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
  const toward = yawTo(k, player.pos.x, player.pos.z);
  switch (k.phase) {
    case 'chase': {
      if (player.dead) break;
      if (k.cooldown <= 0) {
        start(k, pick(k, dist, w), index, player, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, k.pos, player.pos.x, player.pos.z, way);
      k.facing = turn(k.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.kingTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(k) + STAND_OFF)) break;
      walk(k, way.x, way.z, v.kingSpeed * dt, w.nav.large);
      break;
    }
    case 'windup': {
      if (k.move === GEYSER) {
        if (stepGeysers(k, player, w)) setPhase(k, 'recover');
        break;
      }
      const windup = drownedWindup(k.move) * (k.move === BITE && k.shots > 0 ? AGAIN : 1);
      // (Its wall rising, it stands: its way is set.)
      if (k.move === BITE) face(k, player, BITE_AIM, dt);
      else if (k.move === SURF) face(k, player, SURF_AIM, dt);
      else if (k.move !== TIDE) face(k, player, 1, dt);
      if (k.t < windup) break;
      if (k.move === TIDE) {
        setPhase(k, 'blast');
        w.events.push('drownedTide', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
      } else if (k.move === SURF) startSurf(k, index, w);
      else if (k.move === BITE) {
        bite(k, index, player, w);
        // (Twice.)
        if (k.shots === 0) {
          k.shots = 1;
          setPhase(k, 'windup');
          w.events.push('drownedBiteWindup', index, k.pos.x, k.pos.y + v.kingHeight * 0.6, k.pos.z);
        } else setPhase(k, 'recover');
      } else {
        // Its roar over.
        setPhase(k, 'chase');
        k.cooldown = v.kingPause;
      }
      break;
    }
    case 'blast':
      if (stepTide(k, player, dt)) setPhase(k, 'recover');
      break;
    case 'charge':
      steerSurf(k, player, dt);
      // (Into a wall or a column: stunned, 'stun'.)
      if (stepCharge(k, index, player, w, dt, surfSpec()) === 'out') setPhase(k, 'recover');
      break;
    case 'stun':
      if (k.t >= v.kingStun) {
        setPhase(k, 'chase');
        k.cooldown = v.kingPause * 0.5;
      }
      break;
    case 'recover':
      if (k.move !== BITE) face(k, player, 1, dt);
      if (k.t >= v.kingRecover) {
        setPhase(k, 'chase');
        k.cooldown = v.kingPause;
      }
      break;
    default:
      break;
  }
}
