// Update 0.3.42 — The Swarm, the Venom Garden's boss (the designer: "try floor 2 Boss 'The Swarm'"; spec
// MD/the-knot-3d-boss.md): its worms (swarmBody.ts) live round its eye, which drifts at you and keeps close. Its worms step
// every other tick (60 a second, the spec's rate). Dead, its worms drop off in a wave and its eye shows as every boss's
// (bossDoom.ts). Pure.
// Update 0.3.51 — its moves are the Boss Design Bible's ("Pick your target": the Eye is the boss, the worms are the
// problem). Every pause its eye picks a move (seeded) and tells: Gaze Beam, Burrow Ambush, Acid Tears; below half, its worms
// brighten and latch on, and Tethered Shield and Split Pupil join them, its old ones quicker; its ultimate first, then
// every so often (swarmMoves.ts). All the while, the worms on your side lash at you if you're close: their tips glow and
// draw back (the tell), then whip at where you stood, each hurting you once if it reaches you, then coil back.
import { Vector3 } from 'three';
import { SWARM } from '../../tuning/swarm';
import { damagePlayer } from '../player/health';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { doomBoss } from './bossDoom';
import { chaseDir } from './chase';
import { type Enemy, type EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { DEAD, LASH, livingWorm, MASS, RECOIL, seedSwarm, stepSwarm, WINDUP, type SwarmBody } from './swarmBody';
import { swarmEyeHeight } from './swarmHits';
import { aimGaze, BURROW, dropEye, GAZE, GLARE, SHIELD, SPLIT, startBurrow, startShield, startStare, stepFan, stepGaze, stepGlare, stepStare, stepTears, TEARS } from './swarmMoves';
import { ultimateDue } from './ultimate';
import { clearWormlings, stepWormlings, tethersUp, wormlingsIn } from './wormlings';

/** A lash's aim is where you stood, off by up to this (m), and at your chest. */
const AIM_OFF = 0.4;
const CHEST = 1.1;
/** Dead, its worms drop off over this long (s). */
const DROP_OFF = 1.4;
/** The odds of each move on its first half, and below it (gaze, burrow, tears, shield, fan). **(placeholders)** */
const ODDS: readonly (readonly number[])[] = [
  [0.4, 0.35, 0.25, 0, 0],
  [0.22, 0.22, 0.16, 0.2, 0.2],
];
/** How fast its eye rises and falls (m/s). */
const LIFT_RATE = 6;
/** Its eye dropped: its middle this far under where it floats (m). */
const DROPPED = 0.5;

const way = new Vector3();

/** The tell before `move` (s): its old ones quicker below half. */
export function swarmWindup(e: Enemy, move: number): number {
  const v = SWARM.v;
  const base = move === GAZE ? v.gazeWindup : move === BURROW ? v.burrowWindup : move === TEARS ? v.tearWindup : move === SHIELD ? v.shieldWindup : v.splitWindup;
  return base * (e.stage > 0 && (move === GAZE || move === TEARS) ? v.tellQuick : 1);
}

/** The next move (seeded); never one three times running; no shield while one's up. */
function pick(e: Enemy, w: EnemyWorld): number {
  const odds = ODDS[e.stage > 0 ? 1 : 0];
  const up = tethersUp(wormlingsIn(w)) > 0;
  let move = GAZE;
  for (let tries = 0; tries < 5; tries++) {
    let roll = w.rng();
    for (let m = 0; m < odds.length; m++) {
      roll -= odds[m];
      if (roll < 0) {
        move = m;
        break;
      }
    }
    if (move === SHIELD && up) continue;
    if (move !== e.move || e.strafe < 2) break;
  }
  if (move === SHIELD && up) move = GAZE;
  e.strafe = move === e.move ? e.strafe + 1 : 1;
  return move;
}

/** A move starts: its tell. (Its Burrow Ambush's tell is the floor bulging under your feet, not its eye: they start at once,
 *  and it goes on drifting till they're done.) */
export function swarmTell(e: Enemy, move: number, index: number, player: PlayerState, w: EnemyWorld) {
  const v = SWARM.v;
  e.move = move;
  e.shots = 0;
  if (move === BURROW) {
    startBurrow(player, w);
    w.events.push('swarmRipple', index, player.pos.x, 0.1, player.pos.z);
    setPhase(e, 'chase');
    e.cooldown = v.burrowWindup + v.burrowGap * 2 + v.burrowHang + (e.stage > 0 ? v.pause2 : v.pause);
    return;
  }
  setPhase(e, 'windup');
  w.events.push('swarmTell', move, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
}

/** One tick of The Swarm (its eye `e`). */
export function updateSwarm(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const s = e.swarm;
  if (!s) return;
  const v = SWARM.v;
  if (!s.seeded) seedSwarm(s, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z, w.rng);
  e.vel.set(0, 0, 0);
  const dist = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.z - e.pos.z) ** 2);
  if (e.phase !== 'intro') {
    fight(e, index, player, dist, w, dt);
    stepWormlings(wormlingsIn(w), player, w, index, dt);
    // Its shield's up only while a tether stands; the last one down, it drops.
    if (s.shield && tethersUp(wormlingsIn(w)) === 0) {
      s.shield = false;
      dropEye(e, index, v.dropTime, w);
    }
    // Its worms lash on their own, if you're close, unless it's lifted or down.
    s.lashIn -= dt;
    const lashing = e.phase !== 'blast' && e.phase !== 'stun' && !player.dead;
    if (lashing && s.lashIn <= 0 && dist <= v.lashReach + s.extent) {
      s.lashIn = v.lashEvery;
      windUp(s, player, w, index);
    }
  }
  lashes(s, player, w, index);
  step(e, s, player, w, dt);
}

/** Its eye's moves. */
function fight(e: Enemy, index: number, player: PlayerState, dist: number, w: EnemyWorld, dt: number) {
  const v = SWARM.v;
  const toward = yawTo(e, player.pos.x, player.pos.z);
  // Half gone: its worms brighten and latch on, once.
  if (e.stage === 0 && e.hp <= v.swarmHp * v.phase2At && e.phase !== 'breath') {
    e.stage = 1;
    w.events.push('swarmPhase', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
  }
  // Its eye's height: lifted through its stare, dropped when it's down.
  const up = e.phase === 'blast' || (e.phase === 'recover' && e.move === GLARE) ? v.stareLift : e.phase === 'stun' ? -DROPPED : 0;
  e.pos.y += Math.max(-LIFT_RATE * dt, Math.min(LIFT_RATE * dt, up - e.pos.y));
  const due = e.stage > 0 && ultimateDue(e.ult, v.stareEvery, dt);
  switch (e.phase) {
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, v.eyeTurn * dt);
      // It drifts at you and keeps close.
      if (dist > v.keepNear) {
        chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
        walk(e, way.x, way.z, Math.min(v.speed * dt, dist - v.keepNear), w.nav.large);
      }
      if (due) startStare(e, index, w);
      else if (e.cooldown <= 0) swarmTell(e, pick(e, w), index, player, w);
      break;
    }
    case 'windup':
      e.facing = turn(e.facing, toward, v.eyeTurn * dt);
      if (e.move === GAZE) aimGaze(e, player, w);
      if (e.t < swarmWindup(e, e.move)) break;
      if (e.move === SHIELD) {
        startShield(e, index, w);
        rest(e);
      } else {
        e.near = e.move === SPLIT ? e.facing : e.near;
        setPhase(e, 'breath');
        w.events.push(e.move === GAZE ? 'swarmGaze' : e.move === SPLIT ? 'swarmFan' : 'swarmWeep', index, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
      }
      break;
    case 'breath':
      if (e.move === GAZE) {
        // It follows you, slowly: outrun it.
        e.facing = turn(e.facing, toward, v.gazeTurn * dt);
        if (stepGaze(e, player, w)) rest(e);
      } else if (e.move === TEARS) {
        e.facing = turn(e.facing, toward, v.eyeTurn * dt);
        if (stepTears(e, index, player, w)) rest(e);
      } else if (stepFan(e, player, w, dt)) rest(e);
      break;
    case 'blast':
      stepStare(e, index, player, w, dt);
      break;
    case 'recover':
      if (e.move === GLARE) stepGlare(e, player, w);
      if (e.t >= v.stareRecover) rest(e);
      break;
    case 'stun':
      if (e.t >= e.near) rest(e);
      break;
    default:
      if (e.phase === 'flinch') rest(e);
      break;
  }
}

/** Back to drifting at you, a pause before its next. */
function rest(e: Enemy) {
  const v = SWARM.v;
  setPhase(e, 'chase');
  e.cooldown = e.stage > 0 ? v.pause2 : v.pause;
}

/** The worms on your side wind up: as many as Lashing worms, their heads nearest you. */
function windUp(s: SwarmBody, player: PlayerState, w: EnemyWorld, index: number) {
  const v = SWARM.v;
  let tx = player.pos.x - s.cx;
  let tz = player.pos.z - s.cz;
  const tl = Math.sqrt(tx * tx + tz * tz) || 1;
  tx /= tl;
  tz /= tl;
  const n = s.beads;
  let left = Math.round(v.lashCount);
  // The heads facing you most, one at a time (a few, so a scan each).
  while (left > 0) {
    let best = -1;
    let bestDot = -Infinity;
    for (let k = 0; k < s.worms; k++) {
      if (s.state[k] !== MASS) continue;
      const i = k * n;
      const hx = s.x[i] - s.cx;
      const hz = s.z[i] - s.cz;
      const hl = Math.sqrt(hx * hx + hz * hz) || 1;
      const dot = (hx * tx + hz * tz) / hl;
      if (dot > bestDot) {
        bestDot = dot;
        best = k;
      }
    }
    if (best < 0) break;
    s.state[best] = WINDUP;
    s.t[best] = 0;
    s.struck[best] = 0;
    left--;
  }
  if (left < Math.round(v.lashCount)) w.events.push('swarmWindup', index, s.cx, s.cy + SWARM.v.eye, s.cz);
}

/** Each lashing worm's state on, and a lashing head that reaches you hurts you (once a lash). */
function lashes(s: SwarmBody, player: PlayerState, w: EnemyWorld, index: number) {
  const v = SWARM.v;
  const n = s.beads;
  let whipped = false;
  for (let k = 0; k < s.worms; k++) {
    const st = s.state[k];
    if (st === WINDUP && s.t[k] >= v.lashWindup) {
      s.state[k] = LASH;
      s.t[k] = 0;
      s.aimX[k] = player.pos.x + (w.rng() - 0.5) * 2 * AIM_OFF;
      s.aimY[k] = player.pos.y + CHEST;
      s.aimZ[k] = player.pos.z + (w.rng() - 0.5) * 2 * AIM_OFF;
      whipped = true;
    } else if (st === LASH) {
      if (s.t[k] >= v.lashTime) {
        s.state[k] = RECOIL;
        s.t[k] = 0;
        continue;
      }
      if (s.struck[k] || player.dead) continue;
      // Its head (and the next bead) against your body.
      for (let b = 0; b < 2; b++) {
        const i = k * n + b;
        const dy = Math.max(player.pos.y + BODY.radius, Math.min(s.y[i], player.pos.y + 1.8 - BODY.radius)) - s.y[i];
        const dx = player.pos.x - s.x[i];
        const dz = player.pos.z - s.z[i];
        const reach = s.r[i] + BODY.radius;
        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
        s.struck[k] = 1;
        if (damagePlayer(player, v.lashDamage, 'swarm')) w.events.push('swarmBite', index, s.x[i], s.y[i], s.z[i]);
        break;
      }
    } else if (st === RECOIL && s.t[k] >= v.recoil) {
      s.state[k] = MASS;
      s.t[k] = 0;
    }
  }
  if (whipped) w.events.push('swarmLash', index, s.cx, s.cy + SWARM.v.eye, s.cz);
}

/** Its worms on a tick (every other: 60 a second, twice as long), and what died this tick told. */
function step(e: Enemy, s: SwarmBody, player: PlayerState, w: EnemyWorld, dt: number) {
  s.tick++;
  if ((s.tick & 1) === 0) stepSwarm(s, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z, player.pos.x, player.pos.z, w.nav.small, dt * 2);
  for (let k = 0; k < s.goreN; k++) w.events.push('swarmGore', 0, s.gore[k * 3], s.gore[k * 3 + 1], s.gore[k * 3 + 2]);
  s.goreN = 0;
  if (s.eyeHit > 0) w.events.push('swarmEye', 0, e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
  s.eyeHit = 0;
}

/** Dead: its worms drop off the heap in a wave (one by one over Drop off), then its eye's show is every boss's. */
export function doomSwarm(e: Enemy, index: number, w: EnemyWorld, dt: number) {
  const s = e.swarm;
  clearWormlings(wormlingsIn(w));
  if (s?.seeded) {
    s.shield = false;
    const due = Math.min(1, e.t / DROP_OFF) * s.worms;
    for (let k = 0; k < due; k++) {
      if (!livingWorm(s, k)) continue;
      s.state[k] = DEAD;
      s.t[k] = 0;
    }
    s.tick++;
    if ((s.tick & 1) === 0) stepSwarm(s, s.cx, s.cy, s.cz, s.cx, s.cz, w.nav.small, dt * 2);
  }
  doomBoss(e, index, w);
}

/** The worms still in its heap. */
export const swarmAlive = (e: Enemy) => (e.swarm?.seeded ? e.swarm.alive : 0);

