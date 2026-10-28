// Update 0.0.19 (moved out of run.ts, which had grown past 300 lines) — what a run is told by the Game: when you die
// and come back, and where its levels come from.
import type { Level } from './level';

export interface RunCallbacks {
  /** You died: start the fade to black (it lasts HEALTH.deathFade). */
  onDeath(): void;
  /** You're back at the start: clear the black. */
  onRespawn(): void;
}

/** Where the next level comes from (the Game makes them). */
export interface Levels {
  /** A new run from its first floor (after a death). */
  fresh(): Level;
  /** The next floor down. */
  next(current: Level): Level;
  /** This floor again from its start (F3, Restart). */
  again(current: Level): Level;
}
