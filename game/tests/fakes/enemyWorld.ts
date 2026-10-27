// Update 0.0.12 — what an enemy's tick needs, for rule tests: a walk grid (both sizes on the same one unless given),
// the ways to the player, orbs and events.
import type { EventQueue } from '../../src/core/eventQueue';
import type { CombatEvent } from '../../src/sim/combat/state';
import { createOrbs } from '../../src/sim/combat/targets';
import { createFlow } from '../../src/sim/enemies/chase';
import type { EnemyWorld } from '../../src/sim/enemies/enemy';
import { GRID_RADIUS } from '../../src/sim/enemies/kinds';
import type { Arena } from '../../src/world/arena';
import { buildNavGrid, NavGrid } from '../../src/world/navGrid';

/** No floor: open ground everywhere, no walls. */
export const OPEN_ARENA: Arena = { name: 'open', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

export function worldFor(events: EventQueue<CombatEvent>, small: NavGrid, large: NavGrid = small): EnemyWorld {
  return { nav: { small, large }, flow: { small: createFlow(small), large: createFlow(large) }, orbs: createOrbs(), events };
}

/** An arena's grids for both sizes. */
export function arenaWorld(events: EventQueue<CombatEvent>, arena: Arena = OPEN_ARENA): EnemyWorld {
  return worldFor(events, buildNavGrid(arena, GRID_RADIUS.small), buildNavGrid(arena, GRID_RADIUS.large));
}
