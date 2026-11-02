// Update 0.2.24 (out of dressing.ts, which had reached its size) — the cells and the dressing only some floors have:
// floor 2's Venom Garden (gardenDressing.ts) and floor 3's Bone Keep (keepDressing.ts), and the marks they leave on the
// floor (engine/gardenView.ts draws them). Update 0.3.11 — and floor 7's snow (frozen.ts). Update 0.3.13 — and floor
// 8's workbenches (forge.ts); its presses, vents and belts are paving here (engine/forgeView.ts draws them). Pure.
import type { Rng } from '../../core/rng';
import type { FloorPlan } from './floorPlan';
import type { Put, SandCell } from './dressExtras';
import { dressBed, dressGarden, dressWeb, Mark } from './gardenDressing';
import { dressCrystal, dressKeep, dressLair } from './keepDressing';
import { dressFrozen } from './frozen';
import { dressBench } from './forge';
import type { Cell } from './rooms';
import type { DungeonStyle } from './styles';

/** Marks on the floor: floor 2's webs' sheets and its boss room's scorch marks; floor 3's open graves, burrows and
 *  mushrooms. */
export interface Marks {
  webs: Mark[];
  scorch: Mark[];
  graves: Mark[];
  burrows: Mark[];
  shrooms: Mark[];
}

export const noMarks = (): Marks => ({ webs: [], scorch: [], graves: [], burrows: [], shrooms: [] });

/** A cell only some floors have (`boss`: in the boss room). False: not one of them. */
export function dressOwnCell(c: Cell, x: number, z: number, boss: boolean, rng: Rng, put: Put, sand: SandCell[], marks: Marks): boolean {
  switch (c) {
    case 'bed':
    case 'grass':
    case 'tree':
      dressBed(c, x, z, boss, rng, put, sand);
      return true;
    case 'web':
      dressWeb(x, z, rng, put, marks.webs);
      return true;
    case 'grave':
    case 'shroom':
    case 'burrow':
      dressLair(c, x, z, rng, put, sand, marks);
      return true;
    case 'crystal':
      dressCrystal(x, z, rng, put);
      return true;
    case 'pine':
    case 'snow':
      dressFrozen(c, x, z, rng, put, sand);
      return true;
    case 'bench':
      dressBench(x, z, rng, put);
      return true;
    case 'crusher':
    case 'vent':
    case 'belt':
      return true;
    default:
      return false;
  }
}

/** The floor's own dressing over its rooms (`inRoom`: each cell's room, −1: none). */
export function dressOwnRooms(K: DungeonStyle, plan: FloorPlan, inRoom: Int16Array, nearDoor: (col: number, row: number) => boolean, rng: Rng, put: Put, marks: Marks) {
  if (K.id === 'venom') dressGarden(plan, inRoom, nearDoor, rng, put, marks.scorch);
  if (K.id === 'bone') dressKeep(plan, inRoom, nearDoor, rng, put);
}
