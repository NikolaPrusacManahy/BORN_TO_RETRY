// Update 0.3.63 — floor 10's boss, Hellwarden (MD/FLOOR10_HELL_PLAN.md: the Bestiary's skull-faced knight, its greatsword, agreed in 0.3.28;
// by the Boss Design Bible, the Blazing Sword Demon, "The final exam"; the designer: "For floor 10 we have nothing designed so you need to
// start"; spec MD_UPDATES/U0363_HELLWARDEN.md). It walks at you; every pause it picks a move by how close you are (seeded): its Blazing Arc,
// its Hellfire Lunge, its Brand of Ruin (wardenMoves.ts). Below half: its throne room breaks (every column left comes down), its sword splits
// in two, it's quicker: its Echoes of the Fallen (wardenEchoes.ts), its Twin Blade Recall, and its ultimate, Last Verdict (wardenVerdict.ts),
// the game's one one-shot. Enemy.shots: its Arc's second swing; Enemy.strafe: the same move picked in a row. Its death show is the Demon's.
// Pure.
import { Vector3 } from 'three';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { pillarsIn, PillarWorld, snapPillar } from '../combat/pillars';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { ultimateDue } from './ultimate';
import { startEchoes, stepEchoes } from './wardenEchoes';
import { ARC, ARC_TWO, bladesOut, BRAND, ECHOES, LUNGE, paceOf, plantBrand, ROAR, stepArc, stepBrand, stepWalls, swingArc, throwBlades, thrust, THRUST, TWIN, vanish, VERDICT } from './wardenMoves';
import { startVerdict, stepVerdict } from './wardenVerdict';

/** It stops walking this far from your body (m). */
const STAND_OFF = 2.5;
/** The odds of each move (arc, lunge, brand, echoes, twin) close and far: its first phase, then its second. **(placeholders)** */
const ONE = { near: [0.5, 0.25, 0.25, 0, 0], far: [0.2, 0.45, 0.35, 0, 0] };
const TWO = { near: [0.3, 0.2, 0.15, 0.2, 0.15], far: [0.05, 0.25, 0.15, 0.3, 0.25] };
const MOVES = [ARC, LUNGE, BRAND, ECHOES, TWIN];
/** Its roar as phase 2 starts, and the columns coming down one by one through it (s). */
const ROAR_FOR = 1.4;
const COLUMN_GAP = 0.12;

const way = new Vector3();

/** The warning before `move` (s). */
export function wardenWindup(move: number, stage = 0): number {
  const v = HELLWARDEN.v;
  const pace = stage > 0 ? v.ragePace : 1;
  if (move === ROAR) return ROAR_FOR;
  if (move === LUNGE) return v.lungeVanish / pace;
  return v.tell / pace;
}

const pauseOf = (e: Enemy) => HELLWARDEN.v.pause / paceOf(e);

/** The next move for how close you are (seeded); never one move three times running; no second lot of echoes while they last. */
function pick(e: Enemy, dist: number, w: EnemyWorld): number {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  const set = e.stage > 0 ? TWO : ONE;
  const odds = dist <= v.near ? set.near : set.far;
  let move = LUNGE;
  for (let tries = 0; tries < 5; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = MOVES[m];
        break;
      }
    }
    if (move === ECHOES && (b.echoLeft > 0 || b.echoes.length > 0)) continue;
    if (move === TWIN && b.weak > 0) continue;
    if (move !== e.move || e.strafe < 2) break;
  }
  e.strafe = move === e.move ? e.strafe + 1 : 1;
  return move;
}

function warn(e: Enemy, move: number, index: number, w: EnemyWorld) {
  e.move = move;
  e.shots = 0;
  setPhase(e, 'windup');
  const v = HELLWARDEN.v;
  w.events.push(move === ARC ? 'wardenFlare' : move === BRAND ? 'wardenRaise' : move === TWIN ? 'wardenCross' : move === ECHOES ? 'wardenCall' : move === ROAR ? 'wardenRoar' : 'wardenEmbers', index, e.pos.x, e.pos.y + v.height * 0.6, e.pos.z);
}

/** Its throne room comes apart: a column every so often through its roar. */
function bringDown(e: Enemy, w: EnemyWorld) {
  const pillars = pillarsIn(w);
  const n = Math.floor(e.t / COLUMN_GAP);
  let left = n - e.shots;
  for (let i = 0; i < pillars.length && left > 0; i++) {
    if (pillars[i].broken) continue;
    snapPillar(w as unknown as PillarWorld, i, yawTo(e, pillars[i].x, pillars[i].z));
    left--;
    e.shots++;
  }
}

export function updateHellwarden(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  stepWalls(e, player, dt);
  stepBrand(e, index, player, w, dt);
  stepEchoes(e, index, player, w, dt);
  if (b.weak > 0) {
    b.weak = Math.max(0, b.weak - dt);
    if (b.weak === 0) w.events.push('wardenFetched', index, e.pos.x, e.pos.y + 3, e.pos.z);
  }
  if (b.thrown && !bladesOut(w)) b.thrown = false;
  // Low enough: phase 2 (a roar, its throne room breaking), between moves.
  const hp = e.hp / ENEMY_STATS.hellwarden().hp;
  if (e.stage === 0 && hp <= v.rageAt && (e.phase === 'chase' || e.phase === 'recover' || e.phase === 'stun')) {
    e.stage = 1;
    b.twin = true;
    // (Update 0.3.65 — the mask cracks and the second eye lights: the intro coming back.)
    w.events.push('wardenCrack', index, e.pos.x, e.pos.y + v.height * 0.85, e.pos.z);
    warn(e, ROAR, index, w);
    return;
  }
  const due = e.stage > 0 && e.phase !== 'blast' && e.move !== ROAR && ultimateDue(e.ult, v.verdictEvery, dt);
  switch (e.phase) {
    case 'chase': {
      if (player.dead) break;
      if (due) {
        startVerdict(e, index, w);
        break;
      }
      if (e.cooldown <= 0) {
        warn(e, pick(e, dist, w), index, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
      e.facing = turn(e.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.turn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(e) + STAND_OFF)) break;
      walk(e, way.x, way.z, v.speed * paceOf(e) * dt, w.nav.large);
      break;
    }
    case 'windup': {
      const tell = wardenWindup(e.move, e.stage);
      if (e.move === ROAR) {
        bringDown(e, w);
      } else if (e.move !== LUNGE) e.facing = turn(e.facing, toward, v.turn * 1.2 * dt);
      if (e.t < tell) break;
      switch (e.move) {
        case ARC:
          e.facing = toward;
          swingArc(e, index, player, w);
          setPhase(e, 'dive');
          break;
        case LUNGE:
          vanish(e, index, player, w);
          break;
        case BRAND:
          plantBrand(e, index, w);
          break;
        case ECHOES:
          startEchoes(e);
          setPhase(e, 'recover');
          break;
        case TWIN:
          throwBlades(e, index, player, w);
          setPhase(e, 'recover');
          break;
        default:
          // Its roar over.
          e.move = THRUST;
          setPhase(e, 'chase');
          e.cooldown = pauseOf(e);
      }
      break;
    }
    case 'dive':
      if (e.move === ARC || e.move === ARC_TWO) {
        if (stepArc(e, index, player, w)) setPhase(e, 'recover');
      } else if (e.t >= v.brandPlanted / paceOf(e)) setPhase(e, 'recover');
      break;
    case 'burrow':
      // Unseen, the whoosh's gone ahead of it.
      if (e.t >= v.lungeTell / paceOf(e)) thrust(e, index, player, w);
      break;
    case 'blast':
      if (e.move === VERDICT && stepVerdict(e, index, player, w, dt)) setPhase(e, 'recover');
      break;
    case 'stun':
      if (e.t >= (e.move === VERDICT ? v.verdictStun : v.lungeOpen)) {
        b.shattered = false;
        setPhase(e, 'chase');
        e.cooldown = pauseOf(e) * 0.5;
      }
      break;
    case 'recover':
      e.facing = turn(e.facing, toward, v.turn * dt);
      if (e.t >= v.recover / paceOf(e)) {
        if (e.move === ARC_TWO) e.move = ARC;
        setPhase(e, 'chase');
        e.cooldown = pauseOf(e);
      }
      break;
    default:
      break;
  }
}
