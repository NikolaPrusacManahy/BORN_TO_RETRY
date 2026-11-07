// Update 0.5.4 — floor 10's fighters' moves (Enemy.move: martial.ts and each one's), each one of the Universal Animation Library's clips
// (engine/hell/hellLooks.ts plays them): how long each clip is (s) and where in it each blow lands (a share of it: tools/foe-poses.ts measured
// where each one's weapon reaches furthest out). Their own numbers, past floor 8's (shrineShared.ts takes these into its table). Pure data.

// The Imp: its mace's two swings and its combo; its fireball.
export const SWING_A = 60;
export const SWING_B = 61;
export const MACE_COMBO = 62;
export const FIREBALL = 63;
// The Puglin: its club's two blows; its rush.
export const CLUB_A = 64;
export const CLUB_B = 65;
export const RUSH = 66;
// The Bone Axeman: its chop; splitting the floor (its burning line); its spin; standing, axe ready.
export const CHOP = 67;
export const SPLIT_FLOOR = 68;
export const SPIN = 69;
export const STAND = 74;
// The Bone Guard: its cut (the Imp's swing's clip), its combo, its riposte; its guard up; its guard broken.
export const CUT = SWING_A;
export const GUARD_COMBO = 70;
export const RIPOSTE = 71;
export const GUARD = 73;
export const BROKEN = 72;

// Update 0.5.5 — the second batch's (their own rules, not the martial brain's): the Cinder Chicken's fuse; the Brimstone Bee's bomb; the Pit
// Fiend's charge, leap, volley and roar; the Spore Lord's puff of spores, its slam, its bite.
export const FUSE = 80;
export const BEE_BOMB = 81;
export const FIEND_CHARGE = 82;
export const FIEND_LEAP = 83;
export const FIEND_VOLLEY = 84;
export const FIEND_ROAR = 85;
export const PUFF = 86;
export const SPORE_SLAM = 87;
export const BITE = 88;

/** Each move's clip: its length (s) and where its blows land (shares of it). */
export const HELL_CLIPS: Readonly<Record<number, { len: number; lands: readonly number[] }>> = {
  [SWING_A]: { len: 0.43, lands: [0.56] },
  [SWING_B]: { len: 0.53, lands: [0.47] },
  // (Its first reach, at 0.08, is its wind-up: the mace drawn back over its shoulder.)
  [MACE_COMBO]: { len: 3, lands: [0.24, 0.4, 0.53, 0.75] },
  [FIREBALL]: { len: 0.5, lands: [0.34] },
  [CLUB_A]: { len: 0.37, lands: [0.67] },
  [CLUB_B]: { len: 0.43, lands: [0.55] },
  [RUSH]: { len: 1.57, lands: [0.2] },
  [CHOP]: { len: 0.73, lands: [0.65] },
  // (It leaps and comes down: the axe meets the floor at 0.55.)
  [SPLIT_FLOOR]: { len: 1.17, lands: [0.55] },
  [SPIN]: { len: 0.7, lands: [0.71] },
  [GUARD_COMBO]: { len: 3, lands: [0.4, 0.53, 0.75] },
  // (Its one rising cut: its blade's reach peaks twice on the way through, 0.61 and 0.74.)
  [RIPOSTE]: { len: 0.5, lands: [0.61] },
  [BROKEN]: { len: 1.07, lands: [] },
};
