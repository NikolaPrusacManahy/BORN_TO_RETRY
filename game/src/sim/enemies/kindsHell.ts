// Update 0.5.4 — floor 10's own fighters' numbers (Hell on Earth: tuning/foesHell.ts; the Bestiary pack's monsters on the Universal Animation
// Library's skeleton, tools/ual_bake.py): their body radii and their stats as the knobs say now. The Imp (lanky, a spiked mace), the Puglin
// (squat and tusked, a club, about a metre tall), the Bone Axeman (a horned helm, an axe: heavy, only a hard blow makes it flinch) and the
// Bone Guard (a helm, a sword, its guard). Their heights are their models' (the Puglin's a little taller, to a metre).
// Update 0.5.5 — the second batch (tuning/foesHellB.ts; Ultimate Monsters in Hell's colours, tools/hell_paint.py): the Cinder Chicken (light,
// thrown far by a blow), the Brimstone Bee (a flier), and the mini bosses (only a hard hit staggers them): the Pit Fiend (floor 1's old Demon,
// smaller) and the Spore Lord. Pure.
import { ENEMIES } from '../../tuning/enemies';
import { FOES_HELL } from '../../tuning/foesHell';
import { FOES_HELL_B } from '../../tuning/foesHellB';
import { blank, EnemyStats, fill } from './kindStats';

export type KindHell = 'imp' | 'puglin' | 'boneAxeman' | 'boneGuard' | 'cinderChicken' | 'brimBee' | 'pitFiend' | 'sporeLord';
export const KINDS_HELL: readonly KindHell[] = ['imp', 'puglin', 'boneAxeman', 'boneGuard', 'cinderChicken', 'brimBee', 'pitFiend', 'sporeLord'];

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS_HELL: Record<KindHell, number> = { imp: 0.45, puglin: 0.4, boneAxeman: 0.45, boneGuard: 0.45, cinderChicken: 0.4, brimBee: 0.55, pitFiend: 1, sporeLord: 1 };

export const CACHE_HELL: Record<KindHell, EnemyStats> = {
  imp: blank('small'),
  puglin: blank('small'),
  boneAxeman: blank('small'),
  boneGuard: blank('small'),
  cinderChicken: blank('small'),
  brimBee: blank('air'),
  pitFiend: blank('large'),
  sporeLord: blank('large'),
};

/** A mini boss: only a hard hit staggers it, and stunned it takes more. */
const mini = (s: EnemyStats) => {
  s.stunned = 1.5;
  return s;
};

/** A body lies this long before its slot frees (s). */
const LIE = 2.5;

export const STATS_HELL: Record<KindHell, () => EnemyStats> = {
  imp: () => fill(CACHE_HELL.imp, FOES_HELL.v.impHp, RADIUS_HELL.imp, 1.68, FOES_HELL.v.impSpeed, 1, 0, 0.3, LIE, 1.5),
  puglin: () => fill(CACHE_HELL.puglin, FOES_HELL.v.puglinHp, RADIUS_HELL.puglin, 1, FOES_HELL.v.puglinSpeed, 1.2, 0, 0.28, LIE, 1),
  boneAxeman: () => fill(CACHE_HELL.boneAxeman, FOES_HELL.v.axemanHp, RADIUS_HELL.boneAxeman, 1.79, FOES_HELL.v.axemanSpeed, 0.6, FOES_HELL.v.axemanStagger, 0.4, LIE, 2),
  boneGuard: () => fill(CACHE_HELL.boneGuard, FOES_HELL.v.guardHp, RADIUS_HELL.boneGuard, 1.82, FOES_HELL.v.guardSpeed, 0.8, 0, 0.32, LIE, 2),
  // (Its body lies no time: it bursts: cinderChicken.ts.)
  cinderChicken: () => fill(CACHE_HELL.cinderChicken, FOES_HELL_B.v.chickenHp, RADIUS_HELL.cinderChicken, 0.95, FOES_HELL_B.v.chickenSpeed, FOES_HELL_B.v.chickenFly, 0, 0.25, 1.5, 1),
  brimBee: () => fill(CACHE_HELL.brimBee, FOES_HELL_B.v.beeHp, RADIUS_HELL.brimBee, 1.2, FOES_HELL_B.v.beeSpeed, 1, 0, 0.3, LIE, 1.5),
  pitFiend: () => mini(fill(CACHE_HELL.pitFiend, FOES_HELL_B.v.fiendHp, RADIUS_HELL.pitFiend, FOES_HELL_B.v.fiendHeight, FOES_HELL_B.v.fiendSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, LIE, FOES_HELL_B.v.fiendCoins)),
  sporeLord: () => mini(fill(CACHE_HELL.sporeLord, FOES_HELL_B.v.sporeHp, RADIUS_HELL.sporeLord, FOES_HELL_B.v.sporeHeight, FOES_HELL_B.v.sporeSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, LIE, FOES_HELL_B.v.sporeCoins)),
};
