// Update 0.0.21 — floor 3's rooms and the enemies-left count (the designer: "scrap all of floor 3's levels copied from
// lower floors, keep the new ones and create more; you may add two floors inside a room, making use of enemies that
// attack from the distance and giving the player options to climb up and take them down"; "an enemy room count that
// shows how many enemies are left in the room").
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { updateOrbs } from '../src/sim/combat/orbs';
import { createCombat } from '../src/sim/combat/state';
import { enemiesLeft } from '../src/sim/dungeon/enemyCount';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { PERCHED } from '../src/sim/dungeon/wavePlan';
import { hitEnemy, isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { HEIGHT, buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FIGHT_ROOMS } from '../src/world/dungeon/fightRooms';
import { KEEP_ROOMS } from '../src/world/dungeon/keepRooms';
import { LAVA_ROOMS } from '../src/world/dungeon/lavaRooms';
import { layOut } from '../src/world/dungeon/rooms';

const ids = (floor: number) => new Set(Array.from({ length: 40 }, (_, s) => planFloor(s + 1, floor).rooms.filter((r) => r.kind === 'fight').map((r) => r.layout.template.id)).flat());

section('Floor 3 — its own rooms');
{
  const three = ids(3);
  const own = new Set([...LAVA_ROOMS, ...KEEP_ROOMS].map((t) => t.id));
  check('floor 3 has none of the rooms of floors 1 and 2', FIGHT_ROOMS.every((t) => !three.has(t.id)));
  check('only the lava rooms and its own new ones, all of them in use', [...three].every((id) => own.has(id)) && [...own].every((id) => three.has(id)), [...three].join(', '));
  check('floors 1 and 2 never have floor 3’s new rooms', KEEP_ROOMS.every((t) => !ids(1).has(t.id) && !ids(2).has(t.id)));
  for (const t of KEEP_ROOMS) {
    const l = layOut(t, createRng(5));
    const at = (c: number, r: number) => (c < 0 || r < 0 || c >= l.w || r >= l.h ? 'void' : l.cells[r * l.w + c]);
    const ups = l.perches.filter(([c, r]) => at(c, r) === 'highLedge').length;
    // A way up: a step or a pad beside the upper floor.
    let ways = 0;
    for (let r = 0; r < l.h; r++) for (let c = 0; c < l.w; c++) if ((at(c, r) === 'ledge' || at(c, r) === 'pad') && [at(c - 1, r), at(c + 1, r), at(c, r - 1), at(c, r + 1)].includes('highLedge')) ways++;
    check(`${t.id}: an upper floor with spitters’ perches on it (${ups}), and ways up beside it (${ways})`, ups >= 4 && ups === l.perches.length && ways >= 4);
  }
}

section('Floor 3 — up high (Update 0.2.7: Dragonlings in the Spitters’ place)');
{
  let seed = 1;
  while (!planFloor(seed, 3).rooms.some((r) => r.layout.template.id === 'the keep')) seed++;
  const plan = planFloor(seed, 3);
  const level = buildDungeon(plan);
  const i = plan.rooms.findIndex((r) => r.layout.template.id === 'the keep');
  const room = level.rooms[i];
  check(`every wave of a room with perches brings ${PERCHED} Dragonlings for them, no Spitter`, room.waves.every((w) => w.filter((k) => k === 'dragonling').length >= PERCHED && !w.includes('spitter')));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, room.min.z + 3, 0);
  p.grounded = true;
  const rng = createRng(2);
  stepRooms(run, p, c, rng, DT);
  check('stepping in, the count is every enemy of every wave', enemiesLeft(run, c) === room.waves.flat().length, `${enemiesLeft(run, c)} / ${room.waves.flat().length}`);
  for (let k = 0; k < ticks(1.5); k++) stepRooms(run, p, c, rng, DT);
  const onPerch = (x: number, z: number) => room.perches.some((q) => near(q.x, x, 1e-6) && near(q.z, z, 1e-6));
  const came = c.enemies.filter((e) => isLive(e) && e.kind === 'dragonling' && onPerch(e.pos.x, e.pos.z));
  check(`the first wave's Dragonlings come in on the perches (${HEIGHT.highLedge} m up) and take off from there`, came.length >= PERCHED && came.every((e) => near(e.pos.y, HEIGHT.highLedge!, 1e-6) && e.perch === 0));
  // (A Spitter on a perch, as the perch rules still have one stand: floor 3 sends none now.)
  const q = room.perches[0];
  const si = spawnEnemy(c.enemies, 'spitter', new Vector3(q.x, q.y, q.z), 0);
  c.enemies[si].perch = q.y;
  const before = enemiesLeft(run, c);
  const s = c.enemies[si];
  const at = s.pos.clone();
  // Watch them a while: they stay up there, and shoot at you.
  for (const e of c.enemies) if (isLive(e) && e.perch === 0) e.alive = false;
  // (You in the courtyard, in reach of the perches round it.)
  p.pos.set((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2);
  let shots = 0;
  // (One of them: watched longer than two would need.)
  for (let k = 0; k < ticks(8); k++) {
    updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
    updateOrbs(c.orbs, p, new FlatWorld(), c.events, DT);
    for (let e = 0; e < c.events.length; e++) if (c.events.at(e).kind === 'spit') shots++;
    c.events.clear();
    p.hurtTime = 0;
  }
  check('they stay up on their ledge and spit at you from there', s.pos.distanceTo(at) < 1e-6 && shots >= 2, `${shots} shots`);
  hitEnemy(s, 1, 8, 1, 0);
  for (let k = 0; k < ticks(0.5); k++) updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
  check('a hit doesn’t slide one off its ledge', near(s.pos.x, at.x, 1e-6) && near(s.pos.y, at.y, 1e-6));
  hitEnemy(s, 999, 0, 0, 0);
  for (let k = 0; k < ticks(0.5); k++) updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
  check('killed, it lies on its ledge', near(s.pos.y, HEIGHT.highLedge!, 1e-6));
  check('and the count drops', enemiesLeft(run, c) < before);
}

section('The enemies-left count');
{
  const c = createCombat(buildDungeon(planFloor(3, 1)).arena, false);
  check('outside a fight, no count', enemiesLeft(createDungeonRun(buildDungeon(planFloor(3, 1))), c) === -1);
  spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, 0), 0);
  spawnEnemy(c.enemies, 'grunt', new Vector3(3, 0, 0), 0);
  spawnEnemy(c.enemies, 'dragon', new Vector3(10, 0, 0), 0);
  check('in the Lab: those alive (a boss has its bar instead)', enemiesLeft(null, c) === 2);
  for (const e of c.enemies) e.alive = false;
  check('none alive in the Lab: no count', enemiesLeft(null, c) === -1);
}
