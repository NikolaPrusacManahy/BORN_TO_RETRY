// Update 0.3.22 — floor 7's warband's numbers (Frozen Depths: tuning/foesNorse.ts, foesNorseB.ts; the More-enemies
// pack's people, tools/blender/export_people.py): their body radii and their stats as the knobs say now. The Raider,
// the Axe Thrower, the Draugr and the Barrow Maid (the frozen dead, a man and a woman: one kind of moves), the Völva;
// the Berserker and Haugbui (mini bosses: only a hard hit staggers them). Their heights count the hats, crests and horns
// over their heads (the model's height, a person's under it). The dead lie long: the Völva raises them. Pure.
// Update 0.3.26 — and their floor's boss, the Frost Roc (tuning/frostRoc.ts; frostRoc.ts): its death is a boss's show.
import { ENEMIES } from '../../tuning/enemies';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { FOES_NORSE_B } from '../../tuning/foesNorseB';
import { FROST_ROC } from '../../tuning/frostRoc';
import { BOSS } from '../../tuning/boss';
import { blank, DOOM_AFTER, doomTime, EnemyStats, fill } from './kindStats';

export type KindNorse = 'raider' | 'axeThrower' | 'draugr' | 'barrowMaid' | 'volva' | 'berserker' | 'haugbui' | 'frostRoc';
export const KINDS_NORSE: readonly KindNorse[] = ['raider', 'axeThrower', 'draugr', 'barrowMaid', 'volva', 'berserker', 'haugbui', 'frostRoc'];

/** The frozen dead: they rise from the snow, and the Völva raises them again. */
export const DEAD_KINDS: ReadonlySet<string> = new Set<KindNorse>(['draugr', 'barrowMaid']);

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS_NORSE: Record<KindNorse, number> = { raider: 0.45, axeThrower: 0.45, draugr: 0.45, barrowMaid: 0.45, volva: 0.45, berserker: 0.75, haugbui: 0.9, frostRoc: 1.8 };

export const CACHE_NORSE: Record<KindNorse, EnemyStats> = {
  raider: blank('small'),
  axeThrower: blank('small'),
  draugr: blank('small'),
  barrowMaid: blank('small'),
  volva: blank('small'),
  berserker: blank('large'),
  haugbui: blank('large'),
  frostRoc: blank('large', true),
};

/** A mini boss: only a hard hit staggers it, and it's dazed longer. */
const mini = (s: EnemyStats) => {
  s.stunned = 1.5;
  return s;
};

/** A body lies this long before its slot frees (s): the dead long enough to be raised. */
const LIE = 2.5;
const DEAD_LIE = 4;

export const STATS_NORSE: Record<KindNorse, () => EnemyStats> = {
  raider: () => fill(CACHE_NORSE.raider, FOES_NORSE.v.raiderHp, RADIUS_NORSE.raider, 2.05, FOES_NORSE.v.raiderSpeed, 1, 0, 0.3, LIE, 1.5),
  axeThrower: () => fill(CACHE_NORSE.axeThrower, FOES_NORSE.v.throwerHp, RADIUS_NORSE.axeThrower, 1.8, FOES_NORSE.v.throwerSpeed, 1, 0, 0.3, LIE, 1.5),
  draugr: () => fill(CACHE_NORSE.draugr, FOES_NORSE.v.draugrHp, RADIUS_NORSE.draugr, 1.85, FOES_NORSE.v.draugrSpeed, 1.1, 0, 0.3, DEAD_LIE, 1),
  barrowMaid: () => fill(CACHE_NORSE.barrowMaid, FOES_NORSE.v.draugrHp, RADIUS_NORSE.barrowMaid, 1.8, FOES_NORSE.v.draugrSpeed, 1.1, 0, 0.3, DEAD_LIE, 1),
  volva: () => fill(CACHE_NORSE.volva, FOES_NORSE.v.volvaHp, RADIUS_NORSE.volva, 2.4, FOES_NORSE.v.volvaSpeed, 1, 0, 0.3, LIE, 2),
  berserker: () => mini(fill(CACHE_NORSE.berserker, FOES_NORSE_B.v.berserkerHp, RADIUS_NORSE.berserker, 2.65, FOES_NORSE_B.v.berserkerSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, LIE, FOES_NORSE_B.v.berserkerCoins)),
  haugbui: () => mini(fill(CACHE_NORSE.haugbui, FOES_NORSE_B.v.haugbuiHp, RADIUS_NORSE.haugbui, 2.95, FOES_NORSE_B.v.haugbuiSpeed, 0.2, ENEMIES.v.bruteStagger, 0.4, LIE, FOES_NORSE_B.v.haugbuiCoins)),
  frostRoc: () => {
    const v = FROST_ROC.v;
    const s = fill(CACHE_NORSE.frostRoc, v.rocHp, RADIUS_NORSE.frostRoc, v.rocHeight, v.rocSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
};
