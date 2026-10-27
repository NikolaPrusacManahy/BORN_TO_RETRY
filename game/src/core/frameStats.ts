// M1 — frame timing for the F2 overlay: the last 2 s of frame times, FPS and the worst frame.

export const STATS_FRAMES = 480; // 2 s at 240 Hz

export class FrameStats {
  /** Frame times in ms, a ring buffer. */
  readonly times = new Float32Array(STATS_FRAMES);
  /** Where the next frame time goes. */
  head = 0;
  count = 0;
  /** Sim ticks run in the last frame. */
  steps = 0;
  /** Frames that needed more ticks than allowed. */
  dropped = 0;

  push(ms: number, steps: number, dropped: boolean) {
    this.times[this.head] = ms;
    this.head = (this.head + 1) % STATS_FRAMES;
    this.count = Math.min(this.count + 1, STATS_FRAMES);
    this.steps = steps;
    if (dropped) this.dropped++;
  }

  /** The i-th most recent frame time (0 = newest). */
  recent(i: number): number {
    return this.times[(this.head - 1 - i + STATS_FRAMES * 2) % STATS_FRAMES];
  }

  /** Average FPS over the last `seconds`. */
  fps(seconds = 1): number {
    let total = 0;
    let n = 0;
    while (n < this.count && total < seconds * 1000) total += this.recent(n++);
    return total > 0 ? (n * 1000) / total : 0;
  }

  /** The slowest frame in the buffer (ms). */
  worst(): number {
    let w = 0;
    for (let i = 0; i < this.count; i++) w = Math.max(w, this.recent(i));
    return w;
  }

  /** The median frame time (ms), the "normal" frame the hitch check compares against. */
  median(): number {
    if (this.count === 0) return 0;
    const sorted = Array.from(this.times.subarray(0, this.count)).sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  }
}
