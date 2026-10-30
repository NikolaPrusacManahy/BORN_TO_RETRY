// Update 0.2.9 — a look at the lobby without a browser: the game's own hall dressing (src/world/lobby/) written as kit
// placements, the characters where they stand (the locked ones as silhouettes), the boards and what they say, the dark
// beyond the gate, the roof (its tiles, beams and chandeliers: none of it casts a shadow) and the lights under it, and
// camera spots round the hall; Blender draws them with the real kits (`interior`: lit as roughly as the game lights it,
// engine/lobby/lobbyView.ts, not by its renderer).
//   npx tsx tools/lobby-shots.ts <out folder> [difficulty]
//   blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json
//     --kit public/models/dungeon/kit.glb --kit public/models/menu/lobby.glb --out <out folder> --day
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { ROSTER } from '../src/sim/characters';
import { isDifficulty } from '../src/sim/lobby/difficulty';
import { boardLines } from '../src/world/lobby/boards';
import { dressHall, RING_R } from '../src/world/lobby/hallDressing';
import { ALTARS, DAIS, FIGURES, HALL, LOBBY_START } from '../src/world/lobby/spots';
import { BRICK } from '../src/world/dungeon/styles';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/lobby-shots.ts <out folder> [difficulty]');
const difficulty = isDifficulty(process.argv[3]) ? process.argv[3] : 'real';
mkdirSync(out, { recursive: true });
const d = dressHall();
const figures = ROSTER.map((c, i) => ({ piece: `Char_${c.id}`, x: FIGURES[i].x, y: DAIS.h, z: FIGURES[i].z, rot: -Math.PI / 2, sx: 1, sy: 1, sz: 1 }));
const silhouettes = ROSTER.filter((c) => !c.available).map((c) => `Char_${c.id}`);
const boards = d.boards.map((b) => ({ ...b, lines: boardLines(b, difficulty, ROSTER[0].name) }));
const box = (b: { x: number; y: number; z: number; w: number; h: number; d: number }, color: number[], noShadow = false) => ({
  m: new Matrix4().compose(new Vector3(b.x, b.y, b.z), new Quaternion(), new Vector3(b.w, b.h, b.d)).elements,
  color,
  noShadow,
});
const WOOD = [0.07, 0.04, 0.022];
const IRON = [0.02, 0.02, 0.022];
const boxes = [box(d.dark, [0, 0, 0]), ...d.beams.map((b) => box(b, WOOD, true))];
for (const c of d.chandeliers) boxes.push(box({ x: c.x, y: (c.y + HALL.beamsAt) / 2, z: c.z, w: 0.05, h: HALL.beamsAt - c.y, d: 0.05 }, IRON, true));
const rings = d.chandeliers.map((c) => ({ ...c, r: RING_R }));
const di = ['weakling', 'real', 'human'].indexOf(difficulty);
const lights = [
  ...d.torches.map((t) => ({ ...t, w: 140, color: [1, 0.6, 0.28] })),
  ...d.chandeliers.map((c) => ({ ...c, y: c.y - 0.3, w: 900, color: [1, 0.75, 0.45] })),
  { ...d.hearth, w: 250, color: [1, 0.55, 0.25] },
  { x: FIGURES[0].x - 1.5, y: 3.2, z: FIGURES[0].z, w: 250, color: [1, 0.82, 0.6] },
  { x: ALTARS[di].x + 1.4, y: 3, z: ALTARS[di].z, w: 250, color: [1, 0.78, 0.45] },
];
const s = LOBBY_START;
const cams = [
  { name: 'start', at: [s.x, 1.6, s.z], to: [0, 4, -22] },
  { name: 'gate', at: [0, 1.6, -11], to: [0, 4.5, -22] },
  { name: 'gate-close', at: [1.5, 1.6, -18], to: [0, 3, -23] },
  { name: 'difficulty', at: [-5, 1.6, -2], to: [-15, 2.6, -2] },
  { name: 'characters', at: [6, 1.6, -2.5], to: [15, 1.8, -2.5] },
  { name: 'credits', at: [0, 1.6, 15], to: [0, 2.6, 22] },
  { name: 'tables', at: [-1.5, 2.4, -1], to: [-6, 0.5, 8] },
  { name: 'from-gate', at: [0, 2.2, -19], to: [0, 1.5, 10] },
  { name: 'corner-ne', at: [6, 1.8, -12], to: [14, 1, -20] },
  { name: 'corner-se', at: [4, 1.8, 10], to: [13, 0.8, 19] },
  { name: 'corner-sw', at: [-4, 1.8, 11], to: [-13, 0.8, 19] },
];
const extent = { min: { x: -HALL.halfW - 2, z: -HALL.halfD - 3 }, max: { x: HALL.halfW + 2, z: HALL.halfD + 2 } };
writeFileSync(
  join(out, 'dungeon.json'),
  JSON.stringify({ pieces: [...d.pieces, d.bars, ...figures], roof: d.ceiling, gates: [], torches: d.torches, cores: d.cores, pads: [], cams, extent, style: { ...BRICK, bars: '' }, sand: [], boxes, rings, lights, interior: true, boards, silhouettes, slabY: -0.45 }),
);
console.log(`lobby: ${d.pieces.length} pieces, ${d.torches.length} torches, ${d.boards.length} boards`);
