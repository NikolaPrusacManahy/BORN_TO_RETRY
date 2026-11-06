// Update 0.2.10 — floor 5's boss, the Drowned King (the Fish, huge and crowned; spec MD_UPDATES/U0210_DROWNED_TEMPLE.md),
// reworked in the same update (the designer: "frustrating and challenging … use the water … make him different in phase
// 1 & 2"; the moves are Claude's). Its room floods knee-deep as it rises, and down it goes.
// Update 0.3.58 — by the Boss Design Bible, "Master the parry" (the designer: "Keep them, adapt"; spec
// MD_UPDATES/U0358_DROWNED_KING_BIBLE.md). **Beneath** (phase 1) it's still under the water between moves, out of reach, its fin
// circling you; every Under between moves it picks (seeded, by how close you are): its Jaw Launch, its Fin Dive, its Frenzy Combo
// (drownedJaws.ts, drownedKingMoves.ts). Only for those is it up to be hit. **Risen** (below Risen at, up between its moves): it roars,
// rises for good, raises the water (the low stones go under), and wades at you: the same three, quicker, with its Riptide and its surf
// (drownedRisen.ts), Blood Frenzy (a hit of its marks you: its heads come faster), and its Maw of Many (drownedMaw.ts), which calls
// its brood after the first (bossRoom.ts). Enemy.shots: heads launched, claws done; Enemy.near: which way it circles (±1);
// Enemy.strafeTime: the last move it picked, Enemy.strafe: how many times in a row. Pure.
import { Vector3 } from 'three';
import { DROWNED } from '../../tuning/drowned';
import type { CombatEvent } from '../combat/state';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { stepCharge } from './charge';
import { stepHeads } from './drownedBody';
import { headsOut, stepFrenzy, stepVolley } from './drownedJaws';
import { cruise, DIVE, face, feetIn, FIN, FRENZY, goneFor, goUnder, JAWS, LUNGE, MAW, paceOf, RIPTIDE, RISE, rise, RISEN, ROAR, startFin, stepFin, stepGone, stepLeap, SURF, swimOf } from './drownedKingMoves';
import { startMaw, stepMaw } from './drownedMaw';
import { startRiptide, startSurf, steerSurf, stepRiptide, stepRipPull, surfSpec } from './drownedRisen';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { ultimateDue } from './ultimate';

/** Risen, it stops wading this far from your body (m). */
const STAND_OFF = 2;
/** The odds of each move it picks, close and far: beneath (Jaw Launch, Fin Dive, Frenzy Combo), risen (and its Riptide, its surf).
 *  **(placeholders)** */
const BENEATH = { moves: [JAWS, FIN, FRENZY], near: [0.25, 0.3, 0.45], far: [0.45, 0.25, 0.3] };
const RISEN_ODDS = { moves: [JAWS, FIN, FRENZY, RIPTIDE, SURF], near: [0.15, 0.2, 0.5, 0.15, 0], far: [0.3, 0.2, 0, 0.25, 0.25] };
/** Winding up to surf or to claw it turns this much slower. */
const SURF_AIM = 0.5;
const CLAW_AIM = 0.6;
/** Going for you under the water to claw: this many times its swim, for at most this long (s), to this far inside its reach (m). */
const HUNT_PACE = 1.5;
const HUNT = 2.2;
const HUNT_IN = 0.5;
/** It stands at least this long through a volley's end (s). Knocked into the water, you get this long before it dives for you (s). */
const VOLLEY_MIN = 0.5;
const FIN_AFTER = 0.4;

const way = new Vector3();

/** The warning before `move` (s). */
export function drownedWindup(move: number, stage = 0): number {
  const v = DROWNED.v;
  const pace = stage > 0 ? v.ragePace : 1;
  switch (move) {
    case RISE:
      return v.finGone / pace;
    case JAWS:
    case FRENZY:
    case RIPTIDE:
      return v.tell / pace;
    case SURF:
      return v.surfWindup / pace;
    case DIVE:
      return v.diveWindup;
    case RISEN:
      return ROAR;
    default:
      return 1;
  }
}

/** Each move's warning, heard and seen. */
const WARNINGS: Partial<Record<number, CombatEvent>> = { [JAWS]: 'drownedSnap', [FRENZY]: 'drownedHunch', [RIPTIDE]: 'drownedRiptideTell', [SURF]: 'drownedSurfWindup', [RISEN]: 'drownedRisen' };

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
  k.struck = false;
  setPhase(k, 'windup');
  const event = WARNINGS[move];
  if (event) w.events.push(event, index, k.pos.x, k.pos.y + DROWNED.v.kingHeight * 0.6, k.pos.z);
}

/** Up out of the water where it is. */
function surface(k: Enemy, index: number, w: EnemyWorld) {
  if (k.pos.y >= 0) return;
  k.pos.y = k.prev.y = 0;
  w.events.push('drownedSurface', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** It starts `move`. */
function start(k: Enemy, move: number, index: number, w: EnemyWorld) {
  const under = k.pos.y < 0;
  k.shots = 0;
  switch (move) {
    case FIN:
      // (Beneath, it's already there; risen, it goes down first.)
      if (under) startFin(k, index, w);
      else warn(k, DIVE, index, w);
      return;
    case FRENZY:
      if (under) {
        k.move = FRENZY;
        setPhase(k, 'burrow');
        return;
      }
      warn(k, FRENZY, index, w);
      return;
    default:
      surface(k, index, w);
      warn(k, move, index, w);
  }
}

/** How long it stands after its move. */
function recoverOf(k: Enemy, w: EnemyWorld): number {
  const v = DROWNED.v;
  switch (k.move) {
    case JAWS:
      return headsOut(w) ? v.headsUp : VOLLEY_MIN;
    case LUNGE:
      return v.lungeUp;
    case FRENZY:
      return v.frenzyUp / paceOf(k);
    default:
      return v.kingRecover / paceOf(k);
  }
}

/** How long it's stunned. */
function stunOf(k: Enemy): number {
  const v = DROWNED.v;
  return k.move === MAW ? v.mawStun : k.move === FRENZY ? v.clawOpen : v.kingStun;
}

/** Its move over: beneath, down again; risen, it wades at you. */
function nextUp(k: Enemy, index: number, w: EnemyWorld) {
  if (k.stage === 0) {
    warn(k, DIVE, index, w);
    return;
  }
  setPhase(k, 'chase');
  k.cooldown = DROWNED.v.kingPause / paceOf(k);
}

export function updateDrownedKing(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  const b = k.drowned!;
  // Blood Frenzy: risen, a hit of its marks you; it fades with no more of them.
  if (b.hitsSeen < 0) b.hitsSeen = player.hits;
  if (player.hits !== b.hitsSeen) {
    if (player.hits > b.hitsSeen && k.stage > 0 && player.hurtBy === k.kind) {
      if (b.mark <= 0) w.events.push('drownedMarked', index, player.pos.x, player.pos.y + 1, player.pos.z);
      b.mark = v.markFor;
    }
    b.hitsSeen = player.hits;
  } else b.mark = Math.max(0, b.mark - dt);
  if (!(k.phase === 'blast' && k.move === MAW)) stepHeads(b, dt);
  // Low enough, and up between its moves: it rises for good.
  const hp = k.hp / ENEMY_STATS[k.kind]().hp;
  if (k.stage === 0 && hp <= v.risenAt && (k.phase === 'recover' || k.phase === 'chase')) {
    k.stage = 1;
    k.pos.y = k.prev.y = 0;
    warn(k, RISEN, index, w);
    return;
  }
  const due = k.stage > 0 && k.phase !== 'blast' && k.move !== RISEN && ultimateDue(k.ult, v.mawEvery, dt);
  const dist = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
  switch (k.phase) {
    case 'chase':
      chase(k, index, player, w, dt, dist, due);
      break;
    case 'burrow':
      if (k.move === FRENZY) hunt(k, index, player, w, dt, dist);
      else if (k.move === FIN) stepFin(k, index, player, w, dt);
      else {
        cruise(k, player, w, dt);
        if (k.cooldown <= 0 && !player.dead) start(k, pick(k, dist, w), index, w);
      }
      break;
    case 'windup':
      windup(k, index, player, w, dt);
      break;
    case 'breath':
      face(k, player, 1, dt);
      if (stepVolley(k, index, player, w)) setPhase(k, 'recover');
      break;
    case 'dive':
      if (stepFrenzy(k, index, player, w) === 'done') setPhase(k, 'recover');
      break;
    case 'leap':
      if (stepLeap(k, index, w)) setPhase(k, 'recover');
      break;
    case 'blast':
      if (k.move === MAW ? stepMaw(k, index, player, w, dt) : stepRiptide(k, player, w, dt)) setPhase(k, 'recover');
      break;
    case 'charge':
      steerSurf(k, player, dt);
      // (Into a wall, a column or a stone: stunned, 'stun'.)
      if (stepCharge(k, index, player, w, dt, surfSpec()) === 'out') setPhase(k, 'recover');
      break;
    case 'stun':
      if (k.t >= stunOf(k)) {
        b.jammed = false;
        k.cooldown = v.kingPause * 0.5;
        setPhase(k, k.stage > 0 ? 'chase' : 'recover');
        // (Beneath: on down at once, or up for good.)
        if (k.stage === 0) k.t = recoverOf(k, w);
      }
      break;
    case 'recover':
      recover(k, index, player, w, dt);
      break;
    default:
      break;
  }
}

/** Standing, and the moves come when they're due (risen); beneath, only as the show ends: it opens with a volley. */
function chase(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, dist: number, due: boolean) {
  const v = DROWNED.v;
  const b = k.drowned!;
  if (k.stage === 0) {
    if (!b.opened && !player.dead) {
      b.opened = true;
      start(k, JAWS, index, w);
    } else warn(k, DIVE, index, w);
    return;
  }
  if (player.dead) return;
  if (due) {
    startMaw(k, index, w);
    return;
  }
  if (k.cooldown <= 0) {
    start(k, pick(k, dist, w), index, w);
    return;
  }
  const how = chaseDir(w.flow.large, w.nav.large, k.pos, player.pos.x, player.pos.z, way);
  const toward = yawTo(k, player.pos.x, player.pos.z);
  k.facing = turn(k.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.kingTurn * dt);
  if (how === 'none' || (how === 'straight' && dist <= radiusOf(k) + STAND_OFF)) return;
  walk(k, way.x, way.z, v.kingSpeed * dt, w.nav.large);
}

/** To claw, beneath: under the water, at you; there, up it comes. */
function hunt(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, dist: number) {
  const reach = radiusOf(k) + DROWNED.v.clawReach - HUNT_IN;
  if (dist > reach && k.t < HUNT) {
    walk(k, (player.pos.x - k.pos.x) / dist, (player.pos.z - k.pos.z) / dist, Math.min(dist - reach + 0.1, swimOf(k) * HUNT_PACE * dt), w.nav.large);
    return;
  }
  surface(k, index, w);
  k.facing = yawTo(k, player.pos.x, player.pos.z);
  warn(k, FRENZY, index, w);
}

function windup(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DROWNED.v;
  const tell = drownedWindup(k.move, k.stage);
  switch (k.move) {
    case DIVE:
      k.pos.y = -v.kingHeight * 0.5 * Math.min(1, k.t / tell) ** 2;
      if (k.t >= tell) goUnder(k, index, w);
      return;
    case RISE:
      if (stepGone(k, index, player, w, dt) || k.t >= goneFor(k)) rise(k, index, player, w);
      return;
    case JAWS:
      face(k, player, 1, dt);
      // (Its heads snap their jaws twice.)
      if (!k.struck && k.t >= tell * 0.5) {
        k.struck = true;
        w.events.push('drownedSnap', index, k.pos.x, k.pos.y + v.kingHeight * 0.6, k.pos.z);
      }
      if (k.t >= tell) {
        k.shots = 0;
        setPhase(k, 'breath');
      }
      return;
    case FRENZY:
      face(k, player, CLAW_AIM, dt);
      if (k.t >= tell) {
        k.shots = 0;
        setPhase(k, 'dive');
      }
      return;
    case RIPTIDE:
      stepRipPull(k, player, w);
      if (k.t >= tell) startRiptide(k, index, player, w);
      return;
    case SURF:
      face(k, player, SURF_AIM, dt);
      if (k.t >= tell) startSurf(k, index, w);
      return;
    default:
      // Its roar over.
      if (k.t < tell) return;
      setPhase(k, 'chase');
      k.cooldown = v.kingPause;
  }
}

function recover(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const b = k.drowned!;
  face(k, player, 1, dt);
  // You're in the water: it comes for you, at once.
  if (b.finNow && k.t >= FIN_AFTER && feetIn(player, w) && !player.dead) {
    warn(k, DIVE, index, w);
    return;
  }
  if (k.t < recoverOf(k, w)) return;
  b.finNow = false;
  nextUp(k, index, w);
}
