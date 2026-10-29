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
// Update 0.0.15 — the boss room at the end of the way (bossRoom.ts) instead of waves; its wooden gate is shut from the
// start and opens once the boss is dead; the way down is the dark beyond it.
// Update 0.0.16 — a room's waves come from its plan (wavePlan.ts, made with the floor); a room with a Yeti gives one
// key, whichever Yeti dies first (CombatState.keyDrops).
// Update 0.1.0 (the designer: never fewer than 5 enemies on the field, constant pressure) — a room's waves come as one
// stream: the opening brings its first wave, and at least Enemies on field (tuning/rooms.ts); after that, whenever fewer
// than that are fighting, the next of its plan comes in (one every Reinforcement gap), away from you, until all are sent.
// The room is won when they're all sent and dead.
// Update 0.2.0 (the designer) — a won challenge room keeps its gates shut until you've taken its reward (reward.ts:
// 'reward', its chest rising out of the floor); the boss's chest rises as the wooden gate opens. A chest that has
// risen is solid (its box is a gate), once you're clear of it.
import { createRng, Rng } from '../../core/rng';
import type { Spot } from '../../world/arena';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { AIR, buildNavGrid, NavGrid } from '../../world/navGrid';
import type { CombatState } from '../combat/state';
import { createFlow } from '../enemies/chase';
import { isLive } from '../enemies/enemy';
import { GRID_RADIUS, SizeClass } from '../enemies/kinds';
import { spawnAt } from '../enemies/waves';
import { hasYeti } from './wavePlan';
import { BONUS } from '../../tuning/bonus';
import { ROOMS } from '../../tuning/rooms';
import type { EnemyKind } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { BossRun, createBossRun, startShow, stepBoss } from './bossRoom';
import { bossOf } from '../enemies/kinds';
import { createTreasure, raiseChest, Treasure } from './treasure';
import { rewardDone, startReward } from './reward';
import { CHEST_D, CHEST_W } from '../../world/dungeon/assemble';

/** Update 0.2.0 — 'reward': a challenge room won, shut until its reward is taken. */
export type RoomState = 'idle' | 'fighting' | 'reward' | 'cleared';

export interface RoomRun {
  state: RoomState;
  /** Update 0.1.0 — enemies of its plan sent so far, and in all; time until the next may come. */
  sent: number;
  total: number;
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
  /** Update 0.0.15 — the boss room. */
  boss: BossRun;
}

/** Seconds from the gates shutting to the first wave. */
export const FIRST_WAVE = 0.7;
/** Enemies never appear closer to you than this, if the room has room (m). */
const SPAWN_CLEAR = 6;
export { buyWave, roomCount } from './wavePlan';

export function createDungeonRun(level: DungeonLevel): DungeonRun {
  return {
    level,
    rooms: level.rooms.map((r) => ({ state: r.kind === 'fight' || r.kind === 'boss' ? 'idle' : 'cleared', sent: 0, total: 0, delay: 0 })),
    current: -1,
    visited: level.rooms.map(() => false),
    // The wooden gate is shut until the boss is dead.
    shut: level.gates.map((_, i) => i === level.boss.gate),
    nav: level.rooms.map(() => null),
    exited: false,
    treasure: createTreasure(level, createRng(level.plan.seed * 131 + level.plan.level * 17), bossOf(level.plan.level)),
    boss: createBossRun(bossOf(level.plan.level)),
  };
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
      rr.total = room.waves.reduce((n, w) => n + w.length, 0);
      rr.sent = 0;
      // Update 0.1.20 — a challenge room gives Challenge: keys, each white or gold.
      combat.keyDrops = room.challenge ? Math.round(ROOMS.v.challengeKeys) : hasYeti(room.waves) ? 1 : 0;
      combat.betterKeys = room.challenge;
      combat.bonusDrops = BONUS.v.perRoom;
      rr.delay = FIRST_WAVE;
      for (const g of room.gates) run.shut[g] = true;
      enterNav(run, i, combat);
      ev.push('gatesShut', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
      if (room.kind === 'boss') startShow(run.boss, combat, run.level.boss.portal);
    }
    if (room.kind === 'boss') {
      // Its show's clock runs on once the room is cleared (the gate swinging, the view turned to it): Update 0.0.15
      // fix, it stopped there and the view stayed locked on you.
      if (run.boss.beat !== 'waiting' && stepBoss(run.boss, run.level.boss.portal, room.spawns, player, combat, rng, dt)) {
        // The boss is dead: the wooden gate swings open, and the room's own gates lift; its chest rises (Update 0.2.0).
        rr.state = 'cleared';
        raiseChest(run.treasure, room.chest, combat);
        run.shut[run.level.boss.gate] = false;
        for (const g of room.gates) run.shut[g] = false;
        ev.push('woodGateOpen', i, run.level.boss.gateAt.x, 2, run.level.boss.gateAt.z);
        ev.push('gatesOpen', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
      }
      continue;
    }
    if (rr.state === 'reward' && rewardDone(run, i, player, combat)) {
      rr.state = 'cleared';
      for (const g of room.gates) run.shut[g] = false;
      ev.push('gatesOpen', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
    }
    if (rr.state !== 'fighting') continue;
    let live = 0;
    for (const e of combat.enemies) if (isLive(e)) live++;
    rr.delay -= dt;
    if (rr.sent < rr.total) {
      // Keep the field full: the opening (its first wave, at least Enemies on field), then one at a time.
      const min = ROOMS.v.fieldMin;
      if (rr.delay <= 0 && live < min) {
        send(run, i, player, combat, rng, rr.sent === 0 ? Math.max(room.waves[0]?.length ?? 0, min) : 1);
        rr.delay = ROOMS.v.reinforceGap;
      }
      continue;
    }
    if (live > 0) continue;
    // Update 0.2.0 — a challenge room: shut till its reward is taken.
    if (room.challenge) {
      rr.state = 'reward';
      startReward(run, i, player, combat, rng);
      continue;
    }
    rr.state = 'cleared';
    for (const g of room.gates) run.shut[g] = false;
    ev.push('gatesOpen', i, (room.min.x + room.max.x) / 2, 1, (room.min.z + room.max.z) / 2);
  }
  // A risen chest is solid, once you're clear of it.
  for (const c of run.treasure.chests) {
    const g = c.spot.gate;
    if (g < 0 || run.shut[g] || c.state === 'buried') continue;
    const reach = CHEST_W / 2 + CHEST_D / 2;
    if (Math.abs(player.pos.x - c.spot.x) > reach || Math.abs(player.pos.z - c.spot.z) > reach) run.shut[g] = true;
  }
  const ex = run.level.exit;
  if (!run.exited && run.boss.beat === 'open' && player.grounded && Math.hypot(player.pos.x - ex.x, player.pos.z - ex.z) <= ex.radius) {
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
  run.level.rooms.forEach((r, i) => (r.kind === 'fight' || r.kind === 'boss') && navFor(run, i));
}

/** The room's enemies walk its own grid. */
function enterNav(run: DungeonRun, i: number, combat: CombatState) {
  const nav = navFor(run, i);
  combat.nav = nav;
  combat.flow = { small: createFlow(nav.small), large: createFlow(nav.large), air: createFlow(nav.air) };
}

/** The `k`th enemy of a room's plan (its waves one after another). */
function nth(waves: readonly EnemyKind[][], k: number): EnemyKind {
  for (const w of waves) {
    if (k < w.length) return w[k];
    k -= w.length;
  }
  return 'grunt';
}

const kinds: EnemyKind[] = [];

/** The next `n` of room `i`'s plan come in, at its spawn spots away from you (spitters on its free perches first). */
function send(run: DungeonRun, i: number, player: PlayerState, combat: CombatState, rng: Rng, n: number) {
  const room = run.level.rooms[i];
  const rr = run.rooms[i];
  // Its plan has the dearest first in each wave, so brutes get the spots furthest from you.
  kinds.length = 0;
  for (; n > 0 && rr.sent < rr.total; n--) kinds.push(nth(room.waves, rr.sent++));
  const far = room.spawns.filter((s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z) >= SPAWN_CLEAR);
  let pool: Spot[] = [...(far.length > 0 ? far : room.spawns)];
  // Update 0.0.21 — spitters take the perches no one stands on, first.
  const perches = room.perches.filter((p) => !combat.enemies.some((e) => isLive(e) && e.perch > 0 && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < 0.5));
  for (const kind of kinds) {
    if (kind === 'spitter' && perches.length > 0) {
      const slot = spawnAt(combat.enemies, kind, perches, player, rng, combat.events);
      if (slot >= 0) combat.enemies[slot].perch = combat.enemies[slot].pos.y;
      continue;
    }
    if (pool.length === 0) pool = [...room.spawns];
    spawnAt(combat.enemies, kind, pool, player, rng, combat.events);
  }
}
