// Update 0.2.9 — a look at the lobby without a browser: the game's own hall dressing (src/world/lobby/) written as kit
// placements, the characters where they stand (the locked ones as silhouettes), the boards and what they say, the dark
// beyond the gate, the roof (its tiles, beams and chandeliers: none of it casts a shadow) and the lights under it, and
// camera spots round the hall; Blender draws them with the real kits (`interior`: lit as roughly as the game lights it,
// engine/lobby/lobbyView.ts, not by its renderer).
// Update 0.3.21 — the manor: its rooms and the bestiary upstairs (cuts from above under the roofs and under the upper
// floors), the crystal over its dais, the paintings' gilt frames, the windows' daylight (lit boxes), camera spots in
// every room; the galleries' exhibits over their pedestals (items.glb's, each sized as the game sizes it: the plain
// Sword as the gold one; the daggers single, the keys and bonuses without their glows) and the cards
// on their walls (lit boxes in each card's colour, in gilt frames).
//   npx tsx tools/lobby-shots.ts <out folder> [difficulty]
//   blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json
//     --kit public/models/dungeon/kit.glb --kit public/models/menu/lobby.glb --kit public/models/items/items.glb
//     --out <out folder> --day
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { parseUntextured } from '../tests/fakes/glb';
import { exhibitScale } from '../src/engine/lobby/galleryView';
import { CARD, familyOf } from '../src/sim/cards/cards';
import { ROSTER } from '../src/sim/characters';
import { isDifficulty } from '../src/sim/lobby/difficulty';
import { boardLines } from '../src/world/lobby/boards';
import { PEDESTAL } from '../src/world/lobby/furniture';
import { CARD_SIZE, cardSlots, ITEM_STANDS, WEAPON_STANDS } from '../src/world/lobby/galleries';
import { dressHall, RING_R } from '../src/world/lobby/hallDressing';
import { ALTARS, CRYSTAL_DAIS, CRYSTAL_Y, DAIS, FIGURES, HALL, LOBBY_START, WING } from '../src/world/lobby/spots';
import { BRICK as BRICK_STYLE } from '../src/world/dungeon/styles';
import { RARITY_HEX } from '../src/ui/cardMarks';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/lobby-shots.ts <out folder> [difficulty]');
const difficulty = isDifficulty(process.argv[3]) ? process.argv[3] : 'real';
mkdirSync(out, { recursive: true });
const d = dressHall();
const figures = ROSTER.map((c, i) => ({ piece: `Char_${c.id}`, x: FIGURES[i].x, y: DAIS.h, z: FIGURES[i].z, rot: Math.PI / 2, sx: 1, sy: 1, sz: 1 }));
const crystal = { piece: 'lobby_r_Crystal1', x: CRYSTAL_DAIS.x, y: CRYSTAL_Y, z: CRYSTAL_DAIS.z, rot: 0.4, sx: 2.6, sy: 2.6, sz: 2.6 };
const silhouettes = ROSTER.filter((c) => !c.available).map((c) => `Char_${c.id}`);
const boards = d.boards.map((b) => ({ ...b, lines: boardLines(b, difficulty, ROSTER[0].name) }));
type B = { x: number; y: number; z: number; w: number; h: number; d: number; rot?: number };
const box = (b: B, color: number[], extra: { noShadow?: boolean; glow?: boolean } = {}) => ({
  m: new Matrix4().compose(new Vector3(b.x, b.y, b.z), new Quaternion().setFromEuler(new Euler(0, b.rot ?? 0, 0)), new Vector3(b.w, b.h, b.d)).elements,
  color,
  ...extra,
});
const WOOD = [0.07, 0.04, 0.022];
const IRON = [0.02, 0.02, 0.022];
const GOLD = [0.6, 0.38, 0.08];
const boxes = [box(d.dark, [0, 0, 0]), ...d.beams.map((b) => box(b, WOOD, { noShadow: true }))];
for (const c of d.chandeliers) boxes.push(box({ x: c.x, y: (c.y + HALL.beamsAt) / 2, z: c.z, w: 0.05, h: HALL.beamsAt - c.y, d: 0.05 }, IRON, { noShadow: true }));
for (const p of d.panes) boxes.push(box({ x: p.x, y: p.y, z: p.z, w: p.w, h: p.h, d: 0.02, rot: p.rot }, [0.85, 0.92, 1], { glow: true }));
for (const b of d.boards) {
  if (b.kind !== 'floor') continue;
  const t = 0.13;
  boxes.push(box({ x: b.x, y: b.y + b.h / 2 + t / 2, z: b.z, w: b.w + 2 * t, h: t, d: 0.08 }, GOLD), box({ x: b.x, y: b.y - b.h / 2 - t / 2, z: b.z, w: b.w + 2 * t, h: t, d: 0.08 }, GOLD));
  for (const s of [-1, 1]) boxes.push(box({ x: b.x + s * (b.w / 2 + t / 2), y: b.y, z: b.z, w: t, h: b.h, d: 0.08 }, GOLD));
}
for (const b of d.boards) {
  if (b.kind !== 'row') continue;
  const top = b.y + b.h / 2;
  for (const s of [-1, 1]) boxes.push(box({ x: b.x, y: (top + HALL.wallH) / 2, z: b.z + s * (b.w / 2 - 0.3), w: 0.04, h: HALL.wallH - top, d: 0.04 }, IRON, { noShadow: true }));
}
const items = (await parseUntextured(new URL('../public/models/items/items.glb', import.meta.url))).scene;
const exhibits = [...WEAPON_STANDS, ...ITEM_STANDS].map((s, i) => {
  const piece = `item_${s.kind === 'sword' ? 'goldSword' : s.kind}`;
  const node = items.getObjectByName(piece);
  // (Its own box, not where it sits in the file; sized and centred as galleryView.ts does it, not turned.)
  const box = node ? new Box3().setFromObject(node).translate(node.getWorldPosition(new Vector3()).negate()) : new Box3(new Vector3(-0.2, -0.2, -0.2), new Vector3(0.2, 0.2, 0.2));
  const sides = box.getSize(new Vector3());
  const k = exhibitScale(s.kind, Math.max(sides.x, sides.y, sides.z));
  const mid = box.getCenter(new Vector3()).multiplyScalar(k);
  return { piece, x: s.x - mid.x, y: PEDESTAL.top + 0.55 - mid.y, z: s.z - mid.z, rot: 0, sx: k, sy: k, sz: k };
});
const rgb = (hex: string) => [1, 3, 5].map((k) => (parseInt(hex.slice(k, k + 2), 16) / 255) ** 2.2);
for (const c of cardSlots()) {
  const family = familyOf(c.kind);
  const colour = family === 'death' ? [0.1, 0.5, 0.15] : family === 'traitor' ? [0.4, 0.12, 0.8] : rgb(RARITY_HEX[CARD[c.kind].rarity]);
  const nx = Math.sin(c.rot) * 0.03;
  const nz = Math.cos(c.rot) * 0.03;
  boxes.push(box({ x: c.x + nx, y: c.y, z: c.z + nz, w: CARD_SIZE.w, h: CARD_SIZE.h, d: 0.02, rot: c.rot }, colour, { glow: true }));
  boxes.push(box({ x: c.x, y: c.y, z: c.z, w: CARD_SIZE.w + 0.14, h: CARD_SIZE.h + 0.14, d: 0.04, rot: c.rot }, GOLD));
}
const rings = d.chandeliers.map((c) => ({ ...c, r: RING_R }));
const di = ['weakling', 'real', 'human'].indexOf(difficulty);
const lights = [
  ...d.torches.map((t) => ({ ...t, w: 140, color: [1, 0.6, 0.28] })),
  ...d.chandeliers.map((c) => ({ ...c, y: c.y - 0.3, w: 900, color: [1, 0.75, 0.45] })),
  { ...d.hearth, w: 250, color: [1, 0.55, 0.25] },
  { x: FIGURES[0].x + 1.6, y: 3.2, z: FIGURES[0].z, w: 250, color: [1, 0.82, 0.6] },
  { x: ALTARS[di].x - 1.4, y: 3, z: ALTARS[di].z, w: 250, color: [1, 0.78, 0.45] },
  { x: CRYSTAL_DAIS.x, y: CRYSTAL_Y, z: CRYSTAL_DAIS.z, w: 500, color: [0.6, 0.85, 1] },
];
const s = LOBBY_START;
const up = WING.upper + 1.65;
const cams = [
  { name: 'start', at: [s.x, 1.6, s.z], to: [0, 4, -22] },
  { name: 'crystal', at: [6, 1.7, 9], to: [0, 3, 2] },
  { name: 'gate', at: [0, 1.6, -11], to: [0, 4.5, -22] },
  { name: 'characters', at: [-4, 1.7, 14], to: [-15, 1.8, 14] },
  { name: 'difficulty', at: [5, 1.7, 13], to: [15, 2.4, 13] },
  { name: 'paintings', at: [0, 1.7, 13], to: [0, 3, 22] },
  { name: 'stair', at: [-7, 1.7, -4], to: [-13.5, 4, -19] },
  { name: 'from-landing', at: [-13.5, WING.upper + 1.7, -20.5], to: [4, 2, 6] },
  { name: 'weapons', at: [-16.2, 1.9, -6.5], to: [-26, 0.9, 5] },
  { name: 'weapons-back', at: [-31.5, 2.2, 9], to: [-20, 0.9, -2] },
  { name: 'items', at: [16.2, 1.9, -6.5], to: [26, 0.9, 5] },
  { name: 'items-back', at: [31.5, 2.2, 9], to: [20, 0.9, -2] },
  { name: 'dining', at: [-24, 1.8, -9], to: [-24, 1, -20] },
  { name: 'library', at: [17, 1.7, -10], to: [27, 1.2, -18] },
  { name: 'bestiary-w', at: [-16, up, -21], to: [-24, WING.upper + 0.6, 4] },
  { name: 'bestiary-row', at: [-16.4, up, -9.5], to: [-28, WING.upper + 1, -7] },
  { name: 'bestiary-aisle', at: [-17.4, up, 8], to: [-17.4, WING.upper + 1, -21] },
  { name: 'cards', at: [16.5, up, -20.5], to: [28, WING.upper + 1.2, 4] },
  { name: 'cards-back', at: [31, up, 8.5], to: [18, WING.upper + 1.5, -14] },
  { name: 'credits', at: [-25, up, -12], to: [-25, WING.upper + 2.4, -22] },
  { name: 'hall-high', at: [11, 8.5, 20], to: [-4, 1, -10] },
];
const extent = { min: { x: -WING.x1 - 1, z: -HALL.halfD - 3 }, max: { x: WING.x1 + 1, z: HALL.halfD + 1 } };
writeFileSync(
  join(out, 'dungeon.json'),
  JSON.stringify({ pieces: [...d.pieces, d.bars, ...figures, crystal, ...exhibits], roof: d.ceiling, gates: [], torches: d.torches, cores: d.cores, pads: [], cams, extent, style: { ...BRICK_STYLE, bars: '' }, sand: [], boxes, rings, lights, interior: true, cuts: [9.6, WING.upper - 0.4], boards, silhouettes, slabY: -0.45 }),
);
console.log(`lobby: ${d.pieces.length} pieces, ${d.torches.length} torches, ${d.boards.length} boards, ${d.panes.length} windows`);
