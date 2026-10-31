// Update 0.2.11 — floor 6's boss, the Old Whale (the designer's Whale; its moves are Claude's proposal as accepted):
// huge, swimming laps round its room, its wake dragging you along. **Phase 1**: between laps, its ram (its lane shows,
// then it rams through you; into a wall it's stunned) or its song (it draws breath and sings: a ring rolling out from
// it; behind a tower or a column you're safe). **Phase 2** (below Phase 2 at, next on its laps): it roars, its brood of
// Clownfish comes once (bossRoom.ts), and it adds its inhale (the water pulls you to its mouth: swim and kick away, or
// you're swallowed and spat out) and its breach (it rises to the top over you, marks where it'll crash, and crashes
// down: its shock throws whatever's near the floor; then it lies stunned). Enemy.from: the middle of its room (its
// portal). Pure.
import { WHALE } from '../../tuning/whale';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { chest, holdDepth } from './fishSwim';
import { ENEMY_STATS } from './kinds';
import { aimRam, BREACH, crash, INHALE, inhale, lap, markCrash, RAM, ram, rise, ROAR, ROAR_TIME, sing, SONG } from './whaleMoves';

/** Its picks' odds by phase (ram, song, inhale, breach). **(placeholders)** */
const ODDS = [
  [0.55, 0.45, 0, 0],
  [0.3, 0.2, 0.3, 0.2],
];
/** Turning to you as a move winds up (rad/s); after a move it rests this long (s). */
const TURN = 1.6;
const REST = 0.8;

/** How long `move` winds up (s). */
export function whaleWindup(move: number): number {
  const v = WHALE.v;
  return move === RAM ? v.ramWarn : move === SONG ? v.songWindup : move === INHALE ? v.inhaleWindup : move === BREACH ? v.breachWarn : ROAR_TIME;
}

function pick(e: Enemy, w: EnemyWorld): number {
  const odds = ODDS[Math.min(1, e.stage)];
  let roll = w.rng();
  for (let m = 0; m < odds.length; m++) {
    roll -= odds[m];
    if (roll < 0) return m;
  }
  return RAM;
}

export function updateWhale(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = WHALE.v;
  const s = ENEMY_STATS[e.kind]();
  const mid = e.pos.y + s.height / 2;
  switch (e.phase) {
    case 'chase':
      lap(e, player, w, dt, world);
      if (player.dead) break;
      if (e.stage === 0 && e.hp <= s.hp * v.phase2At) {
        e.stage = 1;
        e.move = ROAR;
        setPhase(e, 'windup');
        w.events.push('whaleRoar', index, e.pos.x, mid, e.pos.z);
        break;
      }
      if (e.cooldown > 0) break;
      start(e, pick(e, w), index, player, w);
      break;
    case 'windup':
      windup(e, index, player, w, dt, world);
      break;
    case 'charge':
      ram(e, index, player, w, dt, world);
      break;
    case 'blast':
      if (!sing(e, index, player, w, world)) setPhase(e, 'recover');
      break;
    case 'breath':
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * 0.4 * dt);
      holdDepth(e, chest(player), v.whaleSpeed, dt, w, world);
      if (!inhale(e, index, player, w) && e.phase === 'breath') setPhase(e, 'recover');
      break;
    case 'leap':
      rise(e, player, w, dt, world);
      if (e.t < v.breachRise) break;
      markCrash(e, player, w, world);
      setPhase(e, 'windup');
      break;
    case 'dive':
      crash(e, player, w, dt);
      break;
    case 'stun':
      if (e.t >= v.ramStun) rest(e);
      break;
    case 'recover':
      if (e.t >= REST) rest(e);
      break;
    default:
      break;
  }
}

function rest(e: Enemy) {
  e.cooldown = WHALE.v.gap;
  setPhase(e, 'chase');
}

/** It starts `move`: a breach rises first (its warning comes at the top). */
function start(e: Enemy, move: number, index: number, player: PlayerState, w: EnemyWorld) {
  const mid = e.pos.y + ENEMY_STATS[e.kind]().height / 2;
  e.move = move;
  if (move === BREACH) {
    setPhase(e, 'leap');
    w.events.push('whaleBreach', index, e.pos.x, mid, e.pos.z);
    return;
  }
  setPhase(e, 'windup');
  if (move === RAM) {
    aimRam(e, player);
    w.events.push('whaleRamWarn', index, e.pos.x, mid, e.pos.z);
  } else w.events.push(move === SONG ? 'whaleSongWindup' : 'whaleInhale', index, e.pos.x, mid, e.pos.z);
}

function windup(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = WHALE.v;
  const mid = e.pos.y + ENEMY_STATS[e.kind]().height / 2;
  // (Its lane set, it holds it; at the top it waits over its spot.)
  if (e.move === SONG || e.move === INHALE) {
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), TURN * 2 * dt);
    holdDepth(e, chest(player), v.whaleSpeed, dt, w, world);
  } else if (e.move === RAM) e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), TURN * 2 * dt);
  if (e.t < whaleWindup(e.move)) return;
  if (e.move === RAM) {
    setPhase(e, 'charge');
    w.events.push('whaleRam', index, e.pos.x, mid, e.pos.z);
  } else if (e.move === SONG) {
    e.struck = false;
    setPhase(e, 'blast');
    w.events.push('whaleSong', index, e.pos.x, mid, e.pos.z);
  } else if (e.move === INHALE) setPhase(e, 'breath');
  else if (e.move === BREACH) setPhase(e, 'dive');
  else rest(e);
}
