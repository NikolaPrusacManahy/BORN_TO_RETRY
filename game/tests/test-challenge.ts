// Update 0.1.20 — challenge rooms and the words over the doorways (the designer: "a text just above the room entrance
// saying either Room, Challenge, Shop, Boss"; "a challenge room has 6 more enemies of the norm and has a guaranteed 2
// mini boss and a chest is guaranteed, the mini boss drop only either a white key or a gold key"). Every floor has one
// challenge room, off the way (you choose to go in); its count is a fight room's as deep plus 6, two of them the floor's
// mini bosses (one in the first wave, one in the last), it always has a chest, and its key is white or gold. Over each
// doorway into a room, on the corridor's side, its word.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, roomCount, stepRooms } from '../src/sim/dungeon/roomLoop';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { MINI_BOSSES } from '../src/sim/enemies/kinds';
import { betterKeyFor } from '../src/sim/items/items';
import { createPlayer } from '../src/sim/player/state';
import { ITEMS } from '../src/tuning/items';
import { ROOMS } from '../src/tuning/rooms';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { CELL, cellAt, colAt, PATH_FIGHTS, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { SIGN_Y, signsOf } from '../src/world/dungeon/signs';
import { roomSigns } from '../src/engine/roomSignsView';

section('Challenge rooms — one on every floor, off the way');
{
  let bad = '';
  let rooms = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const floor of [1, 2, 3, 4]) {
      const plan = planFloor(seed * 31, floor);
      const ch = plan.rooms.filter((r) => r.challenge);
      if (ch.length !== 1) {
        bad ||= `seed ${seed * 31} floor ${floor}: ${ch.length} challenge rooms`;
        continue;
      }
      const r = ch[0];
      rooms++;
      const minis = r.waves.flat().filter((k) => MINI_BOSSES.includes(k));
      const want = roomCount(r.depth, floor) + ROOMS.v.challengeExtra;
      if (r.kind !== 'fight' || r.index < PATH_FIGHTS + 2) bad ||= `seed ${seed * 31} floor ${floor}: not a fight room off the way`;
      else if (!r.chest) bad ||= `seed ${seed * 31} floor ${floor}: no chest`;
      else if (r.waves.flat().length !== want) bad ||= `seed ${seed * 31} floor ${floor}: ${r.waves.flat().length} enemies, not ${want}`;
      else if (minis.length !== ROOMS.v.challengeMinis) bad ||= `seed ${seed * 31} floor ${floor}: ${minis.length} mini bosses`;
      else if (!minis.every((k) => rosterOf(floor).includes(k))) bad ||= `seed ${seed * 31} floor ${floor}: a mini boss not of this floor (${minis})`;
      else if (!r.waves[0].some((k) => MINI_BOSSES.includes(k)) || !r.waves[r.waves.length - 1].some((k) => MINI_BOSSES.includes(k))) bad ||= `seed ${seed * 31} floor ${floor}: waves ${r.waves.map((w) => w.length)}`;
      const ids = plan.rooms.filter((q) => q.kind === 'fight').map((q) => q.layout.template.id);
      if (new Set(ids).size !== ids.length) bad ||= `seed ${seed * 31} floor ${floor}: a fight room twice`;
    }
  }
  check(`every floor has one challenge room: a fight room off the way, ${ROOMS.v.challengeExtra} more enemies than a room as deep, ${ROOMS.v.challengeMinis} of them the floor's mini bosses (in the first and last waves), a chest (${rooms} floors)`, !bad, bad);
  const plan = planFloor(4242, 2);
  const other = planFloor(4242, 2);
  check('the same seed, the same challenge room', plan.rooms.findIndex((r) => r.challenge) === other.rooms.findIndex((r) => r.challenge) && plan.cells.join() === other.cells.join());
}

section('Challenge rooms — the key is white or gold');
{
  const n = 3000;
  let white = 0;
  let normal = 0;
  for (let i = 0; i < n; i++) {
    const k = betterKeyFor((i + 0.5) / n);
    if (k === 'whiteKey') white++;
    else if (k === 'key') normal++;
  }
  const share = ITEMS.v.whiteKeyOdds / (ITEMS.v.whiteKeyOdds + ITEMS.v.goldKeyOdds);
  check(`never a normal key; white ${Math.round(share * 100)}%, gold the rest (their odds)`, normal === 0 && near(white / n, share, 0.01), `${white} white of ${n}`);
  const level = buildDungeon(planFloor(77, 1));
  const room = level.rooms.find((r) => r.challenge)!;
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  stepRooms(run, p, c, createRng(1), DT);
  check(`stepping in, the room holds ${ROOMS.v.challengeKeys} key, a better one`, c.keyDrops === ROOMS.v.challengeKeys && c.betterKeys);
  const kinds = new Set<string>();
  for (let k = 0; k < 40; k++) {
    for (const e of c.enemies) e.alive = false;
    for (const d of c.drops) d.alive = false;
    c.keyDrops = 1;
    const i = spawnEnemy(c.enemies, 'brute', new THREE.Vector3(p.pos.x + 6, 0, p.pos.z), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(c.enemies[i].pos);
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
    for (const d of c.drops) if (d.alive && /key/i.test(d.kind)) kinds.add(d.kind);
  }
  check('its mini boss drops a white key or a gold key, never a normal one', kinds.size > 0 && !kinds.has('key') && [...kinds].every((k) => k === 'whiteKey' || k === 'goldKey'), [...kinds].join());
  const plain = level.rooms.find((r) => r.kind === 'fight' && !r.challenge)!;
  p.pos.set((plain.min.x + plain.max.x) / 2, 0, (plain.min.z + plain.max.z) / 2);
  stepRooms(run, p, c, createRng(1), DT);
  check('a room that isn’t: its keys are as before', !c.betterKeys);
}

section('Signs — a word over every doorway into a room');
{
  let bad = '';
  for (const [seed, floor] of [[5, 1], [77, 2], [903, 3]]) {
    const plan = planFloor(seed, floor);
    const signs = signsOf(plan);
    const doors = plan.rooms.filter((r) => r.kind !== 'start').reduce((n, r) => n + r.doors.length, 0);
    if (signs.length !== doors) bad ||= `seed ${seed}: ${signs.length} signs for ${doors} doorways`;
    const words = new Set(signs.map((s) => s.word));
    if (!['Room', 'Challenge', 'Shop', 'Boss'].every((w) => words.has(w as never))) bad ||= `seed ${seed}: words ${[...words]}`;
    for (const s of signs) {
      // It faces out: a step in front of it is a corridor's floor (inside no room); a step behind, the wall's doorway.
      const fx = Math.sin(s.rot);
      const fz = Math.cos(s.rot);
      const front = cellAt(plan, colAt(s.x + fx * CELL * 0.4), rowAt(s.z + fz * CELL * 0.4));
      const back = cellAt(plan, colAt(s.x - fx * CELL * 0.4), rowAt(s.z - fz * CELL * 0.4));
      const inRoom = plan.rooms.some((r) => {
        const c = colAt(s.x + fx * CELL * 0.4) - r.x0;
        const w = rowAt(s.z + fz * CELL * 0.4) - r.z0;
        return c >= 0 && w >= 0 && c < r.layout.w && w < r.layout.h;
      });
      if (front !== 'floor' || inRoom || back !== 'door') bad ||= `seed ${seed}: ${s.word} sign at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}: front ${front}, back ${back}`;
    }
    const ch = plan.rooms.find((r) => r.challenge)!;
    if (ch.doors.length !== 1) bad ||= `seed ${seed}: the challenge room has ${ch.doors.length} doors`;
    if (!signs.some((s) => s.word === 'Challenge')) bad ||= `seed ${seed}: no Challenge sign`;
  }
  check('one over each doorway into a room but the start, on the corridor’s side, facing it; Room, Challenge, Shop and Boss all there', !bad, bad);
  check(`over the arch (3.7 m), under the wall’s top (6 m): ${SIGN_Y} m`, SIGN_Y - 0.45 > 3.75 && SIGN_Y + 0.45 < 6);
  const plan = planFloor(5, 1);
  const group = roomSigns(plan, [], []);
  check('each is drawn, its word on it', group.children.length === signsOf(plan).length && group.children.every((m) => m.name.startsWith('sign ')));
}
