// Update 0.2.8 — the Velociraptor's hunt: a real charge scrapes the sand twice.
// Update 0.3.60 — by the Boss Design Bible, "Trust your ears" (spec MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md).
// Its Stalk & Ambush: it runs off out of your sight and it's gone; clicks come, louder and quicker, from the way it's coming; it shows
// for a moment, low, then lunges. Hit it as it shows and it trips.
// Its Tail Lash: it turns side-on, its tail flicks, it spins all the way round with its tail at chest height: jump it (the bible's slide
// was taken out of the game in 0.3.20); it's dizzy after.
// Its Pack Call: it barks twice with its head up, and two of the small ones come, one to each side of you. While they live, it only
// ambushes.
// Its Feint: it crouches with no hiss, blurs round to your other side, and pounces from there, that one with a hiss. Listen, don't look.
// Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import { freeAt, wallBetween } from '../../world/navGrid';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { dinoPace, HIDDEN_AT, SICKLE, throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, isLive, radiusOf, setPhase, spawnEnemy, turn, walk, yawTo } from './enemy';

/** A real charge's scrapes come at these shares of its warning. */
const SCRAPES = [0.3, 0.65];
/** It looks for somewhere out of your sight this many ways round it; it runs at most this long (s). */
const WAYS = 16;
const SPRINT_MAX = 1.3;
/** Unseen, it goes round you this slowly (rad/s): the way the clicks come from holds still enough to turn to. */
const DRIFT = 0.25;
/** Coming out, it tries closer in by this much (m) till it has a clear line at you, down to this close (m). */
const CLOSER = 2;
const NEAREST = 6;

const spot = new Vector3();

/** Its charge's warning, each tick: it scrapes the sand twice. */
export function scrapes(d: Enemy, w: EnemyWorld, windup: number) {
  while (d.shots < SCRAPES.length && d.t >= SCRAPES[d.shots] * windup) {
    d.shots++;
    w.events.push('dinoScrape', d.shots, d.pos.x, d.pos.y, d.pos.z);
  }
}

/** Off it runs: for the spot furthest in Ambush runs with something between it and you, or else just away. Enemy.aim: where. */
export function startAmbush(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  let best = -1;
  let found = false;
  for (let i = 0; i < WAYS; i++) {
    const y = (i / WAYS) * Math.PI * 2;
    const x = d.pos.x - Math.sin(y) * v.ambushFar;
    const z = d.pos.z - Math.cos(y) * v.ambushFar;
    if (!freeAt(w.nav.large, x, z)) continue;
    const away = Math.hypot(x - player.pos.x, z - player.pos.z);
    const hidden = wallBetween(w.nav.small, player.pos.x, player.pos.z, x, z);
    if (found && !hidden) continue;
    if ((hidden && !found) || away > best) {
      best = away;
      found = found || hidden;
      d.aim.set(x, 0, z);
    }
  }
  if (best < 0) d.aim.set(d.pos.x + (d.pos.x - player.pos.x), 0, d.pos.z + (d.pos.z - player.pos.z));
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  setPhase(d, 'charge');
  w.events.push('dinoSprint', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

/** One tick of it running off. True once it's got there (or run long enough). */
export function stepAmbushRun(d: Enemy, dt: number, w: EnemyWorld): boolean {
  const dx = d.aim.x - d.pos.x;
  const dz = d.aim.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const step = Math.min(dist, DINO.v.ambushSpeed * dinoPace(d) * dt);
  if (dist > 1e-3) walk(d, dx / dist, dz / dist, step, w.nav.large);
  return dist <= step + 0.05 || d.t >= SPRINT_MAX;
}

/** It's gone: under the floor, out of reach, not drawn. */
export function vanish(d: Enemy, player: PlayerState) {
  const b = d.raptor!;
  d.pos.y = d.prev.y = HIDDEN_AT;
  b.clickIn = 0;
  b.way = d.t % 2 < 1 ? 1 : -1;
  b.bearing = Math.atan2(d.pos.x - player.pos.x, d.pos.z - player.pos.z);
}

/** One tick unseen, round you at Stalk ring: it clicks, quicker and louder as `k` (0..1) comes on, from where it is. */
export function stalkUnseen(d: Enemy, _index: number, k: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DINO.v;
  const b = d.raptor!;
  b.bearing += b.way * DRIFT * dt;
  d.pos.x = player.pos.x + Math.sin(b.bearing) * v.stalkRing;
  d.pos.z = player.pos.z + Math.cos(b.bearing) * v.stalkRing;
  d.prev.x = d.pos.x;
  d.prev.z = d.pos.z;
  b.clickIn -= dt;
  if (b.clickIn > 0) return;
  b.clickIn = v.clickSlow + (v.clickFast - v.clickSlow) * k;
  w.events.push('dinoClick', k, d.pos.x, 1, d.pos.z);
}

/** It comes out, on its bearing from you, as close in as it takes to see you. */
export function comeOut(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  const b = d.raptor!;
  let r = v.stalkRing;
  for (; r >= NEAREST; r -= CLOSER) {
    spot.set(player.pos.x + Math.sin(b.bearing) * r, 0, player.pos.z + Math.cos(b.bearing) * r);
    if (freeAt(w.nav.large, spot.x, spot.z) && !wallBetween(w.nav.small, player.pos.x, player.pos.z, spot.x, spot.z)) break;
  }
  if (r < NEAREST) spot.set(player.pos.x + Math.sin(b.bearing) * NEAREST, 0, player.pos.z + Math.cos(b.bearing) * NEAREST);
  d.pos.copy(spot);
  d.prev.copy(spot);
  walk(d, 0, 0, 0, w.nav.large);
  d.facing = yawTo(d, player.pos.x, player.pos.z);
}

/** Its Tail Lash starts: Enemy.aim.x: the facing it starts from. */
export function startTail(d: Enemy, index: number, w: EnemyWorld) {
  d.aim.x = d.facing;
  d.struck = false;
  setPhase(d, 'dive');
  w.events.push('dinoTail', index, d.pos.x, d.pos.y + 1.5, d.pos.z);
}

/** One tick of its spin, all the way round; its tail (behind it) passing you, your feet under it: hurt and thrown. True once it's round. */
export function stepTail(d: Enemy, player: PlayerState) {
  const v = DINO.v;
  const k = Math.min(1, d.t / (v.tailSpin / dinoPace(d)));
  const before = d.facing;
  d.facing = d.aim.x + k * Math.PI * 2;
  if (!d.struck && !player.dead) {
    const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
    // (The way to you, behind which its tail is.)
    const want = yawTo(d, player.pos.x, player.pos.z) + Math.PI;
    const a = Math.atan2(Math.sin(want - before), Math.cos(want - before));
    const b = Math.atan2(Math.sin(want - d.facing), Math.cos(want - d.facing));
    const crossed = (a <= 0 && b >= 0 && Math.abs(a - b) < Math.PI) || (a >= 0 && b <= 0 && Math.abs(a - b) < Math.PI) || k >= 1;
    if (crossed && k < 1 && dist <= v.tailReach && player.pos.y - d.pos.y < v.tailOver) {
      d.struck = true;
      if (damagePlayer(player, v.tailDamage, d.kind)) throwYou(player, d, player.pos.x - d.pos.x, player.pos.z - d.pos.z, dist, v.tailShove, 5);
    }
  }
  return k >= 1;
}

/** Its pack's alive. */
export const packAlive = (w: EnemyWorld) => w.enemies.some((e) => isLive(e) && e.kind === 'dinoBlob');

/** Its Pack Call answered: one to each side of you. */
export function callPack(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  const n = Math.round(v.packCount);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const len = Math.max(0.1, Math.hypot(dx, dz));
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const off = v.packOff * (1 + Math.floor(i / 2) * 0.4);
    spot.set(player.pos.x + (-dz / len) * side * off, 0, player.pos.z + (dx / len) * side * off);
    const slot = spawnEnemy(w.enemies, 'dinoBlob', spot, Math.atan2(-(player.pos.x - spot.x), -(player.pos.z - spot.z)));
    if (slot >= 0) walk(w.enemies[slot], 0, 0, 0, w.nav.small);
    w.events.push('dinoPackIn', slot, spot.x, 1, spot.z);
  }
  d.raptor!.callIn = v.packGap;
  void index;
}

/** Its Feint: off it blurs round you. Enemy.aim: where you stood (x, z), its y its angle from there at the start. */
export function startFeint(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  d.aim.set(player.pos.x, Math.atan2(d.pos.x - player.pos.x, d.pos.z - player.pos.z), player.pos.z);
  d.near = Math.max(radiusOf(d) + 3, Math.hypot(d.pos.x - player.pos.x, d.pos.z - player.pos.z));
  d.shots = w.rng() < 0.5 ? 1 : -1;
  setPhase(d, 'charge');
  w.events.push('dinoFeint', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

/** One tick of it going round you to your other side. True once it's there: its real pounce, the short way. */
export function stepFeint(d: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const k = Math.min(1, d.t / DINO.v.feintRun);
  const a = d.aim.y + d.shots * k * Math.PI;
  d.pos.x = d.aim.x + Math.sin(a) * d.near;
  d.pos.z = d.aim.z + Math.cos(a) * d.near;
  walk(d, 0, 0, 0, w.nav.large);
  d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), 20 * DINO.v.feintRun);
  if (k < 1) return false;
  d.aim.y = 0;
  d.move = SICKLE;
  return true;
}
