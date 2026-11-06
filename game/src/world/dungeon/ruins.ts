// Update 0.3.60 — the Velociraptor's room (the designer: "each boss their designed room"; the Boss Design Bible: "overgrown jungle ruins,
// tall walls and tight corridors"; floor 6 is the Desert, so sand-choked ruins, palms for the jungle). A boss room's size, its middle clear.
// Blocks of wall to break your sight of it: what lets it vanish and what your ears are for. Some corridors too tight for its body: where
// you can get away from its charge, and it can still lunge at you. Walls to run, palms in beds of sand, columns. Pure.
import type { Rng } from '../../core/rng';
import type { Put } from './dressExtras';
import { quarter } from './fightRooms';
import { cellAt, cellX, cellZ, type FloorPlan } from './floorPlan';
import type { RoomTemplate } from './rooms';

export const RUINS_ROOM: RoomTemplate = {
  id: 'the sunken ruins',
  kind: 'boss',
  rows: quarter([
    '...............',
    '.E...##....##..',
    '....###....##..',
    '.##.........E..',
    '.##...##.......',
    '.....###...##..',
    '..Y......Y.##..',
    '....C..........',
    '.###.....###...',
    '.###.....###...',
    '..........Y....',
    '.....##........',
    '..E..##....C...',
    '..........E....',
    '...............',
  ]),
};

const RUBBLE = ['kit_pf_Environment_Rock_1', 'kit_pf_Environment_Rock_2', 'kit_pf_Environment_Rock_3', 'kit_p2_Rock1', 'kit_p2_Rock2'];
const BROKEN = 'kit_p2_Column_Broken2';
const BONES = ['kit_p2_Bones', 'kit_p2_Bones2', 'kit_r_Skull'];
/** The odds of rubble against a wall, of a fallen column there, of bones in the open. */
const AT_WALL = 0.22;
const COLUMN = 0.12;
const IN_OPEN = 0.03;

const DIRS: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Rubble and fallen columns against its walls, the odd bones out in the open. Its middle clear. */
export function dressRuins(plan: FloorPlan, rng: Rng, put: Put) {
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!r) return;
  const { w, h } = r.layout;
  const mx = cellX(r.x0 + w / 2) - 1;
  const mz = cellZ(r.z0 + h / 2) - 1;
  for (let row = r.z0; row < r.z0 + h; row++) {
    for (let col = r.x0; col < r.x0 + w; col++) {
      if (cellAt(plan, col, row) !== 'floor') continue;
      const x = cellX(col);
      const z = cellZ(row);
      if (Math.hypot(x - mx, z - mz) < 10) continue;
      const byWall = DIRS.find(([dc, dr]) => cellAt(plan, col + dc, row + dr) === 'wall');
      if (byWall) {
        if (rng() < COLUMN) {
          put(BROKEN, x, 0, z, Math.floor(rng() * 4) * (Math.PI / 2));
        } else if (rng() < AT_WALL) {
          const s = 0.5 + rng() * 0.6;
          put(RUBBLE[Math.floor(rng() * RUBBLE.length)], x + byWall[0] * 0.5, 0, z + byWall[1] * 0.5, rng() * Math.PI * 2, s, s, s);
        }
      } else if (rng() < IN_OPEN) {
        const s = 0.6 + rng() * 0.4;
        put(BONES[Math.floor(rng() * BONES.length)], x, 0, z, rng() * Math.PI * 2, s, s, s);
      }
    }
  }
}
