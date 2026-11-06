// Update 0.3.62 — the Big Shark's moves by the Boss Design Bible, "The arena is a weapon": use the place, and never stand still (the
// designer: "Keep them, adapt": the fight stays under water, its jaw moves, its feint and its swallow stay; spec
// MD_UPDATES/U0362_BIG_SHARK_BIBLE.md). The bible's ship deck over open ocean is its sunken ships here.
// Its Breach: a dark shape under you, bubbles rising; it comes straight up through them and out of the water, and it's up there, open.
// Its Hull Ram: it backs off, then rams a ship: a shock along the seabed (be off the floor), wreckage coming down, its teeth stuck a while.
// Its Undertow: the water churns white, then a whirlpool drags you to its eye; swim against it, or get bitten.
// In phase 2 its Blood Scent: hurt, you bleed; stay at one spot and it strikes there. Its Deck Breaker: a ship's planks bulge, it smashes
// out through them at you, and it's stuck in the hole. And the ships keep coming apart. Pure.
import { Vector3 } from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import type { CollisionWorld } from '../collisionWorld';
import { dropBomb } from '../combat/bombs';
import { startQuake } from '../combat/quakes';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { aimDart, chest, dart, swimTo } from './fishSwim';
import { ENEMY_STATS } from './kinds';
import { nearestHull } from './sharkBody';

/** Its moves (`Enemy.move`, after bigSharkMoves.ts's). */
export const BREACH = 7;
export const RAM = 8;
export const WHIRL = 9;
export const SCENT = 10;
export const BREAKER = 11;
export const ABYSS = 12;

/** A breach follows you for this share of its warning, then it's set. How high over the water it goes (m). */
const BREACH_FOLLOWS = 0.55;
const OVER_WATER = 4;
/** It rams from this far off the ship (m), this far past it at most. */
const RAM_OFF = 20;
const RAM_LOOK = 40;
/** Wreckage coming down: from this high (m), landing this wide round you (m). */
const WRECK_FROM = 12;
const WRECK_SPREAD = 14;
/** A whirlpool's spot: this far from you toward the ship or wall nearest (m). */
const WHIRL_OFF = 12;
/** Its Deck Breaker's bite reaches this far past its body (m); it looks for a ship this far off (m); under the seabed it's this far down. */
const BREAK_LOOK = 18;
const UNDER = -8;
const BREAK_THROW = [10, 6] as const;

const at = new Vector3();
const spot = { x: 0, y: 0, z: 0 };

export const hiddenShark = (e: Enemy) => e.kind === 'bigShark' && e.pos.y <= UNDER * 0.5;

const quick = (e: Enemy) => (e.stage > 0 ? BIG_SHARK.v.frenzyQuick : 1);

/** Its Breach starts: under where you are, bubbles rising. */
export function startBreach(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  e.move = BREACH;
  e.struck = false;
  e.aim.set(player.pos.x, 0, player.pos.z);
  setPhase(e, 'windup');
  w.events.push('sharkBubbles', index, e.aim.x, 0.2, e.aim.z);
}

/** One tick of its Breach, the shape under you. */
function breachWarn(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = BIG_SHARK.v;
  const long = v.breachTell * quick(e);
  if (e.t < long * BREACH_FOLLOWS) e.aim.set(player.pos.x, 0, player.pos.z);
  swimTo(e, e.aim.x, 0.3, e.aim.z, ENEMY_STATS.bigShark().speed * 2, dt, w, world);
  if (e.t < long) return;
  e.pos.x = e.aim.x;
  e.pos.z = e.aim.z;
  e.from.copy(e.pos);
  setPhase(e, 'leap');
  w.events.push('sharkBreachUp', index, e.pos.x, e.pos.y + 1, e.pos.z);
}

/** Straight up through you and out; up there a while, open; back in. True once it's back. */
function breachUp(e: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = BIG_SHARK.v;
  const top = v.floodTop + OVER_WATER;
  const k = Math.min(1, e.t / v.breachRise);
  e.pos.y = e.from.y + (top - e.from.y) * k;
  if (!e.struck && !player.dead && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= v.breachReach && player.pos.y <= e.pos.y + 1) {
    e.struck = true;
    if (damagePlayer(player, v.breachDamage, 'bigShark')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, 1, 8, 9);
  }
  if (e.t < v.breachRise) return false;
  if (e.t < v.breachRise + v.breachAir) {
    // (A slow arc over the top.)
    const c = (e.t - v.breachRise) / v.breachAir;
    e.pos.y = top + 1.5 * Math.sin(c * Math.PI);
    return false;
  }
  e.pos.y = v.floodTop - 2;
  w.events.push('bigSharkSplash', index, e.pos.x, v.floodTop, e.pos.z);
  return true;
}

/** Its Hull Ram starts: the nearest ship (or, none, the way ahead), and it backs off for the run. Enemy.aim: where it'll hit. */
export function startRam(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const b = e.shark!;
  e.move = RAM;
  e.struck = false;
  if (nearestHull(b, player.pos.x, player.pos.z, RAM_LOOK, spot)) e.aim.set(spot.x, spot.y, spot.z);
  else e.aim.set(player.pos.x, 2, player.pos.z);
  setPhase(e, 'windup');
  w.events.push('sharkRamWarn', index, e.pos.x, e.pos.y + 1, e.pos.z);
}

/** It rams: a shock along the seabed, wreckage coming down, its teeth stuck. */
function rammed(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BIG_SHARK.v;
  startQuake(w.quakes, e.pos.x, 0, e.pos.z, v.ramShockSpeed, v.ramShockReach, v.ramShockDamage, 0, 'bigShark');
  w.events.push('sharkRam', index, e.pos.x, e.pos.y + 1, e.pos.z);
  wreckage(e, player, w, Math.round(v.ramWreck));
  e.move = RAM;
  setPhase(e, 'stun');
}

/** Wreckage comes down round you, some of it on you. */
export function wreckage(e: Enemy, player: PlayerState, w: EnemyWorld, n: number) {
  const v = BIG_SHARK.v;
  for (let i = 0; i < n; i++) {
    const on = i === 0;
    const x = on ? player.pos.x : player.pos.x + (w.rng() * 2 - 1) * WRECK_SPREAD;
    const z = on ? player.pos.z : player.pos.z + (w.rng() * 2 - 1) * WRECK_SPREAD;
    at.set(x, 0, z);
    dropBomb(w.bombs, new Vector3(x, WRECK_FROM, z), at, v.wreckFall + w.rng() * 0.4, v.wreckRadius, v.wreckDamage, 5, 'bigShark', 'boulder');
  }
  void e;
}

/** Its Undertow starts: the water churning white toward the nearest ship or wall. */
export function startWhirl(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BIG_SHARK.v;
  const b = e.shark!;
  e.move = WHIRL;
  if (nearestHull(b, player.pos.x, player.pos.z, WHIRL_OFF * 2, spot)) {
    const d = Math.max(0.1, Math.hypot(spot.x - player.pos.x, spot.z - player.pos.z));
    b.whirlX = player.pos.x + ((spot.x - player.pos.x) / d) * Math.min(d, WHIRL_OFF);
    b.whirlZ = player.pos.z + ((spot.z - player.pos.z) / d) * Math.min(d, WHIRL_OFF);
  } else {
    b.whirlX = player.pos.x + WHIRL_OFF * (e.pos.x > player.pos.x ? 1 : -1);
    b.whirlZ = player.pos.z;
  }
  b.whirlTell = v.whirlTell * quick(e);
  b.whirlFor = v.whirlFor;
  setPhase(e, 'recover');
  w.events.push('sharkChurn', index, b.whirlX, 0.2, b.whirlZ);
}

/** Its whirlpool, one tick, whatever it's doing: its warning, then it drags you to its eye. */
export function stepWhirl(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = BIG_SHARK.v;
  const b = e.shark!;
  if (b.whirlFor <= 0) return;
  if (b.whirlTell > 0) {
    b.whirlTell -= dt;
    return;
  }
  b.whirlFor = Math.max(0, b.whirlFor - dt);
  if (player.dead) return;
  const dx = b.whirlX - player.pos.x;
  const dz = b.whirlZ - player.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > v.whirlReach) return;
  if (d > 0.3) {
    const pull = v.whirlPull * (1 - (d / v.whirlReach) * 0.5);
    player.current.x += (dx / d) * pull;
    player.current.z += (dz / d) * pull;
  }
  if (d > v.whirlEye) return;
  // In its eye: bitten, and flung out.
  b.whirlFor = 0;
  w.events.push('bigSharkBite', index, player.pos.x, player.pos.y + 1, player.pos.z);
  if (damagePlayer(player, v.whirlDamage, 'bigShark')) throwYou(player, e, -dx, -dz, Math.max(d, 0.1), 14, 6);
}

/** Your blood, one tick: hurt by it (phase 2), you bleed a while; at one spot too long, it strikes there. True: it's time. */
export function stepScent(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = BIG_SHARK.v;
  const b = e.shark!;
  if (b.hitsSeen < 0) b.hitsSeen = player.hits;
  if (player.hits !== b.hitsSeen) {
    if (player.hits > b.hitsSeen && e.stage > 0 && player.hurtBy === 'bigShark') {
      if (b.bleed <= 0) w.events.push('sharkBleed', index, player.pos.x, player.pos.y + 1, player.pos.z);
      b.bleed = v.bleedFor;
    }
    b.hitsSeen = player.hits;
  } else b.bleed = Math.max(0, b.bleed - dt);
  if (b.bleed <= 0) {
    b.stillFor = 0;
    return false;
  }
  if (Math.hypot(player.pos.x - b.stillX, player.pos.z - b.stillZ) > v.scentStill) {
    b.stillX = player.pos.x;
    b.stillZ = player.pos.z;
    b.stillFor = 0;
    return false;
  }
  b.stillFor += dt;
  return b.stillFor >= v.scentFor;
}

/** It's caught your scent at one spot: it turns on it, fast. No arrow: you were told to keep moving. */
export function startScent(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const b = e.shark!;
  e.move = SCENT;
  e.struck = false;
  e.aim.set(player.pos.x, chest(player), player.pos.z);
  b.stillFor = 0;
  setPhase(e, 'windup');
  w.events.push('sharkMark', index, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** Its Deck Breaker starts: it's gone, under; a ship's planks by you (or the seabed under you) bulge and crack. Enemy.aim: where. */
export function startBreaker(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  e.move = BREAKER;
  e.struck = false;
  if (nearestHull(e.shark!, player.pos.x, player.pos.z, BREAK_LOOK, spot)) e.aim.set(spot.x, spot.y, spot.z);
  else e.aim.set(player.pos.x, 0.5, player.pos.z);
  e.pos.y = e.prev.y = UNDER;
  setPhase(e, 'windup');
  w.events.push('sharkBulge', index, e.aim.x, e.aim.y, e.aim.z);
}

/** It smashes out: a bite at what's in reach, and it's stuck in the hole. */
function breakOut(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = BIG_SHARK.v;
  const b = e.shark!;
  e.pos.copy(e.aim);
  e.prev.copy(e.aim);
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  b.holes.push({ x: e.aim.x, y: e.aim.y, z: e.aim.z });
  if (b.holes.length > 8) b.holes.shift();
  w.events.push('sharkBreak', index, e.aim.x, e.aim.y, e.aim.z);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (!player.dead && d <= v.breakReach + ENEMY_STATS.bigShark().radius && Math.abs(player.pos.y - e.pos.y) < v.breakReach && damagePlayer(player, v.breakDamage, 'bigShark')) throwYou(player, e, dx, dz, d, BREAK_THROW[0], BREAK_THROW[1]);
  e.move = BREAKER;
  setPhase(e, 'stun');
}

/** How long it's stuck after `move` (s; 0: the old rule). */
export function stuckFor(move: number): number {
  const v = BIG_SHARK.v;
  return move === RAM ? v.ramStuck : move === BREAKER ? v.breakStuck : 0;
}

/** One tick of a move of these: True once it's over. */
export function stepArenaMove(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld): boolean {
  const v = BIG_SHARK.v;
  const s = ENEMY_STATS.bigShark();
  switch (e.move) {
    case BREACH:
      if (e.phase === 'windup') {
        breachWarn(e, index, player, w, dt, world);
        return false;
      }
      return breachUp(e, index, player, w);
    case RAM:
      if (e.phase === 'windup') {
        // Backed off along the line to the ship, then off it goes, its wake growing.
        const dx = e.pos.x - e.aim.x;
        const dz = e.pos.z - e.aim.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        swimTo(e, e.aim.x + (dx / d) * RAM_OFF, e.aim.y, e.aim.z + (dz / d) * RAM_OFF, s.speed * 1.4, dt, w, world);
        if (e.t < v.ramTell * quick(e) * 0.7) return false;
        e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 6 * dt);
        if (e.t < v.ramTell * quick(e)) return false;
        at.set(e.aim.x, e.aim.y, e.aim.z);
        const held = e.aim.clone();
        aimDart(e, at, 2);
        e.struck = false;
        e.aim.copy(held);
        setPhase(e, 'dive');
        w.events.push('sharkRamGo', index, e.pos.x, e.pos.y + 1, e.pos.z);
        return false;
      }
      {
        const how = dart(e, player, v.ramSpeed, dt, world, () => {
          if (player.dead) return;
          if (damagePlayer(player, v.ramDamage, 'bigShark')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, 1, 12, 6);
        });
        if (how === 'wall' || how === 'end') rammed(e, index, player, w);
      }
      return false;
    case SCENT:
      if (e.phase === 'windup') {
        e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 8 * dt);
        if (e.t < v.scentWarn) return false;
        at.copy(e.aim);
        aimDart(e, at, 4);
        e.struck = false;
        setPhase(e, 'dive');
        return false;
      }
      {
        const how = dart(e, player, v.lungeSpeed, dt, world, () => {
          if (player.dead) return;
          w.events.push('bigSharkBite', index, player.pos.x, player.pos.y + 1, player.pos.z);
          if (damagePlayer(player, v.lungeDamage, 'bigShark')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, 1, 9, 4);
        });
        return how === 'wall' || how === 'end';
      }
    case BREAKER:
      if (e.t >= v.breakTell * quick(e)) breakOut(e, index, player, w);
      return false;
    default:
      return true;
  }
}
