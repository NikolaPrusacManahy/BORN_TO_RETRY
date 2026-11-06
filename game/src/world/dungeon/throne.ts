// Update 0.3.63 — Hellwarden's room (the designer: "each boss their designed room"; the Boss Design Bible: "a burning throne room floating in
// a void"; MD/FLOOR10_HELL_PLAN.md: "the Throne of Cinders ... ringed by pillars and chains, lava in channels across it"). A boss room's size,
// its middle clear. Columns its Arc cuts through, and all of them come down as its throne room breaks; pools of lava to route round; a dais
// in each corner. Bones. Pure.
import type { Rng } from '../../core/rng';
import type { Put } from './dressExtras';
import { quarter } from './fightRooms';
import { cellAt, cellX, cellZ, type FloorPlan } from './floorPlan';
import type { RoomTemplate } from './rooms';

export const THRONE_ROOM: RoomTemplate = {
  id: 'the throne of cinders',
  kind: 'boss',
  rows: quarter([
    '...............',
    '.pp............',
    '.pp...C....C...',
    '...............',
    '..LLL..........',
    '..LLL...C......',
    '.C.............',
    '..............E',
    '......C........',
    '...........C...',
    '..E............',
    '.C....LLL......',
    '......LLL......',
    '...............',
    '...............',
  ]),
};

const BONES = ['kit_p2_Bones', 'kit_p2_Bones2', 'kit_r_Bone', 'kit_r_Skull'];
/** The odds of bones on a cell of floor, away from its middle. */
const ON_FLOOR = 0.08;

/** Scorched bones about its floor, none in its middle. */
export function dressThrone(plan: FloorPlan, rng: Rng, put: Put) {
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
      if (Math.hypot(x - mx, z - mz) < 12 || rng() >= ON_FLOOR) continue;
      const s = 0.6 + rng() * 0.5;
      put(BONES[Math.floor(rng() * BONES.length)], x + (rng() - 0.5) * 1.4, 0, z + (rng() - 0.5) * 1.4, rng() * Math.PI * 2, s, s, s);
    }
  }
}
