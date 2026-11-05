// Update 0.2.3 — the Bone King, floor 3's boss (the designer: "the boss of floor 3 is also Skeleton, but massive"). Brought
// down the first time it falls to pieces like its skeletons and rebuilds, its bar filling again: its second life.
// Update 0.3.53 — by the Boss Design Bible, "Go vertical" (spec MD_UPDATES/U0353_BONE_KING_BIBLE.md): it walks at you; every
// Bone King pause it picks a move by how far you are and how high (seeded) and tells it. Its first life: Rib Boomerang, Grave
// Grasp, Arm Slam. Its second, rebuilt wrong: those quicker, Shatter & Rebuild, Rib Cage Trap; and its ultimate, Bone Colossus,
// as it starts and about every minute. Moves: boneKingMoves.ts; its body as a place: kingBody.ts. It never flinches. Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { burstHands, CAGE, closeCage, COLOSSUS, crackRing, followDust, GRASP, HANDS_UP, landSlam, RIBS, SHATTER, shrink, SLAM, startColossus, startShatter, stepCage, stepColossus, stepRebuild, stepShatter, throwRibs } from './boneKingMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { HAND_FORWARD, kingTall, liftArm, skullY, spineAt } from './kingBody';
import { ultimateDue } from './ultimate';

/** It stops walking this far from your body (m: close enough to reach for you). */
const STAND_OFF = 2;
/** You're up out of reach of its hands and its cage this high (m). */
const UP_HIGH = 1.5;
/** A chained grasp's tell, a share of its first. */
const CHAIN = 0.6;
/** Its aim stops following you this long before its arm comes down (s). */
const SLAM_LOCK = 0.25;
/** The odds of each move (ribs, grasp, slam, shatter, cage), close enough for its arm or not, up high; its first life, its
 *  second. **(placeholders)** */
const NEAR = [0.2, 0.25, 0.55, 0, 0];
const FAR = [0.5, 0.5, 0, 0, 0];
const HIGH = [1, 0, 0, 0, 0];
const NEAR_2 = [0.1, 0.1, 0.3, 0.3, 0.2];
const FAR_2 = [0.3, 0.2, 0, 0.2, 0.3];
const HIGH_2 = [0.7, 0, 0, 0.3, 0];

const way = new Vector3();
const spot = new Vector3();
const spineXyz = (k: Enemy): [number, number, number] => {
  spineAt(k, spot);
  return [spot.x, spot.y, spot.z];
};

/** Its tell before `move` (s), in its first life (stage 0) or its second. */
export function kingTell(move: number, stage: number): number {
  const v = BONE_KING.v;
  return (move === SLAM ? v.slamTell : v.tell) * (stage > 0 ? v.tell2 : 1);
}

/** The tell of the move it's on (a chained grasp's is shorter). */
const windupOf = (k: Enemy) => kingTell(k.move, k.stage) * (k.move === GRASP && k.shots > 0 ? CHAIN : 1);

/** Its pause before the next move (shorter in its second life). */
const pauseOf = (k: Enemy) => BONE_KING.v.kingPause * (k.stage > 0 ? BONE_KING.v.kingPause2 : 1);

/** How long it stands after `move`: its ribs out and back, its arm on the floor. */
function recoverOf(k: Enemy): number {
  const v = BONE_KING.v;
  if (k.move === RIBS) return v.ribTime + 0.2;
  if (k.move === SLAM) return v.slamHold;
  return v.kingRecover;
}

/** How long it reels. */
function stunOf(k: Enemy): number {
  const v = BONE_KING.v;
  return k.move === COLOSSUS ? v.colossusStun : k.move === RIBS ? v.ribStagger : v.grabStun;
}

/** The next move for where you are (seeded). Never the same three times. */
function pick(k: Enemy, dist: number, player: PlayerState, w: EnemyWorld): number {
  const high = player.pos.y - k.pos.y > UP_HIGH;
  const near = dist <= kingTall(k) * HAND_FORWARD + radiusOf(k);
  const odds = k.stage > 0 ? (high ? HIGH_2 : near ? NEAR_2 : FAR_2) : high ? HIGH : near ? NEAR : FAR;
  let move = RIBS;
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

function tell(k: Enemy, index: number, move: number, player: PlayerState, w: EnemyWorld) {
  k.move = move;
  k.shots = 0;
  k.blink = 0;
  setPhase(k, 'windup');
  if (move === CAGE) crackRing(k, index, player, w);
  w.events.push('kingWindup', move, k.pos.x, k.pos.y + kingTall(k) * 0.7, k.pos.z);
}

export function updateBoneKing(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = BONE_KING.v;
  const b = k.king!;
  if (!b.midSet) {
    b.midSet = true;
    b.midX = k.pos.x;
    b.midZ = k.pos.z;
  }
  const dist = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
  const toward = yawTo(k, player.pos.x, player.pos.z);
  // Its ultimate's clock runs in its second life, whatever it's doing.
  const due = k.stage > 0 && k.phase !== 'blast' && ultimateDue(k.ult, v.colossusEvery, dt);
  if (b.hands >= 0) {
    b.hands += dt;
    if (b.hands >= HANDS_UP && k.phase !== 'grab') b.hands = -1;
  }
  stepCage(k, index, player, w, dt);
  shrink(k, dt);
  if (b.skullHit > 0) {
    b.skullHit = 0;
    w.events.push('kingSkull', index, k.pos.x, skullY(k) + 0.5, k.pos.z);
  }
  if (b.spineHit > 0) {
    w.events.push('kingSpineHit', b.spineHit, ...spineXyz(k));
    b.spineHit = 0;
  }
  switch (k.phase) {
    case 'rebuild':
      if (stepRebuild(k, index, w)) k.cooldown = pauseOf(k) * 0.4;
      break;
    case 'stun':
      if (k.t >= stunOf(k)) {
        setPhase(k, 'chase');
        k.cooldown = pauseOf(k) * 0.5;
      }
      break;
    case 'recover':
      if (k.move !== SLAM) k.facing = turn(k.facing, toward, v.kingTurn * dt);
      if (k.t >= recoverOf(k)) {
        if (k.move === SLAM) {
          liftArm(k);
          w.events.push('kingArmUp', index, k.pos.x, k.pos.y + 1, k.pos.z);
        }
        setPhase(k, 'chase');
        k.cooldown = pauseOf(k);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      if (due) {
        startColossus(k, index, w);
        break;
      }
      if (k.cooldown <= 0) {
        tell(k, index, pick(k, dist, player, w), player, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, k.pos, player.pos.x, player.pos.z, way);
      k.facing = turn(k.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.kingTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(k) + STAND_OFF)) break;
      walk(k, way.x, way.z, v.kingSpeed * dt, w.nav.large);
      break;
    }
    case 'windup': {
      const long = windupOf(k);
      if (k.move === GRASP) followDust(k, index, player, w, long, dt);
      if (k.move !== SLAM || k.t < long - SLAM_LOCK) k.facing = turn(k.facing, toward, v.kingTurn * dt);
      if (k.t < long) break;
      if (k.move === RIBS) {
        throwRibs(k, index, player, w);
        setPhase(k, 'recover');
      } else if (k.move === GRASP) {
        if (burstHands(k, index, player, w)) break;
        // (Its second life: another, straight after.)
        if (k.stage > 0 && k.shots < 1) {
          k.shots++;
          k.blink = 0;
          setPhase(k, 'windup');
        } else setPhase(k, 'recover');
      } else if (k.move === SLAM) {
        landSlam(k, index, player, w);
        setPhase(k, 'recover');
      } else if (k.move === SHATTER) {
        startShatter(k, index, w);
      } else {
        closeCage(k, index, player, w);
        setPhase(k, 'recover');
      }
      break;
    }
    case 'leap':
      if (stepShatter(k, index, player, w)) {
        setPhase(k, 'recover');
      }
      break;
    case 'blast':
      if (stepColossus(k, index, player, w, dt)) {
        setPhase(k, 'chase');
        k.cooldown = pauseOf(k);
      }
      break;
    // ('grab': its hands have you; the fight's step holds the world still and counts your hits: grab.ts.)
    default:
      break;
  }
}
