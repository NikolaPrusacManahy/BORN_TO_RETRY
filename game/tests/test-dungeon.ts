// Update 0.0.12 — the dungeon (the designer: hand-made rooms, at least 8, with variations; a floor plan different every
// run; step in, the doors shut, enemies come). The rooms are well formed; a floor's plan is a winding way of five
// fight rooms with side rooms, every room and spawn reachable, the same for the same seed and different between
// seeds; the level built from it stands up; the room loop shuts the gates, sends its waves, opens them, and the way
// down ends the floor.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { DungeonView } from '../src/engine/dungeonView';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createFlow, updateFlow } from '../src/sim/enemies/chase';
import { hitEnemy, isLive } from '../src/sim/enemies/enemy';
import { GRID_RADIUS } from '../src/sim/enemies/kinds';
import { buyWave, createDungeonRun, roomBudget, stepRooms, FIRST_WAVE, NEXT_WAVE } from '../src/sim/dungeon/roomLoop';
import { createPlayer } from '../src/sim/player/state';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { cellAt, colAt, FloorPlan, GRID, MAX_ROOM, PATH_FIGHTS, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { Cell, EXIT_ROOM, FIGHT_ROOMS, layOut, SHOP_ROOM, START_ROOM } from '../src/world/dungeon/rooms';
import { dress, KIT } from '../src/world/dungeon/dressing';
import { buildNavGrid, colOf, freeAt, rowOf } from '../src/world/navGrid';

section('Dungeon — the rooms');
{
  check(`at least 8 fight rooms (${FIGHT_ROOMS.length})`, FIGHT_ROOMS.length >= 8 && new Set(FIGHT_ROOMS.map((r) => r.id)).size === FIGHT_ROOMS.length);
  for (const t of [...FIGHT_ROOMS, START_ROOM, EXIT_ROOM, SHOP_ROOM]) {
    const w = t.rows[0].length;
    const h = t.rows.length;
    const even = w % 2 === 0 && h % 2 === 0 && t.rows.every((r) => r.length === w);
    // The middle two cells of every side, two deep, are clear for the doors.
    const clear = (ch: string) => ch === '.' || ch === 'E';
    let doors = true;
    for (const k of [w / 2 - 1, w / 2]) for (const d of [0, 1]) doors &&= clear(t.rows[d][k]) && clear(t.rows[h - 1 - d][k]);
    for (const k of [h / 2 - 1, h / 2]) for (const d of [0, 1]) doors &&= clear(t.rows[k][d]) && clear(t.rows[k][w - 1 - d]);
    const spawns = t.rows.join('').split('E').length - 1;
    check(`${t.id}: even and square-edged, doorways clear${t.kind === 'fight' ? `, ${spawns} spawn points` : ''}`, even && doors && (t.kind !== 'fight' || spawns >= 6));
  }
  // Update 0.0.13 — twice the size (the designer): 0.0.12's were 12–16 cells a side, these 24–36 (48–72 m).
  const sizes = FIGHT_ROOMS.map((t) => [t.rows[0].length, t.rows.length]);
  check(`fight rooms twice the size: 24–${MAX_ROOM} cells a side`, sizes.every(([w, h]) => Math.min(w, h) >= 24 && Math.max(w, h) <= MAX_ROOM), sizes.map(([w, h]) => `${w}×${h}`).join(' '));
  check('every fight room has a spot for a chest; the shop has five tiles', FIGHT_ROOMS.every((t) => layOut(t, createRng(1)).chestSpots.length > 0) && layOut(SHOP_ROOM, createRng(1)).tiles.length === 5);
  const a = layOut(FIGHT_ROOMS[0], createRng(3));
  const b = layOut(FIGHT_ROOMS[0], createRng(3));
  check('a room varies by the seed, the same for the same seed', a.cells.join() === b.cells.join());
  const looks = new Set(Array.from({ length: 12 }, (_, i) => layOut(FIGHT_ROOMS[1], createRng(i)).cells.join()));
  check('and differently across seeds (mirrored, turned, cover chosen)', looks.size >= 4, `${looks.size} versions in 12 runs`);
}

/** Cells you can get through on foot (jumping onto 1 m ledges and over crates, not through walls or columns). */
const passable = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'column' && c !== 'high' && c !== 'highLedge';

/** Every cell reachable from the start. */
function reach(plan: FloorPlan): Uint8Array {
  const seen = new Uint8Array(GRID * GRID);
  const q = [rowAt(plan.start.z) * GRID + colAt(plan.start.x)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop()!;
    const c = i % GRID;
    const r = Math.floor(i / GRID);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (r + dr) * GRID + c + dc;
      if (!seen[n] && passable(cellAt(plan, c + dc, r + dr))) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return seen;
}

section('Dungeon — a floor');
{
  const plan = planFloor(12345, 1);
  const way = plan.rooms.filter((r) => r.depth <= PATH_FIGHTS + 1 && r.kind !== 'fight' || r.depth <= PATH_FIGHTS);
  check(`a start, ${PATH_FIGHTS} fight rooms on the way and the way down`, plan.rooms[0].kind === 'start' && plan.rooms[PATH_FIGHTS + 1].kind === 'exit' && plan.rooms.slice(1, PATH_FIGHTS + 1).every((r) => r.kind === 'fight') && way.length >= 7);
  const sides = plan.rooms.length - (PATH_FIGHTS + 2);
  // Update 0.0.13 — the shop, and maybe a fight.
  check('and side rooms: the shop, maybe a fight', sides >= 1 && sides <= 2 && plan.rooms.slice(PATH_FIGHTS + 2).some((r) => r.kind === 'shop'), `${sides}`);
  const slots = new Set(plan.rooms.map((r) => r.slot.join()));
  check('one room per slot', slots.size === plan.rooms.length);
  const fights = plan.rooms.filter((r) => r.kind === 'fight').map((r) => r.layout.template.id);
  check('no fight room twice on a floor', new Set(fights).size === fights.length);
  check('the same seed lays out the same floor', planFloor(12345, 1).cells.join() === plan.cells.join());
  const differ = new Set(Array.from({ length: 8 }, (_, i) => planFloor(1000 + i, 1).rooms.map((r) => r.slot.join() + r.layout.template.id).join('|')));
  check('different seeds, different floors', differ.size === 8);
  check('the next floor down differs too', planFloor(12345, 2).cells.join() !== plan.cells.join());
}
{
  // Many runs: every room's inside reachable from the start, every spawn point free and connected in its room.
  let bad = '';
  for (let seed = 1; seed <= 40 && !bad; seed++) {
    const plan = planFloor(seed, 1 + (seed % 3));
    const seen = reach(plan);
    for (const r of plan.rooms) {
      for (let row = 0; row < r.layout.h; row++) for (let col = 0; col < r.layout.w; col++) {
        const c = cellAt(plan, r.x0 + col, r.z0 + row);
        if ((c === 'floor' || c === 'pad' || c === 'exit') && !seen[(r.z0 + row) * GRID + r.x0 + col]) bad ||= `seed ${seed}: in room ${r.index} (${r.layout.template.id}) cell ${col},${row} is cut off`;
      }
    }
    const level = buildDungeon(plan);
    for (const room of level.rooms) {
      if (room.kind !== 'fight') continue;
      const nav = buildNavGrid(room.arena, GRID_RADIUS.small);
      const flow = createFlow(nav);
      const first = room.spawns[0];
      updateFlow(flow, nav, first.x, first.z);
      const id = plan.rooms[room.index].layout.template.id;
      for (const s of room.spawns) {
        if (!freeAt(nav, s.x, s.z) || flow.dist[rowOf(nav, s.z) * nav.cols + colOf(nav, s.x)] < 0) bad ||= `seed ${seed}: a spawn in room ${room.index} (${id}) is stuck`;
      }
      // No pocket of floor the grunts can't get into (you'd be safe from them there).
      let pockets = 0;
      for (let i = 0; i < nav.blocked.length; i++) if (!nav.blocked[i] && flow.dist[i] < 0) pockets++;
      if (pockets > 0) bad ||= `seed ${seed}: room ${room.index} (${id}) has ${pockets} cells the grunts can't reach`;
    }
  }
  check('40 floors: every floor cell of every room reachable, every spawn point free, no pocket the grunts cannot reach', !bad, bad);
}

section('Dungeon — the level');
{
  const level = buildDungeon(planFloor(77, 1));
  const s = level.arena.playerStart;
  const startCell = cellAt(level.plan, colAt(s.x), rowAt(s.z));
  check('you start on open floor in the start room', startCell === 'floor' && level.plan.rooms[0].kind === 'start');
  const inBox = level.arena.boxes.some((b) => b.kind !== 'floor' && Math.abs(s.x - b.x) < b.w / 2 && Math.abs(s.z - b.z) < b.d / 2);
  check('nothing stands where you start', !inBox);
  check('a gate for every doorway', level.gates.length === level.plan.links.length * 2);
  check('cells merged into a manageable number of boxes', level.arena.boxes.length < 900, `${level.arena.boxes.length} boxes`);
  const exitCell = cellAt(level.plan, colAt(level.exit.x - 0.5), rowAt(level.exit.z - 0.5));
  check('the way down is in the exit room', exitCell === 'exit');
}

section('Dungeon — the room loop');
{
  const level = buildDungeon(planFloor(2024, 1));
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena);
  const p = createPlayer(level.arena.playerStart.x, 0, level.arena.playerStart.z, 0);
  p.grounded = true;
  const rng = createRng(5);
  const seen: string[] = [];
  const tick = (secs: number) => {
    for (let i = 0; i < ticks(secs); i++) {
      stepRooms(run, p, combat, rng, DT);
      for (let e = 0; e < combat.events.length; e++) seen.push(combat.events.at(e).kind);
      combat.events.clear();
    }
  };
  tick(0.1);
  check('the start room is calm', run.current === 0 && !run.shut.some(Boolean) && !combat.enemies.some(isLive));
  const fight = level.rooms[1];
  const r1 = run.rooms[1];
  // Through the doorway: not in yet.
  p.pos.set((fight.min.x + fight.max.x) / 2, 0, (fight.min.z + fight.max.z) / 2);
  tick(DT);
  check('in a fight room, its gates shut', r1.state === 'fighting' && fight.gates.every((g) => run.shut[g]) && seen.includes('gatesShut'));
  check('and its enemies walk its own grid', combat.nav === run.nav[1]);
  tick(FIRST_WAVE * 0.5);
  check('a moment before the first wave', !combat.enemies.some(isLive));
  tick(FIRST_WAVE * 0.6);
  const first = combat.enemies.filter(isLive);
  check('then the first wave comes', first.length > 0 && seen.includes('enemySpawn'), `${first.length} enemies`);
  check(`none closer than 6 m to you`, first.every((e) => Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) >= 6 - 1e-6));
  const waves = r1.waves;
  for (let w = 0; w < waves; w++) {
    for (const e of combat.enemies) if (isLive(e)) hitEnemy(e, 1e6, 0, 0, 1);
    tick(NEXT_WAVE + 0.1);
  }
  check(`after ${waves} waves the room is cleared and its gates open`, r1.state === 'cleared' && fight.gates.every((g) => !run.shut[g]) && seen.includes('gatesOpen'));
  const before = seen.length;
  tick(1);
  check('a cleared room stays quiet', !seen.slice(before).includes('gatesShut'));
  p.pos.set(level.exit.x, 0, level.exit.z);
  tick(DT);
  check('stepping onto the way down ends the floor', run.exited && seen.includes('floorExit'));
}
{
  const a = roomBudget(1, 1);
  const b = roomBudget(5, 1);
  const c = roomBudget(1, 3);
  check('deeper rooms and lower floors bring more', b.budget > a.budget && c.budget > a.budget);
  const early = buyWave(20, 1, 1, createRng(1));
  check('no brutes in the first rooms of floor 1', !early.includes('brute'));
  const late = Array.from({ length: 20 }, (_, i) => buyWave(20, 5, 2, createRng(i))).flat();
  check('later they come', late.includes('brute') && late.includes('spitter') && late.includes('grunt'));
}

section('Dungeon — the look');
{
  // The Modular Dungeon Pack kit (export_dungeon_kit.py): every piece the dressing uses is in it.
  const buf = readFileSync(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const kit = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
  const level = buildDungeon(planFloor(31337, 2));
  const look = dress(level.plan);
  const used = [...new Set(look.pieces.map((p) => p.piece)), KIT.bars];
  const missing = used.filter((name) => !kit.scene.getObjectByName(name));
  check('every piece the floor is dressed with is in the kit', missing.length === 0, missing.join(', '));
  check('a floor is dressed with thousands of pieces, drawn as instances', look.pieces.length > 1500, `${look.pieces.length} pieces`);
  check('torches light every room', level.rooms.every((r) => look.torches.some((t) => t.x > r.min.x - 3 && t.x < r.max.x + 3 && t.z > r.min.z - 3 && t.z < r.max.z + 3)));
  // Each gate's bars stand in its doorway, where its collision box is.
  const aligned = look.gates.every((g) => level.gates.some((b) => Math.abs(b.x - g.x) < 0.01 && Math.abs(b.z - g.z) < 0.01));
  check('the bars stand where the gates block', look.gates.length === level.gates.length && aligned);
  // Update 0.0.13 — day time (the designer: far too dark): a light sky, a sun with shadows following you, a bright sky
  // light, the haze far off.
  const scene = new THREE.Scene();
  const view = new DungeonView(scene, level, false);
  view.update(0, level.gates.map(() => false), new THREE.Vector3(10, 1.6, -20));
  const sky = scene.background as THREE.Color;
  const sun = view.group.children.find((o): o is THREE.DirectionalLight => o instanceof THREE.DirectionalLight);
  const fill = view.group.children.find((o): o is THREE.HemisphereLight => o instanceof THREE.HemisphereLight);
  const fog = scene.fog as THREE.Fog;
  check('day time: a light sky, the haze far off', sky.r + sky.g + sky.b > 2 && fog.near >= 40);
  check('a sun overhead, its shadows round you', !!sun && sun.castShadow && sun.intensity >= 2 && sun.position.y > 50 && Math.hypot(sun.target.position.x - 10, sun.target.position.z + 20) < 1e-6);
  check('a bright sky light filling the shade', !!fill && fill.intensity >= 1);
  view.dispose();
}
