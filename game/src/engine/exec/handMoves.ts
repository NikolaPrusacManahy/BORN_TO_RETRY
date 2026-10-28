// Update 0.1.2 — your hands in each execution (the designer: "it needs to look like the hands of the player are
// performing the move"), keyframed and timed to its moves (sim/combat/execMoves.ts): gripping a line (a tail, an
// ankle, a forearm, a tongue) as a rope is held, gripping fists, pressing palms, punching fists, chopping edges, or both
// fists clasped into a hammer. Each hand goes to a bone of the body or a point of your own; between keys it's eased.
// Update 0.1.3 — the designer's second pass: the orc's head in your palm and an uppercut; the ninja's arm torn, the other
// chopped, three punches; the armabee in one fist; the ghost punched away; the frog's whirl higher, flung forward; the
// clasped fists a little apart (they passed through each other); the wasp held at its ends; the spider's chops wound
// up high and carried through; the blue demon's last blow to its face.
import type { EnemyKind } from '../../sim/enemies/kinds';
import { BARRAGE, BARRAGE_GAP } from '../../sim/combat/execMoves';

type V3 = readonly [number, number, number];
/** How a hand is: in its guard, round a line (a rope's grip), a fist, half of the clasped hammer, an open palm
 *  pressing, an open hand's edge chopping. */
export type HandMode = 'guard' | 'rope' | 'fist' | 'hammer' | 'palm' | 'chop';

export interface HandAt {
  mode: HandMode;
  /** On a bone of its body ('@grip': on the line it's held by, near its end), moved across your view from there
   *  (right, up, towards you; m). Or a point of your own (`me`: right, up, ahead of where you stood; m). */
  on?: string;
  off?: V3;
  me?: V3;
  /** Rope: the bone the line runs to from the hand ('@grip': the grip's own line), or a way (`way`, as `me`). Fist,
   *  hammer, chop: the knuckles' way (`way`; none: at what it's aimed at, from your eye). Palm: the way the palm faces
   *  (none: inward, across your view). */
  to?: string;
  way?: V3;
  /** Rope: this far further along it, in the arms' own view (m): the second fist. */
  slide?: number;
  /** A tremble (m), and a circling (m, its radius) with the frog's whirl. */
  shake?: number;
  whirl?: number;
}

export interface HandKey {
  t: number;
  L: HandAt;
  R: HandAt;
}

const G: HandAt = { mode: 'guard' };
const LINE: HandAt = { mode: 'rope', on: '@grip', to: '@grip' };
const LINE2: HandAt = { mode: 'rope', on: '@grip', to: '@grip', slide: 0.1 };
const palms = (on: string, w: number, up = 0.05): Pick<HandKey, 'L' | 'R'> => ({
  L: { mode: 'palm', on, off: [-w, up, 0.05] },
  R: { mode: 'palm', on, off: [w, up, 0.05] },
});
/** Both fists on one spot, clasped (viewmodel/heldGrip.ts sets them side by side). */
const hammer = (at: HandAt): Pick<HandKey, 'L' | 'R'> => ({ L: { ...at, mode: 'hammer' }, R: { ...at, mode: 'hammer' } });
/** Fists drawn back, ready to punch. */
const COCK_L: HandAt = { mode: 'fist', me: [-0.25, 1.42, 0.3], way: [0.2, 0, 1] };
const COCK_R: HandAt = { mode: 'fist', me: [0.25, 1.42, 0.3], way: [-0.2, 0, 1] };
/** A chop: wound up high to that side, down through `on`, carried on past it. */
const chopUp = (x: number): HandAt => ({ mode: 'chop', me: [x, 1.95, 0.45], way: [0, 0.5, 1] });
const chopOn = (on: string): HandAt => ({ mode: 'chop', on, off: [0, 0.06, 0], way: [0, -0.8, 0.6] });
const chopThrough = (x: number, ahead: number): HandAt => ({ mode: 'chop', me: [x, 0.7, ahead], way: [0, -1, 0.3] });
const RAISED = hammer({ mode: 'hammer', me: [0, 1.85, 0.6], way: [0, 0.5, 1] });

/** The tail's grip (the snake's): both hands round it, the left on its end. */
const BY_LINE: HandKey[] = [
  { t: 0, L: G, R: G },
  { t: 0.12, L: LINE, R: LINE2 },
  { t: 1.3, L: LINE, R: LINE2 },
  { t: 1.5, L: G, R: G },
];

/** The blue demon's barrage: the fists in turn into its chest and belly, the other drawn back. */
function barrage(): HandKey[] {
  const cockL: HandAt = { mode: 'fist', me: [-0.24, 1.5, 0.3], way: [0.2, 0, 1] };
  const cockR: HandAt = { mode: 'fist', me: [0.24, 1.5, 0.3], way: [-0.2, 0, 1] };
  const spots: V3[] = [
    [-0.12, 0.12, 0.3],
    [0.1, 0.22, 0.3],
    [-0.06, -0.12, 0.32],
    [0.14, -0.04, 0.3],
    [0, 0.3, 0.28],
    [-0.16, 0.24, 0.28],
    [0.06, -0.2, 0.32],
  ];
  const keys: HandKey[] = [
    { t: 0, L: G, R: G },
    { t: 0.15, L: cockL, R: cockR },
  ];
  for (let i = 0; i < BARRAGE; i++) {
    const hit: HandAt = { mode: 'fist', on: i % 3 === 2 ? 'Abdomen' : 'Torso', off: spots[i % spots.length] };
    keys.push({ t: 0.25 + i * BARRAGE_GAP, L: i % 2 === 0 ? hit : cockL, R: i % 2 === 0 ? cockR : hit });
  }
  // The last, drawn back high, to its face.
  keys.push({ t: 1.9, L: cockL, R: { mode: 'fist', me: [0.3, 1.62, 0.1], way: [0, 0.3, 1], shake: 0.006 } });
  keys.push({ t: 2.0, L: cockL, R: { mode: 'fist', on: 'Head', off: [0, 0.15, 0.3] } });
  keys.push({ t: 2.15, L: cockL, R: { mode: 'fist', on: 'Head', off: [0, 0.15, 0.3] } });
  keys.push({ t: 2.35, L: G, R: G });
  return keys;
}

export const HAND_MOVES: Partial<Record<EnemyKind, readonly HandKey[]>> = {
  snake: BY_LINE,
  // Its head in your right palm; tossed up; drawn back low and an uppercut into its belly as it comes down.
  grunt: [
    { t: 0, L: G, R: G },
    { t: 0.18, L: G, R: { mode: 'palm', on: 'Head', off: [0, 0.2, 0], way: [0, -1, 0] } },
    { t: 0.45, L: G, R: { mode: 'palm', on: 'Head', off: [0, 0.2, 0], way: [0, -1, 0] } },
    { t: 0.53, L: G, R: { mode: 'palm', me: [0.35, 2.15, 0.65], way: [0, 1, 0.2] } },
    // (Up where you're looking: drawn back low, they'd be below the view and the arm would fill it.)
    { t: 0.65, L: { mode: 'fist', me: [-0.32, 1.95, 0.5], way: [0.2, 0.6, 1] }, R: { mode: 'fist', me: [0.28, 1.82, 0.32], way: [0, 0.8, 0.6], shake: 0.008 } },
    { t: 0.85, L: { mode: 'fist', me: [-0.32, 1.95, 0.5], way: [0.2, 0.6, 1] }, R: { mode: 'fist', on: 'Abdomen', off: [0, -0.15, 0.1] } },
    { t: 1.0, L: { mode: 'fist', me: [-0.32, 1.95, 0.5], way: [0.2, 0.6, 1] }, R: { mode: 'fist', on: 'Abdomen', off: [0, -0.15, 0.1] } },
    { t: 1.2, L: G, R: G },
  ],
  spitter: [
    { t: 0, L: G, R: G },
    { t: 0.18, ...palms('Head', 0.66, 0.35) },
    { t: 0.9, ...palms('Head', 0.66, 0.35) },
    { t: 1.15, L: G, R: G },
  ],
  // The arm on your right torn off by your right hand; the one on your left chopped off by your left; its face punched
  // left, right, and a last right that sends it flying.
  leaper: [
    { t: 0, L: G, R: G },
    { t: 0.2, L: G, R: { mode: 'rope', me: [0.3, 1.2, 0.55], to: 'ShoulderL' } },
    { t: 0.4, L: G, R: { mode: 'rope', me: [0.45, 1.15, 0.42], to: 'ShoulderL' } },
    { t: 0.47, L: G, R: { mode: 'rope', me: [0.62, 1.05, 0.28], way: [-0.55, 0.1, 0.8] } },
    { t: 0.6, L: chopUp(-0.6), R: COCK_R },
    { t: 0.72, L: chopOn('LowerArmR'), R: COCK_R },
    { t: 0.77, L: chopThrough(-0.7, 0.9), R: COCK_R },
    { t: 0.8, L: COCK_L, R: COCK_R },
    { t: 0.85, L: { mode: 'fist', on: 'Head', off: [-0.05, 0.15, 0.14] }, R: COCK_R },
    { t: 0.93, L: COCK_L, R: COCK_R },
    { t: 1.0, L: COCK_L, R: { mode: 'fist', on: 'Head', off: [0.05, 0.15, 0.14] } },
    { t: 1.1, L: COCK_L, R: { mode: 'fist', me: [0.32, 1.45, 0.1], way: [-0.1, 0, 1], shake: 0.006 } },
    { t: 1.2, L: COCK_L, R: { mode: 'fist', on: 'Head', off: [0, 0.15, 0.14] } },
    { t: 1.32, L: COCK_L, R: { mode: 'fist', on: 'Head', off: [0, 0.15, 0.14] } },
    { t: 1.5, L: G, R: G },
  ],
  slime: [
    { t: 0, L: G, R: G },
    { t: 0.3, ...RAISED },
    { t: 0.5, ...hammer({ mode: 'hammer', on: 'Head', off: [0, 0.22, 0.05], way: [0, -0.5, 1] }) },
    { t: 0.62, ...hammer({ mode: 'hammer', on: 'Head', off: [0, 0.22, 0.05], way: [0, -0.5, 1] }) },
    { t: 0.85, L: G, R: G },
  ],
  frog: [
    { t: 0, L: G, R: G },
    { t: 0.15, L: G, R: { mode: 'rope', me: [0.22, 1.45, 0.5], to: 'Head' } },
    { t: 0.45, L: G, R: { mode: 'rope', me: [0.22, 2.15, 0.42], to: 'Head', whirl: 0.08 } },
    { t: 1.5, L: G, R: { mode: 'rope', me: [0.22, 2.15, 0.42], to: 'Head', whirl: 0.08 } },
    // Flung forward as it's let go.
    { t: 1.6, L: G, R: { mode: 'fist', me: [0.15, 1.75, 0.85], way: [0, 0.3, 1] } },
    { t: 1.8, L: G, R: G },
  ],
  stinger: [
    { t: 0, L: G, R: G },
    // In your right fist by the neck.
    { t: 0.18, L: G, R: { mode: 'rope', on: 'Neck', to: 'Head' } },
    { t: 0.95, L: G, R: { mode: 'rope', on: 'Neck', to: 'Head' } },
    { t: 1.15, L: G, R: G },
  ],
  wraith: [
    { t: 0, L: G, R: G },
    { t: 0.2, ...palms('Torso', 0.36) },
    { t: 0.35, ...palms('Torso', 0.36) },
    { t: 0.5, ...palms('Torso', 0.2) },
    { t: 0.6, ...palms('Torso', 0.2) },
    { t: 0.72, ...palms('Torso', 0.12) },
    // Held in the left palm while the right draws back, then punched away.
    { t: 0.85, L: palms('Torso', 0.12).L, R: { mode: 'fist', me: [0.3, 1.45, 0.15], way: [-0.2, 0.05, 1] } },
    { t: 0.98, L: palms('Torso', 0.12).L, R: { mode: 'fist', me: [0.32, 1.45, 0.1], way: [-0.2, 0.05, 1], shake: 0.006 } },
    { t: 1.05, L: palms('Torso', 0.12).L, R: { mode: 'fist', on: 'Torso', off: [0.02, 0.05, 0.12] } },
    { t: 1.15, L: G, R: { mode: 'fist', on: 'Torso', off: [0.02, 0.05, 0.12] } },
    { t: 1.35, L: G, R: G },
  ],
  wasp: [
    { t: 0, L: G, R: G },
    // Held at its ends (its neck, the tip of its abdomen), well apart.
    { t: 0.22, L: { mode: 'rope', on: 'Neck', to: 'Head' }, R: { mode: 'rope', on: 'Abdomen3', to: 'Sting' } },
    { t: 0.5, L: { mode: 'rope', on: 'Neck', to: 'Head' }, R: { mode: 'rope', on: 'Abdomen3', to: 'Sting' } },
    { t: 0.6, L: { mode: 'rope', on: 'Neck', to: 'Head' }, R: { mode: 'rope', me: [0.62, 1.35, 0.65], way: [1, -0.2, 0] } },
    { t: 0.8, L: { mode: 'rope', on: 'Neck', to: 'Head' }, R: { mode: 'rope', me: [0.55, 1.75, 0.55], way: [1, 0, 0] } },
    { t: 0.9, L: { mode: 'fist', me: [-0.3, 1.05, 0.75], way: [0, -1, 0.5] }, R: { mode: 'fist', me: [0.35, 1.05, 0.75], way: [0, -1, 0.5] } },
    { t: 1.1, L: G, R: G },
  ],
  brute: [
    { t: 0, L: G, R: G },
    { t: 0.15, L: { mode: 'fist', me: [-0.25, 1.45, 0.5], way: [0.2, 0, 1] }, R: { mode: 'fist', me: [0.28, 1.5, 0.2], way: [0, 0, 1], shake: 0.004 } },
    { t: 0.7, L: { mode: 'fist', me: [-0.25, 1.45, 0.5], way: [0.2, 0, 1] }, R: { mode: 'fist', me: [0.3, 1.5, 0.16], way: [0, 0, 1], shake: 0.012 } },
    { t: 0.8, L: { mode: 'fist', me: [-0.3, 1.4, 0.32], way: [0.2, 0, 1] }, R: { mode: 'fist', on: 'Abdomen', off: [0, 0, 0.35] } },
    { t: 1.0, L: { mode: 'fist', me: [-0.3, 1.4, 0.32], way: [0.2, 0, 1] }, R: { mode: 'fist', on: 'Abdomen', off: [0, 0, 0.35] } },
    { t: 1.2, L: G, R: G },
  ],
  spider: [
    { t: 0, L: G, R: G },
    { t: 0.15, L: G, R: chopUp(0.62) },
    { t: 0.25, L: G, R: chopOn('FrontLeg2L') },
    { t: 0.31, L: chopUp(-0.62), R: chopThrough(0.75, 1.0) },
    { t: 0.4, L: chopUp(-0.62), R: G },
    { t: 0.5, L: chopOn('FrontLeg2R'), R: G },
    { t: 0.56, L: chopThrough(-0.75, 1.0), R: chopUp(0.65) },
    { t: 0.65, L: G, R: chopUp(0.65) },
    { t: 0.75, L: G, R: chopOn('MidFrontLeg2L') },
    { t: 0.81, L: G, R: chopThrough(0.9, 1.3) },
    { t: 0.95, L: G, R: G },
    // The slime's smash.
    { t: 1.05, ...RAISED },
    { t: 1.25, ...hammer({ mode: 'hammer', on: 'Body', off: [0, 0.22, 0.05], way: [0, -0.5, 1] }) },
    { t: 1.37, ...hammer({ mode: 'hammer', on: 'Body', off: [0, 0.22, 0.05], way: [0, -0.5, 1] }) },
    { t: 1.6, L: G, R: G },
  ],
  blueDemon: barrage(),
};
