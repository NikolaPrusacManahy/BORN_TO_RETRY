// Update 0.0.12 — the enemy catalog (design §9): every kind's numbers in one place, read from tuning/enemies.ts. A new
// kind is a new entry here (the compiler then asks for it everywhere: its update, its model, its sounds).
// Update 0.0.13 — the Leaper, and two fliers: the Stinger and the Wraith (tuning/foes.ts). Fliers find their way on
// their own grid (only walls and columns reach up to them).
// Update 0.0.15 — the Demon, the first boss (tuning/boss.ts): big, never flinches, takes more while stunned.
// Update 0.0.18 — floor 2's enemies (tuning/foes2.ts): the Slime, the Frog, the Snake, the Wasp (a flier), and the big
// Spider and Blue Demon (only a hard hit staggers them); and floor 2's boss, the Dragon (tuning/dragon.ts).
// Update 0.1.19 — floor 3's (tuning/foes3.ts): the Skeleton (it rebuilds itself), the Mushnub, and the Ninja, a mini
// boss (only a hard hit staggers it; it teleports away from some).
// Update 0.2.3 — floor 3's boss, the Bone King (tuning/boneKing.ts): a massive Skeleton with two lives.
// Update 0.2.4 — floor 4's (tuning/foes4.ts): the Tribal, the Cactoro, the big Cactoro (a mini boss), the Hywirl (a
// flier), the Dino (the Dino's model, small: the designer didn't see a boss in it); and its boss, the Dino
// (tuning/dino.ts), waiting for a better model.
// Update 0.2.7 — floor 3's newcomers (tuning/foes3b.ts): the Dragonling and the Skull Wraith (fliers), the White Rabbit,
// and the Big Mushnub (a mini boss: only a hard hit staggers it).
// Update 0.2.10 — floor 5's, the Drowned Temple (tuning/foes5.ts, foes5b.ts): the Snapper, the Urchin, the Spawnling;
// the Jelly, the Glub, the Big Glub and the Squidle (fliers); the Deep One and the Bog Brute (mini bosses); and its
// boss, the Drowned King (tuning/drowned.ts): their numbers are kinds5.ts's; what every kind's numbers are, and how
// they're filled, kindStats.ts's.
// Update 0.2.11 — floor 6's, the Sunken Grove (tuning/foes6.ts, foes6b.ts, whale.ts): the Clownfish, the Tuna, the
// Angelfish, the Dolphin (they swim), the Drowned Prince (the percher), the Manta Ray and the Shark (mini bosses); its
// boss, the Old Whale. Their numbers are kinds6.ts's.
import { BOSS } from '../../tuning/boss';
import { blank, DOOM_AFTER, doomTime, EnemyStats, fill, SizeClass } from './kindStats';
import { CACHE5, RADIUS5, STATS5 } from './kinds5';
import { CACHE6, RADIUS6, STATS6 } from './kinds6';
import { DRAGON } from '../../tuning/dragon';
import { FOES2 } from '../../tuning/foes2';
import { ENEMIES } from '../../tuning/enemies';
import { FOES } from '../../tuning/foes';
import { FOES3 } from '../../tuning/foes3';
import { FOES3B } from '../../tuning/foes3b';
import { BONE_KING } from '../../tuning/boneKing';
import { FOES4 } from '../../tuning/foes4';
import { DINO } from '../../tuning/dino';

export type { EnemyStats, SizeClass } from './kindStats';
export { doomTime, DOOM_AFTER } from './kindStats';

export type EnemyKind = 'grunt' | 'spitter' | 'brute' | 'leaper' | 'stinger' | 'wraith' | 'demon' | 'slime' | 'frog' | 'snake' | 'wasp' | 'spider' | 'blueDemon' | 'dragon' | 'skeleton' | 'mushnub' | 'ninja' | 'boneKing' | 'tribal' | 'cactoro' | 'cactoroBig' | 'hywirl' | 'dino' | 'dinoBlob' | 'lizard' | 'greenBlob' | 'blobling' | 'maskTribal' | 'skullOrc' | 'dragonling' | 'skullWraith' | 'rabbit' | 'bigMushnub' | 'snapper' | 'urchin' | 'jelly' | 'glub' | 'bigGlub' | 'squidle' | 'spawnling' | 'deepOne' | 'bogBrute' | 'drownedKing' | 'clownfish' | 'tuna' | 'angelfish' | 'dolphin' | 'drownedPrince' | 'mantaRay' | 'shark' | 'whale';

export const ENEMY_KINDS: readonly EnemyKind[] = ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith', 'demon', 'slime', 'frog', 'snake', 'wasp', 'spider', 'blueDemon', 'dragon', 'skeleton', 'mushnub', 'ninja', 'boneKing', 'tribal', 'cactoro', 'cactoroBig', 'hywirl', 'dino', 'dinoBlob', 'lizard', 'greenBlob', 'blobling', 'maskTribal', 'skullOrc', 'dragonling', 'skullWraith', 'rabbit', 'bigMushnub', 'snapper', 'urchin', 'jelly', 'glub', 'bigGlub', 'squidle', 'spawnling', 'deepOne', 'bogBrute', 'drownedKing', 'clownfish', 'tuna', 'angelfish', 'dolphin', 'drownedPrince', 'mantaRay', 'shark', 'whale'];
export const SIZE_CLASSES: readonly SizeClass[] = ['small', 'large', 'air'];

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS: Record<EnemyKind, number> = { grunt: 0.45, spitter: 0.4, brute: 0.85, leaper: 0.45, stinger: 0.5, wraith: 0.55, demon: 1.7, slime: 0.5, frog: 0.55, snake: 0.4, wasp: 0.5, spider: 1.3, blueDemon: 0.85, dragon: 1.8, skeleton: 0.45, mushnub: 0.45, ninja: 0.45, boneKing: 1.5, tribal: 0.45, cactoro: 0.5, cactoroBig: 1.1, hywirl: 0.55, dino: 1.8, dinoBlob: 0.5, lizard: 0.5, greenBlob: 0.6, blobling: 0.4, maskTribal: 0.55, skullOrc: 1, dragonling: 0.55, skullWraith: 0.55, rabbit: 0.45, bigMushnub: 1.05, ...RADIUS5, ...RADIUS6 };
/** The grid each size class walks: blocked for this radius (a little less than the brute's, so 2 m gaps stay open:
 *  the push out of walls keeps its body clear anyway). */
export const GRID_RADIUS: Record<SizeClass, number> = { small: 0.45, large: 0.65, air: 0.6 };

const CACHE: Record<EnemyKind, EnemyStats> = {
  grunt: blank('small'),
  spitter: blank('small'),
  brute: blank('large'),
  leaper: blank('small'),
  stinger: blank('air'),
  wraith: blank('air'),
  demon: blank('large', true),
  slime: blank('small'),
  frog: blank('small'),
  snake: blank('small'),
  wasp: blank('air'),
  spider: blank('large'),
  blueDemon: blank('large'),
  dragon: blank('large', true),
  skeleton: blank('small'),
  mushnub: blank('small'),
  boneKing: blank('large', true),
  tribal: blank('small'),
  cactoro: blank('small'),
  cactoroBig: blank('large'),
  hywirl: blank('air'),
  dino: blank('large', true),
  dinoBlob: blank('small'),
  lizard: blank('small'),
  greenBlob: blank('small'),
  blobling: blank('small'),
  maskTribal: blank('air'),
  skullOrc: blank('large'),
  ninja: blank('small'),
  dragonling: blank('air'),
  skullWraith: blank('air'),
  rabbit: blank('small'),
  bigMushnub: blank('large'),
  ...CACHE5,
  ...CACHE6,
};


/** A kind's numbers as the knobs say now (one object per kind, refilled: nothing is made per call). */
export const ENEMY_STATS: Record<EnemyKind, () => EnemyStats> = {
  grunt: () => {
    const v = ENEMIES.v;
    return fill(CACHE.grunt, v.gruntHp, RADIUS.grunt, v.gruntHeight, v.gruntSpeed, v.gruntKnock, 0, v.gruntFlinch, v.gruntDeathTime, v.gruntCoins);
  },
  spitter: () => {
    const v = ENEMIES.v;
    return fill(CACHE.spitter, v.spitterHp, RADIUS.spitter, v.spitterHeight, v.spitterSpeed, v.spitterKnock, 0, v.spitterFlinch, 1.2, v.spitterCoins);
  },
  brute: () => {
    const v = ENEMIES.v;
    return fill(CACHE.brute, v.bruteHp, RADIUS.brute, v.bruteHeight, v.bruteSpeed, v.bruteKnock, v.bruteStagger, v.bruteFlinch, 2, v.bruteCoins);
  },
  leaper: () => {
    const v = FOES.v;
    return fill(CACHE.leaper, v.leaperHp, RADIUS.leaper, v.leaperHeight, v.leaperSpeed, v.leaperKnock, 0, v.leaperFlinch, 1.4, v.leaperCoins);
  },
  stinger: () => {
    const v = FOES.v;
    return fill(CACHE.stinger, v.stingerHp, RADIUS.stinger, v.stingerHeight, v.stingerSpeed, v.stingerKnock, 0, v.stingerFlinch, 1.4, v.stingerCoins);
  },
  wraith: () => {
    const v = FOES.v;
    return fill(CACHE.wraith, v.wraithHp, RADIUS.wraith, v.wraithHeight, v.wraithSpeed, v.wraithKnock, 0, v.wraithFlinch, 1.4, v.wraithCoins);
  },
  demon: () => {
    const v = BOSS.v;
    // Never flinches, barely slides; its coins burst out when its body does (bossRoom.ts), not on the killing hit.
    const s = fill(CACHE.demon, v.demonHp, RADIUS.demon, v.demonHeight, v.demonSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = v.stunBonus;
    return s;
  },
  // Update 0.0.18 — floor 2's.
  slime: () => {
    const v = FOES2.v;
    return fill(CACHE.slime, v.slimeHp, RADIUS.slime, v.slimeHeight, v.slimeSpeed, 1.2, 0, 0.2, 1.2, v.slimeCoins);
  },
  frog: () => {
    const v = FOES2.v;
    return fill(CACHE.frog, v.frogHp, RADIUS.frog, v.frogHeight, v.frogSpeed, 0.8, 0, 0.3, 1.4, v.frogCoins);
  },
  snake: () => {
    const v = FOES2.v;
    return fill(CACHE.snake, v.snakeHp, RADIUS.snake, v.snakeHeight, v.snakeSpeed, 0.9, 0, 0.25, 1.4, v.snakeCoins);
  },
  wasp: () => {
    const v = FOES2.v;
    return fill(CACHE.wasp, v.waspHp, RADIUS.wasp, v.waspHeight, v.waspSpeed, 1, 0, 0.3, 1.4, v.waspCoins);
  },
  spider: () => {
    const v = FOES2.v;
    return fill(CACHE.spider, v.spiderHp, RADIUS.spider, v.spiderHeight, v.spiderSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.spiderCoins);
  },
  blueDemon: () => {
    const v = FOES2.v;
    const s = fill(CACHE.blueDemon, v.blueHp, RADIUS.blueDemon, v.blueHeight, v.blueSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.blueCoins);
    s.stunned = 1.5;
    return s;
  },
  // Update 0.0.18 — floor 2's boss: like the Demon, never flinches, and takes more while stunned.
  dragon: () => {
    const v = DRAGON.v;
    const s = fill(CACHE.dragon, v.dragonHp, RADIUS.dragon, v.dragonHeight, v.dragonSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
  // Update 0.1.19 — floor 3's. The Ninja: only a hard hit staggers it (as a Yeti's).
  skeleton: () => {
    const v = FOES3.v;
    return fill(CACHE.skeleton, v.skeletonHp, RADIUS.skeleton, v.skeletonHeight, v.skeletonSpeed, 0.8, 0, 0.25, 1.4, v.skeletonCoins);
  },
  mushnub: () => {
    const v = FOES3.v;
    return fill(CACHE.mushnub, v.mushnubHp, RADIUS.mushnub, v.mushnubHeight, v.mushnubSpeed, 1, 0, 0.25, 1.2, v.mushnubCoins);
  },
  ninja: () => {
    const v = FOES3.v;
    return fill(CACHE.ninja, v.ninjaHp, RADIUS.ninja, v.ninjaHeight, v.ninjaSpeed, 0.4, ENEMIES.v.bruteStagger, 0.35, 1.6, v.ninjaCoins);
  },
  // Update 0.2.3 — floor 3's boss: like the Demon, never flinches, and takes more while stunned.
  boneKing: () => {
    const v = BONE_KING.v;
    const s = fill(CACHE.boneKing, v.kingHp, RADIUS.boneKing, v.kingHeight, v.kingSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
  // Update 0.2.4 — floor 4's. The big Cactoro: only a hard hit staggers it (as a Yeti's). The Dino: a boss.
  tribal: () => {
    const v = FOES4.v;
    return fill(CACHE.tribal, v.tribalHp, RADIUS.tribal, v.tribalHeight, v.tribalSpeed, 0.9, 0, 0.3, 1.4, v.tribalCoins);
  },
  cactoro: () => {
    const v = FOES4.v;
    return fill(CACHE.cactoro, v.cactoroHp, RADIUS.cactoro, v.cactoroHeight, v.cactoroDig, 0.8, 0, 0.25, 1.2, v.cactoroCoins);
  },
  cactoroBig: () => {
    const v = FOES4.v;
    return fill(CACHE.cactoroBig, v.bigHp, RADIUS.cactoroBig, v.bigHeight, v.bigSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.bigCoins);
  },
  hywirl: () => {
    const v = FOES4.v;
    return fill(CACHE.hywirl, v.hywirlHp, RADIUS.hywirl, v.hywirlHeight, v.hywirlSpeed, 1, 0, 0.25, 1.4, v.hywirlCoins);
  },
  // (The Dino: the Dino's model, small.)
  dinoBlob: () => {
    const v = FOES4.v;
    return fill(CACHE.dinoBlob, v.dinoBlobHp, RADIUS.dinoBlob, v.dinoBlobHeight, v.dinoBlobSpeed, 0.9, 0, 0.25, 1.4, v.dinoBlobCoins);
  },
  // Update 0.2.4 (the designer's third list) — the Lizard, the Green Blob and the Bloblings it splits into, the Flying
  // Tribal, the Skull Orc (a mini boss: only a hard hit staggers it).
  lizard: () => {
    const v = FOES4.v;
    return fill(CACHE.lizard, v.lizardHp, RADIUS.lizard, v.lizardHeight, v.lizardSpeed, 0.9, 0, 0.3, 1.4, v.lizardCoins);
  },
  greenBlob: () => {
    const v = FOES4.v;
    return fill(CACHE.greenBlob, v.blobHp, RADIUS.greenBlob, v.blobHeight, v.blobSpeed, 0.8, 0, 0.25, 0.4, 1);
  },
  blobling: () => {
    const v = FOES4.v;
    return fill(CACHE.blobling, v.bloblingHp, RADIUS.blobling, v.blobHeight * 0.55, v.bloblingSpeed, 1, 0, 0.2, 1, 0.5);
  },
  maskTribal: () => {
    const v = FOES4.v;
    return fill(CACHE.maskTribal, v.maskHp, RADIUS.maskTribal, v.maskHeight, v.maskSpeed, 1, 0, 0.3, 1.4, v.maskCoins);
  },
  skullOrc: () => {
    const v = FOES4.v;
    return fill(CACHE.skullOrc, v.orcHp, RADIUS.skullOrc, v.orcHeight, v.orcSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.orcCoins);
  },
  // Update 0.2.7 — floor 3's newcomers. (The Skull Wraith has the Wraith's numbers.)
  dragonling: () => {
    const v = FOES3B.v;
    return fill(CACHE.dragonling, v.bratHp, RADIUS.dragonling, v.bratHeight, v.bratSpeed, 1.2, 0, 0.25, 1.4, v.bratCoins);
  },
  skullWraith: () => {
    const v = FOES.v;
    return fill(CACHE.skullWraith, v.wraithHp, RADIUS.skullWraith, v.wraithHeight, v.wraithSpeed, v.wraithKnock, 0, v.wraithFlinch, 1.4, v.wraithCoins);
  },
  rabbit: () => {
    const v = FOES3B.v;
    return fill(CACHE.rabbit, v.rabbitHp, RADIUS.rabbit, v.rabbitHeight, v.rabbitSpeed, 1, 0, 0.25, 1.4, v.rabbitCoins);
  },
  bigMushnub: () => {
    const v = FOES3B.v;
    return fill(CACHE.bigMushnub, v.mushHp, RADIUS.bigMushnub, v.mushHeight, v.mushSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.mushCoins);
  },
  // Update 0.2.10 — floor 5's. The Deep One and the Bog Brute: only a hard hit staggers them (as a Yeti's).
  dino: () => {
    const v = DINO.v;
    const s = fill(CACHE.dino, v.dinoHp, RADIUS.dino, v.dinoHeight, v.dinoSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
  ...STATS5,
  ...STATS6,
};

/** Update 0.0.18 — each floor's boss. Update 0.2.3 — floor 3's the Bone King. Update 0.2.4 — floor 4's the Dino.
 *  Update 0.2.10 — floor 5's the Drowned King. Update 0.2.11 — floor 6's the Old Whale (and the floors past it). */
// (Update 0.3.11 — floor 7's: the Velociraptor stands in till the Frost Roc is made.)
export const bossOf = (floor: number): EnemyKind => (floor <= 1 ? 'demon' : floor === 2 ? 'dragon' : floor === 3 ? 'boneKing' : floor === 4 ? 'dino' : floor === 5 ? 'drownedKing' : floor === 6 ? 'whale' : 'dino');

/** Update 0.0.18 — the mini bosses (the designer): a room with one has a chest, and the first killed drops its key. */
export const MINI_BOSSES: readonly EnemyKind[] = ['brute', 'spider', 'blueDemon', 'ninja', 'cactoroBig', 'skullOrc', 'bigMushnub', 'deepOne', 'bogBrute', 'mantaRay', 'shark'];


/** Fliers (they stay up; their bodies fall when they die). */
export const flies = (kind: EnemyKind) => CACHE[kind].size === 'air';
