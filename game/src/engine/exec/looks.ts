// Update 0.1.2 — each execution as it's drawn (the designer's list, MD_UPDATES/U012_EXECUTIONS.md): which bones your
// hands hold, which joints are held still, the pieces its model is cut into where its bones divide (an arm, a leg, a
// half; an explosion takes every piece), when they come off, how its body is squashed, and what's left after.
import type { EnemyKind } from '../../sim/enemies/kinds';
import type { Side } from '../viewmodel/guard';
import { BARRAGE, BARRAGE_GAP } from '../../sim/combat/execMoves';

type V3 = readonly [number, number, number];

/** A piece coming off at `t` (pieces: indices into `pieces`): held in a hand until `drop`, or flung (right, up, ahead
 *  of where you stood, m/s). */
export interface Cut {
  t: number;
  pieces: readonly number[];
  hand?: Side;
  drop?: number;
  fling?: V3;
}

export interface ExecLook {
  /** Held: the bone in your hands, the bone its body runs to, and the line your hands hold from there (a bone, or a way
   *  in its model; none: it's held whole, turned to show you `face`, a way in its model). */
  grip?: { at: string; to: string; line?: string | V3; face?: V3 };
  /** Joints held still (at rest) while it's held. */
  still?: readonly string[];
  /** Its arms reach for your hands until they're torn off: its upper arm and forearm for your left and right hand. */
  reach?: Record<Side, readonly [string, string]>;
  /** The pieces it can be cut into: each the bones listed and all below them. */
  pieces?: readonly (readonly string[])[];
  cuts?: readonly Cut[];
  /** When it dies it bursts into all its pieces (and the rest of it). */
  burst?: boolean;
  /** Its squash at `t` s in: [across, up] (1: as it is). */
  squash?: (t: number) => readonly [number, number];
  /** Its frog-like tongue: from this bone to your right hand, shot out over `out` s. */
  tongue?: { from: string; out: number };
  /** After it dies it keeps the pose the execution left it in (flattened, smashed). */
  keep?: boolean;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Flattened in `dur` s at `t0`: wide and thin. */
const flatAt = (t0: number, dur: number, up: number, across: number) => (t: number) => {
  const k = ease((t - t0) / dur);
  return [1 + (across - 1) * k, 1 + (up - 1) * k] as const;
};
const HUMANOID: (readonly string[])[] = [['Neck'], ['ShoulderL'], ['ShoulderR'], ['UpperLegL', 'FootL'], ['UpperLegR', 'FootR']];

export const EXEC_LOOKS: Partial<Record<EnemyKind, ExecLook>> = {
  snake: { grip: { at: 'Tail3', to: 'Head', line: 'Tail2' }, still: ['Tail', 'Tail1', 'Tail2', 'Tail3'] },
  grunt: { grip: { at: 'FootL', to: 'Head', line: [0, 0, 1] }, still: ['UpperLegL', 'LowerLegL', 'FootL'] },
  spitter: { grip: { at: 'Head', to: 'Head3', face: [0, 0, 1] }, pieces: [['Head'], ['Head2'], ['Head3']], burst: true },
  leaper: {
    still: ['ShoulderL', 'UpperArmL', 'LowerArmL', 'ShoulderR', 'UpperArmR', 'LowerArmR'],
    reach: { L: ['UpperArmR', 'LowerArmR'], R: ['UpperArmL', 'LowerArmL'] },
    pieces: [['ShoulderR'], ['ShoulderL']],
    // Torn off, then flung aside, out of the way of the punch.
    cuts: [
      { t: 0.55, pieces: [0], hand: 'L', drop: 0.64, fling: [-3.5, 1.5, -0.5] },
      { t: 0.55, pieces: [1], hand: 'R', drop: 0.62, fling: [3.5, 1.5, -0.5] },
    ],
  },
  slime: { squash: flatAt(0.5, 0.06, 0.12, 1.6), keep: true },
  frog: { grip: { at: 'Head', to: 'Back', face: [0, 1, 0] }, tongue: { from: 'Head', out: 0.15 } },
  stinger: { grip: { at: 'Torso', to: 'Head', face: [0, 0, 1] }, keep: true },
  wraith: {
    grip: { at: 'Torso', to: 'Head', face: [0, 0, 1] },
    squash: (t) => {
      const k = 0.55 * ease((t - 0.35) / 0.15) + 0.45 * ease((t - 0.6) / 0.12);
      return [1 - 0.68 * k, 1 - 0.18 * k] as const;
    },
    keep: true,
  },
  wasp: {
    grip: { at: 'Neck', to: 'Sting', face: [0, 0, 1] },
    pieces: [['Abdomen']],
    cuts: [{ t: 0.55, pieces: [0], hand: 'R', drop: 0.85, fling: [0.4, -5, 2.5] }],
  },
  brute: { pieces: HUMANOID, burst: true },
  spider: {
    pieces: [
      ['FrontLegL', 'FrontFootL'],
      ['FrontLegR', 'FrontFoot2R'],
      ['MidFrontLegL', 'MidFrontFootL'],
    ],
    cuts: [
      { t: 0.25, pieces: [0], fling: [4, 3, 0.5] },
      { t: 0.5, pieces: [1], fling: [-4, 3, 0.5] },
      { t: 0.75, pieces: [2], fling: [4.5, 3, 1] },
    ],
    squash: flatAt(1.25, 0.06, 0.2, 1.3),
    keep: true,
  },
  blueDemon: { pieces: HUMANOID, burst: true },
};

/** The blue demon's barrage, for its jolts: each punch's time. */
export const BARRAGE_TIMES = Array.from({ length: BARRAGE }, (_, i) => 0.25 + i * BARRAGE_GAP);
