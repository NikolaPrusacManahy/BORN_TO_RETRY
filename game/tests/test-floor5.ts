// Update 0.2.10 — floor 5, the Drowned Temple (the designer chose it; spec MD_UPDATES/U0210_DROWNED_TEMPLE.md): its look,
// its rooms, willows in mud, the tide (its clock, the horn, wading at high water, which rooms flood), no pits (the
// designer took its deep pools out).
// (Floors 1–7's layouts, doors joined, are checked in test-dungeon.ts.)
import { check, near, section } from './harness';
import { EventQueue } from '../src/core/eventQueue';
import type { CombatEvent } from '../src/sim/combat/state';
import { createTide, stepTide, tideCycle, tideLevel, tideSlow, WADE_MIN, wading } from '../src/sim/dungeon/tide';
import { createPlayer } from '../src/sim/player/state';
import { TIDE } from '../src/tuning/tide';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { DROWNED_ROOMS } from '../src/world/dungeon/drownedRooms';
import { DESERT_ROOMS } from '../src/world/dungeon/desertRooms';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { styleOf } from '../src/world/dungeon/styles';

section('Floor 5 — the Drowned Temple: its look and its rooms');
{
  const s = styleOf(5);
  // (Update 0.2.11 — floor 6 has its own: test-floor6.ts.)
  check('floor 5 is the Drowned Temple: floor 3’s stone recoloured, a grey-green sky, water', s.id === 'drowned' && !!s.tint && !!s.floorTint && s.sky !== undefined && s.water !== undefined && styleOf(6).id !== 'drowned' && styleOf(4).id === 'sand');
  const ids = DROWNED_ROOMS.map((r) => r.id);
  check(`${ids.length} rooms of its own, each different: ${ids.join(', ')}`, ids.length >= 10 && new Set(ids).size === ids.length && DROWNED_ROOMS.every((r) => r.from === 5 && r.until === 5));
  let bad = '';
  for (let seed = 1; seed <= 40; seed++) {
    const fights = planFloor(seed * 17, 5).rooms.filter((r) => r.kind === 'fight').map((r) => r.layout.template.id);
    if (!fights.every((id) => ids.includes(id))) bad ||= `seed ${seed * 17}: ${fights.filter((id) => !ids.includes(id))}`;
    else if (new Set(fights).size !== fights.length) bad ||= `seed ${seed * 17}: a room twice`;
    const four = planFloor(seed * 17, 4).rooms.filter((r) => r.kind === 'fight').map((r) => r.layout.template.id);
    if (!four.every((id) => DESERT_ROOMS.some((t) => t.id === id))) bad ||= `seed ${seed * 17}: floor 4 has ${four}`;
  }
  check('40 floor 5s: only its rooms, none twice; floor 4 keeps the desert’s', !bad, bad);
  let willows = 0;
  let wrong = '';
  let pads = 0;
  let padsOut = 0;
  for (const seed of [5, 77, 903]) {
    const d = dress(planFloor(seed, 5));
    const beds = new Set(d.sand.map((c) => `${c.x},${c.z}`));
    const tiles = new Set(d.pieces.filter((p) => p.piece === d.style.floor && p.y < 0).map((p) => `${p.x},${p.z}`));
    for (const p of d.pieces) {
      if (!/kit_n_Willow/.test(p.piece)) continue;
      willows++;
      if (!beds.has(`${p.x},${p.z}`) || tiles.has(`${p.x},${p.z}`)) wrong ||= `seed ${seed}: ${p.piece} at ${p.x}, ${p.z}`;
    }
    const level = buildDungeon(planFloor(seed, 5));
    for (const f of d.floats) {
      pads++;
      if (!level.tide.some((b) => Math.abs(f.x - b.x) <= b.w / 2 && Math.abs(f.z - b.z) <= b.d / 2)) padsOut++;
    }
  }
  check(`every willow stands in a bed of mud, none on paving (${willows})`, willows > 10 && !wrong, wrong);
  check(`lily pads float only where the tide floods (${pads})`, pads > 20 && padsOut === 0, `${padsOut} outside`);
  check('the desert has none', dress(planFloor(5, 4)).floats.length === 0 && buildDungeon(planFloor(5, 4)).tide.length === 0);
}

section('Floor 5 — the tide');
{
  const v = TIDE.v;
  check('drained at first, then rising after the low water, full at high water, drained again by the cycle’s end', tideLevel(0) === 0 && tideLevel(v.low - 0.01) === 0 && near(tideLevel(v.low + v.rise / 2), v.depth / 2, 0.01) && tideLevel(v.low + v.rise + 1) === v.depth && tideLevel(tideCycle() - 0.001) < 0.001);
  const events = new EventQueue<CombatEvent>(64, 'none');
  const tide = createTide();
  let horns = 0;
  let drains = 0;
  for (let t = 0; t < tideCycle() * 3; t += 1 / 60) {
    stepTide(tide, events, 1 / 60);
    for (let i = 0; i < events.length; i++) {
      const k = events.at(i).kind;
      if (k === 'tideRise') horns++;
      if (k === 'tideFall') drains++;
    }
    events.clear();
  }
  check('a horn as the water starts to rise, once a cycle; once as it drains', horns === 3 && drains === 3, `${horns} horns, ${drains} drains`);
  const level = buildDungeon(planFloor(7, 5));
  const fights = level.rooms.filter((r) => r.kind === 'fight');
  check('every fight room floods (the challenge room too); the start room, the shop, the boss room and the corridors don’t', level.tide.length === fights.length && fights.length >= 7);
  const room = level.tide[0];
  const high = { t: v.low + v.rise + 1, level: v.depth };
  const low = { t: 0, level: 0 };
  const inRoom = createPlayer(room.x, 0, room.z, 0);
  const onLedge = createPlayer(room.x, 1, room.z, 0);
  const s = level.arena.playerStart;
  const atStart = createPlayer(s.x, 0, s.z, 0);
  check(`at high water you wade on the low floor at ${v.wading * 100}% of your speed`, wading(inRoom, high, level.tide) && tideSlow(inRoom, high, level.tide) === v.wading);
  check('up on a ledge you’re dry; at low water you’re not wading; the start room never floods', !wading(onLedge, high, level.tide) && !wading(inRoom, low, level.tide) && !wading(atStart, high, level.tide) && tideSlow(inRoom, low, level.tide) === 1);
  check(`shallower than ${WADE_MIN} m nobody wades`, !wading(inRoom, { t: 0, level: WADE_MIN - 0.01 }, level.tide));
}

section('Floor 5 — no pits');
{
  // (The designer: "remove those water pits you added, no need for them".)
  let pits = '';
  for (let seed = 1; seed <= 40; seed++) {
    const level = buildDungeon(planFloor(seed * 13, 5));
    const n = level.arena.boxes.filter((b) => b.kind === 'lava').length + dress(level.plan).lava.length;
    if (n > 0) pits ||= `seed ${seed * 13}: ${n}`;
  }
  check('40 floor 5s: no pit in any room (nothing to fall in)', !pits && DROWNED_ROOMS.every((r) => r.rows.every((row) => !row.includes('L'))), pits);
}
