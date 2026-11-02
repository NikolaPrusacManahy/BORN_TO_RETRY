// Update 0.3.13 — floor 8, The Forge (the plan for floors 7–10; the designer: "I want all designs to be done first"):
// its look (floor 3's stone sooty and warm), its own nine rooms (floor 8 only), every door joined to every other, its
// belts' rings still rings however a room is turned and mirrored; its presses (they slam on a beat: under one you're
// hurt and thrown out, an enemy is crushed; down, they're in the way), its fire vents (a jet burns you once and throws
// you up), its belts (they carry you, and enemies); all of it holding still while an execution holds the world.
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createMachinery, pressAt, stepMachinery, ventAt } from '../src/sim/dungeon/machinery';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf } from '../src/sim/enemies/kinds';
import { KINDS6 } from '../src/sim/enemies/kinds6';
import { createPlayer } from '../src/sim/player/state';
import { causeName } from '../src/screens/deathText';
import { FORGE_KNOBS } from '../src/tuning/forge';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { cellX, cellZ, GRID, planFloor } from '../src/world/dungeon/floorPlan';
import { cellUnder, Forge, FORGE, noForge, PressSpot } from '../src/world/dungeon/forge';
import { FORGE_ROOMS } from '../src/world/dungeon/forgeRooms';
import { BELT_WAY, FIGHT_ROOMS, layOut, onFloor, RoomTemplate } from '../src/world/dungeon/rooms';
import { styleOf } from '../src/world/dungeon/styles';

const v = FORGE_KNOBS.v;
/** What you can't walk through in a room's drawing. */
const BLOCKED = new Set(['#', 'C', 'b', 'B', 'k', 'L', 'p', 'P', 'U']);

/** Every walkable cell reached from the north door (the room's rows as drawn). */
function reached(t: RoomTemplate): Set<string> {
  const rows = t.rows;
  const seen = new Set<string>();
  const todo: [number, number][] = [[0, rows[0].length / 2]];
  while (todo.length) {
    const [r, c] = todo.pop()!;
    const key = `${r},${c}`;
    if (r < 0 || c < 0 || r >= rows.length || c >= rows[0].length || seen.has(key) || BLOCKED.has(rows[r][c])) continue;
    seen.add(key);
    todo.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
  return seen;
}

section('Floor 8 — The Forge: its look and rooms');
{
  check('floor 8 is The Forge (floor 7 Frozen Depths)', styleOf(8).id === 'forge' && styleOf(7).id === 'frozen' && !styleOf(8).under);
  const eight = FIGHT_ROOMS.filter((t) => onFloor(t, 8));
  check('its own nine rooms, and only its own', eight.length === 9 && eight.every((t) => FORGE_ROOMS.includes(t)) && FORGE_ROOMS.every((t) => !onFloor(t, 7) && !onFloor(t, 9)), eight.map((t) => t.id).join(', '));
  check('every one 28 cells square', FORGE_ROOMS.every((t) => t.rows.length === 28 && t.rows.every((r) => r.length === 28)));
  const doors = (n: number) => [`0,${n / 2}`, `${n - 1},${n / 2}`, `${n / 2},0`, `${n / 2},${n - 1}`];
  const cut = FORGE_ROOMS.filter((t) => {
    const s = reached(t);
    const spawns = t.rows.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === 'E' || ch === 'T' ? [`${r},${c}`] : [])));
    return !doors(28).every((d) => s.has(d)) || !spawns.every((k) => s.has(k));
  });
  check('in each, every door, every spawn and every chest spot joined (round the lava, the benches)', cut.length === 0, cut.map((t) => t.id).join(', '));
  check('each has its machinery or its lava', FORGE_ROOMS.every((t) => /[HV<>vAL]/.test(t.rows.join(''))));
  // A ring of belts: every belt runs onto another — turned and mirrored as a run lays it out, still.
  const rings = FORGE_ROOMS.filter((t) => t.id === 'belt loop' || t.id === 'furnace');
  let broken = 0;
  for (const t of rings) {
    for (let seed = 1; seed <= 12; seed++) {
      const l = layOut(t, createRng(seed));
      const at = new Set(l.belts.map(([c, r]) => `${c},${r}`));
      broken += l.belts.filter(([c, r, dx, dz]) => !at.has(`${c + dx},${r + dz}`)).length;
    }
  }
  check('the belt loop and the furnace ring: every belt runs onto the next, however the room is turned', rings.length === 2 && broken === 0, `${broken} broken`);
  const line = layOut(FORGE_ROOMS.find((t) => t.id === 'foundry line')!, createRng(3));
  const runs = (dx: number) => line.belts.filter(([, , bx]) => bx === dx).length;
  check('the foundry line: its belts run in from both walls', runs(1) > 0 && runs(-1) === runs(1));
  check('a belt’s arrows', BELT_WAY['>'].join() === '1,0' && BELT_WAY.A.join() === '0,-1');
}

const plan = planFloor(41, 8);
const level = buildDungeon(plan);
section('Floor 8 — the floor');
{
  const f = level.forge;
  check('the floor has its presses, vents and belts', f.presses.length > 10 && f.vents.length > 20 && f.belts.length > 40, `${f.presses.length} presses, ${f.vents.length} vents, ${f.belts.length} belt cells`);
  const posts = (p: PressSpot) => level.arena.boxes.filter((b) => b.kind === 'block' && Math.abs(Math.abs(b.x - p.x) - (p.w / 2 - 0.2)) < 0.01 && Math.abs(Math.abs(b.z - p.z) - (p.d / 2 - 0.2)) < 0.01).length;
  check('each press stands in four posts, solid', f.presses.every((p) => posts(p) === 4));
  check('a press’s hammer covers its crusher cells; a vent its own', f.presses.every((p) => cellUnder(plan, p.x - p.w / 2 + 1, p.z - p.d / 2 + 1) === 'crusher') && f.vents.every((x) => cellUnder(plan, x.x, x.z) === 'vent'));
  const dressing = dress(plan);
  check('workbenches with their tables', dressing.pieces.some((p) => p.piece === FORGE.table));
  check('no machinery on another floor', buildDungeon(planFloor(41, 7)).forge.presses.length === 0 && buildDungeon(planFloor(41, 7)).forge.belts.length === 0);
  check('lava again', level.arena.boxes.some((b) => b.kind === 'lava'));
  // (The designer: "Floor 8 is frozen and crashes the entire GAME": the ore came into the kit with shape keys, and an
  // instanced piece with morph targets threw on every frame. Every piece's shape keys come off in the export.)
  const glb = readFileSync(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const kit = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { meshes: { name: string; primitives: { targets?: unknown[] }[] }[] };
  const morphs = kit.meshes.filter((m) => m.primitives.some((pr) => pr.targets)).map((m) => m.name);
  check('no piece of the dungeon kit has morph targets (drawn instanced, they’d throw every frame)', morphs.length === 0 && kit.meshes.some((m) => m.name === 'kit_r_Mineral'), morphs.join(', '));
}

/** A floor with just this machinery. */
const forgeWith = (f: Partial<Forge>): Forge => ({ ...noForge(), ...f });
const PRESS: PressSpot = { x: 0, z: 0, w: 2, d: 2, room: 0, beat: 0 };
const cycle = () => v.pressHang + v.pressWarn + v.pressDrop + v.pressRest + v.pressRise;

section('Floor 8 — presses');
{
  check('it hangs, clanks, drops, rests and rises, in that order', ['hang', 'warn', 'drop', 'rest', 'rise'].every((b, i) => pressAt(PRESS, [0.1, v.pressHang + 0.1, v.pressHang + v.pressWarn + 0.01, v.pressHang + v.pressWarn + v.pressDrop + 0.1, cycle() - 0.3][i]).beat === b));
  check('down, its hammer on the floor; up, at Press height', pressAt(PRESS, v.pressHang + v.pressWarn + v.pressDrop + 0.1).y === 0 && pressAt(PRESS, 0.1).y === v.pressHeight);
  const run = (at: Vector3, secs: number, enemy = false) => {
    const c = createCombat(OPEN_ARENA);
    const p = createPlayer(at.x, at.y, at.z, 0);
    const i = enemy ? spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, 0.1), 0) : -1;
    if (i >= 0) c.enemies[i].hp = 999;
    const m = createMachinery(forgeWith({ presses: [PRESS] }));
    const seen: string[] = [];
    for (let k = 0; k < ticks(secs); k++) {
      stepMachinery(m, p, c, DT);
      for (let j = 0; j < c.events.length; j++) seen.push(c.events.at(j).kind);
      c.events.clear();
    }
    return { p, c, i, seen };
  };
  const under = run(new Vector3(0.1, 0, 0), cycle());
  check(`under it when it lands: hurt (${v.pressDamage}) and thrown out from under it`, under.p.hp === 100 - v.pressDamage && Math.abs(under.p.pos.x) >= 1 - 1e-6, `hp ${under.p.hp}, x ${under.p.pos.x.toFixed(2)}`);
  check('it clanks first, then slams', under.seen.indexOf('pressWarn') >= 0 && under.seen.indexOf('pressWarn') < under.seen.indexOf('pressSlam'));
  const beside = run(new Vector3(2.5, 0, 0), cycle());
  check('beside it: unhurt', beside.p.hp === 100);
  const foe = run(new Vector3(9, 0, 0), cycle(), true);
  check(`an enemy under it is crushed (${v.pressFoes})`, foe.c.enemies[foe.i].hp === 999 - v.pressFoes, `${foe.c.enemies[foe.i].hp}`);
  const far = run(new Vector3(40, 0, 0), cycle());
  check('far off, it isn’t heard', !far.seen.includes('pressSlam'));
  // Down: in the way.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(5, 0, 0, 0);
  const m = createMachinery(forgeWith({ presses: [PRESS] }));
  const toRest = v.pressHang + v.pressWarn + v.pressDrop + 0.05;
  for (let k = 0; k < ticks(toRest); k++) stepMachinery(m, p, c, DT);
  p.pos.set(0.2, 0, 0.1);
  stepMachinery(m, p, c, DT);
  check('resting on the floor, you can’t stand under it', m.presses[0].beat === 'rest' && Math.abs(p.pos.x) >= 1 - 1e-6 && p.hp === 100);
}

section('Floor 8 — fire vents and belts');
{
  const VENT = { x: 0, z: 0, room: 0, beat: 0 };
  check('a vent idles, sputters, jets', ventAt(VENT, 0.1) === 'idle' && ventAt(VENT, v.ventIdle + 0.1) === 'warn' && ventAt(VENT, v.ventIdle + v.ventWarn + 0.1) === 'burn');
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0.3, 0, 0.2, 0);
  const i = spawnEnemy(c.enemies, 'grunt', new Vector3(-0.3, 0, 0), 0);
  c.enemies[i].hp = 999;
  const m = createMachinery(forgeWith({ vents: [VENT] }));
  let popped = false;
  for (let k = 0; k < ticks(v.ventIdle + v.ventWarn + v.ventBurn - 0.05); k++) {
    stepMachinery(m, p, c, DT);
    popped ||= p.vel.y > 0;
    p.pos.set(0.3, 0, 0.2);
    p.vel.set(0, 0, 0);
  }
  check(`standing on it through a jet: burnt once (${v.ventDamage}), thrown up`, p.hp === 100 - v.ventDamage && popped, `hp ${p.hp}`);
  check(`an enemy in it, burnt once (${v.ventFoes})`, c.enemies[i].hp === 999 - v.ventFoes, `${c.enemies[i].hp}`);
  // A belt cell east at the grid's middle.
  const col = GRID / 2;
  const row = GRID / 2;
  const belts = forgeWith({ belts: [{ x: cellX(col), z: cellZ(row), dx: 1, dz: 0 }] });
  belts.beltAt[row * GRID + col] = 1;
  const bc = createCombat(OPEN_ARENA);
  const bp = createPlayer(cellX(col), 0, cellZ(row), 0);
  bp.grounded = true;
  const bm = createMachinery(belts);
  const j = spawnEnemy(bc.enemies, 'grunt', new Vector3(cellX(col) - 0.5, 0, cellZ(row)), 0);
  const from = bc.enemies[j].pos.x;
  stepMachinery(bm, bp, bc, DT);
  check(`on a belt you’re carried its way (${v.beltSpeed} m/s)`, near(bp.current.x, v.beltSpeed, 1e-9) && bp.current.z === 0);
  check('and an enemy on it', near(bc.enemies[j].pos.x - from, v.beltSpeed * DT, 1e-9));
  bp.current.set(0, 0, 0);
  bp.grounded = false;
  bp.pos.y = 2;
  stepMachinery(bm, bp, bc, DT);
  check('in the air over it, not', bp.current.x === 0);
  // An execution holds the world: the machinery waits.
  bc.exec.active = true;
  const t = bm.t;
  stepMachinery(bm, bp, bc, DT);
  check('while an execution holds the world, it all waits', bm.t === t);
}

section('Floor 8 — stand-ins');
{
  const roster = rosterOf(8);
  check('its enemies stand in from the dry floors (none of floor 6’s)', roster.length > 0 && roster.every((k) => !(KINDS6 as readonly string[]).includes(k)), roster.join(', '));
  check('its boss stands in (the Velociraptor)', bossOf(8) === 'dino');
  check('“A press”, “A fire vent” on the death screen', causeName('crusher') === 'A press' && causeName('vent') === 'A fire vent');
}
