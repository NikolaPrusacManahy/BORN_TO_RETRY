// M1 step 8 — what happens when you die: the world slows, the screen fades to black, and once it's black you're
// back at the start with full health while the black clears. Timing only (pure): LabRun restarts the lab, the App
// draws the fade.
import { HEALTH } from '../tuning/health';

export class DeathFlow {
  /** Real seconds since death (−1: alive). */
  private t = -1;

  get active() {
    return this.t >= 0;
  }

  start() {
    if (this.t < 0) this.t = 0;
  }

  /** The sim's time scale: slow motion while dying, 1 otherwise. */
  get timeScale() {
    return this.t >= 0 ? HEALTH.v.deathSlow : 1;
  }

  /** Advances on real time. True once the screen is black: time to respawn (then `reset`). */
  update(real: number): boolean {
    if (this.t < 0) return false;
    this.t += real;
    return this.t >= HEALTH.v.deathFade;
  }

  reset() {
    this.t = -1;
  }
}
