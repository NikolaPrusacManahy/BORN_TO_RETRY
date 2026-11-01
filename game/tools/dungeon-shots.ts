// Update 0.0.12 — a look at a dungeon floor without a browser: the game's own floor plan and dressing for a seed,
// written as kit placements plus a few camera spots; Blender draws them with the real kit
// (tools/blender/render_dungeon.py).
// Update 0.0.20 — the lava (an orange slab per lava cell) and two looks into each lava room on the floor.
// Update 0.2.4 — the floor's sand (quicksand, and the beds palms and cacti stand in); the look's colours ride in `style`.
// Update 0.2.9 — the slab under the floor only where the game has it (under the floor boxes: `floors`), so a gap at a
// wall's foot shows the sky as it does in the game; and close looks along wall feet (`foot-…`).
// Update 0.2.23 — floor 2's Venom Garden: its sludge's colour (the look's `pit`), looks into each of its rooms.
// Update 0.2.10 — floor 5's water: the tide at high water over its rooms (`water`), its lily pads on it; and looks into
// its rooms.
//   npx tsx tools/dungeon-shots.ts <out folder> [seed] [floor]
//   blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <out folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { buildDungeon, LAVA_DEPTH } from '../src/world/dungeon/assemble';
import { TIDE } from '../src/tuning/tide';
import { CELL, cellAt, cellX, cellZ, GRID } from '../src/world/dungeon/floorPlan';
import { dress } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { DESERT_ROOMS } from '../src/world/dungeon/desertRooms';
import { VENOM_ROOMS } from '../src/world/dungeon/venomRooms';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/dungeon-shots.ts <out folder> [seed] [floor]');
const seed = Number(process.argv[3] ?? 1);
const floor = Number(process.argv[4] ?? 1);
mkdirSync(out, { recursive: true });
const level = buildDungeon(planFloor(seed, floor));
const d = dress(level.plan);
const s = level.arena.playerStart;
// Eye height 1.6; looking the way the start faces, and from inside the first fight room towards its middle.
const look = (yaw: number) => [-Math.sin(yaw), -Math.cos(yaw)];
const [fx, fz] = look(s.yaw);
const r1 = level.rooms[1];
const mid = { x: (r1.min.x + r1.max.x) / 2, z: (r1.min.z + r1.max.z) / 2 };
const cams = [
  { name: 'start', at: [s.x, 1.6, s.z], to: [s.x + fx * 10, 1.4, s.z + fz * 10] },
  { name: 'room1', at: [r1.min.x + 2.5, 1.6, r1.min.z + 2.5], to: [mid.x, 1.2, mid.z] },
  { name: 'room1-high', at: [r1.max.x - 2, 7, r1.max.z - 2], to: [mid.x, 0, mid.z] },
  // Update 0.0.13 — close to the start room's corner, looking into it and up it (where the sky showed through).
  { name: 'corner', at: [s.x - 4, 1.6, s.z - 4], to: [s.x - 12, 1.2, s.z - 12] },
  { name: 'corner-up', at: [s.x - 9.5, 1.6, s.z - 9.5], to: [s.x - 12, 5, s.z - 12] },
];
// Update 0.0.20 — the first fight room's doorway nearest the start, close up (its gate shut), and a column.
{
  const g = d.gates.find((x) => x.room === r1.index)!;
  const ax = Math.cos(g.rot);
  const az = -Math.sin(g.rot);
  const nx = -az;
  const nz = ax;
  const side = Math.sign((mid.x - g.x) * nx + (mid.z - g.z) * nz) || 1;
  cams.push({ name: 'doorway', at: [g.x + nx * side * 7 + ax * 3, 2.2, g.z + nz * side * 7 + az * 3], to: [g.x, 2.2, g.z] });
}
// Each lava room: from a corner high up, and from the walkway at eye height looking across the lava.
for (const r of level.rooms) {
  const id = level.plan.rooms[r.index].layout.template.id;
  // (Update 0.0.21 — and floor 3's two-level rooms. Update 0.2.4 — and floor 4's desert rooms.)
  if (!id.startsWith('lava') && !['gauntlet', 'the keep', 'ramparts', 'towers', 'bridgeworks'].includes(id) && !DESERT_ROOMS.some((t) => t.id === id) && !VENOM_ROOMS.some((t) => t.id === id)) continue;
  const m = { x: (r.min.x + r.max.x) / 2, z: (r.min.z + r.max.z) / 2 };
  cams.push({ name: `${id.replace(/ /g, '-')}-high`, at: [r.min.x + 3, 14, r.min.z + 3], to: [m.x, -1, m.z] });
  cams.push({ name: `${id.replace(/ /g, '-')}-eye`, at: [r.min.x + 5, 1.6, m.z + 1], to: [m.x, 0, m.z] });
}
// Update 0.2.9 — along the foot of a wall in the first fight room and in the corridor out of the start room, from
// where you'd stand (1 m off it, eye height), looking along it.
{
  const solidCell = (col: number, row: number) => ['wall', 'ledge', 'highLedge'].includes(cellAt(level.plan, col, row));
  let n = 0;
  for (let row = 1; row < GRID - 1 && n < 4; row++) {
    for (let col = 1; col < GRID - 1 && n < 4; col++) {
      // A floor cell with a wall to its west and floor three cells on to the north.
      if (cellAt(level.plan, col, row) !== 'floor' || !solidCell(col - 1, row)) continue;
      if (![1, 2, 3].every((k) => cellAt(level.plan, col, row - k) === 'floor' && solidCell(col - 1, row - k))) continue;
      if ((col * 7 + row * 3) % 5 !== n % 5) continue;
      const x = cellX(col) - CELL / 2 + 0.9;
      const z = cellZ(row);
      cams.push({ name: `foot-${n++}`, at: [x, 1.6, z + 1], to: [x - 0.9, 0, z - 5] });
    }
  }
}
const floors = level.arena.boxes.filter((b) => b.kind === 'floor').map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d }));
const wet = d.style.water !== undefined;
const pit = d.style.pit ? [(d.style.pit.deep >> 16) / 255, ((d.style.pit.deep >> 8) & 255) / 255, (d.style.pit.deep & 255) / 255] : [1, 0.32, 0.04];
const lava = d.lava.map((c) => ({ m: new Matrix4().compose(new Vector3(c.x, -LAVA_DEPTH + 0.01, c.z), new Quaternion(), new Vector3(CELL, 0.02, CELL)).elements, color: pit }));
const high = TIDE.v.depth;
const water = wet ? { level: high, rooms: level.tide.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d })) } : null;
const pieces = [...d.pieces, ...(wet ? d.floats.map((f) => ({ ...f, y: high + 0.015 })) : [])];
if (wet) {
  // Into the first fight rooms at eye height, standing in the water.
  for (const r of level.rooms.filter((x) => x.kind === 'fight').slice(0, 4)) {
    const id = level.plan.rooms[r.index].layout.template.id.replace(/ /g, '-');
    const m = { x: (r.min.x + r.max.x) / 2, z: (r.min.z + r.max.z) / 2 };
    cams.push({ name: `${id}-eye`, at: [r.min.x + 4, 1.6, r.min.z + 4], to: [m.x, 0.6, m.z] });
    cams.push({ name: `${id}-high`, at: [r.min.x + 3, 14, r.min.z + 3], to: [m.x, -1, m.z] });
  }
}
const extent = { min: { x: Math.min(...level.rooms.map((r) => r.min.x)) - 4, z: Math.min(...level.rooms.map((r) => r.min.z)) - 4 }, max: { x: Math.max(...level.rooms.map((r) => r.max.x)) + 4, z: Math.max(...level.rooms.map((r) => r.max.z)) + 4 } };
writeFileSync(join(out, 'dungeon.json'), JSON.stringify({ seed, floor, pieces, water, gates: d.gates, torches: d.torches, cores: d.cores, pads: level.arena.pads, exit: level.exit, cams, extent, style: d.style, sand: d.sand, boxes: lava, slabY: lava.length ? -LAVA_DEPTH - 0.2 : -0.45, floors }));
console.log(`seed ${seed} floor ${floor}: ${level.rooms.length} rooms (${level.plan.rooms.map((r) => r.layout.template.id).join(', ')}), ${d.pieces.length} pieces, ${level.arena.boxes.length} boxes`);
