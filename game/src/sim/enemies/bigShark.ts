// Update 0.3.16 — floor 6's boss, the Big Shark (the designer: "the Boss is the Big shark and player WILL fight the boss
// under water"; the jaw moves and the swallow are the designer's, the rest Claude's: spec MD_UPDATES/U0316_BIG_SHARK.md),
// in its arena flooded to the top (sim/dungeon/sharkShow.ts). It circles you (Big Shark circle) a lap or so, then one of
// its moves (bigSharkMoves.ts):
//  - its lunge: it lines up on you, jaws opening (Lunge warning), and lunges through you; as its jaws come an arrow shows
//    which way to go: press that way (move left or move right) in the window and you're thrown clear, else bitten;
//  - its snap: it swims past close and, beside you, swings its head back and snaps sideways at you: the arrow points
//    away from it;
//  - its swallow (every Swallow every moves): it backs off, jaws wide, then charges to swallow you whole: swim out of its
//    way; caught, your hands hold its jaws apart (combat/jaws.ts): click fast, punch its throat, or it's over;
//  - its tail: close behind it, its tail whips you.
// A lunge or swallow into a wall sticks its teeth in it: stunned (hits do more). Below Frenzy at it frenzies (a roar):
// shorter warnings and laps. It never flinches. `move`: its move; `blink`: the arrow (−1 left, 1 right); `deeds`: 1
// once you've pressed the wrong way (no escaping this bite); `shots`: moves since its last swallow; `stage`: 1 frenzied;
// `near`: seconds on this lap. In the show (`intro`) it's placed by the show. Update 0.3.16 — its circle kept in open
// water, off the walls (openMiddle). Pure.
import { BIG_SHARK } from '../../tuning/bigShark';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { Vector3 } from 'three';
import { behind, charge, escape, FEINT, FEINT_WARN, LUNGE, openMiddle, quick, ROAR, roomPast, snap, SNAP, startFeint, startLunge, startSnap, startSwallow, startTail, SWALLOW, TAIL, windup } from './bigSharkMoves';
import { Enemy, EnemyWorld, setPhase } from './enemy';
import { chest, circleYou, holdDepth } from './fishSwim';
import { ENEMY_STATS } from './kinds';

/** Its frenzy's roar lasts this long (s); after a move it circles, slower, this long (s), at this share of its speed. */
const ROAR_TIME = 1.2;
const REST = 0.7;
const EASY = 0.6;
/** The odds of a lunge (else a snap); it weaves this far up and down as it circles (m); its tail no sooner than this
 *  far into a lap (s). */
const LUNGES = 0.55;
const TAIL_GAP = 2;
const WEAVE = 1.6;
const about = new Vector3();

/** How long `move` warns (s): the view times its bite to it. */
export function bigSharkWindup(move: number): number {
  const v = BIG_SHARK.v;
  return move === LUNGE ? v.lungeWarn : move === SNAP ? v.snapWarn : move === SWALLOW ? v.swallowWarn : move === TAIL ? v.tailWarn : move === FEINT ? FEINT_WARN : ROAR_TIME;
}

export function updateBigShark(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  if (e.phase === 'intro' || e.phase === 'grab') return;
  const v = BIG_SHARK.v;
  const s = ENEMY_STATS.bigShark();
  // Below Frenzy at: a roar, once; then everything comes sooner.
  if (e.stage === 0 && e.hp <= s.hp * v.frenzyAt && (e.phase === 'chase' || e.phase === 'recover')) {
    e.stage = 1;
    e.move = ROAR;
    setPhase(e, 'roar');
    w.events.push('bigSharkFrenzy', index, e.pos.x, e.pos.y + s.height, e.pos.z);
    return;
  }
  escape(e, index, player, w);
  switch (e.phase) {
    case 'roar':
      holdDepth(e, chest(player), s.speed, dt, w, world);
      if (e.t < ROAR_TIME) break;
      e.move = 0;
      setPhase(e, 'chase');
      break;
    case 'stun':
      if (e.t >= v.stunTime) setPhase(e, 'recover');
      break;
    case 'flinch':
      setPhase(e, 'chase');
      break;
    case 'recover':
      circleYou(e, player, v.bigRing, 0, s.speed * EASY, dt, w, world, openMiddle(player, v.bigRing, w, about));
      if (e.t >= REST) setPhase(e, 'chase');
      break;
    case 'chase':
      lap(e, index, player, w, dt, world);
      break;
    case 'windup':
      windup(e, index, player, w, dt, world);
      break;
    case 'dive':
      charge(e, index, player, w, dt, world);
      break;
    case 'charge':
      snap(e, index, player, w, dt);
      break;
  }
}

/** Round you, fast and never quite the same (the designer: "it does swim around fast and have unpredictable moves"):
 *  its circle swelling and tightening, weaving up and down, turning back now and then; close behind it, its tail; its
 *  next move any moment once it's had a short lap (on average after Big Shark lap), a feint now and then. */
function lap(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = BIG_SHARK.v;
  e.near += dt;
  if (w.rng() < dt * v.turnBack) e.strafe = -e.strafe;
  const ring = v.bigRing * (0.75 + 0.35 * Math.sin(e.near * 1.3 + index));
  circleYou(e, player, ring, Math.sin(e.near * 0.9 + index * 2) * WEAVE, ENEMY_STATS.bigShark().speed, dt, w, world, openMiddle(player, ring, w, about));
  if (player.dead || e.cooldown > 0) return;
  if (behind(e, player) && e.near > TAIL_GAP) {
    e.near = 0;
    return startTail(e, index, w);
  }
  const lapFor = v.bigLap * quick(e);
  if (e.near < lapFor / 3 || w.rng() > dt / ((lapFor * 2) / 3)) return;
  e.near = 0;
  if (e.shots >= Math.round(v.swallowEvery)) return startSwallow(e, index, player, w);
  const r = w.rng();
  const room = roomPast(e, player, w);
  if (r < v.feints && room) startFeint(e, index, w);
  else if (r < v.feints + (1 - v.feints) * LUNGES && room) startLunge(e, index, w);
  else startSnap(e, index, player, w);
}
