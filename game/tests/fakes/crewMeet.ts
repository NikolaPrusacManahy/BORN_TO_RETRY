// Update 0.3.15 — Skull Cove's crew met for rule tests (test-floor6-crew.ts, test-floor6-cove-minis.ts): you on your
// feet in the middle of a walled room of sand, the enemies somewhere; ticks of the fight, what was seen and what you lost.
import { Vector3 } from 'three';
import { DT, FlatWorld, ticks } from './flatWorld';
import { createRng } from '../../src/core/rng';
import { emptyCombatIntent } from '../../src/sim/combat/fists';
import { createCombat } from '../../src/sim/combat/state';
import { stepCombat } from '../../src/sim/combat/step';
import { spawnEnemy } from '../../src/sim/enemies/enemy';
import type { EnemyKind } from '../../src/sim/enemies/kinds';
import { createPlayer } from '../../src/sim/player/state';
import { Arena, ArenaBox, boxAt } from '../../src/world/arena';

const WALLS = [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')];
const room = (more: ArenaBox[]): Arena => ({ name: 'cove', boxes: [...WALLS, ...more], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] });

/** You at the middle (facing −z), `kind`s at `ats`; more boxes in the room (`more`: a wall to hide behind). */
export function crew(kind: EnemyKind, ats: Vector3[], more: ArenaBox[] = [], seed = 5) {
  const c = createCombat(room(more));
  c.rng = createRng(seed);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slots = ats.map((a) => spawnEnemy(c.enemies, kind, a, Math.atan2(a.x, a.z)));
  c.events.clear();
  return { c, p, es: slots.map((s) => c.enemies[s]), e: c.enemies[slots[0]], world: new FlatWorld() };
}
export type Crew = ReturnType<typeof crew>;

/** Steps `secs` (`each(i)`: before tick i; you held where you are unless `free`; `after`: after each tick's fight, the
 *  world's turn): what was seen and what you lost (each tick's blow lands: your grace after a hit is taken away). */
export function run(m: Crew, secs: number, each?: (i: number) => void, free = false, after?: () => void) {
  const seen: string[] = [];
  const hp = m.p.hp;
  const at = m.p.pos.clone();
  for (let i = 0; i < ticks(secs); i++) {
    each?.(i);
    stepCombat(m.c, m.p, emptyCombatIntent(), m.world, DT);
    after?.();
    m.p.hurtTime = 0;
    m.p.invuln = 0;
    if (!free && !each) {
      m.p.pos.copy(at);
      m.p.vel.set(0, 0, 0);
    }
    m.p.events.clear();
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return { seen, lost: hp - m.p.hp };
}

/** Steps until `done()` (at most `secs`); returns what was seen. */
export function until(m: Crew, done: () => boolean, secs: number, each?: (i: number) => void) {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs) && !done(); i++) seen.push(...run(m, DT, each ? () => each(i) : undefined).seen);
  return seen;
}

/** Makes one ready to attack now (its turn: a token, its rest over). */
export function ready(e: { token: boolean; cooldown: number }) {
  e.token = true;
  e.cooldown = 0;
}

export const at = (x: number, y: number, z: number) => new Vector3(x, y, z);
export { DT };
