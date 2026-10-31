// Update 0.2.11 — floor 6's fish met for rule tests (test-floor6-foes.ts, test-floor6-minis.ts, test-whale.ts): you in
// the middle of a walled room under water (its top 6.5 m), one enemy somewhere; ticks of the fight, what was seen and
// what you lost.
import { Vector3 } from 'three';
import { DT, FlatWorld, ticks } from './flatWorld';
import { createRng } from '../../src/core/rng';
import { emptyCombatIntent } from '../../src/sim/combat/fists';
import { createCombat } from '../../src/sim/combat/state';
import { stepCombat } from '../../src/sim/combat/step';
import { spawnEnemy } from '../../src/sim/enemies/enemy';
import type { EnemyKind } from '../../src/sim/enemies/kinds';
import { createPlayer } from '../../src/sim/player/state';
import { Arena, boxAt } from '../../src/world/arena';

export const TOP = 6.5;
const walls = [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')];
export const ROOM: Arena = { name: 'grove', boxes: walls, pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

/** You `y` m up at the middle (facing −z), one `kind` at `at`; the world for rays (walls: `world.walls`). */
export function meet(kind: EnemyKind, at: Vector3, y = 2, seed = 5) {
  const c = createCombat(ROOM);
  c.rng = createRng(seed);
  const p = createPlayer(0, y, 0, 0);
  p.grounded = y === 0;
  p.swimTop = TOP;
  const slot = spawnEnemy(c.enemies, kind, at, Math.atan2(at.x, at.z));
  c.events.clear();
  return { c, p, e: c.enemies[slot], slot, world: new FlatWorld() };
}
export type Meet = ReturnType<typeof meet>;

/** Steps `secs` (`each(i)`: before tick i; you held where you are unless `free`): what was seen, what you lost, and the
 *  water's drag on you at the end. */
export function run(m: Meet, secs: number, each?: (i: number) => void, free = false) {
  const seen: string[] = [];
  const hp = m.p.hp;
  const at = m.p.pos.clone();
  for (let i = 0; i < ticks(secs); i++) {
    each?.(i);
    m.c.tide = TOP;
    stepCombat(m.c, m.p, emptyCombatIntent(), m.world, DT);
    m.p.hurtTime = 0;
    m.p.invuln = 0;
    if (!free && !each) {
      m.p.pos.copy(at);
      m.p.vel.set(0, 0, 0);
    }
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return { seen, lost: hp - m.p.hp };
}

/** Steps until `done()` (at most `secs`); returns what was seen. */
export function until(m: Meet, done: () => boolean, secs: number, each?: (i: number) => void) {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs) && !done(); i++) seen.push(...run(m, DT, each ? () => each(i) : undefined).seen);
  return seen;
}

/** Makes it ready to attack now (its turn: a token, its rest over). */
export function ready(m: Meet) {
  m.e.token = true;
  m.e.cooldown = 0;
}

export const at = (x: number, y: number, z: number) => new Vector3(x, y, z);
