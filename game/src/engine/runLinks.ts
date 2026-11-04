// Update 0.0.19 (moved out of run.ts, which had grown past 300 lines) — what a run is told by the Game: when you die
// and come back, and where its levels come from.
// Update 0.1.14 — and the death screen: what killed you and how far you got.
// Update 0.2.2 (the designer: "we stop at floor 7, not floor 10") — the run's last floor: its way down ends the run, the
// same screen saying you survived.
// Update 0.2.9 — and the lobby's: a choice made, the main gate reached.
import type { Cause } from '../sim/player/state';
import type { CharacterId } from '../sim/characters';
import type { Difficulty } from '../sim/lobby/difficulty';
import type { Level } from './level';
import type { DealView } from './fateView';
import { FLOOR } from '../world/dungeon/floorOrder';

/** Update 0.2.2 — the run's last floor: taking its way down ends the run. Update 0.2.12 — the alpha's (the designer:
 *  "allow room 1 to 5 only, don't include 6 yet"): floor 5's way down wins it. Update 0.3.11 — floor 6 is in (the plan
 *  for floors 7–10, MD/FLOORS_7_10_PLAN.md: the game's run is 10 floors now; it ends at each one as it's done). */
// (Update 0.3.25 — the floors reordered: Skull Cove's way down, floor 7 now, with Frozen Depths in at 4.)
// (Update 0.3.47 — the designer, for the playtest's public build: "no access to floor 10, access of floor 1 to 9": the
// Moon's way down, floor 9, after Tidebreaker. Hell on Earth, floor 10, is reached only from the dev build's Lab.)
export const LAST_FLOOR = FLOOR.moon;
export const endsRun = (floor: number) => floor >= LAST_FLOOR;

/** Update 0.1.14 — what the death screen shows. */
export interface DeathInfo {
  /** What killed you (null: nothing recorded). */
  by: Cause | null;
  floor: number;
  /** Seconds played since the run's start (not paused, not dead). */
  time: number;
  kills: number;
  /** Update 0.2.2 — you took the last floor's way down: the run is won. */
  won?: boolean;
}

export interface RunCallbacks {
  /** You died: start the fade to black (it lasts HEALTH.deathFade). */
  onDeath(): void;
  /** You're back at the start: clear the black. */
  onRespawn(): void;
  /** Update 0.1.14 — dead in the dungeon and it's black: show the death screen (the run waits for Retry). */
  onDeathScreen(info: DeathInfo): void;
  /** Update 0.2.9 — in the lobby, a difficulty or a character was chosen (to save). Update 0.2.17 — or Fate Cards
   *  turned on or off (`cards`). */
  onLobbyPick(difficulty: Difficulty, character: CharacterId, cards: boolean): void;
  /** Update 0.2.9 — in the lobby, you went through the main gate (walked in, or E at it). */
  onLobbyGate(): void;
  /** Update 0.2.16 — a chest dealt Fate Cards (the world holds still): show them; `Game.pickCard`, then `endDeal`. */
  onDeal(deal: DealView): void;
  /** Update 0.2.16 — TAB: show what you carry (`Game.inventory`). */
  onInventory(): void;
  /** Update 0.3.23 — a level is being made ready (`true`: the loader up, the world waiting) or is ready (`false`). */
  onLoading?(on: boolean): void;
}

/** Where the next level comes from (the Game makes them). */
export interface Levels {
  /** A new run from its first floor (after a death). */
  fresh(): Level;
  /** The next floor down. */
  next(current: Level): Level;
  /** This floor again from its start (F3, Restart). */
  again(current: Level): Level;
  /** Update 0.3.37 — this floor's boss room alone, its show from the start (the capture kit's . key). */
  boss(current: Level): Level;
}
