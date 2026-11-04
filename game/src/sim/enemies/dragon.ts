// Update 0.0.18 — the Dragon, floor 2's boss (the designer). It flies at you, low; every Dragon pause it picks a move
// by how far you are and where (seeded) and warns, each its own way: it rears and its throat glows (the beam), it
// draws a breath (the fireballs), it crouches to spring (the claws' swoop), it draws a wing back (the wing swing), it
// coils (the tail swing: always, when you're behind it). The moves are in dragonMoves.ts. It never flinches; swoop it
// into a wall or a column and it's stunned (hits do more). At Rage at of its health it screams (bossRoom.ts calls
// wasps), then warns quicker, pauses less and flies faster. Its death show is every boss's (bossDoom.ts). Pure.
// Update 0.0.20 (the designer) — close to it, it strikes (wing, tail, claws) and pauses half as long; far off, it
// breathes fire and throws fireballs; between, the swoop, the beam and fireballs. The beam charges 1.5 s, its line
// aimed all the while (the view draws it as a warning).
// Update 0.0.21 (the designer) — raging, it doesn't call wasps or roar: it flies straight up and bombs you (dragonSky.ts).
// Stay close to it too long and it charges up and bursts into flame round it (Enemy.near counts the time).
import { Vector3 } from 'three';
import { DRAGON } from '../../tuning/dragon';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { stepCharge, startCharge } from './charge';
import { startSky, stepSky } from './dragonSky';
import { aimBeam, BREATH, BURST, CLAWS, flameBurst, dragonMouth, dragonPace, dragonRecover, FIREBALLS, fireball, moreFireballs, startBreath, stepBreath, swoopSpec, TAIL, tailSwing, WING, wingSwing } from './dragonMoves';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';

/** It stops flying this close to you (m: its body is wide). */
const STAND_OFF = 6;
/** Behind it (rad off its facing) and this close (m): the tail. */
const BEHIND = 1.9;
const TAIL_FROM = 9;
/** The odds of each move (beam, fireballs, claws, wing, tail) close (Dragon close), between, and far (Dragon far).
 *  **(placeholders)** */
const ODDS_NEAR = [0, 0, 0.15, 0.55, 0.3];
const ODDS_MID = [0.3, 0.25, 0.45, 0, 0];
const ODDS_FAR = [0.5, 0.5, 0, 0, 0];
/** While winding up a swoop it turns this much slower (a dash aside beats it). */
const CLAW_AIM = 0.6;

const way = new Vector3();
const mouth = new Vector3();

/** The warning before `move` (s), quicker once it rages. */
export function dragonWindup(d: Enemy, move: number): number {
  const v = DRAGON.v;
  const base = [v.breathWindup, v.fireWindup, v.clawWindup, v.wingWindup, v.tailWindup, v.burstWindup][move] ?? v.breathWindup;
  return base * (d.stage > 0 ? v.rageWindup : 1);
}

/** Its pause before the next move: shorter raging, and shorter when you're close (it strikes more often). */
const pauseOf = (d: Enemy, dist: number) => DRAGON.v.dragonPause * (d.stage > 0 ? DRAGON.v.ragePause : 1) * (dist <= DRAGON.v.dragonNear ? DRAGON.v.closePause : 1);

/** The next move for where you are (seeded); never the same one three times running. */
function pick(d: Enemy, dist: number, off: number, w: EnemyWorld): number {
  if (dist <= TAIL_FROM && off >= BEHIND) return TAIL;
  const odds = dist <= DRAGON.v.dragonNear ? ODDS_NEAR : dist <= DRAGON.v.dragonFar ? ODDS_MID : ODDS_FAR;
  let move = BREATH;
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
  setPhase(d, 'windup');
  dragonMouth(d, mouth);
  w.events.push('dragonWindup', move, mouth.x, mouth.y, mouth.z);
}

export function updateDragon(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DRAGON.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  // Half dead: it screams and flies up to bomb you (once), whatever it was about, unless it's swooping or breathing fire.
  if (d.stage === 0 && d.hp <= v.dragonHp * v.rageAt && d.phase !== 'charge' && d.phase !== 'breath' && d.phase !== 'intro') {
    d.stage = 1;
    startSky(d, index, w);
    return;
  }
  // How long you've stayed close (it forgets at half the rate when you step away).
  if (d.phase !== 'sky' && d.phase !== 'intro') d.near = dist <= v.burstNear ? d.near + dt : Math.max(0, d.near - dt * 0.5);
  switch (d.phase) {
    case 'sky':
      if (stepSky(d, index, player, w, dt)) d.cooldown = pauseOf(d, dist);
      break;
    case 'stun':
      if (d.t >= v.dragonStun) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d, dist) * 0.5;
      }
      break;
    case 'recover':
      if (d.move !== TAIL) d.facing = turn(d.facing, toward, v.dragonTurn * dt);
      if (d.move === FIREBALLS) moreFireballs(d, index, player, w);
      if (d.t >= dragonRecover(d.move)) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d, dist);
      }
      break;
    case 'chase': {
      if (player.dead) break;
      if (d.cooldown <= 0) {
        const off = Math.abs(Math.atan2(Math.sin(toward - d.facing), Math.cos(toward - d.facing)));
        if (d.near >= v.burstAfter) {
          d.near = 0;
          warn(d, BURST, w);
        } else warn(d, pick(d, dist, off, w), w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.dragonTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= STAND_OFF)) break;
      walk(d, way.x, way.z, v.dragonSpeed * dragonPace(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      if (d.move !== TAIL && d.move !== BURST) d.facing = turn(d.facing, toward, v.dragonTurn * (d.move === CLAWS ? CLAW_AIM : 1) * dt);
      // Charging the beam: its line is aimed all the while (the warning).
      if (d.move === BREATH) aimBeam(d, player, w);
      if (d.t < dragonWindup(d, d.move)) break;
      if (d.move === BREATH) startBreath(d, index, player, w);
      else if (d.move === CLAWS) startCharge(d, index, w);
      else {
        if (d.move === FIREBALLS) {
          d.shots = 0;
          fireball(d, index, player, w);
        } else if (d.move === WING) wingSwing(d, index, player, w);
        else if (d.move === BURST) flameBurst(d, index, player, w);
        else tailSwing(d, index, player, w);
        setPhase(d, 'recover');
      }
      break;
    case 'breath':
      if (stepBreath(d, index, player, w, dt)) setPhase(d, 'recover');
      break;
    case 'charge':
      if (stepCharge(d, index, player, w, dt, swoopSpec(d)) === 'out') setPhase(d, 'recover');
      break;
    default:
      break;
  }
}
