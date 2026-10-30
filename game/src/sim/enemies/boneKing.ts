// Update 0.2.3 — the Bone King, floor 3's boss (the designer: "the boss of floor 3 is also Skeleton, but massive"). It
// walks at you; every Bone King pause it picks a move by how far you are (seeded) and warns: it reaches down for a
// skeleton (the throw: three, one after another), crouches (the jump-smash: jump, smash, jump again, smash), or reaches
// for you (the grab, close by). The moves are in boneKingMoves.ts. It never flinches. Brought down the first time it
// falls to pieces like its skeletons and rebuilds, its bar filling again: its second life (phase 2), quicker between
// moves, opening with a roar and three skeletons called up out of the floor (once); at Blast at of its health it
// charges its final blast where it stands (once). Killed in its second life, it crumbles. Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { BLAST, BLASTED, GRAB, moreThrows, SMASH, startBlast, startJump, stepBlast, stepJump, stepRebuild, summon, SUMMON, SUMMON_WINDUP, SUMMONED, THROW, throwSkeleton, tryGrab } from './boneKingMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** It stops walking this far from your body (m: close enough to reach for you). */
const STAND_OFF = 2;
/** The odds of each move (throw, smash, grab) within reach of a grab, close (Bone King close), between, and far (Bone
 *  King far). **(placeholders)** */
const ODDS_REACH = [0, 0.35, 0.65];
const ODDS_NEAR = [0.15, 0.85, 0];
const ODDS_MID = [0.45, 0.55, 0];
const ODDS_FAR = [0.75, 0.25, 0];

const way = new Vector3();

/** The warning before `move` (s); the second jump's is its crouch between landings. */
export function kingWindup(k: Enemy, move: number): number {
  const v = BONE_KING.v;
  if (move === THROW) return v.throwWindup;
  if (move === SMASH) return k.shots > 0 ? v.smashBetween : v.smashWindup;
  if (move === GRAB) return v.grabWindup;
  if (move === SUMMON) return SUMMON_WINDUP;
  return 0;
}

/** Its pause before the next move (shorter in its second life). */
const pauseOf = (k: Enemy) => BONE_KING.v.kingPause * (k.stage > 0 ? BONE_KING.v.kingPause2 : 1);

/** How long it stands after `move`. */
function recoverOf(k: Enemy): number {
  const v = BONE_KING.v;
  if (k.move === THROW) return v.throwGap * Math.max(0, Math.round(v.throws) - 1) + v.kingRecover;
  if (k.move === BLAST) return v.kingRecover * 1.5;
  return v.kingRecover;
}

/** The next move for where you are (seeded); its second life's once-only moves first. Never the same three times. */
function pick(k: Enemy, dist: number, player: PlayerState, w: EnemyWorld): number {
  const v = BONE_KING.v;
  if (k.stage > 0 && !(k.deeds & SUMMONED) && Math.round(v.summon) > 0) return SUMMON;
  if (k.stage > 0 && !(k.deeds & BLASTED) && k.hp <= ENEMY_STATS[k.kind]().hp * v.blastAt) return BLAST;
  const reach = dist - radiusOf(k) <= v.grabReach && player.pos.y - k.pos.y < 2;
  const odds = reach ? ODDS_REACH : dist <= v.kingNear ? ODDS_NEAR : dist <= v.kingFar ? ODDS_MID : ODDS_FAR;
  let move = SMASH;
  for (let tries = 0; tries < 3; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = m;
        break;
      }
    }
    if (move !== k.move || k.strafe < 2) break;
  }
  k.strafe = move === k.move ? k.strafe + 1 : 1;
  return move;
}

function warn(k: Enemy, move: number, w: EnemyWorld) {
  k.move = move;
  k.shots = 0;
  setPhase(k, 'windup');
  w.events.push('kingWindup', move, k.pos.x, k.pos.y + BONE_KING.v.kingHeight * 0.7, k.pos.z);
}

export function updateBoneKing(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = BONE_KING.v;
  const dist = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
  const toward = yawTo(k, player.pos.x, player.pos.z);
  switch (k.phase) {
    case 'rebuild':
      if (stepRebuild(k, index, w)) k.cooldown = pauseOf(k) * 0.4;
      break;
    case 'stun':
      if (k.t >= v.grabStun) {
        setPhase(k, 'chase');
        k.cooldown = pauseOf(k) * 0.5;
      }
      break;
    case 'recover':
      k.facing = turn(k.facing, toward, v.kingTurn * dt);
      if (k.move === THROW) moreThrows(k, index, player, w);
      if (k.t >= recoverOf(k)) {
        setPhase(k, 'chase');
        k.cooldown = pauseOf(k);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      if (k.cooldown <= 0) {
        const move = pick(k, dist, player, w);
        if (move === BLAST) startBlast(k, index, w);
        else warn(k, move, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, k.pos, player.pos.x, player.pos.z, way);
      k.facing = turn(k.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.kingTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(k) + STAND_OFF)) break;
      walk(k, way.x, way.z, v.kingSpeed * dt, w.nav.large);
      break;
    }
    case 'windup':
      k.facing = turn(k.facing, toward, v.kingTurn * dt);
      if (k.t < kingWindup(k, k.move)) break;
      if (k.move === THROW) {
        throwSkeleton(k, index, player, w);
        setPhase(k, 'recover');
      } else if (k.move === SMASH) {
        if (!startJump(k, index, player, w)) setPhase(k, 'recover');
      } else if (k.move === GRAB) {
        if (!tryGrab(k, index, player, w)) setPhase(k, 'recover');
      } else {
        summon(k, index, player, w);
        setPhase(k, 'recover');
      }
      break;
    case 'leap':
      if (!stepJump(k, player, w)) break;
      // Twice: a crouch, then up again for where you are now.
      if (k.shots < 2) {
        setPhase(k, 'windup');
        break;
      }
      setPhase(k, 'recover');
      break;
    case 'blast':
      if (stepBlast(k, player, w, dt)) setPhase(k, 'recover');
      break;
    // ('grab': you're in its hand; the fight's step holds the world still and counts your hits: grab.ts.)
    default:
      break;
  }
}
