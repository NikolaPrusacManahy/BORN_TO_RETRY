// Update 0.3.26 — floor 4's boss, the Frost Roc (the designer: "Birb, the Frost Roc"; Ultimate Monsters' Birb, huge):
// Hræsvelgr of the frozen warband. It waddles at you; every Frost Roc pause it picks a move by where you are (seeded;
// never one move three times running) and warns. Close: its swipe (Swipe reach, in front), or its gust: its wings
// beat (Gust for) and you're blown back across the floor (on ice you can't hold), and half the time its belly slide
// follows. Between: its frost breath (it sweeps across you, chilling you, leaving rime), its belly slide (at where you
// stood, past it; on ice or rime it can't stop: into a wall fast and it's stunned, your hits worth more), now and then
// its gust or its leap. Far: its leap (up and down where you stood: its landing hurts round it, jump it, and freezes the
// floor) or its slide. Below Frost Roc rage it rages: a roar, quicker in everything, and it calls the dead up out of the
// snow (sim/dungeon/bossRoom.ts). Its death show is the Demon's. Enemy.move: its move; .near: its slide's speed; .shots:
// its slide's run to where you stood (m), its breath's rime laid; .blink: till its breath can catch you again;
// .strafe: the same move picked in a row; .aim: where it lands, its slide's way, its breath's middle (x: its yaw). Pure.
import { Vector3 } from 'three';
import { FROST_ROC } from '../../tuning/frostRoc';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { addRime, chillYou, onRime } from '../combat/frost';
import { onIce } from '../dungeon/quicksand';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir, freeSpotNear } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Its moves (`move`). */
export const SWIPE = 0;
export const GUST = 1;
export const SLIDE = 2;
export const LEAP = 3;
export const BREATH = 4;
export const ROAR = 5;
/** The odds of each move (swipe, gust, slide, leap, breath) close, between and far. **(placeholders)** */
const ODDS = { near: [0.45, 0.35, 0, 0, 0.2], mid: [0, 0.15, 0.35, 0.15, 0.35], far: [0, 0, 0.5, 0.5, 0] };
/** A gust's follow-up slide, this share of the time; its roar's warning (s); its swipe's and gust's arc (rad, either
 *  side); its breath catches you this near its line (rad); it lays rime this often along its breath (s), this far out
 *  (m); it stops walking this far from you (m); faster than this (m/s), a wall stuns it, slower it's stopped. */
const FOLLOW = 0.5;
const ROAR_WARN = 1;
const ARC = 1.1;
const NARROW = 0.28;
const RIME_EVERY = 0.5;
const RIME_OUT = 6;
const STAND_OFF = 2;
const STUNS = 6;
const STOPPED = 0.8;
/** Thrown by its swipe, slide and landing (m/s along, up). */
const THROW = { swipe: [12, 6], slide: [16, 7], land: [10, 8] } as const;
/** Higher than this over its feet (m), you're over its blows. */
const OVER = 3;

const way = new Vector3();
const pace = (d: Enemy) => (d.stage > 0 ? FROST_ROC.v.ragePace : 1);
/** What each move's start is heard as. */
const MOVE_EVENTS = ['rocSwipe', 'rocGust', 'rocSlide', 'rocLeap', 'rocBreath'] as const;
/** How far round from where it faces you are (rad). */
function offAngle(d: Enemy, player: PlayerState): number {
  const a = yawTo(d, player.pos.x, player.pos.z) - d.facing;
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}

/** The warning before `move` (s). */
export function rocWindup(move: number): number {
  const v = FROST_ROC.v;
  return [v.swipeWindup, v.gustWindup, v.slideWindup, v.leapWindup, v.breathWindup, ROAR_WARN][move] ?? v.swipeWindup;
}

/** Its next move for where you are (seeded). */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const v = FROST_ROC.v;
  const odds = dist <= v.rocNear ? ODDS.near : dist <= v.rocFar ? ODDS.mid : ODDS.far;
  let move = SWIPE;
  for (let tries = 0; tries < 4; tries++) {
    let roll = w.rng();
    move = odds.findIndex((p) => (roll -= p) < 0);
    if (move < 0) move = odds.findIndex((p) => p > 0);
    if (move !== d.move || d.strafe < 2) break;
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

function warn(d: Enemy, move: number, w: EnemyWorld) {
  d.move = move;
  setPhase(d, 'windup');
  w.events.push('rocWindup', move, d.pos.x, d.pos.y + FROST_ROC.v.rocHeight * 0.7, d.pos.z);
}

export function updateFrostRoc(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  d.blink = Math.max(0, d.blink - dt);
  // Low enough: it rages (a roar), not mid-move.
  const busy = d.phase === 'charge' || d.phase === 'leap' || d.phase === 'breath' || d.phase === 'intro';
  if (!busy && d.stage === 0 && d.hp <= ENEMY_STATS.frostRoc().hp * v.rageAt) {
    d.stage = 1;
    warn(d, ROAR, w);
    return;
  }
  switch (d.phase) {
    case 'chase': {
      if (player.dead) break;
      if (d.cooldown <= 0) {
        warn(d, pick(d, dist, w), w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.rocTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(d) + STAND_OFF)) break;
      walk(d, way.x, way.z, v.rocSpeed * pace(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      // (Aiming a slide or a leap it turns slower: a dash aside beats it.)
      d.facing = turn(d.facing, toward, v.rocTurn * (d.move === SLIDE || d.move === LEAP ? 0.5 : 1.5) * dt);
      if (d.t >= rocWindup(d.move) / pace(d)) unleash(d, index, player, w, dist);
      break;
    case 'breath':
      if (d.move === GUST) gust(d, player, w, dt);
      else breathe(d, index, player, w);
      break;
    case 'charge':
      slide(d, index, player, w, dt);
      break;
    case 'leap':
      fly(d, player, w);
      break;
    case 'stun':
      if (d.t >= v.slideStun) {
        setPhase(d, 'chase');
        d.cooldown = v.rocPause * 0.5;
      }
      break;
    case 'recover':
      if (d.t >= v.rocRecover / pace(d)) {
        setPhase(d, 'chase');
        d.cooldown = v.rocPause / pace(d);
      }
      break;
    default:
      break;
  }
}

/** Its warning over: the move. */
function unleash(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number) {
  const v = FROST_ROC.v;
  w.events.push(MOVE_EVENTS[d.move] ?? 'rocRoar', index, d.pos.x, d.pos.y + v.rocHeight * 0.6, d.pos.z);
  switch (d.move) {
    case SWIPE: {
      setPhase(d, 'recover');
      const off = offAngle(d, player);
      if (!player.dead && dist <= v.swipeReach + radiusOf(d) && off <= ARC && player.pos.y - d.pos.y < OVER && damagePlayer(player, v.swipeDamage, 'frostRoc')) throwYou(player, d, player.pos.x - d.pos.x, player.pos.z - d.pos.z, dist, THROW.swipe[0], THROW.swipe[1]);
      return;
    }
    case GUST:
    case BREATH:
      d.aim.x = d.facing;
      d.shots = 0;
      setPhase(d, 'breath');
      return;
    case SLIDE:
      d.aim.set(player.pos.x - d.pos.x, 0, player.pos.z - d.pos.z).normalize();
      d.facing = yawTo(d, player.pos.x, player.pos.z);
      d.near = v.slideSpeed;
      d.shots = dist;
      d.struck = false;
      setPhase(d, 'charge');
      return;
    case LEAP:
      way.set(0, 0, 0);
      if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, way)) return setPhase(d, 'recover');
      d.from.copy(d.pos);
      d.aim.set(way.x, d.pos.y, way.z);
      d.facing = yawTo(d, way.x, way.z);
      setPhase(d, 'leap');
      return;
    default:
      // (Its roar: the dead are called up: bossRoom.ts.)
      setPhase(d, 'recover');
  }
}

/** Its wings beat: you're blown back, in front of it and within its reach (on the ground or not). */
function gust(d: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (!player.dead && dist > 1e-3 && dist <= v.gustReach && offAngle(d, player) <= ARC) {
    player.vel.x += (dx / dist) * v.gustPush * dt;
    player.vel.z += (dz / dist) * v.gustPush * dt;
  }
  if (d.t < v.gustFor) return;
  // Half the time its slide follows at once.
  if (w.rng() < FOLLOW) warn(d, SLIDE, w);
  else setPhase(d, 'recover');
}

/** Its breath sweeps across you: it catches you near its line (now and then), and lays rime along it. */
function breathe(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FROST_ROC.v;
  const k = Math.min(1, d.t / v.breathFor);
  d.facing = d.aim.x + v.breathSweep * (2 * k - 1);
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (!player.dead && d.blink <= 0 && dist <= v.breathReach && offAngle(d, player) <= NARROW && player.pos.y - d.pos.y < v.rocHeight && damagePlayer(player, v.breathDamage, 'frostRoc')) {
    d.blink = v.breathEvery;
    if (w.ground) chillYou(w.ground.frost, w.events, player.pos.x, player.pos.y + 1, player.pos.z);
    w.events.push('rocBreathHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
  }
  if (w.ground && d.t >= d.shots * RIME_EVERY) {
    d.shots++;
    addRime(w.ground.frost, d.pos.x - Math.sin(d.facing) * RIME_OUT, d.pos.z - Math.cos(d.facing) * RIME_OUT, FOES_NORSE.v.rimeSize * 1.3, FOES_NORSE.v.rimeLast);
  }
  if (k >= 1) setPhase(d, 'recover');
}

/** Its belly slide: on along its way, slowing as the ground lets it; into you once; a wall stops it, stunned. */
function slide(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  const slick = onIce(d.pos.x, d.pos.y, d.pos.z, w.ground?.ice) || onRime(w.ground?.frost, d.pos.x, d.pos.y, d.pos.z);
  const brake = (v.slideSpeed * v.slideSpeed) / (2 * (d.shots + (slick ? v.slideIce : v.slidePast)));
  const step = d.near * dt;
  const x = d.pos.x;
  const z = d.pos.z;
  walk(d, d.aim.x, d.aim.z, step, w.nav.large);
  const moved = Math.hypot(d.pos.x - x, d.pos.z - z);
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (!d.struck && !player.dead && dist <= radiusOf(d) + 0.8 && player.pos.y - d.pos.y < OVER) {
    d.struck = true;
    if (damagePlayer(player, v.slideDamage, 'frostRoc')) throwYou(player, d, d.aim.x, d.aim.z, 1, THROW.slide[0], THROW.slide[1]);
  }
  if (d.near > STUNS && moved < step * 0.5) {
    setPhase(d, 'stun');
    w.events.push('rocCrash', index, d.pos.x, d.pos.y + v.rocHeight * 0.5, d.pos.z);
    return;
  }
  d.near = Math.max(0, d.near - brake * dt);
  if (d.near <= STOPPED) setPhase(d, 'recover');
}

/** Up and over to where you stood: landing, it hurts you near (on the ground) and freezes the floor round it. */
function fly(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = FROST_ROC.v;
  const k = Math.min(1, d.t / v.leapTime);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = d.from.y + (d.aim.y - d.from.y) * k + 4 * v.leapHeight * k * (1 - k);
  if (k < 1) return;
  d.pos.copy(d.aim);
  walk(d, 0, 0, 0, w.nav.large);
  setPhase(d, 'recover');
  w.events.push('rocLand', v.landReach, d.pos.x, d.pos.y, d.pos.z);
  if (w.ground) addRime(w.ground.frost, d.pos.x, d.pos.z, v.landIce, FOES_NORSE.v.rimeLast);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (!player.dead && dist <= v.landReach + radiusOf(d) && player.pos.y - d.pos.y < 0.6 && damagePlayer(player, v.landDamage, 'frostRoc')) throwYou(player, d, dx, dz, dist, THROW.land[0], THROW.land[1]);
}
