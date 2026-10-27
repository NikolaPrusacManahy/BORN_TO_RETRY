// M1 — fixed-step simulation clock. The sim always ticks at the same rate; rendering blends the last two
// ticks by `alpha`, so it is smooth on 60, 144 and 240 Hz screens.

/** A frame longer than this (a tab switch, a debugger pause) counts as this long. */
export const MAX_FRAME = 0.25;

export class FixedStep {
  /** Sim time banked but not yet ticked (s). */
  acc = 0;
  /** How far between the last two ticks this frame is drawn (0..1). */
  alpha = 0;
  /** Set when a frame needed more ticks than allowed and the rest was dropped. */
  dropped = false;

  /** Banks `frameDt` seconds and returns how many ticks of `stepDt` to run now (at most `maxSteps`). */
  advance(frameDt: number, stepDt: number, maxSteps: number): number {
    this.acc += Math.min(Math.max(frameDt, 0), MAX_FRAME);
    let steps = Math.floor(this.acc / stepDt + 1e-9);
    this.dropped = steps > maxSteps;
    if (this.dropped) {
      // Too far behind: run the max and forget the rest instead of spiralling.
      steps = maxSteps;
      this.acc = 0;
    } else {
      this.acc -= steps * stepDt;
    }
    this.alpha = Math.min(1, Math.max(0, this.acc / stepDt));
    return steps;
  }

  reset() {
    this.acc = 0;
    this.alpha = 0;
    this.dropped = false;
  }
}
