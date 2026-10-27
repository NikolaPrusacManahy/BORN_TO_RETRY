// M1 step 6 — hit-stop: the game freezes for a few milliseconds on a heavy hit. Requests never add up: the
// longest one wins. It runs on real time (the Game counts it down), and the mouse never freezes.

export class HitStop {
  /** Seconds of freeze left. */
  remaining = 0;

  request(ms: number) {
    this.remaining = Math.max(this.remaining, ms / 1000);
  }

  /** Counts down by real time. Returns true while frozen. */
  tick(realDt: number): boolean {
    if (this.remaining <= 0) return false;
    this.remaining = Math.max(0, this.remaining - realDt);
    return true;
  }

  get active() {
    return this.remaining > 0;
  }
}
