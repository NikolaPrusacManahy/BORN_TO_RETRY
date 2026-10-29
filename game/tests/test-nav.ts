// Update 0.0.11 — grunts and walls (the designer: they ran into walls forever and got stuck inside blocks). The walk
// grid from the Feel Lab; the way round a wall; a grunt never left inside a wall however it's moved; no swing through
// a wall or up at you on a block; every lab spawn finds its way to you.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { EventQueue } from '../src/core/eventQueue';
import type { CombatEvent } from '../src/sim/combat/state';
import { createEnemies, Enemy, hitEnemy, spawnEnemy } from '../src/sim/enemies/enemy';
import { separateEnemies } from '../src/sim/enemies/bodies';
import { RADIUS } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { worldFor, OPEN_WORLD } from './fakes/enemyWorld';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { ENEMIES } from '../src/tuning/enemies';
import { Arena, ArenaBox, boxAt } from '../src/world/arena';
import { FEEL_LAB } from '../src/world/arenas/feelLab';
import { buildNavGrid, freeAt, lineClear, NavGrid, pushOutOfWalls, wallBetween } from '../src/world/navGrid';

const v = ENEMIES.v;
const GRUNT_RADIUS = RADIUS.grunt;
const events = new EventQueue<CombatEvent>(256, 'none');

/** A 40 × 40 m floor with these boxes on it. */
function room(...boxes: ArenaBox[]): Arena {
  return { name: 't', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), ...boxes], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
}

/** How deep a body of the grunt's radius at (x, z) is in the deepest wall (≤ 0: not in one). */
function inWall(nav: NavGrid, x: number, z: number): number {
  let worst = 0;
  for (const f of nav.walls) {
    const dx = Math.max(f.minX - x, 0, x - f.maxX);
    const dz = Math.max(f.minZ - z, 0, z - f.maxZ);
    worst = Math.max(worst, GRUNT_RADIUS - Math.hypot(dx, dz));
  }
  return worst;
}

/** Runs one grunt at the player for up to `secs`; returns when it first winds up (−1: never) and how deep it ever got
 *  into a wall. */
function chase(nav: NavGrid, from: Vector3, p: PlayerState, secs: number) {
  const w = worldFor(events, nav);
  const grunts = createEnemies();
  spawnEnemy(grunts, 'grunt', from, 0);
  const g = grunts[0];
  let deepest = 0;
  for (let i = 0; i < ticks(secs); i++) {
    updateEnemies(grunts, p, w, OPEN_WORLD, DT);
    events.clear();
    deepest = Math.max(deepest, inWall(nav, g.pos.x, g.pos.z));
    if (g.phase === 'windup') return { g, windupAt: (i + 1) * DT, deepest };
  }
  return { g, windupAt: -1, deepest };
}

const MM = 0.001;

section('Nav — the Feel Lab floor');
{
  const nav = buildNavGrid(FEEL_LAB, GRUNT_RADIUS);
  check('the start is open floor', freeAt(nav, 0, 24));
  check('a pillar is blocked', !freeAt(nav, -10, -10));
  check('so is the ground just beside it (a grunt is 0.45 m wide)', !freeAt(nav, -8.8, -10) && freeAt(nav, -8.3, -10));
  check('the 4 m plateau, the ramp and the spike strip are walls to a grunt', !freeAt(nav, 18, -18) && !freeAt(nav, 18, -5) && !freeAt(nav, 19, 15));
  check('so is the slide tunnel (its roof is lower than a grunt)', !freeAt(nav, 20, 5));
  check('the ledge 13 m up blocks nothing under it', freeAt(nav, -21.5, 15));
  check('a clear line across open floor', lineClear(nav, 0, 24, 0, 12));
  check('no clear line through a pillar', !lineClear(nav, -10, -14, -10, -6) && wallBetween(nav, -10, -14, -10, -6));
  check('and none past it either: a wall is only "between" when the line crosses it', !wallBetween(nav, -7, -14, -7, -6));
  const inside = new Vector3(-10.2, 0, -10.1);
  pushOutOfWalls(nav, inside, GRUNT_RADIUS);
  check('a body inside a pillar is pushed out of it', inWall(nav, inside.x, inside.z) <= MM, `(${inside.x.toFixed(2)}, ${inside.z.toFixed(2)})`);
}

section('Grunt — round walls');
{
  // A 10 m wall straight between them: it used to run into it forever.
  const nav = buildNavGrid(room(boxAt(-5, 0, -0.5, 10, 3, 1, 'wall')), GRUNT_RADIUS);
  const p = createPlayer(0, 0, 6, 0);
  const r = chase(nav, new Vector3(0, 0, -6), p, 8);
  check('a wall between you: it goes round and reaches you', r.windupAt > 0, r.windupAt > 0 ? `in ${r.windupAt.toFixed(1)} s` : `stuck at (${r.g.pos.x.toFixed(1)}, ${r.g.pos.z.toFixed(1)})`);
  check('never once inside the wall', r.deepest <= MM, `${(r.deepest * 100).toFixed(1)} cm deep`);
}
{
  // A U-shaped pen open away from you: it has to go back out to come round.
  const nav = buildNavGrid(room(boxAt(-4, 0, 2, 8, 3, 1, 'wall'), boxAt(-4, 0, -4, 1, 3, 6, 'wall'), boxAt(3, 0, -4, 1, 3, 6, 'wall')), GRUNT_RADIUS);
  const p = createPlayer(0, 0, 8, 0);
  const r = chase(nav, new Vector3(0, 0, 0), p, 10);
  check('trapped in a pen facing you: it backs out and comes round', r.windupAt > 0 && r.deepest <= MM, r.windupAt > 0 ? `in ${r.windupAt.toFixed(1)} s` : `stuck at (${r.g.pos.x.toFixed(1)}, ${r.g.pos.z.toFixed(1)})`);
}
{
  // Behind a thin wall in reach: no swing through it.
  const nav = buildNavGrid(room(boxAt(-3, 0, -0.15, 6, 3, 0.3, 'wall')), GRUNT_RADIUS);
  const p = createPlayer(0, 0, 0.65, 0);
  const grunts = createEnemies();
  spawnEnemy(grunts, 'grunt', new Vector3(0, 0, -0.65), 0);
  updateEnemies(grunts, p, worldFor(events, nav), OPEN_WORLD, DT);
  events.clear();
  check('in reach but behind a wall: no wind-up, it heads round', grunts[0].phase === 'chase');
}

section('Grunt — never stuck in a wall');
{
  const nav = buildNavGrid(room(boxAt(-1, 0, -1, 2, 3, 2, 'block')), GRUNT_RADIUS);
  const w = worldFor(events, nav);
  const p = createPlayer(0, 0, 10, 0);
  const grunts = createEnemies();
  spawnEnemy(grunts, 'grunt', new Vector3(0.2, 0, 0.1), 0);
  updateEnemies(grunts, p, w, OPEN_WORLD, DT);
  check('one that finds itself inside a block is out of it the next tick', inWall(nav, grunts[0].pos.x, grunts[0].pos.z) <= MM);
  // Knocked hard into the block.
  const g = grunts[0];
  g.pos.set(0, 0, 2);
  hitEnemy(g, 1, 40, 0, -1);
  let deepest = 0;
  for (let i = 0; i < ticks(1); i++) {
    updateEnemies(grunts, p, w, OPEN_WORLD, DT);
    deepest = Math.max(deepest, inWall(nav, g.pos.x, g.pos.z));
  }
  events.clear();
  check('knocked hard into a block, it stops at its face', deepest <= MM, `${(deepest * 100).toFixed(1)} cm deep`);
  // Two squeezed together against it: pushing apart never pushes one in.
  const two: Enemy[] = createEnemies();
  spawnEnemy(two, 'grunt', new Vector3(0, 0, 1.46), 0);
  spawnEnemy(two, 'grunt', new Vector3(0, 0, 1.5), 0);
  separateEnemies(two, w.nav);
  check('grunts pushed apart against a block stay out of it', inWall(nav, two[0].pos.x, two[0].pos.z) <= MM && inWall(nav, two[1].pos.x, two[1].pos.z) <= MM);
}
{
  // You up on a block (out of its reach): it waits at the foot, never climbing in.
  const nav = buildNavGrid(room(boxAt(-3, 0, -3, 6, 2, 6, 'block')), GRUNT_RADIUS);
  const p = createPlayer(0, 2, 0, 0);
  const r = chase(nav, new Vector3(0, 0, -12), p, 6);
  const near = Math.hypot(r.g.pos.x, r.g.pos.z);
  check('you on a block: it comes to the foot and waits there, no swing', r.windupAt < 0 && near < 4.5 && r.deepest <= MM, `${near.toFixed(1)} m from you`);
}

section('Grunt — the Feel Lab');
{
  // Every spawn point finds its way to you at the start, and at a spot behind cover.
  const nav = buildNavGrid(FEEL_LAB, GRUNT_RADIUS);
  for (const [name, at] of [
    ['the start', new Vector3(0, 0, 24)],
    ['behind the low cover', new Vector3(-4.5, 0, -1.5)],
    ['between the pillars', new Vector3(-10, 0, 0)],
  ] as const) {
    const p = createPlayer(at.x, at.y, at.z, 0);
    const results = FEEL_LAB.spawns.map((s) => chase(nav, new Vector3(s.x, s.y, s.z), p, 15));
    const stuck = results.filter((r) => r.windupAt < 0);
    const deepest = Math.max(...results.map((r) => r.deepest));
    check(`you at ${name}: grunts from every spawn reach you`, stuck.length === 0, stuck.map((r) => `stuck at (${r.g.pos.x.toFixed(1)}, ${r.g.pos.z.toFixed(1)})`).join(' '));
    check(`  and none ever gets into a wall`, deepest <= MM, `${(deepest * 100).toFixed(1)} cm`);
  }
  check(`(a grunt's reach is ${v.gruntReach} m)`, v.gruntReach > 0);
}
