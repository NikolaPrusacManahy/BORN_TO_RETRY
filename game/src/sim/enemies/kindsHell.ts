// Update 0.5.4 — floor 10's own fighters' numbers (Hell on Earth: tuning/foesHell.ts; the Bestiary pack's monsters on the Universal Animation
// Library's skeleton, tools/ual_bake.py): their body radii and their stats as the knobs say now. The Imp (lanky, a spiked mace), the Puglin
// (squat and tusked, a club, about a metre tall), the Bone Axeman (a horned helm, an axe: heavy, only a hard blow makes it flinch) and the
// Bone Guard (a helm, a sword, its guard). Their heights are their models' (the Puglin's a little taller, to a metre). Pure.
import { FOES_HELL } from '../../tuning/foesHell';
import { blank, EnemyStats, fill } from './kindStats';

export type KindHell = 'imp' | 'puglin' | 'boneAxeman' | 'boneGuard';
export const KINDS_HELL: readonly KindHell[] = ['imp', 'puglin', 'boneAxeman', 'boneGuard'];

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS_HELL: Record<KindHell, number> = { imp: 0.45, puglin: 0.4, boneAxeman: 0.45, boneGuard: 0.45 };

export const CACHE_HELL: Record<KindHell, EnemyStats> = {
  imp: blank('small'),
  puglin: blank('small'),
  boneAxeman: blank('small'),
  boneGuard: blank('small'),
};

/** A body lies this long before its slot frees (s). */
const LIE = 2.5;

export const STATS_HELL: Record<KindHell, () => EnemyStats> = {
  imp: () => fill(CACHE_HELL.imp, FOES_HELL.v.impHp, RADIUS_HELL.imp, 1.68, FOES_HELL.v.impSpeed, 1, 0, 0.3, LIE, 1.5),
  puglin: () => fill(CACHE_HELL.puglin, FOES_HELL.v.puglinHp, RADIUS_HELL.puglin, 1, FOES_HELL.v.puglinSpeed, 1.2, 0, 0.28, LIE, 1),
  boneAxeman: () => fill(CACHE_HELL.boneAxeman, FOES_HELL.v.axemanHp, RADIUS_HELL.boneAxeman, 1.79, FOES_HELL.v.axemanSpeed, 0.6, FOES_HELL.v.axemanStagger, 0.4, LIE, 2),
  boneGuard: () => fill(CACHE_HELL.boneGuard, FOES_HELL.v.guardHp, RADIUS_HELL.boneGuard, 1.82, FOES_HELL.v.guardSpeed, 0.8, 0, 0.32, LIE, 2),
};
