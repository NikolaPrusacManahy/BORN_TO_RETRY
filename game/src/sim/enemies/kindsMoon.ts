// Update 0.3.18 — floor 8's crew's numbers (the Moon: tuning/foesMoon.ts, foesMoonB.ts): their body radii and their
// stats as the knobs say now. On foot, the Space Kit's astronauts: the Gunner (Fernando the Flamingo), the Flanker (Rae
// the Red Panda, the designer's Fox), the Leaper (Finn the Frog); in their tiny ships (a wasp's size): the Strafer, the
// Diver, the Mine-layer. The mini bosses: Barbara the Bee's ship, her mech, and Barbara herself on foot once the mech is
// broken (never sent: the mech becomes her). Only a hard hit staggers a mini boss. Pure.
import { ENEMIES } from '../../tuning/enemies';
import { FOES_MOON } from '../../tuning/foesMoon';
import { FOES_MOON_B } from '../../tuning/foesMoonB';
import { blank, EnemyStats, fill } from './kindStats';

export type KindMoon = 'gunner' | 'flanker' | 'hopper' | 'strafer' | 'diver' | 'mineLayer' | 'beeShip' | 'beeMech' | 'beeNaut';
export const KINDS_MOON: readonly KindMoon[] = ['gunner', 'flanker', 'hopper', 'strafer', 'diver', 'mineLayer', 'beeShip', 'beeMech', 'beeNaut'];

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS_MOON: Record<KindMoon, number> = { gunner: 0.45, flanker: 0.45, hopper: 0.5, strafer: 0.5, diver: 0.5, mineLayer: 0.55, beeShip: 1.3, beeMech: 1.2, beeNaut: 0.5 };

export const CACHE_MOON: Record<KindMoon, EnemyStats> = {
  gunner: blank('small'),
  flanker: blank('small'),
  hopper: blank('small'),
  strafer: blank('air'),
  diver: blank('air'),
  mineLayer: blank('air'),
  beeShip: blank('air'),
  beeMech: blank('large'),
  beeNaut: blank('small'),
};

/** A mini boss: only a hard hit staggers it, and it's dazed longer. */
const mini = (s: EnemyStats) => {
  s.stunned = 1.5;
  return s;
};

/** The astronauts stand this tall (m: a person's height); the tiny ships this tall (a wasp's size: about a metre long). */
const NAUT = 1.9;

export const STATS_MOON: Record<KindMoon, () => EnemyStats> = {
  gunner: () => fill(CACHE_MOON.gunner, FOES_MOON.v.gunnerHp, RADIUS_MOON.gunner, NAUT, FOES_MOON.v.gunnerSpeed, 1, 0, 0.3, 2.5, 1.5),
  flanker: () => fill(CACHE_MOON.flanker, FOES_MOON.v.flankerHp, RADIUS_MOON.flanker, NAUT, FOES_MOON.v.flankerSpeed, 1.1, 0, 0.25, 2.5, 1.5),
  hopper: () => fill(CACHE_MOON.hopper, FOES_MOON.v.hopperHp, RADIUS_MOON.hopper, NAUT, FOES_MOON.v.hopperSpeed, 0.9, 0, 0.3, 2.5, 2),
  strafer: () => fill(CACHE_MOON.strafer, FOES_MOON.v.straferHp, RADIUS_MOON.strafer, 0.28, FOES_MOON.v.shipSpeed, 1.3, 0, 0.15, 2, 0.5),
  diver: () => fill(CACHE_MOON.diver, FOES_MOON.v.diverHp, RADIUS_MOON.diver, 0.26, FOES_MOON.v.shipSpeed * 1.2, 1.3, 0, 0.15, 2, 0.5),
  mineLayer: () => fill(CACHE_MOON.mineLayer, FOES_MOON.v.layerHp, RADIUS_MOON.mineLayer, 0.34, FOES_MOON.v.shipSpeed * 0.6, 1.3, 0, 0.15, 2, 0.5),
  beeShip: () => mini(fill(CACHE_MOON.beeShip, FOES_MOON_B.v.beeShipHp, RADIUS_MOON.beeShip, 2.2, FOES_MOON_B.v.beeShipSpeed, 0.2, ENEMIES.v.bruteStagger, 0.4, 3, FOES_MOON_B.v.beeShipCoins)),
  beeMech: () => mini(fill(CACHE_MOON.beeMech, FOES_MOON_B.v.mechHp, RADIUS_MOON.beeMech, 3.2, FOES_MOON_B.v.mechSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, 0)),
  beeNaut: () => mini(fill(CACHE_MOON.beeNaut, FOES_MOON_B.v.nautHp, RADIUS_MOON.beeNaut, NAUT, FOES_MOON_B.v.nautSpeed, 0.8, ENEMIES.v.bruteStagger, 0.3, 2.5, FOES_MOON_B.v.mechCoins)),
};
