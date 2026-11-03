// Update 0.3.33 — floor 8's martial artists' numbers (the Shrine Dimension: tuning/foesShrine.ts, foesShrineB.ts; the
// More-enemies pack's people with the Universal Animation Library's clips, tools/ual_people.py): their body radii and
// their stats as the knobs say now. The Karateka and the Karate Girl, the Shinobi, the Kunoichi, the Sand Ninja (a man
// and a woman: one kind of moves), the Archer; the Sensei and the Shadow (mini bosses: only a hard hit staggers them),
// and the Shadow's clones (one hit ends one). Their heights count the hair and headbands over their heads. Pure.
import { ENEMIES } from '../../tuning/enemies';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { FOES_SHRINE_B } from '../../tuning/foesShrineB';
import { blank, EnemyStats, fill } from './kindStats';

export type KindShrine = 'karateka' | 'karateGirl' | 'shinobi' | 'kunoichi' | 'sandNinja' | 'sandNinjaF' | 'archer' | 'sensei' | 'shadow' | 'shadowClone';
export const KINDS_SHRINE: readonly KindShrine[] = ['karateka', 'karateGirl', 'shinobi', 'kunoichi', 'sandNinja', 'sandNinjaF', 'archer', 'sensei', 'shadow', 'shadowClone'];

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS_SHRINE: Record<KindShrine, number> = { karateka: 0.45, karateGirl: 0.45, shinobi: 0.45, kunoichi: 0.45, sandNinja: 0.45, sandNinjaF: 0.45, archer: 0.45, sensei: 0.75, shadow: 0.75, shadowClone: 0.45 };

export const CACHE_SHRINE: Record<KindShrine, EnemyStats> = {
  karateka: blank('small'),
  karateGirl: blank('small'),
  shinobi: blank('small'),
  kunoichi: blank('small'),
  sandNinja: blank('small'),
  sandNinjaF: blank('small'),
  archer: blank('small'),
  sensei: blank('large'),
  shadow: blank('large'),
  shadowClone: blank('small'),
};

/** A mini boss: only a hard hit staggers it, and it's dazed longer. */
const mini = (s: EnemyStats) => {
  s.stunned = 1.5;
  return s;
};

/** A body lies this long before its slot frees (s); a clone fades at once. */
const LIE = 2.5;

export const STATS_SHRINE: Record<KindShrine, () => EnemyStats> = {
  karateka: () => fill(CACHE_SHRINE.karateka, FOES_SHRINE.v.karatekaHp, RADIUS_SHRINE.karateka, 1.95, FOES_SHRINE.v.karatekaSpeed, 1, 0, 0.32, LIE, 1.5),
  karateGirl: () => fill(CACHE_SHRINE.karateGirl, FOES_SHRINE.v.karateGirlHp, RADIUS_SHRINE.karateGirl, 1.85, FOES_SHRINE.v.karateGirlSpeed, 1, 0, 0.28, LIE, 1.5),
  shinobi: () => fill(CACHE_SHRINE.shinobi, FOES_SHRINE.v.shinobiHp, RADIUS_SHRINE.shinobi, 1.95, FOES_SHRINE.v.shinobiSpeed, 1, 0, 0.3, LIE, 1.5),
  kunoichi: () => fill(CACHE_SHRINE.kunoichi, FOES_SHRINE.v.kunoichiHp, RADIUS_SHRINE.kunoichi, 1.85, FOES_SHRINE.v.kunoichiSpeed, 1, 0, 0.28, LIE, 1.5),
  sandNinja: () => fill(CACHE_SHRINE.sandNinja, FOES_SHRINE.v.sandHp, RADIUS_SHRINE.sandNinja, 1.9, FOES_SHRINE.v.sandSpeed, 1, 0, 0.3, LIE, 1.5),
  sandNinjaF: () => fill(CACHE_SHRINE.sandNinjaF, FOES_SHRINE.v.sandHp, RADIUS_SHRINE.sandNinjaF, 1.85, FOES_SHRINE.v.sandSpeed, 1, 0, 0.3, LIE, 1.5),
  archer: () => fill(CACHE_SHRINE.archer, FOES_SHRINE.v.archerHp, RADIUS_SHRINE.archer, 1.85, FOES_SHRINE.v.archerSpeed, 1, 0, 0.3, LIE, 1.5),
  sensei: () => mini(fill(CACHE_SHRINE.sensei, FOES_SHRINE_B.v.senseiHp, RADIUS_SHRINE.sensei, 3.1, FOES_SHRINE_B.v.senseiSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, LIE, FOES_SHRINE_B.v.senseiCoins)),
  shadow: () => mini(fill(CACHE_SHRINE.shadow, FOES_SHRINE_B.v.shadowHp, RADIUS_SHRINE.shadow, 2.9, FOES_SHRINE_B.v.shadowSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, LIE, FOES_SHRINE_B.v.shadowCoins)),
  shadowClone: () => fill(CACHE_SHRINE.shadowClone, FOES_SHRINE_B.v.cloneHp, RADIUS_SHRINE.shadowClone, 2.2, FOES_SHRINE_B.v.shadowSpeed, 1.2, 0, 0.2, 0.4, 0),
};
