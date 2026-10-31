// Update 0.2.10 — the Drowned King's fight for rule tests (test-drowned-king.ts, test-drowned-risen.ts): you in the
// middle of a walled room, it somewhere, its room's water already up; ticks of the fight with its water as the tide
// (as Run makes it), what was seen and what you lost; its moves started by hand; its picks.
import { Vector3 } from 'three';
import { DT, FlatWorld, ticks } from './flatWorld';
import { createRng } from '../../src/core/rng';
import { emptyCombatIntent } from '../../src/sim/combat/fists';
import { createCombat } from '../../src/sim/combat/state';
import { stepCombat } from '../../src/sim/combat/step';
import { CRUISE } from '../../src/sim/enemies/drownedKingMoves';
import { setPhase, spawnEnemy } from '../../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../../src/sim/enemies/kinds';
import { createPlayer } from '../../src/sim/player/state';
import { DROWNED } from '../../src/tuning/drowned';
import { Arena, boxAt } from '../../src/world/arena';

const v = DROWNED.v;
const walls = [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')];
const ROOM: Arena = { name: 'temple', boxes: walls, pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
export const world = new FlatWorld();

/** You at the middle, it at `at` (up), its room already at `flood` m; risen with `stage` 1. */
export function fight(at: Vector3, stage = 0, flood = stage > 0 ? v.risenDeep : v.shallow, seed = 3) {
  const c = createCombat(ROOM);
  c.rng = createRng(seed);
  c.flood = flood;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'drownedKing', at, Math.atan2(at.x, at.z));
  const e = c.enemies[slot];
  e.stage = stage;
  if (stage > 0) e.hp = ENEMY_STATS.drownedKing().hp * (v.risenAt - 0.05);
  e.cooldown = 99;
  c.events.clear();
  return { c, p, e, slot };
}
export type Fight = ReturnType<typeof fight>;

/** Steps the fight `secs` (`each(i)`: before tick i). Its water is the tide, as in its room (Run). */
export function run(f: Fight, secs: number, each?: (i: number) => void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.(i);
    f.c.tide = f.c.flood;
    stepCombat(f.c, f.p, emptyCombatIntent(), world, DT);
    f.p.hurtTime = 0;
    f.p.invuln = 0;
    for (let k = 0; k < f.c.events.length; k++) seen.push(f.c.events.at(k).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}
export const count = (seen: string[], kind: string) => seen.filter((s) => s === kind).length;
/** Steps until `done` (at most `secs`). */
export function until(f: Fight, done: () => boolean, secs: number) {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs) && !done(); i++) seen.push(...run(f, DT).seen);
  return seen;
}
export function warnOf(f: Fight, move: number) {
  f.e.move = move;
  f.e.shots = 0;
  setPhase(f.e, 'windup');
}
/** Under the water, circling. */
export function under(f: Fight) {
  f.e.pos.y = f.e.prev.y = -v.kingHeight;
  f.e.move = CRUISE;
  setPhase(f.e, 'burrow');
}
/** Its next picks (`n` of them), as move numbers. */
export function picks(f: Fight, n: number, set: () => void) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    set();
    f.e.cooldown = 0;
    run(f, DT);
    out.push(f.e.move);
  }
  return out;
}
