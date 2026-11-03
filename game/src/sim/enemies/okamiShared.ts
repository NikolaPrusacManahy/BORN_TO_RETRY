// Update 0.3.34 — Yokai : Okami's moves (Enemy.move: okami.ts, sim/dungeon/okamiShow.ts), each one of the Universal
// Animation Library's clips (engine/shrine/okamiLook.ts plays them): how long each clip is (s) and where in it each
// blow lands (a share of it: its claws measured from the library's hands). Pure data.

// Its claws: a swipe of both (Zombie_Scratch: two blows), its three-blow combo (Melee_Combo).
export const CLAW = 1;
export const COMBO = 2;
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
  [COMBO]: { len: 2.27, lands: [0.5, 0.65, 0.85] },
  [ROAR]: { len: 2.23, lands: [] },
  [LAND]: { len: 1.27, lands: [0.08] },
};
