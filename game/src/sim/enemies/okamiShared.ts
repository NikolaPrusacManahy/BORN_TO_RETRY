// Update 0.3.34 — Yokai : Okami's moves (Enemy.move: okami.ts, sim/dungeon/okamiShow.ts), each one of the Universal
// Animation Library's clips (engine/shrine/okamiLook.ts plays them): how long each clip is (s) and where in it each
// blow lands (a share of it: its claws measured from the library's hands). Pure data.

// Its claws: a swipe of both (Zombie_Scratch: two blows); its bite (Zombie_Bite: Update 0.3.35, the designer: "why does
// the boss still do the fighter stancing and the hits??? he has human animations?" — in place of a boxer's combo).
export const CLAW = 1;
export const COMBO = 2;
// Update 0.3.35 — its moves (the designer's three, Claude's two): its four leaps; its blue fireball; its fire dash; its
// roar of fire; its devastation (charging in the arena's middle), and its massive fireball hurled down at its end.
export const LEAPS = 3;
export const FIREBALL = 4;
export const DASH = 5;
export const BREATH = 6;
export const DEVASTATE = 7;
export const HURL = 8;
// Its show: coming down out of the sky onto its island, crouched on it as it falls, roaring on it, its leap (up, over,
// down) with its name, its landing.
export const ARRIVE = 10;
export const RIDE = 11;
export const ROAR = 12;
export const LEAP = 13;
export const LAND = 14;

/** Each strike's clip: its length (s) and where its blows land (shares of it). */
export const CLIPS: Readonly<Record<number, { len: number; lands: readonly number[] }>> = {
  [CLAW]: { len: 1.8, lands: [0.33, 0.65] },
  [COMBO]: { len: 1.5, lands: [0.42] },
  [ROAR]: { len: 2.23, lands: [] },
  // (Its roar of fire: its flame comes as its head goes back. Its throws: each with a swing of its claw
  // (Zombie_Scratch's first); its massive fireball's gathered as it roars, slowly, through its charge.)
  [BREATH]: { len: 2.23, lands: [0.3] },
  [FIREBALL]: { len: 1.8, lands: [0.33] },
  [HURL]: { len: 1.8, lands: [0.33] },
  [LAND]: { len: 1.27, lands: [0.08] },
};
