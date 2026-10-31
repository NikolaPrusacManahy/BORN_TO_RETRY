// Update 0.2.10 — floor 5's enemies' numbers (the Drowned Temple: tuning/foes5.ts, foes5b.ts, drowned.ts), out of
// kinds.ts, which had reached its size: their body radii, and their stats as the knobs say now (each its own object,
// refilled). The Snapper, the Urchin, the Spawnling; the Jelly, the Glub, the Big Glub and the Squidle (fliers); the
// Deep One and the Bog Brute (mini bosses: only a hard hit staggers them); the Drowned King (the boss). Pure.
import { BOSS } from '../../tuning/boss';
import { ENEMIES } from '../../tuning/enemies';
import { FOES5 } from '../../tuning/foes5';
import { FOES5B } from '../../tuning/foes5b';
import { DROWNED } from '../../tuning/drowned';
import { blank, DOOM_AFTER, doomTime, EnemyStats, fill } from './kindStats';

type Kind5 = 'snapper' | 'urchin' | 'jelly' | 'glub' | 'bigGlub' | 'squidle' | 'spawnling' | 'deepOne' | 'bogBrute' | 'drownedKing';

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS5: Record<Kind5, number> = { snapper: 0.5, urchin: 0.55, jelly: 0.55, glub: 0.5, bigGlub: 0.75, squidle: 0.6, spawnling: 0.4, deepOne: 1.1, bogBrute: 1.1, drownedKing: 1.8 };

export const CACHE5: Record<Kind5, EnemyStats> = {
  snapper: blank('small'),
  urchin: blank('small'),
  jelly: blank('air'),
  glub: blank('air'),
  bigGlub: blank('air'),
  squidle: blank('air'),
  spawnling: blank('small'),
  deepOne: blank('large'),
  bogBrute: blank('large'),
  drownedKing: blank('large', true),
};

export const STATS5: Record<Kind5, () => EnemyStats> = {
  snapper: () => {
    const v = FOES5.v;
    return fill(CACHE5.snapper, v.snapperHp, RADIUS5.snapper, v.snapperHeight, v.snapperSpeed, 0.9, 0, 0.25, 1.2, v.snapperCoins);
  },
  urchin: () => {
    const v = FOES5.v;
    return fill(CACHE5.urchin, v.urchinHp, RADIUS5.urchin, v.urchinHeight, v.urchinSpeed, 0.6, 0, 0.3, 1.2, v.urchinCoins);
  },
  jelly: () => {
    const v = FOES5.v;
    return fill(CACHE5.jelly, v.jellyHp, RADIUS5.jelly, v.jellyHeight, v.jellySpeed, 1, 0, 0.25, 1.2, v.jellyCoins);
  },
  glub: () => {
    const v = FOES5.v;
    return fill(CACHE5.glub, v.glubHp, RADIUS5.glub, v.glubHeight, v.glubSpeed, 1.2, 0, 0.25, 1.4, v.glubCoins);
  },
  bigGlub: () => {
    const v = FOES5.v;
    return fill(CACHE5.bigGlub, v.bigGlubHp, RADIUS5.bigGlub, v.bigGlubHeight, v.bigGlubSpeed, 0.6, 0, 0.3, 1.4, v.bigGlubCoins);
  },
  squidle: () => {
    const v = FOES5.v;
    return fill(CACHE5.squidle, v.squidleHp, RADIUS5.squidle, v.squidleHeight, v.squidleSpeed, 1, 0, 0.25, 1.4, v.squidleCoins);
  },
  spawnling: () => {
    const v = FOES5.v;
    return fill(CACHE5.spawnling, v.spawnHp, RADIUS5.spawnling, v.spawnHeight, v.spawnSpeed, 1.3, 0, 0.2, 1, v.spawnCoins);
  },
  deepOne: () => {
    const v = FOES5B.v;
    return fill(CACHE5.deepOne, v.deepHp, RADIUS5.deepOne, v.deepHeight, v.deepSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.deepCoins);
  },
  bogBrute: () => {
    const v = FOES5B.v;
    return fill(CACHE5.bogBrute, v.bogHp, RADIUS5.bogBrute, v.bogHeight, v.bogSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.bogCoins);
  },
  drownedKing: () => {
    const v = DROWNED.v;
    const s = fill(CACHE5.drownedKing, v.kingHp, RADIUS5.drownedKing, v.kingHeight, v.kingSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
};
