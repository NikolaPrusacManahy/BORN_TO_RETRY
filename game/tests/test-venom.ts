// Update 0.2.23 — floor 2's Venom Garden (the designer: floors "need to match their enemies"): its look, its own rooms
// and its boss room (The Swarm's nest since Update 0.3.52: test-swarm-show.ts), plants only in beds, webs that slow you, sludge that poisons, and the wasps' hives (they let
// wasps out while their room fights; punched down, they stop).
import { Vector3 } from 'three';
import { parseUntextured } from './fakes/glb';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { isLive } from '../src/sim/enemies/enemy';
import { armHives, createHives, resetHives, stepHives } from '../src/sim/dungeon/hives';
import { lavaStep } from '../src/sim/dungeon/lava';
import { webSlow } from '../src/sim/dungeon/quicksand';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { createPlayer } from '../src/sim/player/state';
import { GARDEN } from '../src/tuning/garden';
import { lavaOf } from '../src/world/arena';
import { buildDungeon, DungeonLevel } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { SANDY } from '../src/world/dungeon/dressExtras';
import { HIVE_Y } from '../src/world/dungeon/garden';
import { VENOM_PIECES } from '../src/world/dungeon/gardenDressing';
import { cellAt, colAt, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { bossRoomOf, FIGHT_ROOMS, onFloor } from '../src/world/dungeon/rooms';
import { styleOf, VENOM } from '../src/world/dungeon/styles';
import { VENOM_ROOMS } from '../src/world/dungeon/venomRooms';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const HIVE_ROOMS = ['hive hall', 'overgrown cloister', 'sludge gauntlet'];

/** A floor 2 with a room that has hives (the first seed from `from`). */
function hiveFloor(from = 1): DungeonLevel {
  for (let seed = from; seed < from + 200; seed++) {
    const plan = planFloor(seed, FLOOR.garden);
    if (plan.rooms.some((r) => HIVE_ROOMS.includes(r.layout.template.id))) return buildDungeon(plan);
  }
  throw new Error('no floor 2 with hives');
}

section('Venom Garden — the floor');
{
  check('floor 2 is the Venom Garden: mossy brick, earth beds, sludge in its pits, bushes for low cover', styleOf(FLOOR.garden) === VENOM && VENOM.pit !== undefined && VENOM.low === 'kit_n_Bush_1' && styleOf(FLOOR.dungeon).id === 'brick' && styleOf(FLOOR.desert).id === 'sand');
  const on = (f: number) => FIGHT_ROOMS.filter((t) => onFloor(t, f)).map((t) => t.id);
  const venom = VENOM_ROOMS.map((t) => t.id);
  check('nine rooms of its own, and only those (floor 1 and 3 have none of them)', venom.length === 9 && on(2).every((id) => venom.includes(id)) && on(2).length === 9 && !on(1).some((id) => venom.includes(id)) && !on(3).some((id) => venom.includes(id)));
  check('no lava rooms on floors 1–2', !on(1).includes('lava lake') && !on(2).includes('lava lake') && !on(2).includes('bone bridges'));
  check('its boss room is The Swarm’s nest (Update 0.3.52); the others keep theirs', bossRoomOf(FLOOR.garden).id === 'the nest' && bossRoomOf(FLOOR.dungeon).id === 'the burnt courtyard' && bossRoomOf(FLOOR.desert).id === 'the sunken ruins' && bossRoomOf(FLOOR.hell).id === 'boss');
  const living = new Set([...VENOM_PIECES.plants, ...VENOM_PIECES.tall, ...VENOM_PIECES.trees]);
  const charred = new Set([...VENOM_PIECES.burnt, ...VENOM_PIECES.ash]);
  let bad = '';
  let sludge = 0;
  let grass = 0;
  let scorched = 0;
  for (let seed = 1; seed <= 24 && !bad; seed++) {
    const plan = planFloor(seed, FLOOR.garden);
    const look = dress(plan);
    const bossRoom = plan.rooms.find((r) => r.kind === 'boss')!;
    const inBoss = (x: number, z: number) => {
      const c = colAt(x) - bossRoom.x0;
      const r = rowAt(z) - bossRoom.z0;
      return c >= 0 && r >= 0 && c < bossRoom.layout.w && r < bossRoom.layout.h;
    };
    sludge += look.lava.length;
    for (const p of look.pieces) {
      const cell = cellAt(plan, colAt(p.x), rowAt(p.z));
      if (VENOM_PIECES.tall.includes(p.piece)) grass++;
      if ((living.has(p.piece) || VENOM_PIECES.burnt.includes(p.piece)) && !SANDY.has(cell)) bad ||= `seed ${seed}: ${p.piece} on ${cell}`;
      if (living.has(p.piece) && inBoss(p.x, p.z)) bad ||= `seed ${seed}: ${p.piece} alive in the nest`;
      if (VENOM_PIECES.burnt.includes(p.piece)) bad ||= `seed ${seed}: a charred tree on this floor`;
      if (VENOM_PIECES.webs.includes(p.piece) && inBoss(p.x, p.z)) bad ||= `seed ${seed}: a cobweb in the nest`;
    }
    // Its bushes (low cover) too: each in a bed, no paving under it.
    for (const p of look.pieces) {
      if (p.piece !== VENOM.low) continue;
      if (!look.sand.some((s) => s.x === p.x && s.z === p.z) || look.pieces.some((f) => f.piece === VENOM.floor && f.x === p.x && f.z === p.z)) bad ||= `seed ${seed}: a bush on paving`;
    }
    scorched += look.marks.scorch.length;
    if (look.sand.some((s) => s.ash || inBoss(s.x, s.z))) bad ||= `seed ${seed}: a bed in the nest, or ash`;
  }
  check('24 floors: every plant, bush, clump of grass and tree grows out of a bed, never paving; none in the nest, its floor is flesh', !bad, bad);
  check('no scorch marks now; sludge in the pits; tall grass where the snakes hunt', scorched === 0 && sludge > 0 && grass > 0, `${scorched} ${sludge} ${grass}`);
  check('its charred pieces are recoloured whole', charred.size > 0 && VENOM_PIECES.burnt.every((p) => VENOM.burnt?.[p] !== undefined));
  // (Update 0.3.14 — the kit has a texture now, floor 6's palette: taken out to parse it in Node.)
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const all = [...VENOM_PIECES.plants, ...VENOM_PIECES.tall, ...VENOM_PIECES.trees, ...VENOM_PIECES.burnt, ...VENOM_PIECES.ash, ...VENOM_PIECES.webs, ...VENOM.litter, VENOM.low!];
  const missing = all.filter((n) => !kit.scene.getObjectByName(n));
  check('every piece it uses is in the kit', missing.length === 0, missing.join(', '));
}

section('Venom Garden — webs and sludge');
{
  let level: DungeonLevel | null = null;
  for (let seed = 1; seed < 200 && !level; seed++) {
    const plan = planFloor(seed, FLOOR.garden);
    if (plan.rooms.some((r) => r.layout.template.id === 'web cellar')) level = buildDungeon(plan);
  }
  const webs = level!.webs;
  const w = webs[0];
  const p = createPlayer(w.x, 0, w.z, 0);
  check('a web slows you to Web slow of your speed', webs.length > 0 && webSlow(p, webs) === GARDEN.v.web);
  p.pos.y = 1;
  check('not in the air over it', webSlow(p, webs) === 1);
  p.pos.set(level!.arena.playerStart.x, 0, level!.arena.playerStart.z);
  check('nor off it', webSlow(p, webs) === 1);
  // Falling into the sludge: burnt as by lava, sent back, and poisoned.
  const pitted = buildDungeon(planFloor(2, FLOOR.garden));
  const pits = lavaOf(pitted.arena);
  const run = createDungeonRun(pitted);
  const combat = createCombat(pitted.arena, false);
  const q = createPlayer(pits[0].x, pits[0].y, pits[0].z, 0);
  const start = pitted.arena.playerStart;
  const back = lavaStep(q, pits, start, run, combat);
  check('sludge burns you, sends you back and poisons you', back && q.poison === GARDEN.v.sludgePoison && q.poisonBy === 'lava' && q.hp < 100);
  const lava3 = buildDungeon(planFloor(2, FLOOR.keep));
  const pits3 = lavaOf(lava3.arena);
  const r = createPlayer(pits3[0]?.x ?? 0, pits3[0]?.y ?? 0, pits3[0]?.z ?? 0, 0);
  lavaStep(r, pits3, lava3.arena.playerStart, createDungeonRun(lava3), createCombat(lava3.arena, false));
  check('floor 3’s lava doesn’t poison', pits3.length === 0 || r.poison === 0);
}

section('Venom Garden — hives');
{
  const level = hiveFloor();
  const hives = level.hives;
  const onWall = hives.every((h) => {
    const room = level.rooms[h.room];
    const ahead = { x: h.x + h.nx * 1.5, z: h.z + h.nz * 1.5 };
    const behind = cellAt(level.plan, colAt(h.x - h.nx * 1), rowAt(h.z - h.nz * 1));
    return h.y === HIVE_Y && behind === 'wall' && ahead.x > room.min.x && ahead.x < room.max.x && ahead.z > room.min.z && ahead.z < room.max.z;
  });
  check(`hives hang on walls, facing into their rooms (${hives.length})`, hives.length >= 4 && onWall);
  const combat = createCombat(level.arena, false);
  combat.hives = createHives(hives);
  const room = hives[0].room;
  const mine = combat.hives.filter((h) => h.room === room);
  const p = createPlayer((level.rooms[room].min.x + level.rooms[room].max.x) / 2, 0, (level.rooms[room].min.z + level.rooms[room].max.z) / 2, 0);
  armHives(combat.hives, room);
  check('a fight arms its room’s hives (no other room’s)', mine.every((h) => h.left === GARDEN.v.hiveWasps) && combat.hives.every((h) => h.room === room || h.left === 0));
  const outs = () => Array.from({ length: combat.events.length }, (_, i) => combat.events.at(i)).filter((e) => e.kind === 'hiveOut').length;
  stepHives(combat, room, p, GARDEN.v.hiveGap / 2 - 0.1);
  check('none comes out at once', outs() === 0);
  stepHives(combat, room, p, 0.2);
  const wasps = () => combat.enemies.filter((e) => isLive(e) && e.kind === 'wasp').length;
  check('then wasps come out (one a hive, at most Hive wasps at once)', outs() === Math.min(mine.length, GARDEN.v.hiveCap) && wasps() === outs());
  let most = 0;
  for (let i = 0; i < ticks(120); i++) {
    stepHives(combat, room, p, DT);
    most = Math.max(most, wasps());
  }
  check('never more than Hive wasps at once while they live', most <= GARDEN.v.hiveCap, `${most}`);
  for (const e of combat.enemies) e.alive = false;
  for (let i = 0; i < ticks(GARDEN.v.hiveGap * (GARDEN.v.hiveWasps + 1) * mine.length); i++) {
    stepHives(combat, room, p, DT);
    for (const e of combat.enemies) e.alive = false;
  }
  check('each lets out Wasps a hive, then stays quiet', mine.every((h) => h.left === 0 && h.out.length === GARDEN.v.hiveWasps));
  // Punched down.
  resetHives(combat.hives);
  armHives(combat.hives, room);
  combat.events.clear();
  const h = mine[0];
  const i = combat.hives.indexOf(h);
  const eye = new Vector3(h.pos.x + h.nx * 1.5, h.pos.y, h.pos.z + h.nz * 1.5);
  const hit = emptyTargetHit();
  const found = nearestTarget(combat, eye, h.pos, 0.3, hit);
  check('a hive is something to hit', found && hit.kind === 'hive' && hit.index === i);
  const fell = landHit(combat, hit, GARDEN.v.hiveHp, 1, -h.nx, -h.nz, 'hitJab', GARDEN.v.hiveHp);
  const kinds = Array.from({ length: combat.events.length }, (_, k) => combat.events.at(k).kind);
  check('at Hive health it falls', fell && h.broken && kinds.includes('hiveDown'));
  check('and is no target any more', !nearestTarget(combat, eye, h.pos, 0.3, hit) || hit.kind !== 'hive' || hit.index !== i);
  for (let k = 0; k < ticks(GARDEN.v.hiveGap * 2); k++) stepHives(combat, room, p, DT);
  check('a fallen hive lets out no more', h.out.length === 0 && h.left === 0);
  resetHives(combat.hives);
  check('the floor starting over hangs it back up', !h.broken && h.hp === GARDEN.v.hiveHp);
}
{
  // The room loop: walk into a hive room and its hives start.
  const level = hiveFloor(7);
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  combat.hives = createHives(level.hives);
  const room = level.hives[0].room;
  const r = level.rooms[room];
  const p = createPlayer((r.min.x + r.max.x) / 2, 0, (r.min.z + r.max.z) / 2, 0);
  p.grounded = true;
  const rng = createRng(3);
  let outs = 0;
  for (let i = 0; i < ticks(GARDEN.v.hiveGap); i++) {
    stepRooms(run, p, combat, rng, DT);
    for (let e = 0; e < combat.events.length; e++) if (combat.events.at(e).kind === 'hiveOut') outs++;
    combat.events.clear();
  }
  check('in a hive room, the fight brings wasps out of its hives', run.rooms[room].state === 'fighting' && outs > 0, `${outs}`);
  // Update 0.3.27 — the designer: the count "would loop back to 2 after killing the last enemy and spawns them again …
  // 3 times". Its own all sent and dead, the hives' wasps still flying: they're the last; once they're dead, it's won.
  const rr = run.rooms[room];
  const fromHive = (i: number) => combat.hives.some((h) => h.out.includes(i));
  for (let k = 0; k < ticks(120) && rr.sent < rr.total; k++) {
    combat.enemies.forEach((e, i) => !fromHive(i) && (e.alive = false));
    stepRooms(run, p, combat, rng, DT);
  }
  combat.enemies.forEach((e, i) => !fromHive(i) && (e.alive = false));
  const flying = combat.enemies.filter((e, i) => fromHive(i) && isLive(e)).length;
  combat.events.clear();
  let more = 0;
  let wasLeft = 0;
  for (let k = 0; k < ticks(GARDEN.v.hiveGap * 3) && rr.state === 'fighting'; k++) {
    if (k === ticks(1)) {
      wasLeft = combat.enemies.filter(isLive).length;
      combat.enemies.forEach((e) => (e.alive = false));
    }
    stepRooms(run, p, combat, rng, DT);
    for (let e = 0; e < combat.events.length; e++) if (combat.events.at(e).kind === 'hiveOut') more++;
    combat.events.clear();
  }
  check('its own all down, the hives let no more out: their wasps are the last, then the room is won', rr.sent === rr.total && flying > 0 && more === 0 && wasLeft === flying && rr.state !== 'fighting', `${flying} flying, ${more} more, ${wasLeft} left, ${rr.state}`);
}
