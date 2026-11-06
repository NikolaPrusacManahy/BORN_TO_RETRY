// Update 0.2.24 (out of dressing.ts, which had reached its size) — the cells and the dressing only some floors have:
// floor 2's Venom Garden (gardenDressing.ts) and floor 3's Bone Keep (keepDressing.ts), and the marks they leave on the
// floor (engine/gardenView.ts draws them). Update 0.3.11 — and floor 7's snow (frozen.ts). Update 0.3.13 — and floor
// 8's workbenches (forge.ts); its presses, vents and belts are paving here (engine/forgeView.ts draws them). Update
// 0.3.14 — and floor 6's cove (cove.ts: its set pieces, boardwalks, boats and treasure; its kegs are the view's).
// Update 0.3.17 — and floor 8's moon (moon.ts: its set pieces, meteorites, greenhouse beds, dishes). Update 0.3.32 —
// and floor 8's Shrine Dimension (shrine.ts: its trees, beds, bamboo, lanterns, set pieces, bridges; its petals).
// Update 0.3.43 — and floor 10's Hell (hell.ts: the fires in its braziers). Pure.
import { dressPit } from './pit';
import { dressTemple } from './temple';
import { dressRuins } from './ruins';
import { dressThrone } from './throne';
import type { Rng } from '../../core/rng';
import { colAt, FloorPlan, rowAt } from './floorPlan';
import type { Put, SandCell } from './dressExtras';
import { dressCourtyard } from './courtyard';
import { dressBed, dressGarden, dressWeb, Mark } from './gardenDressing';
import { dressCrystal, dressKeep, dressLair } from './keepDressing';
import { dressFrozen } from './frozen';
import { dressBench } from './forge';
import { dressCove } from './cove';
import { dressFlora, dressMoon } from './moon';
import { dressShrine, dressShrineCell } from './shrine';
import { dressHell } from './hell';
import type { Cell } from './rooms';
import type { DungeonStyle } from './styles';

/** Marks on the floor: floor 2's webs' sheets; the Dragon's courtyard's scorch marks; floor 3's open graves, burrows and
 *  mushrooms. */
export interface Marks {
  webs: Mark[];
  scorch: Mark[];
  graves: Mark[];
  burrows: Mark[];
  shrooms: Mark[];
  /** Update 0.3.32 — the carpets of petals under floor 8's sakura. */
  petals: Mark[];
}

export const noMarks = (): Marks => ({ webs: [], scorch: [], graves: [], burrows: [], shrooms: [], petals: [] });

/** A cell only some floors have (`boss`: in the boss room). False: not one of them. */
export function dressOwnCell(c: Cell, x: number, z: number, boss: boolean, rng: Rng, put: Put, sand: SandCell[], marks: Marks): boolean {
  if (dressShrineCell(c, x, z, colAt(x), rowAt(z), boss, rng, put, sand, marks.petals)) return true;
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
    case 'flora':
    case 'alienTree':
      dressFlora(c, x, z, rng, put, sand);
      return true;
    case 'crusher':
    case 'vent':
    case 'belt':
    case 'boardwalk':
    case 'keg':
    case 'wreck':
    case 'boat':
    case 'house':
    case 'outcrop':
    case 'bones':
    case 'crater':
    case 'module':
    case 'dome':
    case 'rover':
    case 'solar':
    case 'boulder':
      return true;
    default:
      return false;
  }
}

/** The floor's own dressing over its rooms (`inRoom`: each cell's room, −1: none). */
export function dressOwnRooms(K: DungeonStyle, plan: FloorPlan, inRoom: Int16Array, nearDoor: (col: number, row: number) => boolean, rng: Rng, put: Put, marks: Marks) {
  if (K.id === 'venom') dressGarden(plan, inRoom, nearDoor, rng, put);
  if (K.bossTowers) dressCourtyard(K, plan, rng, put, marks.scorch);
  if (K.id === 'bone') {
    dressKeep(plan, inRoom, nearDoor, rng, put);
    dressPit(plan, rng, put);
  }
  if (K.id === 'drowned') dressTemple(plan, rng, put);
  if (K.id === 'sand') dressRuins(plan, rng, put);
  if (K.id === 'cove') dressCove(plan, rng, put);
  if (K.id === 'moon') dressMoon(plan, rng, put);
  if (K.id === 'shrine') dressShrine(plan, rng, put);
  if (K.id === 'hell') {
    dressHell(plan, put);
    dressThrone(plan, rng, put);
  }
}
