// M1 step 6 — how far each fist is through its punch: out fast, a short hold, then back with a little
// overshoot. Runs on game time, so hit-stop freezes the fist at impact. (The charge draw-back is the viewmodel's.)
import { ARMS } from '../../tuning/arms';
import type { Side } from './guard';

// M2 — slashL (forehand: from up right, down to the left) and slashR (backhand: back across) swing a held weapon.
export type PunchStyle = 'jab' | 'heavy' | 'quick' | 'slashL' | 'slashR';

interface ArmTimeline {
  /** Seconds since the punch was thrown (−1: idle). */
  t: number;
  style: PunchStyle;
}

/** Timing multipliers per style: [out, hold, back]. */
const STYLE: Record<PunchStyle, [number, number, number]> = {
  jab: [1, 1, 1],
  heavy: [1.25, 2.5, 1.4],
  quick: [0.8, 0.8, 0.9],
  slashL: [1.3, 0.9, 1.5],
  slashR: [1.3, 0.9, 1.5],
};

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
/** Ease out with a small overshoot past the end (the fist settles back into the guard). */
const easeOutBack = (x: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};

/** How far out a punch is `t` seconds in (0 guard → 1 full extension; a little below 0 on the way back). */
export function punchExtension(t: number, style: PunchStyle): number {
  if (t < 0) return 0;
  const [o, h, b] = STYLE[style];
  const out = ARMS.v.punchOut * o;
  const hold = ARMS.v.punchHold * h;
  const back = ARMS.v.punchBack * b;
  if (t < out) return easeOutCubic(t / out);
  if (t < out + hold) return 1;
  if (t < out + hold + back) return 1 - easeOutBack((t - out - hold) / back);
  return 0;
}

export class ArmsAnim {
  readonly arms: Record<Side, ArmTimeline> = {
    L: { t: -1, style: 'jab' },
    R: { t: -1, style: 'jab' },
  };

  punch(side: Side, style: PunchStyle) {
    const a = this.arms[side];
    a.t = 0;
    a.style = style;
  }

  update(dt: number) {
    for (const side of ['L', 'R'] as const) {
      const a = this.arms[side];
      if (a.t < 0) continue;
      a.t += dt;
      const [o, h, b] = STYLE[a.style];
      if (a.t > ARMS.v.punchOut * o + ARMS.v.punchHold * h + ARMS.v.punchBack * b) a.t = -1;
    }
  }

  extension(side: Side): number {
    const a = this.arms[side];
    return punchExtension(a.t, a.style);
  }

  /** The style of the punch or swing in progress (or the last one). */
  style(side: Side): PunchStyle {
    return this.arms[side].style;
  }

  reset() {
    for (const side of ['L', 'R'] as const) this.arms[side].t = -1;
  }
}
