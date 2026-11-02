// Update 0.2.26 — what each enemy bleeds (the designer: "blood splashes", "Red, plentiful"): red blood for flesh, green
// ichor for the slimes, bugs and spitters, bone chips for the skeletons, spores for the Mushnubs and a pale mist for the
// Wraith, amber sap for the Cactoros, dark ink for the squid and jellies. Drips fall and splat on the floor; chips fall
// and lie a moment; mist rises and fades. Under water everything bleeds a cloud. And how much, by the Options' Blood
// setting (state/settings.ts). Pure data.
import type { EnemyKind } from '../sim/enemies/kinds';
import type { BloodLevel } from '../state/settings';

export type BloodMode = 'drip' | 'chip' | 'mist';

export interface BloodLook {
  mode: BloodMode;
  /** Its drops' colour, and its splats' on the floor (sRGB hex). */
  drop: number;
  splat: number;
}

const RED: BloodLook = { mode: 'drip', drop: 0x9a0c0c, splat: 0x6a0707 };
const ICHOR: BloodLook = { mode: 'drip', drop: 0x6cc21e, splat: 0x3f7d12 };
const BONE: BloodLook = { mode: 'chip', drop: 0xeee6d2, splat: 0 };
const SPORE: BloodLook = { mode: 'mist', drop: 0xc6a8f0, splat: 0 };
const WISP: BloodLook = { mode: 'mist', drop: 0xbfe6ff, splat: 0 };
const SAP: BloodLook = { mode: 'drip', drop: 0xe0a02c, splat: 0x9a6612 };
const INK: BloodLook = { mode: 'drip', drop: 0x2c1f4f, splat: 0x1d1536 };
/** Update 0.3.18 — floor 8's machines (its ships, the Bee's mech): metal chips. */
const METAL: BloodLook = { mode: 'chip', drop: 0xa8acb2, splat: 0 };

const OF: Partial<Record<EnemyKind, BloodLook>> = {
  spitter: ICHOR,
  stinger: ICHOR,
  slime: ICHOR,
  wasp: ICHOR,
  spider: ICHOR,
  greenBlob: ICHOR,
  blobling: ICHOR,
  dinoBlob: ICHOR,
  glub: ICHOR,
  bigGlub: ICHOR,
  spawnling: ICHOR,
  skeleton: BONE,
  // (Update 0.3.15 — floor 6's Cursed Crewman, headless or not, the designer: "The skeletons are bleeding???"; the
  // Kraken's Tentacle, ink.)
  crewman: BONE,
  headless: BONE,
  tentacle: INK,
  strafer: METAL,
  diver: METAL,
  mineLayer: METAL,
  beeShip: METAL,
  beeMech: METAL,
  boneKing: BONE,
  skullWraith: BONE,
  mushnub: SPORE,
  bigMushnub: SPORE,
  wraith: WISP,
  hywirl: WISP,
  cactoro: SAP,
  cactoroBig: SAP,
  squidle: INK,
  urchin: INK,
  jelly: INK,
};

/** What `kind` bleeds (red unless said). */
export const bloodOf = (kind: EnemyKind): BloodLook => OF[kind] ?? RED;

/** Drops in a hit's spray (by its damage), a kill's burst and an execution's; whether kills leave pools; how long a
 *  splat lies on the floor (s). */
export interface BloodAmount {
  hit: (damage: number) => number;
  kill: number;
  exec: number;
  pools: boolean;
  life: number;
}

const ON: BloodAmount = { hit: (d) => Math.round(Math.min(30, 8 + d * 0.6)), kill: 44, exec: 90, pools: true, life: 40 };
const LESS: BloodAmount = { hit: (d) => Math.round(Math.min(10, 3 + d * 0.2)), kill: 14, exec: 30, pools: false, life: 14 };

/** The amounts for a Blood setting (null: off). */
export const bloodAmount = (level: BloodLevel): BloodAmount | null => (level === 'off' ? null : level === 'less' ? LESS : ON);
