// Update 0.3.11 — floor 7, Frozen Depths (the plan for floors 7–10): its look (floor 3's stone frosted), its own nine
// rooms (floor 7 only; floor 6's stop at 6), its snowy trees in beds of snow (never on paving), its sheets of ice (you
// keep sliding on them; a body knocked across one slides far), its icicles (they shake when you come under them, fall,
// and hurt what's under them), its stand-in enemies and boss (dry-land ones, till its own are designed). The run ends
// at floor 6 for now.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createCombat } from '../src/sim/combat/state';
import { createIcicles, stepIcicles } from '../src/sim/dungeon/icicles';
import { iceGrip, onIce } from '../src/sim/dungeon/quicksand';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { createEnemies, spawnEnemy } from '../src/sim/enemies/enemy';
import { fly } from '../src/sim/enemies/flight';
import { bossOf } from '../src/sim/enemies/kinds';
import { KINDS6 } from '../src/sim/enemies/kinds6';
import { groundMove } from '../src/sim/player/ground';
import { createPlayer } from '../src/sim/player/state';
import { FROZEN_KNOBS } from '../src/tuning/frozen';
import { MOVE } from '../src/tuning/movement';
import { buildNavGrid } from '../src/world/navGrid';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { FROZEN } from '../src/world/dungeon/frozen';
import { FROZEN_ROOMS } from '../src/world/dungeon/frozenRooms';
import { CELL, cellAt, GRID, planFloor } from '../src/world/dungeon/floorPlan';
import { FIGHT_ROOMS, onFloor } from '../src/world/dungeon/rooms';
import { styleOf } from '../src/world/dungeon/styles';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const v = FROZEN_KNOBS.v;
/** The cell a point is in. */
const colOf = (x: number) => Math.floor(x / CELL + GRID / 2);
const rowOf = (z: number) => Math.floor(z / CELL + GRID / 2);

section('Floor 7 — Frozen Depths: its look and rooms');
{
  check('floor 7 is Frozen Depths (floor 6 Skull Cove)', styleOf(FLOOR.frozen).id === 'frozen' && styleOf(FLOOR.cove).id === 'cove' && !styleOf(FLOOR.frozen).under);
  const seven = FIGHT_ROOMS.filter((t) => onFloor(t, FLOOR.frozen));
  check(`its own nine rooms, and only its own`, seven.length === 9 && seven.every((t) => FROZEN_ROOMS.includes(t)) && FROZEN_ROOMS.every((t) => !onFloor(t, FLOOR.frozen - 1) && !onFloor(t, FLOOR.frozen + 1)), seven.map((t) => t.id).join(', '));
  check('every one has ice in it', FROZEN_ROOMS.every((t) => t.rows.join('').includes('I')));
}
const plan = planFloor(41, FLOOR.frozen);
const level = buildDungeon(plan);
{
  check('the floor has its sheets of ice and its icicles', level.ice.length > 0 && level.icicles.length > 20, `${level.ice.length} sheets, ${level.icicles.length} icicles`);
  // Every snowy tree stands in a bed of snow (a pine cell: no paving), with a trunk you bump into.
  const dressing = dress(plan);
  const trees = dressing.pieces.filter((p) => FROZEN.trees.includes(p.piece));
  const onBed = trees.every((p) => cellAt(plan, colOf(p.x), rowOf(p.z)) === 'pine');
  check('every snowy tree grows out of a bed of snow, never paving', trees.length > 0 && onBed, `${trees.length} trees`);
  const paved = dressing.pieces.filter((p) => p.piece === styleOf(FLOOR.frozen).floor && ['pine', 'snow'].includes(cellAt(plan, colOf(p.x), rowOf(p.z))));
  check('no paving under the snow', paved.length === 0);
  const pine = trees[0];
  check('a tree’s trunk is solid', !!pine && level.arena.boxes.some((b) => b.kind === 'block' && Math.abs(b.x - pine.x) < 0.01 && Math.abs(b.z - pine.z) < 0.01));
  check('icicles hang only in fight rooms, beside their walls', level.icicles.every((s) => plan.rooms[s.room].kind === 'fight'));
}

section('Floor 7 — the ice');
{
  const p = createPlayer(0, 0, 0, 0);
  const sheet = level.ice[0];
  p.pos.set(sheet.x, 0, sheet.z);
  check(`on ice your grip is Ice grip (${v.iceGrip}); off it, whole`, iceGrip(p, level.ice) === v.iceGrip && (p.pos.set(9999, 0, 9999), iceGrip(p, level.ice)) === 1);
  // Let go from a run: how far until you stop.
  const stop = (grip: number) => {
    const vel = new Vector3(MOVE.v.runSpeed, 0, 0);
    let x = 0;
    for (let k = 0; k < ticks(10) && vel.x > 0.01; k++) {
      groundMove(vel, 0, 0, DT, 1, grip);
      x += vel.x * DT;
    }
    return x;
  };
  check('stopping from a run on ice takes you far further', stop(v.iceGrip) > stop(1) * 5, `${stop(1).toFixed(2)} m on stone, ${stop(v.iceGrip).toFixed(2)} m on ice`);
  // A knocked enemy across ice.
  // (Update 0.3.27 — the designer: "Do not make the enemies in Frozen Depths slide on ice at all": as on stone.)
  const slide = () => {
    const enemies = createEnemies();
    const i = spawnEnemy(enemies, 'grunt', new Vector3(0, 0, 0), 0);
    const e = enemies[i];
    e.vel.set(6, 0, 0);
    const nav = buildNavGrid(OPEN_ARENA, 0.45);
    for (let k = 0; k < ticks(3); k++) fly(e, nav, 0.45, DT);
    return e.pos.x;
  };
  check('a body knocked across ice slides no further than on stone (6 m/s: under a metre)', slide() < 1, `${slide().toFixed(2)} m`);
  check('a body on a sheet is on ice; off it, not', onIce(sheet.x, 0, sheet.z, level.ice) && !onIce(9999, 0, 9999, level.ice) && !onIce(sheet.x, 2, sheet.z, level.ice));
}

section('Floor 7 — icicles');
{
  const spot = { x: 3, z: 0, room: 0 };
  const run = (stand: (t: number) => Vector3, secs: number) => {
    const c = createCombat(OPEN_ARENA);
    const p = createPlayer(0, 0, 0, 0);
    const icicles = createIcicles([spot]);
    const seen: string[] = [];
    for (let k = 0; k < ticks(secs); k++) {
      p.pos.copy(stand(k * DT));
      stepIcicles(icicles, p, c, DT);
      for (let j = 0; j < c.events.length; j++) seen.push(c.events.at(j).kind);
      c.events.clear();
    }
    return { p, c, ic: icicles[0], seen };
  };
  const far = run(() => new Vector3(-10, 0, 0), 3);
  check('away from it, it hangs', far.ic.state === 'hang' && far.seen.length === 0);
  const under = run(() => new Vector3(3, 0, 0.3), 0.3);
  check('come under it: it shakes (the warning)', under.ic.state === 'shake' && under.seen.includes('icicleShake'));
  const stay = run(() => new Vector3(3, 0, 0.3), v.icicleWarn + 1.5);
  check(`stay under it: it falls and hurts you (${v.icicleDamage})`, stay.ic.state === 'gone' && stay.seen.includes('icicleShatter') && stay.p.hp === 100 - v.icicleDamage, `hp ${stay.p.hp}`);
  const dodge = run((t) => (t < 0.1 ? new Vector3(3, 0, 0.3) : new Vector3(7, 0, 0)), v.icicleWarn + 1.5);
  check('step away as it shakes: it falls, and misses you', dodge.ic.state === 'gone' && dodge.p.hp === 100);
  // An enemy under it.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(3, 0, 0.3, 0);
  const i = spawnEnemy(c.enemies, 'grunt', new Vector3(3.3, 0, -0.3), 0);
  c.enemies[i].hp = 999;
  const icicles = createIcicles([spot]);
  for (let k = 0; k < ticks(0.05); k++) stepIcicles(icicles, p, c, DT);
  p.pos.set(9, 0, 0);
  for (let k = 0; k < ticks(v.icicleWarn + 1.5); k++) stepIcicles(icicles, p, c, DT);
  check('and an enemy under it is hurt too', c.enemies[i].hp === 999 - v.icicleDamage, `${c.enemies[i].hp}`);
  check('it falls once', near(icicles[0].y, 0, 1e-9) && icicles[0].state === 'gone');
  const dungeon = createDungeonRun(level);
  check('the floor’s run carries its icicles, all hanging', dungeon.icicles.length === level.icicles.length && dungeon.icicles.every((ic) => ic.state === 'hang'));
}

section('Floor 7 — stand-ins');
{
  const roster = rosterOf(FLOOR.frozen);
  check('its enemies stand in from the dry floors (none of floor 6’s)', roster.length > 0 && roster.every((k) => !(KINDS6 as readonly string[]).includes(k)), roster.join(', '));
  // (Update 0.3.26 — its own: the Frost Roc, test-frost-roc.ts.)
  check('its boss is its own, the Frost Roc', bossOf(FLOOR.frozen) === 'frostRoc');
}
