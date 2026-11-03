// Update 0.3.22 — floor 7's waves as its warband comes (MD/FLOOR7_WARBAND_PLAN.md; out of wavePlan.ts, which had reached
// its size): no more than VOLVA_MAX Völvas in a room (the rest Raiders: two seeresses raising the dead is plenty), and
// the two kinds of dead in turn (as many Barrow Maids as Draugr, give or take one). Other floors' waves are as they were.
// Update 0.3.33 — and floor 8's: no more than two Archers in a room (the rest Karateka) nor two Sand Ninjas (the rest
// Shinobi: their smoke and caltrops are plenty from two), the man and the woman in turn. Pure.
import type { EnemyKind } from '../enemies/kinds';
import { COST } from './wavePlan';

/** The most Völvas a room sends. */
export const VOLVA_MAX = 2;
/** Update 0.3.33 — the most Archers and Sand Ninjas a room sends. */
export const ARCHER_MAX = 2;
export const SAND_MAX = 2;

export function warbandWaves(waves: EnemyKind[][]): EnemyKind[][] {
  let volvas = 0;
  let dead = 0;
  let archers = 0;
  let sand = 0;
  for (const w of waves) {
    for (let i = 0; i < w.length; i++) {
      if (w[i] === 'volva' && ++volvas > VOLVA_MAX) w[i] = 'raider';
      if (w[i] === 'draugr' || w[i] === 'barrowMaid') w[i] = dead++ % 2 === 0 ? 'draugr' : 'barrowMaid';
      if (w[i] === 'archer' && ++archers > ARCHER_MAX) w[i] = 'karateka';
      if (w[i] === 'sandNinja' || w[i] === 'sandNinjaF') w[i] = ++sand > SAND_MAX ? 'shinobi' : sand % 2 === 1 ? 'sandNinja' : 'sandNinjaF';
    }
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}
