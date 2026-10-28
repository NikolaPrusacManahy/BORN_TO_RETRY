// Update 0.0.12 — the room loop (the designer: step into a room, the doors shut, the enemies start coming). Once you're
// properly inside a fight room (past its doorway) its gates slam shut; a moment later the first wave appears at the
// room's spawn points, away from you; each wave comes once the last one is dead; after the last wave the gates open.
// A room's enemies walk its own grid (its gates shut). Waves are bought from a budget that grows with how deep the
// room is and the floor you're on: grunts are cheap, spitters dearer, brutes dearest (and only from the third room).
// Stepping onto the way down in the exit room ends the floor. Rooms you've been in, and their neighbours, show on the
// minimap. Pure and seeded.
// Update 0.0.13 — each floor's shop and chests (treasure.ts). Bigger budgets for rooms twice the size; waves picked
// from every kind the room may have (weighted), the leaper and the stinger from the second room, the wraith and the
// brute from the third (all of them from floor 2).
import { createRng, Rng } from '../../core/rng';
import type { Spot } from '../../world/arena';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { AIR, buildNavGrid, NavGrid } from '../../world/navGrid';
import type { CombatState } from '../combat/state';
import { createFlow } from '../enemies/chase';
import { isLive } from '../enemies/enemy';
import { ENEMY_KINDS, GRID_RADIUS, EnemyKind, SizeClass } from '../enemies/kinds';
import { spawnAt } from '../enemies/waves';
import type { PlayerState } from '../player/state';
import { createTreasure, Treasure } from './treasure';

export type RoomState = 'idle' | 'fighting' | 'cleared';

export interface RoomRun {
  state: RoomState;
  /** Waves sent so far, and in all; time until the next one. */
  wave: number;
  waves: number;
  delay: number;
}

export interface DungeonRun {
  level: DungeonLevel;
  rooms: RoomRun[];
  /** The room you're in (−1: a corridor or a doorway). */
  current: number;
  visited: boolean[];
  /** Shut gates (indices as level.gates). */
  shut: boolean[];
  /** Each fight room's walk grids, made the first time you go in. */
  nav: (Record<SizeClass, NavGrid> | null)[];
  /** You've taken the way down. */
  exited: boolean;
  /** Update 0.0.13 — the shop's offers and the chests. */
  treasure: Treasure;
}

/** Seconds from the gates shutting to the first wave, and between waves. */
export const FIRST_WAVE = 0.7;
export const NEXT_WAVE = 0.9;
/** Enemies never appear closer to you than this, if the room has room (m). */
const SPAWN_CLEAR = 6;
/** No more than this many in one wave. */
const WAVE_CAP = 8;
const COST: Record<EnemyKind, number> = { grunt: 1, spitter: 2, brute: 4, leaper: 2, stinger: 2, wraith: 3 };
/** How often each kind is picked, and the first room (on floor 1) it comes in. **(placeholders)** */
const WEIGHT: Record<EnemyKind, number> = { grunt: 4, spitter: 2, brute: 1, leaper: 1.5, stinger: 2, wraith: 1 };
const FROM: Record<EnemyKind, number> = { grunt: 1, spitter: 1, brute: 3, leaper: 2, stinger: 2, wraith: 3 };

export function createDungeonRun(level: DungeonLevel): DungeonRun {
  return {
    level,
    rooms: level.rooms.map((r) => ({ state: r.kind === 'fight' ? 'idle' : 'cleared', wave: 0, waves: 0, delay: 0 })),
    current: -1,
    visited: level.rooms.map(() => false),
    shut: level.gates.map(() => false),
    nav: level.rooms.map(() => null),
    exited: false,
    treasure: createTreasure(level, createRng(level.plan.seed * 131 + level.plan.level * 17)),
  };
}

/** A room's fight: its budget (enemy cost to spend) and how many waves it comes in. */
export function roomBudget(depth: number, floor: number): { budget: number; waves: number } {
  const budget = 6 + 3 * depth + 4 * (floor - 1);
  return { budget, waves: budget >= 18 ? 3 : 2 };
}

/** The kinds of one wave, bought from `budget` (seeded). */
export function buyWave(budget: number, depth: number, floor: number, rng: Rng): EnemyKind[] {
  const out: EnemyKind[] = [];
  let left = budget;
  const can = (k: EnemyKind) => (floor >= 2 || depth >= FROM[k]) && COST[k] <= left;
  while (left > 0 && out.length < WAVE_CAP) {
    let total = 0;
    for (const k of ENEMY_KINDS) if (can(k)) total += WEIGHT[k];
    let roll = rng() * total;
    let kind: EnemyKind = 'grunt';
    for (const k of ENEMY_KINDS) {
      if (!can(k)) continue;
      kind = k;
      roll -= WEIGHT[k];
      if (roll < 0) break;
    }
    out.push(kind);
    left -= COST[kind];
  }
  return out;
}

export function roomAt(run: DungeonRun, x: number, z: number): number {
  for (const r of run.level.rooms) if (x >= r.inMin.x && x <= r.inMax.x && z >= r.inMin.z && z <= r.inMax.z) return r.index;
  return -1;
}

/** One tick of the loop. */
export function stepRooms(run: DungeonRun, player: PlayerState, combat: CombatState, rng: Rng, dt: number) {
  run.current = roomAt(run, player.pos.x, player.pos.z);
  if (run.current >= 0) run.visited[run.current] = true;
  const ev = combat.events;
  for (let i = 0; i < run.rooms.length; i++) {
    const rr = run.rooms[i];
    const room = run.level.rooms[i];
    if (rr.state === 'idle' && run.current === i && !player.dead) {
      rr.state = 'fighting';
      rr.waves = roomBudget(room.depth, run.level.plan.level).waves;
      rr.wave = 0;
      rr.delay = FIRST_WAVE;
      for (const g of room.gates) run.shut[g] = true;
      enterNav(run, i, combat);
      ev.push('gatesShut', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
    }
    if (rr.state !== 'fighting') continue;
    let live = false;
    for (const e of combat.enemies) live ||= isLive(e);
    if (live) continue;
    rr.delay -= dt;
    if (rr.delay > 0) continue;
    if (rr.wave < rr.waves) {
      sendWave(run, i, player, combat, rng);
      rr.wave++;
      rr.delay = NEXT_WAVE;
      continue;
    }
    rr.state = 'cleared';
    for (const g of room.gates) run.shut[g] = false;
    ev.push('gatesOpen', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
  }
  const ex = run.level.exit;
  if (!run.exited && player.grounded && Math.hypot(player.pos.x - ex.x, player.pos.z - ex.z) <= ex.radius) {
    run.exited = true;
    ev.push('floorExit', run.level.plan.level, ex.x, 0, ex.z);
  }
}

/** A room's walk grids (made once). */
function navFor(run: DungeonRun, i: number): Record<SizeClass, NavGrid> {
  const arena = run.level.rooms[i].arena;
  return (run.nav[i] ??= { small: buildNavGrid(arena, GRID_RADIUS.small), large: buildNavGrid(arena, GRID_RADIUS.large), air: buildNavGrid(arena, GRID_RADIUS.air, 0, 0.5, AIR) });
}

/** Every fight room's walk grids, made up front (when the floor loads) so going into a room never stalls. */
export function prepareNav(run: DungeonRun) {
  run.level.rooms.forEach((r, i) => r.kind === 'fight' && navFor(run, i));
}

/** The room's enemies walk its own grid. */
function enterNav(run: DungeonRun, i: number, combat: CombatState) {
  const nav = navFor(run, i);
  combat.nav = nav;
  combat.flow = { small: createFlow(nav.small), large: createFlow(nav.large), air: createFlow(nav.air) };
}

function sendWave(run: DungeonRun, i: number, player: PlayerState, combat: CombatState, rng: Rng) {
  const room = run.level.rooms[i];
  const { budget, waves } = roomBudget(room.depth, run.level.plan.level);
  const kinds = buyWave(Math.ceil(budget / waves), room.depth, run.level.plan.level, rng);
  // Brutes first, so they get the spots furthest from you.
  kinds.sort((a, b) => COST[b] - COST[a]);
  const far = room.spawns.filter((s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z) >= SPAWN_CLEAR);
  let pool: Spot[] = [...(far.length > 0 ? far : room.spawns)];
  for (const kind of kinds) {
    if (pool.length === 0) pool = [...room.spawns];
    spawnAt(combat.enemies, kind, pool, player, rng, combat.events);
  }
}
