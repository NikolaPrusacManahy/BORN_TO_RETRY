// Update 0.5.1 — what a save has opened (the designer, "for new players": "they only have Joseph"; "Are you even human mode is locked at the start"; "Gravity Sean is unlocked by clearing the game in at least
// The real experience or higher"; "Clearing the game once unlocks the harder mode"; "The Hell warden is unlocked after either clearing Are you even human once or clear any run on weakling experience or the
// real experience 5 times (just do 5 runs)"). A clear is a run won: the last floor's way down taken, counted by the difficulty it was on (not in the Lab). A save from before this keeps what it had opened
// (`won`, `demon`): nothing's taken away. Pure.
import type { Difficulty } from './lobby/difficulty';

/** Runs won, by difficulty. */
export type Clears = Record<Difficulty, number>;
export const noClears = (): Clears => ({ weakling: 0, real: 0, human: 0 });

/** Clears on WEAKLING EXPERIENCE and THE REAL EXPERIENCE, together, that open the Demon. */
export const DEMON_CLEARS = 5;

/** What a save holds of it: the runs won, and what an older save, or the Lab, had opened outright (`won`: Gravity Sean and ARE YOU EVEN HUMAN?; `demon`: the Demon). */
export interface Progress {
  clears: Clears;
  won: boolean;
  demon: boolean;
}

export interface Unlocks {
  /** ARE YOU EVEN HUMAN? can be chosen. */
  human: boolean;
  sean: boolean;
  demon: boolean;
}

export function unlocksOf(p: Progress): Unlocks {
  const c = p.clears;
  return {
    human: p.won || c.weakling + c.real + c.human > 0,
    sean: p.won || c.real + c.human > 0,
    demon: p.demon || c.human > 0 || c.weakling + c.real >= DEMON_CLEARS,
  };
}
