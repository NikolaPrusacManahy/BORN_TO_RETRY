// Update 0.0.12 — a look at a dungeon floor without a browser: the game's own floor plan and dressing for a seed,
// written as kit placements plus a few camera spots; Blender draws them with the real kit
// (tools/blender/render_dungeon.py).
//   npx tsx tools/dungeon-shots.ts <out folder> [seed] [floor]
//   blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <out folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';

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
const extent = { min: { x: Math.min(...level.rooms.map((r) => r.min.x)) - 4, z: Math.min(...level.rooms.map((r) => r.min.z)) - 4 }, max: { x: Math.max(...level.rooms.map((r) => r.max.x)) + 4, z: Math.max(...level.rooms.map((r) => r.max.z)) + 4 } };
writeFileSync(join(out, 'dungeon.json'), JSON.stringify({ seed, floor, pieces: d.pieces, gates: d.gates, torches: d.torches, cores: d.cores, pads: level.arena.pads, exit: level.exit, cams, extent }));
console.log(`seed ${seed} floor ${floor}: ${level.rooms.length} rooms (${level.plan.rooms.map((r) => r.layout.template.id).join(', ')}), ${d.pieces.length} pieces, ${level.arena.boxes.length} boxes`);
