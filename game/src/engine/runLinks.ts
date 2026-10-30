// Update 0.0.19 (moved out of run.ts, which had grown past 300 lines) — what a run is told by the Game: when you die
// and come back, and where its levels come from.
// Update 0.1.14 — and the death screen: what killed you and how far you got.
// Update 0.2.2 (the designer: "we stop at floor 7, not floor 10") — the run's last floor: its way down ends the run, the
// same screen saying you survived.
import type { Cause } from '../sim/player/state';
import type { Level } from './level';

/** Update 0.2.2 — the run's last floor: taking its way down ends the run. */
export const LAST_FLOOR = 7;
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
