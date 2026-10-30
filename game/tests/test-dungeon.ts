// Update 0.0.12 — the dungeon (the designer: hand-made rooms, at least 8, with variations; a floor plan different every
// run; step in, the doors shut, enemies come). The rooms are well formed; a floor's plan is a winding way of five
// fight rooms with side rooms, every room and spawn reachable, the same for the same seed and different between
// seeds; the level built from it stands up; the room loop shuts the gates, sends its waves, opens them, and the way
// down ends the floor.
// Update 0.0.15 — the way ends in the boss room (no exit room): its wooden gate in the far wall, the dark beyond it on
// empty ground, walled round; the gate is one more gate.
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
import { buyWave, createDungeonRun, roomCount, stepRooms, FIRST_WAVE } from '../src/sim/dungeon/roomLoop';
import { MINI_BOSSES } from '../src/sim/enemies/kinds';
import { ROOMS } from '../src/tuning/rooms';
import { createPlayer } from '../src/sim/player/state';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { CELL, cellAt, cellX, cellZ, colAt, FloorPlan, GRID, MAX_ROOM, pathFights, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { DARK_DEPTH, OPPOSITE } from '../src/world/dungeon/wayOut';
import { BOSS_ROOM, Cell, FIGHT_ROOMS, layOut, SHOP_ROOM, START_ROOM } from '../src/world/dungeon/rooms';
import { CORE_INSET, dress, KIT } from '../src/world/dungeon/dressing';
import { HEIGHT } from '../src/world/dungeon/assemble';
import { buildNavGrid, colOf, freeAt, rowOf } from '../src/world/navGrid';

section('Dungeon — the rooms');
{
  check(`at least 8 fight rooms (${FIGHT_ROOMS.length})`, FIGHT_ROOMS.length >= 8 && new Set(FIGHT_ROOMS.map((r) => r.id)).size === FIGHT_ROOMS.length);
  for (const t of [...FIGHT_ROOMS, START_ROOM, BOSS_ROOM, SHOP_ROOM]) {
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
// (Update 0.0.20 — nor lava: every floor cell must be reachable round the pits.)
const passable = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'column' && c !== 'high' && c !== 'highLedge' && c !== 'lava';

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
  const PATH_FIGHTS = pathFights(1);
  const way = plan.rooms.filter((r) => r.depth <= PATH_FIGHTS + 1 && r.kind !== 'fight' || r.depth <= PATH_FIGHTS);
  check(`a start, ${PATH_FIGHTS} fight rooms on the way and the boss room`, plan.rooms[0].kind === 'start' && plan.rooms[PATH_FIGHTS + 1].kind === 'boss' && plan.rooms.slice(1, PATH_FIGHTS + 1).every((r) => r.kind === 'fight') && way.length >= 7);
  const sides = plan.rooms.length - (PATH_FIGHTS + 2);
  // Update 0.0.13 — the shop, and maybe a fight. Update 0.1.20 — and the challenge room.
  check('and side rooms: the shop, maybe a fight, the challenge room', sides >= 2 && sides <= 3 && plan.rooms.slice(PATH_FIGHTS + 2).some((r) => r.kind === 'shop') && plan.rooms.slice(PATH_FIGHTS + 2).some((r) => r.challenge), `${sides}`);
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
  // (Update 0.2.2 — on all 7 floors: the longer ways deeper down.)
  let bad = '';
  for (let seed = 1; seed <= 56 && !bad; seed++) {
    const plan = planFloor(seed, 1 + (seed % 7));
    const seen = reach(plan);
    for (const r of plan.rooms) {
      for (let row = 0; row < r.layout.h; row++) for (let col = 0; col < r.layout.w; col++) {
        const c = cellAt(plan, r.x0 + col, r.z0 + row);
        if ((c === 'floor' || c === 'pad') && !seen[(r.z0 + row) * GRID + r.x0 + col]) bad ||= `seed ${seed}: in room ${r.index} (${r.layout.template.id}) cell ${col},${row} is cut off`;
      }
    }
    const level = buildDungeon(plan);
    for (const room of level.rooms) {
      if (room.kind !== 'fight' && room.kind !== 'boss') continue;
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
  check('56 floors (all 7): every floor cell of every room reachable, every spawn point free, no pocket the grunts cannot reach', !bad, bad);
}
{
  // Update 0.0.15 — the dark beyond the boss room's wooden gate: opposite its door, on ground nothing else uses, walled
  // round, reached through the gate.
  let bad = '';
  for (let seed = 1; seed <= 70 && !bad; seed++) {
    const plan = planFloor(seed * 7, 1 + (seed % 7));
    const o = plan.wayOut;
    const r = plan.rooms[o.room];
    if (r.kind !== 'boss' || r.doors.length !== 1 || o.side !== OPPOSITE[r.doors[0]]) bad ||= `seed ${seed}: the gate isn't opposite the boss room's door`;
    let dark = 0;
    for (let row = o.z0; row <= o.z1; row++) for (let col = o.x0; col <= o.x1; col++) dark += cellAt(plan, col, row) === 'dark' ? 1 : 0;
    if (dark !== 2 * DARK_DEPTH) bad ||= `seed ${seed}: ${dark} dark cells`;
    // Nothing else stands there: no room (walls included) and no corridor (walls included) overlaps it.
    const overlaps = (x0: number, z0: number, x1: number, z1: number) => o.x0 <= x1 && o.x1 >= x0 && o.z0 <= z1 && o.z1 >= z0;
    for (const q of plan.rooms) if (overlaps(q.x0 - 1, q.z0 - 1, q.x0 + q.layout.w, q.z0 + q.layout.h)) bad ||= `seed ${seed}: the dark runs into room ${q.index}`;
    for (const c of plan.corridors) if (overlaps(c.x0 - 1, c.z0 - 1, c.x1 + 1, c.z1 + 1)) bad ||= `seed ${seed}: the dark runs into a corridor`;
    // Walled round: every neighbour of a dark cell is dark, the doorway or wall.
    for (let row = o.z0 - 1; row <= o.z1 + 1; row++) for (let col = o.x0 - 1; col <= o.x1 + 1; col++) {
      const c = cellAt(plan, col, row);
      if (c !== 'dark' && c !== 'wall' && c !== 'door') bad ||= `seed ${seed}: a ${c} beside the dark`;
    }
    const seen = reach(plan);
    if (!seen[o.z0 * GRID + o.x0] && !seen[o.z1 * GRID + o.x1]) bad ||= `seed ${seed}: the dark can't be reached`;
  }
  check('70 floors (all 7): the dark beyond the wooden gate is opposite the door, on empty ground, walled round, reachable', !bad, bad);
}

section('Dungeon — the level');
{
  const level = buildDungeon(planFloor(77, 1));
  const s = level.arena.playerStart;
  const startCell = cellAt(level.plan, colAt(s.x), rowAt(s.z));
  check('you start on open floor in the start room', startCell === 'floor' && level.plan.rooms[0].kind === 'start');
  const inBox = level.arena.boxes.some((b) => b.kind !== 'floor' && Math.abs(s.x - b.x) < b.w / 2 && Math.abs(s.z - b.z) < b.d / 2);
  check('nothing stands where you start', !inBox);
  // (Update 0.2.0 — then a box for each chest that rises: the challenge room's and the boss's. Update 0.2.1 — every
  // chest rises.)
  const rising = level.chests.filter((c) => c.rises).length;
  check('a gate for every doorway, the wooden gate, and each rising chest', level.gates.length === level.plan.links.length * 2 + 1 + rising && level.boss.gate === level.plan.links.length * 2 && rising === level.chests.length);
  // (Update 0.0.15 — 1000, was 900: the boss room's twelve pillars and the dark's walls. Update 0.1.20 — 1150: the
  // challenge room.)
  check('cells merged into a manageable number of boxes', level.arena.boxes.length < 1150, `${level.arena.boxes.length} boxes`);
  const exitCell = cellAt(level.plan, colAt(level.exit.x - 0.5), rowAt(level.exit.z - 0.5));
  check('the way down is the dark beyond the boss room', exitCell === 'dark' && level.rooms[level.boss.room].kind === 'boss');
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
  check('the start room is calm (only the wooden gate shut)', run.current === 0 && !run.shut.some((s, i) => s && i !== level.boss.gate) && !combat.enemies.some(isLive));
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
  check(`then the first wave comes, at least ${ROOMS.v.fieldMin} (Update 0.1.0)`, first.length >= Math.min(ROOMS.v.fieldMin, r1.total) && seen.includes('enemySpawn'), `${first.length} enemies`);
  check(`none closer than 6 m to you`, first.every((e) => Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) >= 6 - 1e-6));
  // Update 0.1.0 (the designer: never fewer than 5 on the field, constant pressure; it was waves that waited for the last
  // one to die) — kill them one at a time: while the room has more to send, the field is kept full.
  let thin = '';
  let kills = 0;
  for (let k = 0; k < 300 && r1.state === 'fighting'; k++) {
    const live = combat.enemies.filter(isLive);
    const more = r1.total - r1.sent;
    if (more > 0 && live.length < ROOMS.v.fieldMin) thin ||= `${live.length} fighting with ${more} still to come`;
    if (live.length) {
      hitEnemy(live[0], 1e6, 0, 0, 1);
      live[0].alive = false;
      kills++;
    }
    tick(ROOMS.v.reinforceGap + 0.05);
  }
  check(`while it has more to send, at least ${ROOMS.v.fieldMin} are fighting`, !thin, thin);
  check(`once all ${r1.total} are sent and dead, the room is cleared and its gates open`, kills === r1.total && r1.state === 'cleared' && fight.gates.every((g) => !run.shut[g]) && seen.includes('gatesOpen'));
  const before = seen.length;
  tick(1);
  check('a cleared room stays quiet', !seen.slice(before).includes('gatesShut'));
  p.pos.set(level.exit.x, 0, level.exit.z);
  tick(DT);
  check('the way down stays shut while the boss lives (test-boss.ts opens it)', !run.exited && !seen.includes('floorExit'));
}
{
  // Update 0.1.1 (the designer: floor 1 starts at 8 and then 11; floor 2 at 11 then 14, and so on) — counts, not budgets.
  check('floor 1: 8, 11, 14, 17, 20 enemies along the way', [1, 2, 3, 4, 5].map((d) => roomCount(d, 1)).join() === '8,11,14,17,20');
  // Update 0.1.16 (the designer: "2 more enemies every 2 floors, starting with floor 2"; it was 3 more every floor).
  check('floor 2 starts at 10, then 13; floor 3 the same as floor 2', roomCount(1, 2) === 10 && roomCount(2, 2) === 13 && roomCount(1, 3) === 10);
  const firsts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => roomCount(1, f)).join();
  check(`floors 1 to 10 start at ${firsts.replace(/,/g, ', ')}`, firsts === '8,10,10,12,12,14,14,16,16,18');
  check(`floor 10’s last fight room: ${roomCount(5, 10)}`, roomCount(5, 10) === 30);
  let off = '';
  let bigs = 0;
  for (let seed = 1; seed <= 12; seed++) {
    for (const floor of [1, 2, 3]) {
      for (const r of planFloor(seed, floor).rooms) {
        if (r.kind !== 'fight') continue;
        const n = r.waves.flat().length;
        // (Update 0.1.20 — a challenge room: Challenge: more enemies on top.)
        const want = roomCount(r.depth, floor) + (r.challenge ? ROOMS.v.challengeExtra : 0);
        if (n !== want) off ||= `seed ${seed} floor ${floor} room ${r.index}: ${n}, not ${want}`;
        bigs = Math.max(bigs, r.waves.flat().filter((k) => MINI_BOSSES.includes(k)).length);
      }
    }
  }
  check('every fight room sends exactly its count (floor 3’s perched spitters among them)', !off, off);
  check(`never more than ${ROOMS.v.bigMax} mini bosses in a room`, bigs <= ROOMS.v.bigMax, `${bigs}`);
  const early = buyWave(20, 1, 1, createRng(1));
  check('no brutes in the first rooms of floor 1', !early.includes('brute'));
  // (Update 0.0.18 — floor 2 has no brutes: floor 1's last room.)
  const late = Array.from({ length: 20 }, (_, i) => buyWave(20, 5, 1, createRng(i))).flat();
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
  // (Update 0.0.15 — the wooden gate has no bars: engine/boss/woodGate.ts draws it.)
  check('the bars stand where the gates block', look.gates.length === level.plan.links.length * 2 && aligned);
  // Update 0.0.13 — day time (the designer: far too dark): a light sky, a sun with shadows following you, a bright sky
  // light, the haze far off.
  const scene = new THREE.Scene();
  const view = new DungeonView(scene, level, false);
  view.update(0, createDungeonRun(level), new THREE.Vector3(10, 1.6, -20));
  const sky = scene.background as THREE.Color;
  const sun = view.group.children.find((o): o is THREE.DirectionalLight => o instanceof THREE.DirectionalLight);
  const fill = view.group.children.find((o): o is THREE.HemisphereLight => o instanceof THREE.HemisphereLight);
  const fog = scene.fog as THREE.Fog;
  check('day time: a light sky, the haze far off', sky.r + sky.g + sky.b > 2 && fog.near >= 40);
  check('a sun overhead, its shadows round you', !!sun && sun.castShadow && sun.intensity >= 2 && sun.position.y > 50 && Math.hypot(sun.target.position.x - 10, sun.target.position.z + 20) < 1e-6);
  check('a bright sky light filling the shade', !!fill && fill.intensity >= 1);
  // Update 0.0.13 — the designer saw the sky through the walls' corners and feet: solid cores behind the brick faces,
  // and a slab under the floor.
  check('the walls and ledges are solid inside, and the floor has a slab under it', view.group.children.some((o) => o instanceof THREE.InstancedMesh && o.count === look.cores.length) && view.group.children.some((o) => o instanceof THREE.Mesh && o.position.y < -0.3 && o.position.y > -1));
  view.dispose();
  const solid = (c: Cell) => c === 'wall' || c === 'ledge' || c === 'highLedge';
  const inside = (b: { x: number; z: number; w: number; d: number }, x: number, z: number) => Math.abs(x - b.x) <= b.w / 2 + 1e-6 && Math.abs(z - b.z) <= b.d / 2 + 1e-6;
  let unfilled = 0;
  let poking = 0;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (!solid(cellAt(level.plan, col, row))) continue;
      const x = cellX(col);
      const z = cellZ(row);
      const core = look.cores.find((b) => inside(b, x, z));
      if (!core || core.y - core.h / 2 > -0.4) {
        unfilled++;
        continue;
      }
      // Towards lower ground (where the brick faces are) it stays behind them; towards more wall it reaches the edge.
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = cellAt(level.plan, col + dc, row + dr);
        const edge = dc !== 0 ? core.x + (dc * core.w) / 2 : core.z + (dr * core.d) / 2;
        const boundary = (dc !== 0 ? x : z) + ((dc || dr) * CELL) / 2;
        const back = (boundary - edge) * (dc || dr);
        const faced = n !== 'void' && n !== 'wall' && n !== 'door' && n !== 'dark' && !(solid(n) && (HEIGHT[n] ?? 0) >= (HEIGHT[cellAt(level.plan, col, row)] ?? 0));
        if (faced ? back < CORE_INSET - 1e-6 : back > 1e-6) poking++;
      }
    }
  }
  check('every wall and ledge cell is filled, set back behind its faces and flush with the walls beside it', unfilled === 0 && poking === 0, `${unfilled} unfilled, ${poking} sides wrong`);
}
