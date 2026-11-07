// Update 0.1.2 — each execution as it's drawn (the designer's list, MD_UPDATES/U012_EXECUTIONS.md): which bones your
// hands hold, which joints are held still, the pieces its model is cut into where its bones divide (an arm, a leg, a
// half; an explosion takes every piece), when they come off, how its body is squashed, and what's left after.
// Update 0.2.2 — floor 3's: the Ninja's as the leaper's (the same model), the Mushnub's as the slime's, the Skeleton
// shaking in your hold and bursting into its bones (each limb in two).
import type { EnemyKind } from '../../sim/enemies/kinds';
import type { Side } from '../viewmodel/guard';
import { BARRAGE, BARRAGE_GAP, ALIKE } from '../../sim/combat/execMoves';

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
  /** Its arm reaches for your hand until the first piece comes off: its upper arm and forearm for that hand. */
  reach?: Partial<Record<Side, readonly [string, string]>>;
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
  /** Update 0.2.2 — standing, it shakes this much (m) at `t` s in. */
  tremble?: (t: number) => number;
  /** Update 0.3.40 — what its body does while it's held, in turn (a model with all of them only; else it thrashes as
   *  before): its own `Exec_…` clips, baked from the animation library (tools/ual_exec.py). Held, it hangs from the
   *  grip as the clip poses it (body.ts `posedGrip`). */
  clips?: readonly ExecClip[];
}

/** Update 0.3.40 — a clip its body plays from `at` s in (at Execution speed 1), `speed` × its own, faded into over
 *  `fade` s; played once, its last moment held. */
export interface ExecClip {
  at: number;
  name: string;
  speed?: number;
  fade?: number;
}

/** Update 0.3.40 — the clip a body plays `t` s into its execution (null: none yet). */
export function execClipAt(clips: readonly ExecClip[], t: number): ExecClip | null {
  let now: ExecClip | null = null;
  for (const c of clips) if (t >= c.at) now = c;
  return now;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Flattened in `dur` s at `t0`: wide and thin. */
const flatAt = (t0: number, dur: number, up: number, across: number) => (t: number) => {
  const k = ease((t - t0) / dur);
  return [1 + (across - 1) * k, 1 + (up - 1) * k] as const;
};
export const HUMANOID: (readonly string[])[] = [['Neck'], ['ShoulderL'], ['ShoulderR'], ['UpperLegL', 'FootL'], ['UpperLegR', 'FootR']];

export const EXEC_LOOKS: Partial<Record<EnemyKind, ExecLook>> = {
  snake: { grip: { at: 'Tail3', to: 'Head', line: 'Tail2' }, still: ['Tail', 'Tail1', 'Tail2', 'Tail3'] },
  // Update 0.1.3 — held by its head (its body hanging, its front to you); it bursts.
  // Update 0.3.40 (the designer: "make stuff more accurate", the animation library; the Orc's first) — it moves as a
  // body does: it buckles as your palm takes its head and is drawn up arching, hangs kicking and clawing at your hand,
  // flails as it's tossed, and curls round the uppercut (the Orc's model only so far: the others that share this
  // thrash as before).
  grunt: {
    grip: { at: 'Head', to: 'Hips', face: [0, 0, 1] },
    pieces: HUMANOID,
    burst: true,
    clips: [
      { at: 0, name: 'Exec_Lift', speed: 1.6 },
      { at: 0.3, name: 'Exec_Hang', fade: 0.1 },
      { at: 0.5, name: 'Exec_Flail', speed: 1.3, fade: 0.08 },
      // (Curled by the time the fist lands at 0.85: the hit's freeze holds the view's clips too.)
      { at: 0.83, name: 'Exec_Fold', fade: 0.02 },
    ],
  },
  spitter: { grip: { at: 'Head', to: 'Head3', face: [0, 0, 1] }, pieces: [['Head'], ['Head2'], ['Head3']], burst: true },
  leaper: {
    still: ['ShoulderL', 'UpperArmL', 'LowerArmL', 'ShoulderR', 'UpperArmR', 'LowerArmR'],
    // Update 0.1.3 — the arm on your right reaches into your right fist and is torn off, flung aside; the one on your
    // left (still held out) is chopped off.
    reach: { R: ['UpperArmL', 'LowerArmL'] },
    pieces: [['ShoulderR'], ['ShoulderL']],
    cuts: [
      { t: 0.45, pieces: [1], hand: 'R', drop: 0.53, fling: [4, 1.5, -0.3] },
      { t: 0.72, pieces: [0], fling: [-5, 2.5, 1] },
    ],
  },
  slime: { squash: flatAt(0.5, 0.06, 0.12, 1.6), keep: true },
  frog: { grip: { at: 'Head', to: 'Back', face: [0, 1, 0] }, tongue: { from: 'Head', out: 0.15 } },
  // Update 0.1.3 — held by its neck in one fist, its body hanging.
  stinger: { grip: { at: 'Neck', to: 'Torso', face: [0, 0, 1] }, keep: true },
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
    // Update 0.1.3 — chopped off hard: flung far, spinning.
    cuts: [
      { t: 0.25, pieces: [0], fling: [7, 4.5, 1] },
      { t: 0.5, pieces: [1], fling: [-7, 4.5, 1] },
      { t: 0.75, pieces: [2], fling: [7.5, 4, 1.5] },
    ],
    squash: flatAt(1.25, 0.06, 0.2, 1.3),
    keep: true,
  },
  blueDemon: { pieces: HUMANOID, burst: true },
  // Update 0.2.2 — each limb (its arms are the 001 "legs") in two, its head, its ribs, its hips the rest; shaking harder
  // as it's lifted, hardest as your fist closes.
  skeleton: {
    pieces: [['Torso'], ['Head'], ['LUpperLeg'], ['LDownLeg'], ['RUpperLeg'], ['RDownLeg'], ['LUpperLeg001'], ['LDownLeg001'], ['RUpperLeg001'], ['RDownLeg001']],
    burst: true,
    tremble: (t) => (t < 0.25 ? 0 : 0.012 + 0.03 * ease((t - 0.25) / 0.6)),
  },
};
// Update 0.2.2 — the Ninja's as the leaper's; the Mushnub's as the slime's.
EXEC_LOOKS.ninja = EXEC_LOOKS.leaper;
EXEC_LOOKS.mushnub = EXEC_LOOKS.slime;
// Update 0.2.4 — floor 4's, as their moves (execMoves.ts).
EXEC_LOOKS.tribal = EXEC_LOOKS.grunt;
EXEC_LOOKS.cactoroBig = EXEC_LOOKS.brute;
EXEC_LOOKS.cactoro = EXEC_LOOKS.slime;
EXEC_LOOKS.hywirl = EXEC_LOOKS.wraith;
EXEC_LOOKS.dinoBlob = EXEC_LOOKS.grunt;
EXEC_LOOKS.lizard = EXEC_LOOKS.grunt;
EXEC_LOOKS.skullOrc = EXEC_LOOKS.brute;
EXEC_LOOKS.dragonling = EXEC_LOOKS.wraith;
EXEC_LOOKS.skullWraith = EXEC_LOOKS.wraith;
EXEC_LOOKS.rabbit = EXEC_LOOKS.grunt;
EXEC_LOOKS.bigMushnub = EXEC_LOOKS.brute;
EXEC_LOOKS.greenBlob = EXEC_LOOKS.slime;
EXEC_LOOKS.blobling = EXEC_LOOKS.slime;
EXEC_LOOKS.maskTribal = EXEC_LOOKS.wraith;
// Update 0.2.10 — floor 5's, as their moves (execMoves.ts).
for (const [kind, like] of ALIKE) EXEC_LOOKS[kind] = EXEC_LOOKS[like];
// Update 0.3.15 — the Cursed Crewman bursts into its bones as the Skeleton does, cut where its own bones divide (the
// Pirate Kit's skeleton: its torso, its head, each limb in two).
EXEC_LOOKS.crewman = EXEC_LOOKS.headless = {
  ...EXEC_LOOKS.skeleton,
  pieces: [['Torso'], ['Head'], ['UpperLegL'], ['LowerLegL'], ['UpperLegR'], ['LowerLegR'], ['UpperArmL'], ['LowerArmL'], ['UpperArmR'], ['LowerArmR']],
};
// Update 0.5.4 — floor 10's Bestiary monsters (the Imp, the Puglin, the two armoured skeletons) are on the Animation Library's own skeleton: the
// Orc's hold and its reactions (baked onto each: tools/ual_bake.py), held by the head with the pelvis below, cut where their own bones divide
// (the head, each arm from its collarbone, each leg from its thigh).
const LIBRARY_BODY: readonly (readonly string[])[] = [['neck_01'], ['clavicle_l'], ['clavicle_r'], ['thigh_l'], ['thigh_r']];
for (const k of ['imp', 'puglin', 'boneAxeman', 'boneGuard'] as const) EXEC_LOOKS[k] = { ...EXEC_LOOKS.grunt!, grip: { at: 'Head', to: 'pelvis', face: [0, 0, 1] }, pieces: LIBRARY_BODY };
/** The kinds that burst into their bones (the wall finisher too: pinLook.ts). */
export const BONY: readonly EnemyKind[] = ['skeleton', 'crewman', 'headless'];

/** The blue demon's barrage, for its jolts: each punch's time. */
export const BARRAGE_TIMES = Array.from({ length: BARRAGE }, (_, i) => 0.25 + i * BARRAGE_GAP);
