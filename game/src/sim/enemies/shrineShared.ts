// Update 0.3.33 — floor 8's martial artists' moves (Enemy.move: martial.ts and each fighter's), each one of the
// Universal Animation Library's clips (engine/shrine/shrineLooks.ts plays them): how long each clip is (s) and where
// in it each blow lands (a share of it: tools/ual_lands.py measured the fists, feet and blades). Pure data.

// In its stance: side-stepping left, right, backing off. Dashing in. Side-stepping a blow; blocking one.
export const STRAFE_L = 1;
export const STRAFE_R = 2;
export const BACK = 3;
export const DASH = 4;
export const DODGE_L = 5;
export const DODGE_R = 6;
export const BLOCK = 7;
// Hand to hand (the karate fighters, the ninjas up close).
export const JAB = 10;
export const CROSS = 11;
export const KICK = 12;
export const COMBO = 13;
export const HOOK = 14;
export const KNEE = 15;
export const UPPERCUT = 16;
export const FLYING_KNEE = 17;
export const BACKFLIP = 18;
// The ninjas: a throw (shuriken, a smoke bomb), the dash cut, katana cuts, kunai, the wall run, the leap and its landing,
// caltrops scattered, a roll away.
export const THROW = 20;
export const DASH_CUT = 21;
export const SLASH_A = 22;
export const SLASH_B = 23;
export const SLASH_COMBO = 24;
export const KUNAI = 25;
export const WALLRUN_L = 26;
export const WALLRUN_R = 27;
export const LEAP = 28;
export const LAND = 29;
export const SMOKE = 30;
export const CALTROPS = 31;
export const ROLL = 32;
// The Archer: drawing and loosing; a volley.
export const AIM = 33;
export const LOOSE = 34;
export const VOLLEY = 35;
// The Sensei: his staff's combos, his slam, his ki palm, his counter; waiting with his arms folded.
export const STAFF = 40;
export const STAFF_HEAVY = 41;
export const SLAM = 42;
export const KI = 43;
export const STAFF_COUNTER = 44;
export const FOLDED = 45;
// The Shadow: splitting, his long cut across the room, his heavy cut, set for the long cut (its line on the floor).
export const SPLIT = 46;
export const LONG_CUT = 47;
export const HEAVY_CUT = 48;
export const CUT_SET = 49;

/** Each move's clip: its length (s) and where its blows land (shares of it). */
export const CLIPS: Readonly<Record<number, { len: number; lands: readonly number[] }>> = {
  [JAB]: { len: 0.87, lands: [0.23] },
  [CROSS]: { len: 1, lands: [0.3] },
  [KICK]: { len: 1.1, lands: [0.48] },
  [COMBO]: { len: 2.27, lands: [0.5, 0.65, 0.85] },
  [HOOK]: { len: 0.47, lands: [0.57] },
  // (A knee's: where the knee's highest, not the foot's furthest.)
  [KNEE]: { len: 0.87, lands: [0.62] },
  [UPPERCUT]: { len: 1.07, lands: [0.25] },
  [FLYING_KNEE]: { len: 0.87, lands: [0.62] },
  [BACKFLIP]: { len: 1.93, lands: [] },
  [THROW]: { len: 1.33, lands: [0.28] },
  [DASH_CUT]: { len: 1.57, lands: [0.21] },
  [SLASH_A]: { len: 0.37, lands: [0.64] },
  [SLASH_B]: { len: 0.43, lands: [0.54] },
  [SLASH_COMBO]: { len: 3.4, lands: [0.19, 0.39, 0.61] },
  [KUNAI]: { len: 0.5, lands: [0.53] },
  [LAND]: { len: 1.27, lands: [0.08] },
  [SMOKE]: { len: 1.33, lands: [0.28] },
  [CALTROPS]: { len: 1.57, lands: [0.53] },
  [ROLL]: { len: 1.47, lands: [] },
  [LOOSE]: { len: 0.67, lands: [0.4] },
  [STAFF]: { len: 3, lands: [0.23, 0.4, 0.51] },
  [STAFF_HEAVY]: { len: 4.33, lands: [0.11, 0.25, 0.41, 0.59] },
  [SLAM]: { len: 1.17, lands: [0.37] },
  [KI]: { len: 0.5, lands: [0.53] },
  [STAFF_COUNTER]: { len: 0.7, lands: [0.24] },
  [SPLIT]: { len: 0.63, lands: [0.8] },
  [LONG_CUT]: { len: 1.57, lands: [0.21] },
  [HEAVY_CUT]: { len: 0.73, lands: [0.64] },
};
