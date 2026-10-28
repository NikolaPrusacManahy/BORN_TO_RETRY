// Update 0.0.13 — the Leaper, the Stinger and the Wraith (the designer: three more enemies, two of them flying, and one
// on the ground that causes problems). The leaper warns, leaps in an arc to where you stood and hurts you on landing
// (unless you jumped), then is stuck a moment; it backs off when you're close; it doesn't leap through a tall wall; a
// hit knocks it out of the air. The stinger climbs to its height, warns, dives through you once, and ends low and
// dazed; never through a wall. The wraith floats at its height, keeps its distance, warns, then casts a fan of orbs
// at you; a hit cancels it. Fliers find their way over low things; the rooms send the new kinds from their rooms on.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';
import { updateOrbs } from '../src/sim/combat/orbs';
import type { CombatEvent } from '../src/sim/combat/state';
import { slamImpact } from '../src/sim/combat/slamHit';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { ENEMIES } from '../src/tuning/enemies';
import { FEEL_LAB } from '../src/world/arenas/feelLab';
import { buyWave } from '../src/sim/dungeon/roomLoop';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { GRID_RADIUS } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import type { CollisionWorld } from '../src/sim/collisionWorld';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { FOES } from '../src/tuning/foes';
import { Arena, boxAt } from '../src/world/arena';
import { AIR, buildNavGrid, freeAt } from '../src/world/navGrid';

const v = FOES.v;
const events = new EventQueue<CombatEvent>(256, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  e: Enemy;
}

function fight(kind: Enemy['kind'], at: Vector3, arena?: Arena): Fight {
  const w = arenaWorld(events, arena);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  spawnEnemy(all, kind, at, Math.atan2(at.x, at.z));
  // Ready to attack at once (a new enemy waits a second).
  all[0].cooldown = 0;
  events.clear();
  return { w, p, all, e: all[0] };
}

/** Ticks for `secs`; returns the events, when you were first hurt (−1: never) and the highest the enemy got. */
function run(f: Fight, secs: number, world: CollisionWorld = OPEN_WORLD, each?: (i: number) => void) {
  const seen: string[] = [];
  let hurtAt = -1;
  let top = -Infinity;
  for (let i = 0; i < ticks(secs); i++) {
    each?.(i);
    const hp = f.p.hp;
    updateEnemies(f.all, f.p, f.w, world, DT);
    updateOrbs(f.w.orbs, f.p, new FlatWorld(), events, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    seen.push(...kinds());
    events.clear();
    top = Math.max(top, f.e.pos.y);
    if (f.p.hp < hp && hurtAt < 0) hurtAt = (i + 1) * DT;
  }
  return { seen, hurtAt, top };
}

section('Leaper');
{
  const f = fight('leaper', new Vector3(0, 0, -9));
  const r = run(f, v.leaperWindup * 0.8);
  check('in range, it crouches first (the warning)', r.seen.includes('leaperWindup') && !r.seen.includes('leaperLeap'));
  const leap = run(f, v.leaperWindup * 0.2 + v.leaperAir + 0.1);
  check('then leaps in an arc', leap.seen.includes('leaperLeap') && near(leap.top, v.leaperArc, 0.15), `top ${leap.top.toFixed(2)} m`);
  check('and lands where you stood, hurting you', leap.seen.includes('leaperLand') && leap.hurtAt > 0 && Math.hypot(f.e.pos.x, f.e.pos.z) < 0.6 && f.e.pos.y === 0);
  const at = f.e.pos.clone();
  f.p.pos.set(0, 0, 8);
  run(f, v.leaperRecover * 0.8);
  check('then it is stuck a moment (your opening)', f.e.phase === 'recover' && f.e.pos.distanceTo(at) < 0.05);
}
{
  const f = fight('leaper', new Vector3(0, 0, -9));
  run(f, v.leaperWindup + 0.05);
  // You jump just before it lands.
  const r = run(f, v.leaperAir + 0.1, OPEN_WORLD, (i) => {
    if (i * DT > v.leaperAir - 0.15) f.p.pos.y = 1.5;
  });
  check('a jump clears its landing', r.seen.includes('leaperLand') && r.hurtAt < 0);
}
{
  const f = fight('leaper', new Vector3(0, 0, -2));
  f.e.cooldown = 5;
  const before = Math.hypot(f.e.pos.x, f.e.pos.z);
  run(f, 0.5);
  check('too close, it backs off for room to leap', Math.hypot(f.e.pos.x, f.e.pos.z) > before + 1);
}
{
  // A tall wall between you: it runs round instead of leaping through it.
  const wall: Arena = { name: 'w', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(-4, 0, -5, 8, 6, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const f = fight('leaper', new Vector3(0, 0, -10), wall);
  const r = run(f, 0.4);
  check('never through a tall wall', !r.seen.includes('leaperWindup'));
  // Low cover between you doesn't stop it.
  const low: Arena = { name: 'l', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(-2, 0, -5, 4, 1.3, 1, 'block')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const g = fight('leaper', new Vector3(0, 0, -10), low);
  check('but over low cover', run(g, 0.2).seen.includes('leaperWindup'));
}
{
  const f = fight('leaper', new Vector3(0, 0, -9));
  run(f, v.leaperWindup + v.leaperAir * 0.5);
  check('(mid-leap)', f.e.phase === 'leap' && f.e.pos.y > 1);
  hitEnemy(f.e, 5, 0, 0, 1);
  run(f, 0.6);
  check('a hit knocks it out of the air: it drops', f.e.pos.y === 0 && f.e.phase !== 'leap');
}

section('Stinger');
{
  const f = fight('stinger', new Vector3(0, 0, -20));
  f.e.cooldown = 99;
  run(f, 1.5);
  check(`it climbs to its height (${v.stingerAlt} m)`, near(f.e.pos.y, v.stingerAlt, 0.05));
  f.e.cooldown = 0;
  const r = run(f, 3);
  check('in range it warns first', r.seen.indexOf('stingerWindup') >= 0 && r.seen.indexOf('stingerWindup') < r.seen.indexOf('stingerDive'));
  check('then dives through you, once', r.hurtAt > 0 && f.p.hp === 100 - v.stingerDamage);
}
{
  const f = fight('stinger', new Vector3(0, v.stingerAlt, -8));
  const r = run(f, v.stingerWindup * 0.8);
  check('(winding up)', r.seen.includes('stingerWindup') && f.e.phase === 'windup');
  run(f, 1);
  check('a dive ends low and dazed (your opening)', f.e.phase === 'recover' && f.e.pos.y < 1);
}
{
  // A wall between it and you (the plane x = 3, it on the far side).
  const world = new FlatWorld();
  world.walls.push({ x: 3, normalX: -1 });
  const f = fight('stinger', new Vector3(6, v.stingerAlt, 0));
  // (Not long enough to fly past the wall: this test's walk grid doesn't know about it.)
  const r = run(f, 0.25, world);
  check('never dives without a clear line', !r.seen.includes('stingerWindup') && f.p.hp === 100);
}
{
  const f = fight('stinger', new Vector3(0, v.stingerAlt, -8));
  run(f, v.stingerWindup * 0.5);
  hitEnemy(f.e, 5, 0, 0, 1);
  const r = run(f, 0.3);
  check('a hit cancels its dive', !r.seen.includes('stingerDive'));
}
{
  // Up there your ground slam doesn't reach it.
  const s = createCombat({ name: 'o', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] });
  spawnEnemy(s.enemies, 'stinger', new Vector3(1, v.stingerAlt, 0), 0);
  slamImpact(s, new Vector3(0, 0, 0), 4);
  check('a ground slam doesn’t reach a flier up high', s.enemies[0].hp === v.stingerHp);
  hitEnemy(s.enemies[0], 1e6, 0, 0, 1);
  const f: Fight = { w: arenaWorld(events), p: createPlayer(0, 0, 0, 0), all: s.enemies, e: s.enemies[0] };
  run(f, 0.6);
  check('a dead flier falls', f.e.pos.y === 0);
}

section('Wraith');
{
  const f = fight('wraith', new Vector3(0, 0, -14));
  f.e.cooldown = 99;
  run(f, 1.5);
  check(`it floats at its height (${v.wraithAlt} m)`, near(f.e.pos.y, v.wraithAlt, 0.05));
  f.e.cooldown = 0;
  const r = run(f, v.wraithWindup + 0.1);
  check('it warns, then casts', r.seen.indexOf('wraithWindup') >= 0 && r.seen.indexOf('wraithWindup') < r.seen.indexOf('wraithCast'));
  const orbs = f.w.orbs.filter((o) => o.alive);
  check(`a fan of ${v.wraithOrbs} orbs`, orbs.length === v.wraithOrbs);
  const yaws = orbs.map((o) => Math.atan2(o.vel.x, o.vel.z)).sort((a, b) => a - b);
  check('spread across', near(yaws[yaws.length - 1] - yaws[0], ((v.wraithOrbs - 1) * v.wraithSpread * Math.PI) / 180, 0.05));
  check('down at you', orbs.every((o) => o.vel.y < 0) && orbs.some((o) => Math.abs(Math.atan2(o.vel.x, o.vel.z)) < 0.05));
  const hit = run(f, 3);
  check('the middle orb hits you standing still', hit.hurtAt > 0);
}
{
  const f = fight('wraith', new Vector3(0, v.wraithAlt, -4));
  f.e.cooldown = 99;
  run(f, 1);
  check('too close, it drifts away', Math.hypot(f.e.pos.x, f.e.pos.z) > 6);
}
{
  const f = fight('wraith', new Vector3(0, v.wraithAlt, -12));
  run(f, v.wraithWindup * 0.5);
  hitEnemy(f.e, 5, 0, 0, 1);
  const r = run(f, 0.4);
  check('a hit cancels its cast', !r.seen.includes('wraithCast') && f.w.orbs.every((o) => !o.alive));
}

section('Leaper and fliers in the lab');
{
  const s = createCombat(FEEL_LAB);
  const p = createPlayer(0, 0, 0, 0);
  const world = new FlatWorld();
  for (let i = 0; i < ticks(ENEMIES.v.labWaveDelay + 0.1); i++) {
    stepCombat(s, p, emptyCombatIntent(), world, DT, FEEL_LAB.spawns);
    s.events.clear();
  }
  const count = (k: string) => s.enemies.filter((e) => isLive(e) && e.kind === k).length;
  check('the lab sends leapers, stingers and wraiths too', count('leaper') === v.labLeapers && count('stinger') === v.labStingers && count('wraith') === v.labWraiths);
}

section('Fliers — the way');
{
  const arena: Arena = { name: 'a', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(4, 0, 0, 2, 1.3, 2, 'block'), boxAt(-4, 0, 0, 2, 6, 2, 'wall'), boxAt(0, 0, 6, 2, 4.9, 2, 'block')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const air = buildNavGrid(arena, GRID_RADIUS.air, 0, 0.5, AIR);
  const foot = buildNavGrid(arena, GRID_RADIUS.small);
  check('fliers go over low cover', freeAt(air, 5, 1) && !freeAt(foot, 5, 1));
  check('but round walls and columns', !freeAt(air, -3, 1) && !freeAt(air, 1, 7));
}

section('Fliers and the leaper in the rooms');
{
  const sample = (depth: number, floor: number) => new Set(Array.from({ length: 40 }, (_, i) => buyWave(24, depth, floor, createRng(i))).flat());
  const first = sample(1, 1);
  check('the first room of floor 1: grunts and spitters only', [...first].every((k) => k === 'grunt' || k === 'spitter'));
  const second = sample(2, 1);
  check('from the second room, leapers and stingers', second.has('leaper') && second.has('stinger') && !second.has('wraith') && !second.has('brute'));
  const third = sample(3, 1);
  check('from the third, wraiths and brutes too', third.has('wraith') && third.has('brute'));
  const deep = sample(1, 2);
  check('every kind from floor 2 on', ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith'].every((k) => deep.has(k as Enemy['kind'])));
  check('(they live)', isLive(fight('wraith', new Vector3(0, 0, -5)).e));
}
