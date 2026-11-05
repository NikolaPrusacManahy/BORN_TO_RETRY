// Update 0.0.18 — the Dragon, its floor's boss (the designer). It flies at you, low. It never flinches. Its death show is
// every boss's (bossDoom.ts).
// Update 0.3.49 — anew, from the Boss Design Bible ("Read the tell": watch the body, dash at the right moment; slow, huge,
// honest telegraphs). Every pause on the ground it picks a move by how far you are (seeded) and warns: its head rears and
// its throat glows (Flame Sweep), its wings lift (Wing Gust), it turns its back and shakes its tail (Tail Quake). Each
// leaves a punish window (dragonMoves.ts). At half health it screams and takes to the sky for good (dragonSky.ts: Dive
// Bomb, Ember Rain; its old moves quicker and chained), its ultimate first, and again every so often (dragonCore.ts).
import { Vector3 } from 'three';
import { DRAGON } from '../../tuning/dragon';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { startCore, stepBlast, stepCore, stepCoreLanding } from './dragonCore';
import { aimSweepStart, BLAST, CORE, DIVE, dragonMouth, dragonRecover, EMBER, startGust, startSweep, stepGust, stepSweep, SWEEP, TAIL, tailSlam, WING } from './dragonMoves';
import { climb, startDive, stepDive, stepDiveTell, stepEmbers, stepSky, takeOff } from './dragonSky';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { ultimateDue } from './ultimate';

/** It stops flying this close to you (m: its body is wide). */
const STAND_OFF = 6;
/** The odds of each move (sweep, wing, tail) close (Dragon close), between, and far (Dragon far). **(placeholders)** */
const ODDS_NEAR = [0.2, 0.4, 0.4];
const ODDS_MID = [0.5, 0.25, 0.25];
const ODDS_FAR = [0.6, 0.25, 0.15];

const way = new Vector3();
const mouth = new Vector3();

/** The warning before `move` (s): its old moves quicker in phase 2. */
export function dragonWindup(d: Enemy, move: number): number {
  const v = DRAGON.v;
  if (move === DIVE) return v.diveWindup;
  if (move === EMBER) return v.emberWindup;
  const base = move === WING ? v.wingWindup : move === TAIL ? v.tailWindup : v.sweepWindup;
  return base * (d.stage > 0 ? v.rageWindup : 1);
}

/** Its pause before the next move: shorter when you're close (it strikes more often). */
const pauseOf = (dist: number) => DRAGON.v.dragonPause * (dist <= DRAGON.v.dragonNear ? DRAGON.v.closePause : 1);

/** The next move for where you are (seeded); never the same one three times running. */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const odds = dist <= DRAGON.v.dragonNear ? ODDS_NEAR : dist <= DRAGON.v.dragonFar ? ODDS_MID : ODDS_FAR;
  let move = SWEEP;
  for (let tries = 0; tries < 3; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = m;
        break;
      }
    }
    // Enemy.strafe counts the same move in a row.
    if (move !== d.move || d.strafe < 2) break;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

function warn(d: Enemy, move: number, w: EnemyWorld) {
  d.move = move;
  d.shots = 0;
  setPhase(d, 'windup');
  dragonMouth(d, mouth);
  w.events.push('dragonWindup', move, mouth.x, mouth.y, mouth.z);
}

/** A ground move over. On the ground it goes back to flying at you; in phase 2 its sweep chains into its gust, and any
 *  other goes back up. */
function afterMove(d: Enemy, index: number, dist: number, w: EnemyWorld) {
  if (d.stage === 0) {
    setPhase(d, 'chase');
    d.cooldown = pauseOf(dist);
  } else if (d.move === SWEEP) warn(d, WING, w);
  else takeOff(d, index, w, false);
}

export function updateDragon(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DRAGON.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  // Half dead: it screams and takes to the sky (once), unless it's in the middle of its fire or its wind.
  if (d.stage === 0 && d.hp <= v.dragonHp * v.rageAt && d.phase !== 'breath' && d.phase !== 'intro') {
    d.stage = 1;
    takeOff(d, index, w, true);
    return;
  }
  const due = d.stage > 0 && ultimateDue(d.ult, v.coreEvery, dt);
  switch (d.phase) {
    case 'sky': {
      if (due && d.pos.y >= v.skyAlt - 0.01 && !player.dead) {
        startCore(d);
        break;
      }
      // (Due, it picks nothing else on its way up.)
      if (due) d.cooldown = Math.max(d.cooldown, 1);
      const next = stepSky(d, player, w, dt);
      if (next === SWEEP) {
        // Down to it first ('dive', Enemy.move SWEEP).
        d.move = SWEEP;
        setPhase(d, 'dive');
      } else if (next >= 0) warn(d, next, w);
      break;
    }
    case 'dive':
      if (d.move === DIVE) {
        if (stepDive(d, index, player, w, dt)) setPhase(d, 'stun');
      } else if (d.move === CORE) stepCoreLanding(d, index, player, w, dt);
      else {
        climb(d, 0, dt);
        if (d.pos.y <= 0) warn(d, SWEEP, w);
      }
      break;
    case 'blast':
      stepCore(d, index, w, dt);
      break;
    case 'stun': {
      const long = d.move === DIVE ? v.diveStuck : v.coreStagger;
      if (d.t < long) break;
      // Out of the ground, its Tail Quake; its core broken, back up.
      if (d.move === DIVE) warn(d, TAIL, w);
      else if (d.stage > 0) takeOff(d, index, w, false);
      else setPhase(d, 'chase');
      break;
    }
    case 'recover':
      if (d.move === BLAST) stepBlast(d, player, w);
      // (Its head low, or its back to you: it doesn't turn.)
      else if (d.move === WING) d.facing = turn(d.facing, toward, v.dragonTurn * dt);
      if (d.t >= dragonRecover(d.move)) afterMove(d, index, dist, w);
      break;
    case 'chase': {
      if (player.dead) break;
      if (d.cooldown <= 0) {
        warn(d, pick(d, dist, w), w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.dragonTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= STAND_OFF)) break;
      walk(d, way.x, way.z, v.dragonSpeed * dt, w.nav.large);
      break;
    }
    case 'windup':
      windup(d, index, player, toward, w, dt);
      break;
    case 'breath':
      if (d.move === EMBER) {
        if (stepEmbers(d, index, player, w, dt)) takeOff(d, index, w, false);
      } else if (d.move === WING ? stepGust(d, index, player, w, dt) : stepSweep(d, player, w)) setPhase(d, 'recover');
      break;
    default:
      break;
  }
}

/** One tick of a warning, and the move it warned of. */
function windup(d: Enemy, index: number, player: PlayerState, toward: number, w: EnemyWorld, dt: number) {
  const v = DRAGON.v;
  const long = dragonWindup(d, d.move);
  if (d.move === DIVE) stepDiveTell(d, player, w, dt);
  // Its back to you, by the time it slams.
  else if (d.move === TAIL) d.facing = turn(d.facing, toward + Math.PI, (Math.PI / Math.max(0.1, long)) * 1.2 * dt);
  else d.facing = turn(d.facing, toward, v.dragonTurn * dt);
  if (d.move === EMBER) climb(d, v.skyAlt, dt);
  if (d.move === SWEEP) aimSweepStart(d, w);
  if (d.t < long) return;
  if (d.move === SWEEP) startSweep(d, index, w);
  else if (d.move === WING) startGust(d, index, w);
  else if (d.move === DIVE) startDive(d, index, player, w);
  else if (d.move === EMBER) setPhase(d, 'breath');
  else {
    tailSlam(d, index, w);
    setPhase(d, 'recover');
  }
}
