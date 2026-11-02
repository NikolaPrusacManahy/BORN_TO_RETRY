// Update 0.3.17 — floor 8 reworked: the Moon (the designer: "BIG REWORK of FLOOR 8 … Sci-fi / moon theme … space sky …
// planet earth … moon gravity … Moon themed levels"; the plan, MD/FLOOR8_MOON_PLAN.md). Its look (moon grey, dust
// everywhere, a black sky of stars with the Earth in it, bright all the same, no torches), its nine rooms (every door
// joined), its set pieces and craters, plants only in their beds; moon gravity (your jumps higher and longer, bodies
// falling slower); its meteor showers (a warning, a strike that hurts and throws, a mark left). (The Forge it was:
// test-forge.ts.)
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, run, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { Meteors, stepMeteors } from '../src/sim/dungeon/meteors';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { beginTick } from '../src/sim/enemies/tick';
import { bossOf } from '../src/sim/enemies/kinds';
import { KINDS6 } from '../src/sim/enemies/kinds6';
import { createPlayer } from '../src/sim/player/state';
import { maxHpOf } from '../src/sim/player/health';
import { causeName } from '../src/screens/deathText';
import { MOON } from '../src/tuning/moon';
import { SpaceSky } from '../src/engine/moon/spaceSky';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { cellX, cellZ, GRID, planFloor } from '../src/world/dungeon/floorPlan';
import { MOON_KIT } from '../src/world/dungeon/moon';
import { MOON_ROOMS } from '../src/world/dungeon/moonRooms';
import { FIGHT_ROOMS, onFloor, RoomTemplate } from '../src/world/dungeon/rooms';
import { styleOf } from '../src/world/dungeon/styles';

const v = MOON.v;
/** What you can't walk through: walls, cover, ledges, set pieces, alien trees. */
const BLOCKED = new Set(['#', 'b', 'p', 'P', 'O', 'd', 'u', 's', 'q', 'y']);
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
/** How light an sRGB colour is (0 black … 1 white). */
const lum = (hex: number) => (((hex >> 16) & 255) + ((hex >> 8) & 255) + (hex & 255)) / 765;

section('Floor 8 — the Moon: its look and rooms');
{
  const look = styleOf(8);
  check('floor 8 is the Moon (floor 7 Frozen Depths, the Forge past it)', look.id === 'moon' && styleOf(7).id === 'frozen' && styleOf(9).id === 'forge');
  check('in space: a black sky; moon gravity; moon dust on every floor cell', look.space === true && lum(look.sky!) < 0.05 && look.lowGravity === true && look.sandFloor === true);
  check('bright all the same: a white sun and a white sky light; the haze pale, not black', look.sun === 0xffffff && look.skyLight === 0xffffff && lum(look.haze!) > 0.6);
  const eight = FIGHT_ROOMS.filter((t) => onFloor(t, 8));
  check('its own nine rooms, and only its own', eight.length === 9 && eight.every((t) => MOON_ROOMS.includes(t)) && MOON_ROOMS.every((t) => !onFloor(t, 7) && !onFloor(t, 9)), eight.map((t) => t.id).join(', '));
  check('every one 28 cells square', MOON_ROOMS.every((t) => t.rows.length === 28 && t.rows.every((r) => r.length === 28)));
  const doors = [`0,14`, `27,14`, `14,0`, `14,27`];
  const cut = MOON_ROOMS.filter((t) => {
    const s = reached(t);
    const spots = t.rows.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === 'E' || ch === 'T' ? [`${r},${c}`] : [])));
    return !doors.every((d) => s.has(d)) || !spots.every((k) => s.has(k));
  });
  check('in each, every door, every spawn and every chest spot joined (round the base, the rocks, the rovers)', cut.length === 0, cut.map((t) => t.id).join(', '));
  const showers = MOON_ROOMS.filter((t) => t.meteors).map((t) => t.id);
  check('three rooms with meteor showers', showers.join() === 'crater field,earthrise,meteor plain', showers.join(', '));
}

section('Floor 8 — the floor laid out');
{
  const kitGlb = readFileSync(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const kit = JSON.parse(kitGlb.subarray(20, 20 + kitGlb.readUInt32LE(12)).toString('utf8')) as { meshes: { name: string }[]; materials: { name: string }[]; images?: unknown[] };
  const inKit = new Set(kit.meshes.map((m) => m.name));
  const used = new Set<string>();
  let plants = 0;
  let offBeds = 0;
  let torches = 0;
  let landers = 0;
  let meteorites = 0;
  const kinds = new Set<string>();
  for (let seed = 1; seed <= 8; seed++) {
    const plan = planFloor(seed, 8);
    const level = buildDungeon(plan);
    const d = dress(plan);
    torches += d.torches.length + d.pieces.filter((p) => /Torch/.test(p.piece)).length;
    for (const p of d.pieces) used.add(p.piece);
    for (const p of level.moon.pieces) kinds.add(p.kind);
    landers += d.pieces.filter((p) => p.piece === MOON_KIT.lander[0]).length;
    meteorites += level.moon.craters.filter((c) => c.meteorite).length;
    const cellOf = (x: number, z: number) => {
      const col = Math.round((x - cellX(0)) / 2);
      const row = Math.round((z - cellZ(0)) / 2);
      return col >= 0 && row >= 0 && col < GRID && row < GRID ? plan.cells[row * GRID + col] : 'void';
    };
    for (const p of d.pieces) {
      if (![...MOON_KIT.plants, ...MOON_KIT.trees].includes(p.piece)) continue;
      plants++;
      if (cellOf(p.x, p.z) !== 'flora' && cellOf(p.x, p.z) !== 'alienTree') offBeds++;
    }
  }
  check('every piece the floor uses is in the dungeon kit', [...used].every((p) => inKit.has(p)), [...used].filter((p) => !inKit.has(p)).join(', '));
  check('the Space Kit’s pieces share one palette, one material (Atlas_Moon), as the Pirate Kit’s do', kit.materials.filter((m) => m.name.startsWith('Atlas')).map((m) => m.name).sort().join() === 'Atlas_Moon,Atlas_Pirate' && kit.images?.length === 2);
  check('the moon base, domes, rovers, solar panels and boulders, as set pieces', ['module', 'dome', 'rover', 'solar', 'boulder'].every((k) => kinds.has(k)), [...kinds].join(', '));
  check('the landing site’s lander; big craters with their meteorites', landers > 0 && meteorites > 0, `${landers} landers, ${meteorites} meteorites`);
  check('alien plants only in the greenhouse’s beds (nothing grows on bare dust)', plants > 0 && offBeds === 0, `${plants} plants, ${offBeds} off their beds`);
  check('no torches (no air for a flame)', torches === 0, `${torches}`);
}

section('Floor 8 — the sky');
{
  const sky = new SpaceSky();
  const kit = new THREE.Group();
  for (const name of ['kit_m_Planet_1', 'kit_m_Planet_7']) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshStandardMaterial());
    o.name = name;
    kit.add(o);
  }
  sky.build(kit);
  const meshes: THREE.Mesh[] = [];
  sky.group.traverse((o) => o instanceof THREE.Mesh && meshes.push(o));
  const stars = sky.group.children.find((o) => o instanceof THREE.Points) as THREE.Points | undefined;
  check('stars, the sun, the Earth and a ringed planet (the Space Kit’s Planet_1 and Planet_7)', !!stars && (stars.geometry.getAttribute('position').count ?? 0) > 1000 && meshes.length >= 4);
  check('none of it in the haze', meshes.every((m) => (m.material as THREE.Material & { fog: boolean }).fog === false));
  const at = new THREE.Vector3(10, 2, -30);
  sky.update(0.1, at);
  check('it stays round you', sky.group.position.equals(at));
  sky.dispose();
}

section('Floor 8 — moon gravity');
{
  const jump = (g: number) => {
    const p = createPlayer(0, 0, 0, 0);
    p.gravity = g;
    const w = new FlatWorld();
    run(p, w, 1);
    run(p, w, 1, () => ({ jumpPressed: true }));
    let top = 0;
    let air = 0;
    for (let i = 0; i < ticks(6) && (air === 0 || !p.grounded); i++) {
      run(p, w, 1);
      top = Math.max(top, p.pos.y);
      air += DT;
    }
    return { top, air };
  };
  const earth = jump(1);
  const moon = jump(v.gravity);
  check(`your jumps go ${(1 / v.gravity).toFixed(1)} times as high (Moon gravity ${v.gravity})`, near(moon.top / earth.top, 1 / v.gravity, 0.06), `${earth.top.toFixed(2)} m → ${moon.top.toFixed(2)} m`);
  check('and hang longer', moon.air > earth.air * 1.4, `${earth.air.toFixed(2)} s → ${moon.air.toFixed(2)} s`);
  const fall = (g: number) => {
    const c = createCombat(OPEN_ARENA);
    const i = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(0, 0, 0), 0);
    const e = c.enemies[i];
    setPhase(e, 'dead');
    e.pos.y = 3;
    let t = 0;
    while (e.pos.y > 0 && t < 5) {
      beginTick(e, c.nav.small, DT, false, g);
      t += DT;
    }
    return t;
  };
  check('a body knocked into the air falls slower', fall(v.gravity) > fall(1) * 1.2, `${fall(1).toFixed(2)} s → ${fall(v.gravity).toFixed(2)} s`);
  check('only on the moon', [1, 2, 3, 4, 5, 6, 7, 9].every((n) => !styleOf(n).lowGravity));
}

section('Floor 8 — meteor showers');
{
  const c = createCombat(OPEN_ARENA);
  c.rng = createRng(3);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const m: Meteors = { rooms: [true, false], clock: 0, falling: [], marks: [] };
  const seen: string[] = [];
  let warned = -1;
  let struck = -1;
  const i = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(1.5, 0, 0), 0);
  const hp = c.enemies[i].hp;
  for (let k = 0; k < ticks(v.meteorEvery + v.meteorWarn + 1) && struck < 0; k++) {
    stepMeteors(m, 0, true, p, c, DT);
    p.pos.set(0, 0, 0);
    c.enemies[i].pos.set(1.5, 0, 0);
    for (let j = 0; j < c.events.length; j++) seen.push(c.events.at(j).kind);
    if (warned < 0 && seen.includes('meteorWarn')) warned = k * DT;
    if (struck < 0 && seen.includes('meteorStrike')) struck = k * DT;
    c.events.clear();
  }
  check(`in a meteor room while it fights, one is called down where you stand; ${v.meteorWarn} s later it strikes`, warned >= 0 && near(struck - warned, v.meteorWarn, 0.05), `warned ${warned.toFixed(2)}, struck ${struck.toFixed(2)}`);
  check(`under it, you’re hurt (${v.meteorDamage}) and thrown`, maxHpOf(p) - p.hp === v.meteorDamage && p.vel.y > 0);
  check(`an enemy near it hurt harder (${v.meteorFoeDamage}, or killed)`, hp - c.enemies[i].hp === v.meteorFoeDamage || c.enemies[i].hp <= 0, `${hp} → ${c.enemies[i].hp}`);
  check('its mark left on the dust', m.marks.length === 1);
  const quiet = (room: number, fighting: boolean) => {
    const q: Meteors = { rooms: [true, false], clock: 0, falling: [], marks: [] };
    for (let k = 0; k < ticks(v.meteorEvery * 3); k++) stepMeteors(q, room, fighting, p, c, DT);
    return q.falling.length === 0 && q.marks.length === 0;
  };
  check('none in a room without them, none once it’s won, none in a corridor', quiet(1, true) && quiet(0, false) && quiet(-1, false));
  check('“A meteor” on the death screen', causeName('meteor') === 'A meteor');
}

section('Floor 8 — stand-ins (its own enemies come next: the plan)');
{
  const roster = rosterOf(8);
  check('its enemies stand in from the dry floors (none of floor 6’s)', roster.length > 0 && roster.every((k) => !(KINDS6 as readonly string[]).includes(k)), roster.join(', '));
  check('its boss stands in (the Velociraptor) till the alien’s model is in', bossOf(8) === 'dino');
}
