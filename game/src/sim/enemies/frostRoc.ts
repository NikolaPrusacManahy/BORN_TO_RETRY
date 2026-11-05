// Update 0.3.26 — floor 4's boss, the Frost Roc (the designer: "Birb, the Frost Roc"; Ultimate Monsters' Birb, huge): Hræsvelgr of
// the frozen warband. Its death show is the Demon's.
// Update 0.3.56 — by the Boss Design Bible, "Ground or air?" (the designer: "Keep them, adapt"; spec
// MD_UPDATES/U0356_FROST_ROC_BIBLE.md): it waddles at you; every Frost Roc pause it picks a move by where you are, and by what you've
// been doing: much in the air, its clap comes more; rooted to the ground, its stomp (seeded; never one move three times running).
// Moves: rocMoves.ts. Below Phase 2 at it roars and tears a pillar out to swing; its ultimate, Mountain Fall: rocFall.ts. Enemy.move:
// its move; .near: its slide's speed; .shots: its stomps, swings, slide's run, breath's rime; .blink: till its breath can catch you
// again; .strafe: the same move picked in a row; .aim: where it's going, its slide's way, its breath's middle (x: its yaw); .deeds:
// the pillar it holds (+1: engine/pillarEvents.ts). Pure.
import { Vector3 } from 'three';
import { FROST_ROC } from '../../tuning/frostRoc';
import { pillarsIn, PillarWorld, uprootPillar } from '../combat/pillars';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { doomBoss } from './bossDoom';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { clearSlabs } from './rocBody';
import { startFall, stepFall, stepStrikes } from './rocFall';
import { BREATH, clap, CLAP, FALL, FAULT, HURL, hurl, layCracks, raiseFault, ROAR, SLIDE, startSlide, startSwing, stepBreath, stepHurl, stepSlabs, stepSlide, stepStomp, stepSwing, STOMP, SWING } from './rocMoves';
import { ultimateDue } from './ultimate';

/** The odds of each move (stomp, clap, hurl, slide, breath, swing, fault), close, between and far; its first phase, its second.
 *  **(placeholders)** */
const NEAR = [0.45, 0.3, 0, 0, 0.25, 0, 0];
const MID = [0.15, 0.2, 0.3, 0.2, 0.15, 0, 0];
const FAR = [0, 0, 0.55, 0.45, 0, 0, 0];
const NEAR_2 = [0.25, 0.15, 0, 0, 0.1, 0.4, 0.1];
const MID_2 = [0.1, 0.15, 0.2, 0.15, 0.05, 0.1, 0.25];
const FAR_2 = [0, 0, 0.4, 0.3, 0, 0, 0.3];
/** You count as in the air above this (m); how long it remembers (s). How much what you overuse raises the move that punishes it. */
const IN_AIR = 0.4;
const REMEMBERS = 5;
const PUNISH = 2.6;
/** Its roar's tell (s); it hops to the pillar it tears out over this long (s), this high (m), stopping this far from it (m). */
const ROAR_TELL = 1;
const TO_PILLAR = 0.9;
const TO_PILLAR_UP = 5;
const BESIDE = 2.5;
/** It stops walking this far from you (m). */
const STAND_OFF = 2;

const way = new Vector3();
const pace = (d: Enemy) => (d.stage > 0 ? FROST_ROC.v.ragePace : 1);

/** The tell before `move` (s), in its first phase (stage 0) or its second. */
export function rocWindup(move: number, stage = 0): number {
  return (move === ROAR ? ROAR_TELL : FROST_ROC.v.tell) / (stage > 0 ? FROST_ROC.v.ragePace : 1);
}

/** Its next move for where you are and what you've been doing (seeded). */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const v = FROST_ROC.v;
  const r = d.roc!;
  const near = d.stage > 0 ? NEAR_2 : NEAR;
  const mid = d.stage > 0 ? MID_2 : MID;
  const far = d.stage > 0 ? FAR_2 : FAR;
  const odds = dist <= v.rocNear ? near : dist <= v.rocFar ? mid : far;
  const weight = (m: number) => odds[m] * (m === CLAP ? 1 + PUNISH * r.air : m === STOMP ? 1 + PUNISH * (1 - r.air) : 1);
  const total = odds.reduce((sum, _, m) => sum + weight(m), 0);
  let move = odds.findIndex((p) => p > 0);
  for (let tries = 0; tries < 4; tries++) {
    let roll = w.rng() * total;
    for (let m = 0; m < odds.length; m++) {
      roll -= weight(m);
      if (roll < 0) {
        move = m;
        break;
      }
    }
    if (move !== d.move || d.strafe < 2) break;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

function tell(d: Enemy, move: number, player: PlayerState, w: EnemyWorld) {
  d.move = move;
  d.shots = 0;
  setPhase(d, 'windup');
  if (move === FAULT) layCracks(d, player, w);
  w.events.push('rocWindup', move, d.pos.x, d.pos.y + FROST_ROC.v.rocHeight * 0.7, d.pos.z);
}

/** How long it stands after `move`. */
function recoverOf(d: Enemy): number {
  const v = FROST_ROC.v;
  return (d.move === STOMP ? v.stompRecover : v.rocRecover) / pace(d);
}

/** How long it's down. */
function stunOf(d: Enemy): number {
  const v = FROST_ROC.v;
  return d.move === FALL ? v.fallStun : d.move === HURL ? v.shardStagger : v.slideStun;
}

/** Its roar over: off to the nearest pillar standing, to tear it out; or none: on with it. */
function goForPillar(d: Enemy, index: number, w: EnemyWorld) {
  w.events.push('rocRoar', index, d.pos.x, d.pos.y + FROST_ROC.v.rocHeight * 0.85, d.pos.z);
  const pillars = pillarsIn(w);
  let best = -1;
  let far = Infinity;
  pillars.forEach((p, i) => {
    const away = Math.hypot(p.x - d.pos.x, p.z - d.pos.z);
    if (!p.broken && away < far) [best, far] = [i, away];
  });
  if (best < 0) return setPhase(d, 'recover');
  const p = pillars[best];
  const off = Math.max(far, 0.1);
  d.from.copy(d.pos);
  d.aim.set(p.x + ((d.pos.x - p.x) / off) * (radiusOf(d) + BESIDE), 0, p.z + ((d.pos.z - p.z) / off) * (radiusOf(d) + BESIDE));
  d.shots = best;
  d.facing = yawTo(d, p.x, p.z);
  setPhase(d, 'leap');
}

/** One tick of the hop there; arriving, the pillar's torn out, and it's its club. */
function hopToPillar(d: Enemy, index: number, w: EnemyWorld) {
  const k = Math.min(1, d.t / TO_PILLAR);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = 4 * TO_PILLAR_UP * k * (1 - k);
  if (k < 1) return;
  d.pos.y = 0;
  walk(d, 0, 0, 0, w.nav.large);
  uprootPillar(w as unknown as PillarWorld, d.shots);
  d.deeds = d.shots + 1;
  w.events.push('rocRip', index, d.pos.x, 0.1, d.pos.z);
  setPhase(d, 'recover');
}

export function updateFrostRoc(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  const r = d.roc!;
  if (!r.midSet) {
    r.midSet = true;
    r.midX = d.pos.x;
    r.midZ = d.pos.z;
  }
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  d.blink = Math.max(0, d.blink - dt);
  r.air += ((player.pos.y - d.pos.y > IN_AIR ? 1 : 0) - r.air) * Math.min(1, dt / REMEMBERS);
  stepSlabs(d, index, player, w, dt);
  stepHurl(d, w, dt);
  stepStrikes(d, w);
  if (r.cornice !== 'hung') {
    r.corniceT += dt;
    if (r.cornice !== 'cracking' && r.corniceT > v.fallStun) r.cornice = 'hung';
  }
  if (r.kneeHit > 0) {
    w.events.push('rocKneeHit', r.kneeHit, d.pos.x, d.pos.y + 1, d.pos.z);
    r.kneeHit = 0;
  }
  // Low enough: phase 2 (a roar), not mid-move.
  const busy = d.phase === 'charge' || d.phase === 'leap' || d.phase === 'breath' || d.phase === 'dive' || d.phase === 'blast' || d.phase === 'intro';
  if (!busy && d.stage === 0 && d.hp <= ENEMY_STATS.frostRoc().hp * v.rageAt) {
    d.stage = 1;
    tell(d, ROAR, player, w);
    return;
  }
  // Its ultimate's clock runs from phase 2 on, whatever it's doing.
  const due = d.stage > 0 && d.phase !== 'blast' && d.move !== ROAR && ultimateDue(d.ult, v.fallEvery, dt);
  switch (d.phase) {
    case 'chase': {
      if (player.dead) break;
      if (due) {
        startFall(d, index, w);
        break;
      }
      if (d.cooldown <= 0) {
        tell(d, pick(d, dist, w), player, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.rocTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(d) + STAND_OFF)) break;
      walk(d, way.x, way.z, v.rocSpeed * pace(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      // (Aiming a slide it turns slower: a dash aside beats it.)
      d.facing = turn(d.facing, toward, v.rocTurn * (d.move === SLIDE ? 0.5 : 1.5) * dt);
      if (d.t >= rocWindup(d.move, d.stage)) unleash(d, index, player, w, dist);
      break;
    case 'leap':
      if (d.move === ROAR) hopToPillar(d, index, w);
      else if (stepStomp(d, player, w, v.stompGap / pace(d), dt)) setPhase(d, 'recover');
      break;
    case 'breath':
      stepBreath(d, index, player, w);
      break;
    case 'charge':
      stepSlide(d, index, player, w, dt);
      break;
    case 'dive':
      if (stepSwing(d, player, w, v.swingTell / pace(d), dt)) setPhase(d, 'recover');
      break;
    case 'blast':
      if (stepFall(d, index, player, w, dt)) setPhase(d, 'recover');
      break;
    case 'stun':
      if (d.t >= stunOf(d)) {
        setPhase(d, 'chase');
        d.cooldown = v.rocPause * 0.5;
      }
      break;
    case 'recover':
      if (d.t >= recoverOf(d)) {
        setPhase(d, 'chase');
        d.cooldown = v.rocPause / pace(d);
      }
      break;
    default:
      break;
  }
}

/** Its tell over: the move. */
function unleash(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number) {
  switch (d.move) {
    case STOMP:
      d.shots = 0;
      setPhase(d, 'leap');
      return;
    case CLAP:
      clap(d, index, player, w);
      setPhase(d, 'recover');
      return;
    case HURL:
      hurl(d, index, player, w);
      setPhase(d, 'recover');
      return;
    case SLIDE:
      w.events.push('rocSlide', index, d.pos.x, d.pos.y + 3, d.pos.z);
      startSlide(d, player, dist);
      return;
    case BREATH:
      w.events.push('rocBreath', index, d.pos.x, d.pos.y + 3, d.pos.z);
      d.aim.x = d.facing;
      d.shots = 0;
      setPhase(d, 'breath');
      return;
    case SWING:
      startSwing(d, w);
      return;
    case FAULT:
      raiseFault(d, index, w);
      setPhase(d, 'recover');
      return;
    default:
      goForPillar(d, index, w);
  }
}

/** Dead: nothing of it left standing; its death show. */
export function doomRoc(d: Enemy, index: number, w: EnemyWorld) {
  if (d.roc) clearSlabs(d.roc);
  doomBoss(d, index, w);
}
