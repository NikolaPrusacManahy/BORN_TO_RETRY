// Update 0.3.53 — the Bone King's room (the designer: "each boss their designed room"; the Boss Design Bible: "a bone-filled
// pit with ledges along the walls"). A boss room's size, its walls high, a ledge 2.5 m up along all four, cut at the doorways:
// what you get up on when its club crosses the whole floor. Steps up to them, jump pads, and walls to run. Its middle clear
// for its arm and its Colossus. Its floor all bones, the ledges' corners great ribs. Pure.
import type { Rng } from '../../core/rng';
import type { Put } from './dressExtras';
import { quarter } from './fightRooms';
import { cellAt, cellX, cellZ, type FloorPlan } from './floorPlan';
import type { RoomTemplate } from './rooms';

export const PIT_ROOM: RoomTemplate = {
  id: 'the bone pit',
  kind: 'boss',
  rows: quarter([
    'PPPPPPPPPPPPPP.',
    'PPPPPPPPPPPPPP.',
    'PP.......pp....',
    'PP.............',
    'PP......E......',
    'PP.............',
    'PPp...J........',
    'PPp............',
    'PP.............',
    'PP..E..........',
    'PP.............',
    'PP.............',
    'PPpp...........',
    'PP.............',
    '...............',
  ]),
};

const BONES = ['kit_p2_Bones', 'kit_p2_Bones2', 'kit_r_Bone', 'kit_r_Bone', 'kit_p1_Skull', 'kit_r_Skull'];
const GREAT_RIBS = 'kit_pf_Environment_LargeBones';
/** The odds of bones on a cell of floor by how far from its middle (kept readable where you fight: its tells show on the
 *  floor), of another with them, and on a ledge's. */
const ON_FLOOR: readonly (readonly [number, number])[] = [[10, 0.05], [20, 0.2], [Infinity, 0.45]];
const MORE = 0.35;
const ON_LEDGE = 0.2;
const LEDGE_TOP = 2.5;

/** Bones all over its floor, some on its ledges, great ribs at their corners. */
export function dressPit(plan: FloorPlan, rng: Rng, put: Put) {
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!r) return;
  const { w, h } = r.layout;
  const pick = () => BONES[Math.floor(rng() * BONES.length)];
  const mx = cellX(r.x0 + w / 2) - 1;
  const mz = cellZ(r.z0 + h / 2) - 1;
  for (let row = r.z0; row < r.z0 + h; row++) {
    for (let col = r.x0; col < r.x0 + w; col++) {
      const c = cellAt(plan, col, row);
      const x = cellX(col);
      const z = cellZ(row);
      if (c === 'floor') {
        const out = Math.hypot(x - mx, z - mz);
        if (rng() >= ON_FLOOR.find(([far]) => out < far)![1]) continue;
        const n = rng() < MORE ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const s = 0.55 + rng() * 0.5;
          put(pick(), x + (rng() - 0.5) * 1.8, 0, z + (rng() - 0.5) * 1.8, rng() * Math.PI * 2, s, s, s);
        }
      } else if (c === 'highLedge' && rng() < ON_LEDGE) {
        const s = 0.55 + rng() * 0.4;
        put(pick(), x + (rng() - 0.5) * 1.4, LEDGE_TOP, z + (rng() - 0.5) * 1.4, rng() * Math.PI * 2, s, s, s);
      }
    }
  }
  // Great ribs on the ledges' corners, arching in.
  for (const [dc, dr, rot] of [[1, 1, Math.PI / 4], [w - 2, 1, -Math.PI / 4], [1, h - 2, (3 * Math.PI) / 4], [w - 2, h - 2, (-3 * Math.PI) / 4]] as const) {
    put(GREAT_RIBS, cellX(r.x0 + dc), LEDGE_TOP, cellZ(r.z0 + dr), rot, 1.4, 1.4, 1.4);
  }
}
