// Update 0.2.24 — floor 3's lairs (the Bone Keep: world/dungeon/lairs.ts): in a room that has them, its Skeletons climb
// out of its open graves (lying in pieces, then rising as a fallen one rebuilds: its own revive still to come), its
// Mushnubs come out of its mushroom beds and its White Rabbits out of their burrows, instead of at the room's spawn
// spots. A lair no one stands on first. Pure.
import type { Rng } from '../../core/rng';
import type { Spot } from '../../world/arena';
import type { DungeonRoom } from '../../world/dungeon/assemble';
import { FOES3 } from '../../tuning/foes3';
import type { CombatState } from '../combat/state';
import { isLive, setPhase } from '../enemies/enemy';
import type { EnemyKind } from '../enemies/kinds';
import { LYING } from '../enemies/skeleton';
import { spawnAt } from '../enemies/waves';
import type { PlayerState } from '../player/state';

/** Someone standing this close to a lair (m) has it taken. */
const TAKEN = 1.2;

/** The lairs `kind` comes out of in `room` (null: none, it comes in as the rest do). */
export function lairFor(room: DungeonRoom, kind: EnemyKind): Spot[] | null {
  const l = room.lairs;
  const spots = kind === 'skeleton' ? l.graves : kind === 'mushnub' ? l.shrooms : kind === 'rabbit' ? l.burrows : null;
  return spots && spots.length > 0 ? spots : null;
}

/** `kind` comes out of one of `spots`. Returns its slot (−1: no free slot). */
export function fromLair(state: CombatState, kind: EnemyKind, spots: readonly Spot[], player: PlayerState, rng: Rng): number {
  const free = spots.filter((s) => !state.enemies.some((e) => isLive(e) && Math.hypot(e.pos.x - s.x, e.pos.z - s.z) < TAKEN));
  const slot = spawnAt(state.enemies, kind, [...(free.length > 0 ? free : spots)], player, rng, state.events);
  if (slot < 0 || kind !== 'skeleton') return slot;
  const e = state.enemies[slot];
  setPhase(e, 'rebuild');
  e.shots = LYING;
  e.t = FOES3.v.skeletonDown;
  e.stage = -1;
  return slot;
}
