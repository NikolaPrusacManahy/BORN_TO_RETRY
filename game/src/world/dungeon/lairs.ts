// Update 0.2.24 — floor 3's Bone Keep in the level (assemble.ts): each room's lairs, the spots its enemies come out of
// (sim/dungeon/lairs.ts): open graves (Skeletons climb out), mushroom beds (Mushnubs), burrows (White Rabbits); and its
// crystals (a Skull Wraith blinks to one: sim/enemies/evade.ts). Pure.
// Update 0.3.22 — floor 7's barrows: its beds of snow (the frozen dead rise out of them: sim/enemies/draugr.ts); in a
// room with none, its sheets of ice (they come up through the ice).
import type { Spot } from '../arena';
import { cellX, cellZ, PlacedRoom } from './floorPlan';

export interface Lairs {
  graves: Spot[];
  shrooms: Spot[];
  burrows: Spot[];
  crystals: Spot[];
  barrows: Spot[];
}

/** Room `r`'s lairs: the middles of its cells of each. */
export function lairsOf(r: PlacedRoom): Lairs {
  const out: Lairs = { graves: [], shrooms: [], burrows: [], crystals: [], barrows: [] };
  const ice: Spot[] = [];
  const { w, h, cells } = r.layout;
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const c = cells[row * w + col];
      const list = c === 'grave' ? out.graves : c === 'shroom' ? out.shrooms : c === 'burrow' ? out.burrows : c === 'crystal' ? out.crystals : c === 'snow' ? out.barrows : c === 'ice' ? ice : null;
      list?.push({ x: cellX(r.x0 + col), y: 0, z: cellZ(r.z0 + row) });
    }
  }
  if (out.barrows.length === 0) out.barrows = ice;
  return out;
}
