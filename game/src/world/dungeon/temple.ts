// Update 0.3.58 — the Drowned King's room (the designer: "each boss their designed room"; the Boss Design Bible: "a flooded temple with
// stone platforms in knee-deep water"; "water rises; fewer dry platforms"). A boss room's size, its middle clear for it to rise in. Low
// stones (_, just over its first water) go under as it rises for good; the platforms (p, 1 m) stay dry, and a high ledge in each corner
// (P, 2.5 m, up from the platform beside it): the one place its Riptide doesn't reach, and nothing else it does stops there. Columns its
// surf can stun itself on. Wide lanes between them all: it's as big as it is. Its dressing: broken columns and mossy rocks. Pure.
import type { Rng } from '../../core/rng';
import type { Put } from './dressExtras';
import { quarter } from './fightRooms';
import { cellAt, cellX, cellZ, type FloorPlan } from './floorPlan';
import type { RoomTemplate } from './rooms';

export const TEMPLE_ROOM: RoomTemplate = {
  id: 'the flooded temple',
  kind: 'boss',
  rows: quarter([
    '...............',
    '.PPp.......___.',
    '.PPp.......___.',
    '.pp............',
    '..............E',
    '.....___.......',
    '.C...___....C..',
    '...............',
    '...........ppp.',
    '..___......ppp.',
    '..___......ppp.',
    '.......C.......',
    '..E............',
    '...ppp...___...',
    '...ppp...___...',
  ]),
};

const MOSS = ['kit_n_Rock_Moss_1', 'kit_n_Rock_Moss_2', 'kit_n_Rock_Moss_4', 'kit_n_Rock_Moss_6'];
const BROKEN = 'kit_p2_Column_Broken2';
const PEDESTAL = 'kit_p1_Pedestal';
/** The odds of a mossy rock on a cell of floor by the wall, and of a stone's cell having one; a platform's cell a broken column. */
const BY_WALL = 0.3;
const ON_STONE = 0.12;
const ON_PLATFORM = 0.14;
const STONE_TOP = 0.6;
const PLATFORM_TOP = 1;

/** Mossy rocks along its walls and on its stones, broken columns on its platforms. Its middle clear: its tells show on the water. */
export function dressTemple(plan: FloorPlan, rng: Rng, put: Put) {
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!r) return;
  const { w, h } = r.layout;
  const pick = () => MOSS[Math.floor(rng() * MOSS.length)];
  for (let row = r.z0; row < r.z0 + h; row++) {
    for (let col = r.x0; col < r.x0 + w; col++) {
      const c = cellAt(plan, col, row);
      const x = cellX(col);
      const z = cellZ(row);
      if (c === 'floor') {
        const byWall = col === r.x0 || col === r.x0 + w - 1 || row === r.z0 || row === r.z0 + h - 1;
        if (!byWall || rng() >= BY_WALL) continue;
        const s = 0.7 + rng() * 0.7;
        put(pick(), x + (rng() - 0.5) * 1.2, 0, z + (rng() - 0.5) * 1.2, rng() * Math.PI * 2, s, s, s);
      } else if (c === 'stone' && rng() < ON_STONE) {
        const s = 0.35 + rng() * 0.25;
        put(pick(), x + (rng() - 0.5) * 1, STONE_TOP, z + (rng() - 0.5) * 1, rng() * Math.PI * 2, s, s, s);
      } else if (c === 'ledge' && rng() < ON_PLATFORM) {
        put(rng() < 0.7 ? BROKEN : PEDESTAL, x, PLATFORM_TOP, z, Math.floor(rng() * 4) * (Math.PI / 2));
      }
    }
  }
}
