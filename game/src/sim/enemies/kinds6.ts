// Update 0.2.11 — floor 6's enemies' numbers (the Sunken Grove: tuning/foes6.ts, foes6b.ts, whale.ts): their body
// radii, how long each fish is (its hit capsule lies along it), and their stats as the knobs say now. The Clownfish,
// the Tuna, the Angelfish, the Dolphin (they swim: the 'air' grid); the Drowned Prince (the percher: a small Drowned
// King on its feet); the Manta Ray and the Shark (mini bosses: only a hard hit staggers them); the Old Whale (the
// boss). Update 0.3.16 — and Skull Cove's boss, the Big Shark (tuning/bigShark.ts), fought in its flooded arena. Pure.
import { BOSS } from '../../tuning/boss';
import { ENEMIES } from '../../tuning/enemies';
import { FOES6 } from '../../tuning/foes6';
import { FOES6B } from '../../tuning/foes6b';
import { WHALE } from '../../tuning/whale';
import { BIG_SHARK } from '../../tuning/bigShark';
import { blank, DOOM_AFTER, doomTime, EnemyStats, fill } from './kindStats';

export type Kind6 = 'clownfish' | 'tuna' | 'angelfish' | 'dolphin' | 'drownedPrince' | 'mantaRay' | 'shark' | 'whale' | 'bigShark';
export const KINDS6: readonly Kind6[] = ['clownfish', 'tuna', 'angelfish', 'dolphin', 'drownedPrince', 'mantaRay', 'shark', 'whale', 'bigShark'];

/** Body radii (m): a fish's is half its body's height (its hit capsule's). Not knobs: the walk grids are built for them. */
export const RADIUS6: Record<Kind6, number> = { clownfish: 0.4, tuna: 0.45, angelfish: 0.6, dolphin: 0.5, drownedPrince: 0.6, mantaRay: 0.9, shark: 0.7, whale: 2.25, bigShark: 1.6 };
/** How long each fish is, as a share of its body's height (its model's); 0: it stands (the Prince). */
const LONG: Record<Kind6, number> = { clownfish: 1.86, tuna: 3, angelfish: 1.64, dolphin: 3, drownedPrince: 0, mantaRay: 2.8, shark: 3, whale: 3, bigShark: 2.8 };
/** The kinds that swim (everything on floor 6 but the Prince). */
export const SWIMS: ReadonlySet<string> = new Set(KINDS6.filter((k) => LONG[k] > 0));
/** How long `kind`'s body is (m; 0: not a fish). */
export const fishLength = (kind: string, height: number) => (LONG[kind as Kind6] ?? 0) * height;

export const CACHE6: Record<Kind6, EnemyStats> = {
  clownfish: blank('air'),
  tuna: blank('air'),
  angelfish: blank('air'),
  dolphin: blank('air'),
  drownedPrince: blank('small'),
  mantaRay: blank('air'),
  shark: blank('air'),
  whale: blank('air', true),
  bigShark: blank('air', true),
};

export const STATS6: Record<Kind6, () => EnemyStats> = {
  clownfish: () => {
    const v = FOES6.v;
    return fill(CACHE6.clownfish, v.clownHp, RADIUS6.clownfish, v.clownHeight, v.clownSpeed, 1.3, 0, 0.2, 2.5, v.clownCoins);
  },
  tuna: () => {
    const v = FOES6.v;
    return fill(CACHE6.tuna, v.tunaHp, RADIUS6.tuna, v.tunaHeight, v.tunaSpeed, 0.8, 0, 0.25, 2.5, v.tunaCoins);
  },
  angelfish: () => {
    const v = FOES6.v;
    return fill(CACHE6.angelfish, v.angelHp, RADIUS6.angelfish, v.angelHeight, v.angelSpeed, 1, 0, 0.25, 2.5, v.angelCoins);
  },
  dolphin: () => {
    const v = FOES6.v;
    return fill(CACHE6.dolphin, v.dolphinHp, RADIUS6.dolphin, v.dolphinHeight, v.dolphinSpeed, 0.8, 0, 0.25, 2.5, v.dolphinCoins);
  },
  drownedPrince: () => {
    const v = FOES6.v;
    return fill(CACHE6.drownedPrince, v.princeHp, RADIUS6.drownedPrince, v.princeHeight, 2, 0.5, 0, 0.3, 1.6, v.princeCoins);
  },
  mantaRay: () => {
    const v = FOES6B.v;
    const s = fill(CACHE6.mantaRay, v.mantaHp, RADIUS6.mantaRay, v.mantaHeight, v.mantaSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 3, v.mantaCoins);
    s.stunned = 1.5;
    return s;
  },
  shark: () => {
    const v = FOES6B.v;
    const s = fill(CACHE6.shark, v.sharkHp, RADIUS6.shark, v.sharkHeight, v.sharkSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 3, v.sharkCoins);
    s.stunned = 1.5;
    return s;
  },
  whale: () => {
    const v = WHALE.v;
    const s = fill(CACHE6.whale, v.whaleHp, RADIUS6.whale, v.whaleHeight, v.whaleSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
  bigShark: () => {
    const v = BIG_SHARK.v;
    const s = fill(CACHE6.bigShark, v.bigHp, RADIUS6.bigShark, v.bigHeight, v.bigSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
};
