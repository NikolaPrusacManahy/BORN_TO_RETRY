// Update 0.3.15 — floor 6's crew's numbers (Skull Cove: tuning/foesCove.ts, foesCoveB.ts): their body radii and their
// stats as the knobs say now. The Corsair, the Shanty Man, the Bomber, the Cursed Crewman and its headless self (the
// Pirate Kit's characters, on their feet); the Thieving Gull and the Cave Bat (unused fliers, the Pigeon and the Bat);
// the Kraken Tentacle (it stands in the sea, never flinches); Mako and Captain Barbarossa (mini bosses: only a hard hit
// staggers them). Pure.
import { ENEMIES } from '../../tuning/enemies';
import { FOES_COVE } from '../../tuning/foesCove';
import { FOES_COVE_B } from '../../tuning/foesCoveB';
import { blank, EnemyStats, fill } from './kindStats';

export type KindCove = 'corsair' | 'shanty' | 'bomber' | 'crewman' | 'headless' | 'gull' | 'bat' | 'tentacle' | 'mako' | 'captain';
export const KINDS_COVE: readonly KindCove[] = ['corsair', 'shanty', 'bomber', 'crewman', 'headless', 'gull', 'bat', 'tentacle', 'mako', 'captain'];

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS_COVE: Record<KindCove, number> = { corsair: 0.45, shanty: 0.45, bomber: 0.5, crewman: 0.45, headless: 0.45, gull: 0.5, bat: 0.45, tentacle: 0.9, mako: 0.85, captain: 0.6 };

export const CACHE_COVE: Record<KindCove, EnemyStats> = {
  corsair: blank('small'),
  shanty: blank('small'),
  bomber: blank('small'),
  crewman: blank('small'),
  headless: blank('small'),
  gull: blank('air'),
  bat: blank('air'),
  tentacle: blank('large'),
  mako: blank('large'),
  captain: blank('large'),
};

/** A mini boss: only a hard hit staggers it, and it's dazed longer. */
const mini = (s: EnemyStats) => {
  s.stunned = 1.5;
  return s;
};

export const STATS_COVE: Record<KindCove, () => EnemyStats> = {
  corsair: () => fill(CACHE_COVE.corsair, FOES_COVE.v.corsairHp, RADIUS_COVE.corsair, 1.9, FOES_COVE.v.corsairSpeed, 1, 0, 0.3, 2.5, 1.5),
  shanty: () => fill(CACHE_COVE.shanty, FOES_COVE.v.shantyHp, RADIUS_COVE.shanty, 1.85, FOES_COVE.v.shantySpeed, 1, 0, 0.3, 2.5, 2),
  bomber: () => fill(CACHE_COVE.bomber, FOES_COVE.v.bomberHp, RADIUS_COVE.bomber, 1.95, FOES_COVE.v.bomberSpeed, 0.9, 0, 0.3, 2.5, 1.5),
  crewman: () => fill(CACHE_COVE.crewman, FOES_COVE.v.crewmanHp, RADIUS_COVE.crewman, 1.9, FOES_COVE.v.crewmanSpeed, 1, 0, 0.3, 2.5, 0),
  headless: () => fill(CACHE_COVE.headless, FOES_COVE.v.headlessHp, RADIUS_COVE.headless, 1.65, FOES_COVE.v.headlessSpeed, 1, 0, 0.25, 2.5, 1.5),
  gull: () => fill(CACHE_COVE.gull, FOES_COVE.v.gullHp, RADIUS_COVE.gull, 0.9, FOES_COVE.v.gullSpeed, 1.3, 0, 0.2, 2.5, 0.5),
  bat: () => fill(CACHE_COVE.bat, FOES_COVE.v.batHp, RADIUS_COVE.bat, 0.85, FOES_COVE.v.batSpeed, 1.3, 0, 0.15, 2, 0.25),
  tentacle: () => fill(CACHE_COVE.tentacle, FOES_COVE_B.v.tentacleHp, RADIUS_COVE.tentacle, FOES_COVE_B.v.tentacleHeight, 0, 0, Infinity, 0, 2, 4),
  mako: () => mini(fill(CACHE_COVE.mako, FOES_COVE_B.v.makoHp, RADIUS_COVE.mako, FOES_COVE_B.v.makoHeight, FOES_COVE_B.v.makoSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 3, FOES_COVE_B.v.makoCoins)),
  captain: () => mini(fill(CACHE_COVE.captain, FOES_COVE_B.v.captainHp, RADIUS_COVE.captain, FOES_COVE_B.v.captainHeight, FOES_COVE_B.v.captainSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 3, FOES_COVE_B.v.captainCoins)),
};
