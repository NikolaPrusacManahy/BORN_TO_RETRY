// Update 0.1.2 — your hands in each execution (the designer: "it needs to look like the hands of the player are
// performing the move"), keyframed and timed to its moves (sim/combat/execMoves.ts): gripping a line (a tail, an
// ankle, a forearm, a tongue) as a rope is held, gripping fists, pressing palms, punching fists, chopping edges, or both
// fists clasped into a hammer. Each hand goes to a bone of the body or a point of your own; between keys it's eased.
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
const hammer = (at: HandAt): Pick<HandKey, 'L' | 'R'> => ({
  L: { ...at, mode: 'hammer', off: at.off ? [at.off[0] - 0.045, at.off[1], at.off[2]] : undefined, me: at.me ? [at.me[0] - 0.045, at.me[1], at.me[2]] : undefined },
  R: { ...at, mode: 'hammer', off: at.off ? [at.off[0] + 0.045, at.off[1], at.off[2]] : undefined, me: at.me ? [at.me[0] + 0.045, at.me[1], at.me[2]] : undefined },
});
const RAISED = hammer({ mode: 'hammer', me: [0, 1.85, 0.6], way: [0, 0.5, 1] });

/** The tail's grip (the snake's, the orc's ankle): both hands round it, the left on its end. */
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
  keys.push({ t: 1.9, L: cockL, R: { mode: 'fist', me: [0.3, 1.5, 0.15], way: [0, 0, 1], shake: 0.006 } });
  keys.push({ t: 2.0, L: cockL, R: { mode: 'fist', on: 'Abdomen', off: [0, 0, 0.3] } });
  keys.push({ t: 2.15, L: cockL, R: { mode: 'fist', on: 'Abdomen', off: [0, 0, 0.3] } });
  keys.push({ t: 2.35, L: G, R: G });
  return keys;
}

export const HAND_MOVES: Partial<Record<EnemyKind, readonly HandKey[]>> = {
  snake: BY_LINE,
  grunt: BY_LINE,
  spitter: [
    { t: 0, L: G, R: G },
    { t: 0.18, ...palms('Head', 0.66, 0.35) },
    { t: 0.9, ...palms('Head', 0.66, 0.35) },
    { t: 1.15, L: G, R: G },
  ],
  leaper: [
    { t: 0, L: G, R: G },
    { t: 0.2, L: { mode: 'rope', me: [-0.3, 1.2, 0.55], to: 'ShoulderR' }, R: { mode: 'rope', me: [0.3, 1.2, 0.55], to: 'ShoulderL' } },
    { t: 0.5, L: { mode: 'rope', me: [-0.42, 1.15, 0.42], to: 'ShoulderR' }, R: { mode: 'rope', me: [0.42, 1.15, 0.42], to: 'ShoulderL' } },
    { t: 0.56, L: { mode: 'rope', me: [-0.6, 1.08, 0.3], way: [0.55, 0.1, 0.8] }, R: { mode: 'rope', me: [0.6, 1.08, 0.3], way: [-0.55, 0.1, 0.8] } },
    { t: 0.64, L: { mode: 'fist', me: [-0.62, 1.12, 0.3], way: [-0.6, 0.2, 0.8] }, R: { mode: 'fist', me: [0.3, 1.45, 0.2], way: [-0.1, 0.1, 1] } },
    { t: 0.85, L: { mode: 'fist', me: [-0.3, 1.3, 0.35], way: [0.2, 0, 1] }, R: { mode: 'fist', on: 'Head', off: [0, 0, 0.14] } },
    { t: 0.95, L: { mode: 'fist', me: [-0.3, 1.3, 0.35], way: [0.2, 0, 1] }, R: { mode: 'fist', on: 'Head', off: [0, 0, 0.14] } },
    { t: 1.15, L: G, R: G },
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
    { t: 0.45, L: G, R: { mode: 'rope', me: [0.28, 1.82, 0.55], to: 'Head', whirl: 0.07 } },
    { t: 1.5, L: G, R: { mode: 'rope', me: [0.28, 1.82, 0.55], to: 'Head', whirl: 0.07 } },
    { t: 1.7, L: G, R: G },
  ],
  stinger: [
    { t: 0, L: G, R: G },
    { t: 0.18, L: { mode: 'rope', on: 'Torso', off: [-0.36, 0.22, 0.05], to: 'Head' }, R: { mode: 'rope', on: 'Torso', off: [0.36, 0.22, 0.05], to: 'Head' } },
    { t: 0.95, L: { mode: 'rope', on: 'Torso', off: [-0.36, 0.22, 0.05], to: 'Head' }, R: { mode: 'rope', on: 'Torso', off: [0.36, 0.22, 0.05], to: 'Head' } },
    { t: 1.15, L: G, R: G },
  ],
  wraith: [
    { t: 0, L: G, R: G },
    { t: 0.2, ...palms('Torso', 0.36) },
    { t: 0.35, ...palms('Torso', 0.36) },
    { t: 0.5, ...palms('Torso', 0.2) },
    { t: 0.6, ...palms('Torso', 0.2) },
    { t: 0.72, ...palms('Torso', 0.12) },
    { t: 1.05, ...palms('Torso', 0.12) },
    { t: 1.2, L: G, R: G },
  ],
  wasp: [
    { t: 0, L: G, R: G },
    { t: 0.22, L: { mode: 'rope', on: 'Thorax', to: 'Head' }, R: { mode: 'rope', on: 'Abdomen2', to: 'Sting' } },
    { t: 0.5, L: { mode: 'rope', on: 'Thorax', to: 'Head' }, R: { mode: 'rope', on: 'Abdomen2', to: 'Sting' } },
    { t: 0.6, L: { mode: 'rope', on: 'Thorax', to: 'Head' }, R: { mode: 'rope', me: [0.55, 1.35, 0.65], way: [1, -0.2, 0] } },
    { t: 0.8, L: { mode: 'rope', on: 'Thorax', to: 'Head' }, R: { mode: 'rope', me: [0.5, 1.75, 0.55], way: [1, 0, 0] } },
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
    { t: 0.13, L: G, R: { mode: 'chop', me: [0.5, 1.75, 0.55], way: [0, 0.3, 1] } },
    { t: 0.25, L: G, R: { mode: 'chop', on: 'FrontLeg2L', off: [0, 0.06, 0], way: [0, -0.6, 1] } },
    { t: 0.33, L: { mode: 'chop', me: [-0.5, 1.75, 0.55], way: [0, 0.3, 1] }, R: G },
    { t: 0.5, L: { mode: 'chop', on: 'FrontLeg2R', off: [0, 0.06, 0], way: [0, -0.6, 1] }, R: G },
    { t: 0.6, L: G, R: { mode: 'chop', me: [0.55, 1.75, 0.6], way: [0, 0.3, 1] } },
    { t: 0.75, L: G, R: { mode: 'chop', on: 'MidFrontLeg2L', off: [0, 0.06, 0], way: [0, -0.6, 1] } },
    { t: 0.85, L: G, R: G },
    { t: 1.05, ...RAISED },
    { t: 1.25, ...hammer({ mode: 'hammer', on: 'Body', off: [0, 0.25, 0.1], way: [0, -0.5, 1] }) },
    { t: 1.4, ...hammer({ mode: 'hammer', on: 'Body', off: [0, 0.25, 0.1], way: [0, -0.5, 1] }) },
    { t: 1.6, L: G, R: G },
  ],
  blueDemon: barrage(),
};
