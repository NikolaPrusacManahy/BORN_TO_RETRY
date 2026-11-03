// Update 0.3.22 — floor 7's waves as its warband comes (MD/FLOOR7_WARBAND_PLAN.md; out of wavePlan.ts, which had reached
// its size): no more than VOLVA_MAX Völvas in a room (the rest Raiders: two seeresses raising the dead is plenty), and
// the two kinds of dead in turn (as many Barrow Maids as Draugr, give or take one). Other floors' waves are as they were.
// Pure.
import type { EnemyKind } from '../enemies/kinds';
import { COST } from './wavePlan';

/** The most Völvas a room sends. */
export const VOLVA_MAX = 2;

export function warbandWaves(waves: EnemyKind[][]): EnemyKind[][] {
  let volvas = 0;
  let dead = 0;
  for (const w of waves) {
    for (let i = 0; i < w.length; i++) {
      if (w[i] === 'volva' && ++volvas > VOLVA_MAX) w[i] = 'raider';
      if (w[i] === 'draugr' || w[i] === 'barrowMaid') w[i] = dead++ % 2 === 0 ? 'draugr' : 'barrowMaid';
    }
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}
