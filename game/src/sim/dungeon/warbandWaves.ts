// Update 0.3.22 — floor 7's waves as its warband comes (MD/FLOOR7_WARBAND_PLAN.md; out of wavePlan.ts, which had reached
// its size): no more than VOLVA_MAX Völvas in a room (the rest Raiders: two seeresses raising the dead is plenty), and
// the two kinds of dead in turn (as many Barrow Maids as Draugr, give or take one). Other floors' waves are as they were.
// Update 0.3.33 — and floor 8's: no more than two Archers in a room (the rest Karateka) nor two Sand Ninjas (the rest
// Shinobi: their smoke and caltrops are plenty from two), the man and the woman in turn.
// Update 0.5.4 — and floor 10's packs (MD/FLOOR10_HELL_PLAN.md): Imps in threes, Puglins in fours. Pure.
import { FOES_HELL } from '../../tuning/foesHell';
import { EnemyKind, MINI_BOSSES } from '../enemies/kinds';
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
    pack(w, 'imp', Math.round(FOES_HELL.v.impPack));
    pack(w, 'puglin', Math.round(FOES_HELL.v.puglinPack));
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}

const PACKS: readonly EnemyKind[] = ['imp', 'puglin'];

/** Update 0.5.4 — a wave's `kind` made up to whole packs of `size`, in place of its others (not a mini boss, not another pack); too few
 *  others, the odd ones become Bone Guards. */
function pack(w: EnemyKind[], kind: EnemyKind, size: number) {
  const n = w.filter((k) => k === kind).length;
  if (n === 0 || size <= 1) return;
  const free = (k: EnemyKind) => !PACKS.includes(k) && !MINI_BOSSES.includes(k);
  const others = w.filter(free).length;
  const up = Math.ceil(n / size) * size;
  const keep = up - n <= others ? up : Math.floor(n / size) * size;
  for (let i = w.length - 1, need = keep - n; i >= 0 && need > 0; i--) {
    if (!free(w[i])) continue;
    w[i] = kind;
    need--;
  }
  for (let i = w.length - 1, extra = n - keep; i >= 0 && extra > 0; i--) {
    if (w[i] !== kind) continue;
    w[i] = 'boneGuard';
    extra--;
  }
}
