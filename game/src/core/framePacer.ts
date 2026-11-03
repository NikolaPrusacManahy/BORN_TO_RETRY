// Update 0.3.38 — the frame-rate cap (the designer: "when I boot up the game my PC go full fan speed"): the browser
// asks for a frame every time the screen refreshes (144 or 240 a second on a fast screen), and every one was drawn, the
// near-still menus too. Now a frame is drawn only once its time has come for the cap (Options → Graphics: Frame rate);
// the menus and the pause menu at 60 at most. The time a frame is late is kept, so the rate holds on average (on a
// screen whose rate the cap doesn't divide, frames come a refresh early or late). A cap at the screen's own rate or
// over it caps nothing: every refresh is drawn (the screen's rate is measured, so a screen a hair faster than its
// number never drops a frame now and then). Pure.

/** The caps to choose from (fps; 0: none, every refresh drawn). */
export const FRAME_CAPS: readonly number[] = [30, 60, 90, 120, 144, 165, 240, 0];
export const DEFAULT_FRAME_CAP = 144;
/** The menus' and the pause menu's cap, whatever's chosen. */
export const RESTING_CAP = 60;
/** A refresh this early still counts as on time (ms): the browser's timings wobble. */
const EARLY = 1;
/** The screen's rate is the middle of this many gaps between refreshes, once there are this many. */
const GAPS = 31;
const GAPS_MIN = 5;
/** A cap within this of the screen's rate counts as its rate. */
const SAME_RATE = 1.05;

/** What's said for a cap. */
export const capLabel = (fps: number) => (fps > 0 ? `${fps} fps` : 'Unlimited');

/** The cap now: the chosen one; `resting` (a menu, paused), 60 at most. */
export const capOf = (chosen: number, resting: boolean) => (resting ? (chosen > 0 ? Math.min(chosen, RESTING_CAP) : RESTING_CAP) : chosen);

export class FramePacer {
  /** When the next frame may be drawn (ms, the browser's clock). */
  private due = -Infinity;
  private readonly gaps = new Float64Array(GAPS);
  private readonly sorted = new Float64Array(GAPS);
  private gapCount = 0;
  private gapAt = 0;
  private last = -1;

  /** The time between the screen's refreshes (ms; 0: not known yet). */
  get refresh(): number {
    const n = Math.min(this.gapCount, GAPS);
    if (n < GAPS_MIN) return 0;
    const s = this.sorted.subarray(0, n);
    s.set(this.gaps.subarray(0, n));
    s.sort();
    return s[n >> 1];
  }

  /** A refresh at `now` (ms): true, draw it; false, skip it. `fps` 0: every refresh. */
  ready(now: number, fps: number): boolean {
    if (this.last >= 0) {
      this.gaps[this.gapAt] = now - this.last;
      this.gapAt = (this.gapAt + 1) % GAPS;
      this.gapCount++;
    }
    this.last = now;
    const step = fps > 0 ? 1000 / fps : 0;
    const refresh = step > 0 ? this.refresh : 0;
    if (fps <= 0 || (refresh > 0 && step <= refresh * SAME_RATE)) {
      this.due = now + step;
      return true;
    }
    if (now < this.due - EARLY) return false;
    this.due += step;
    // (Behind, after a stall or on a screen slower than the cap: from now, no catching up in a burst.)
    if (this.due < now) this.due = now + step;
    return true;
  }
}
