// Update 0.0.12 — what an enemy's tick needs, for rule tests: a walk grid (both sizes on the same one unless given),
// the ways to the player, orbs and events. Update 0.0.13 — and the fliers' grid, and a collision world with nothing
// in it (for the lines fliers need in the air). Update 0.0.15 — quake rings and a seeded RNG (the Demon).
// Update 0.0.18 — the enemies the Dragon's beam can burn (none unless given).
import type { EventQueue } from '../../src/core/eventQueue';
import type { CombatEvent } from '../../src/sim/combat/state';
import { createOrbs } from '../../src/sim/combat/targets';
import { createQuakes } from '../../src/sim/combat/quakes';
import { createBombs } from '../../src/sim/combat/bombs';
import { createGrab } from '../../src/sim/combat/grab';
import { createPin } from '../../src/sim/combat/pin';
import { createRng } from '../../src/core/rng';
import { createFlow } from '../../src/sim/enemies/chase';
import type { Enemy, EnemyWorld } from '../../src/sim/enemies/enemy';
import { GRID_RADIUS } from '../../src/sim/enemies/kinds';
import type { Arena } from '../../src/world/arena';
import { AIR, buildNavGrid, NavGrid } from '../../src/world/navGrid';
import { FlatWorld } from './flatWorld';

/** Nothing in the way of a ray. */
export const OPEN_WORLD = new FlatWorld();

/** No floor: open ground everywhere, no walls. */
export const OPEN_ARENA: Arena = { name: 'open', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

export function worldFor(events: EventQueue<CombatEvent>, small: NavGrid, large: NavGrid = small, air: NavGrid = small, enemies: Enemy[] = []): EnemyWorld {
  return { nav: { small, large, air }, flow: { small: createFlow(small), large: createFlow(large), air: createFlow(air) }, orbs: createOrbs(), quakes: createQuakes(), rng: createRng(1), events, enemies, bombs: createBombs(), grab: createGrab(), pin: createPin(), storm: 0 };
}

/** An arena's grids for both sizes. */
export function arenaWorld(events: EventQueue<CombatEvent>, arena: Arena = OPEN_ARENA): EnemyWorld {
  return worldFor(events, buildNavGrid(arena, GRID_RADIUS.small), buildNavGrid(arena, GRID_RADIUS.large), buildNavGrid(arena, GRID_RADIUS.air, 0, 0.5, AIR));
}
