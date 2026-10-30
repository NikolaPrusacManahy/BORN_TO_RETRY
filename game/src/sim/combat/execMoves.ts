// Update 0.1.2 — each enemy's execution as data (the designer's list, spec MD_UPDATES/U012_EXECUTIONS.md; the snake's
// from Update 0.1.1): where its body goes (held in your hands, or standing where it's pulled to), where you look, its
// blows (each a freeze), and how it ends: thrown ahead, thrown at the nearest wall, or dying where it is. The hands are
// the view's (engine/exec/handMoves.ts), timed to these. Pure.
// Update 0.1.3 — the designer's second pass (spec MD_UPDATES/U013_EXECUTIONS.md): the orc tossed up by its head and
// burst by an uppercut; the ninja's arms off one by one, three punches; the armabee in one hand; the ghost punched
// away; the frog let go higher; the spider's chops harder; the blue demon's last blow to the face.
// Update 0.2.2 — floor 3's (execMoves3.ts): the Ninja the leaper's, the Mushnub the slime's, the Skeleton crushed by
// telekinesis. A standing body's `grip` height lifts it off the floor (0 for every other).
import { ENEMY_STATS, EnemyKind } from '../enemies/kinds';
import { NINJA, SKELETON } from './execMoves3';

export type V3 = readonly [number, number, number];
/** A blow: its sound, its sparks and its freeze. */
export type Blow = 'punch' | 'chop' | 'tear' | 'crush' | 'smash';
export const BLOWS: readonly Blow[] = ['punch', 'chop', 'tear', 'crush', 'smash'];

/** A keyframe (s in). Held: where your hands hold its grip and the way its body runs from there (its grip-to-head
 *  line); standing: where it stands (`grip` on the floor; Update 0.2.2: its height, how far it's lifted). Both as (right, up, ahead) of where you stood, in the frame
 *  turned `aim` of the way to where it's thrown (the wall). `grip` null: where it was. `look`: where you look (degrees
 *  left of the frame and above the horizon; null: where you looked). `hit`: it slams into the floor here (eased into).
 *  `glide`: straight through, not eased (a whirl); `snap`: sped into and out of, as a slam is, with no slam (a toss). */
export interface BodyKey {
  t: number;
  grip: V3 | null;
  dir?: V3;
  look: readonly [number, number] | null;
  hit?: boolean;
  aim?: number;
  glide?: boolean;
  snap?: boolean;
}

/** A blow at `t`, freezing `stop` s; `at`: where (right, up, ahead of where you stood; the body's middle if none). */
export interface Beat {
  t: number;
  blow: Blow;
  stop: number;
  at?: V3;
}

export interface ExecMove {
  /** Held in your hands (else it stands, pulled where its keys say). */
  held: boolean;
  keys: readonly BodyKey[];
  beats: readonly Beat[];
  /** How it ends at `endAt`: thrown ahead, thrown at the nearest wall (it bursts there), or dying where it is. */
  end: 'throw' | 'wall' | 'burst';
  endAt: number;
  /** Held: its middle from its grip, as a share of its height. */
  half: number;
  /** A throw: × Throw distance, × Throw height, × Throw flight. */
  far?: number;
  lob?: number;
  fly?: number;
}

const UP: V3 = [0, 1, 0];

/** The snake's (Update 0.1.1): raised in front of you, so you see it come down; swung round on your right (the left
 *  hand holds the tail's end, so a body out to the left would cross your arms), never through your head. */
const SNAKE: BodyKey[] = [
  { t: 0, grip: null, dir: [0, 1, 0], look: null },
  { t: 0.22, grip: [0.25, 1.35, 0.9], dir: [0, -1, 0.15], look: [0, -12] },
  { t: 0.38, grip: [0.2, 1.8, 0.85], dir: [0.1, 0.95, 0.25], look: [0, 16] },
  { t: 0.5, grip: [0.15, 0.75, 1.0], dir: [0, -0.85, 0.53], look: [0, -32], hit: true },
  { t: 0.68, grip: [0.25, 1.65, 0.8], dir: [0.65, 0.55, 0.5], look: [-10, 4] },
  { t: 0.84, grip: [0.1, 1.8, 0.8], dir: [0.15, 0.95, 0.2], look: [0, 16] },
  { t: 1, grip: [0.35, 0.75, 0.9], dir: [0.61, -0.76, 0.2], look: [-12, -32], hit: true },
  { t: 1.15, grip: [0.35, 1.7, 0.45], dir: [0.75, 0.3, -0.6], look: [-18, 0] },
  { t: 1.3, grip: [0.2, 1.6, 1.15], dir: [0, 0.15, 1], look: [0, -3] },
];

/** The frog's whirl: yanked up in front of you, then twice round overhead on its tongue (a ring tilted down in front, so
 *  you see it pass), its head to your hand; let go in front. */
function frogKeys(): BodyKey[] {
  const keys: BodyKey[] = [
    { t: 0, grip: null, dir: [0, 0, -1], look: null },
    { t: 0.22, grip: null, dir: [0, 0, -1], look: [0, 4] },
  ];
  const c: V3 = [0, 2.15, 0.7];
  const r = 1.3;
  const tilt = (35 * Math.PI) / 180;
  const at = (a: number): [V3, V3] => {
    const x = Math.cos(a);
    const f = Math.sin(a);
    const out: V3 = [x, -f * Math.sin(tilt), f * Math.cos(tilt)];
    return [[c[0] + r * out[0], c[1] + r * out[1], c[2] + r * out[2]], out];
  };
  const [p0, d0] = at(Math.PI / 2);
  keys.push({ t: 0.45, grip: p0, dir: d0, look: [0, 26] });
  // Two turns, a key every 30°, from in front round by your right.
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const [p, d] = at(Math.PI / 2 - (i * Math.PI * 2 * 2) / steps);
    keys.push({ t: 0.45 + (i * 1.05) / steps, grip: p, dir: d, look: [0, 28], glide: true });
  }
  return keys;
}

/** The blue demon's barrage: 30 punches, 0.055 s apart, about its chest and belly. */
const BARRAGE_FROM = 0.25;
export const BARRAGE_GAP = 0.055;
export const BARRAGE = 30;
function barrage(): Beat[] {
  const beats: Beat[] = [];
  for (let i = 0; i < BARRAGE; i++) beats.push({ t: BARRAGE_FROM + i * BARRAGE_GAP, blow: 'punch', stop: 0 });
  // The last, to its face.
  beats.push({ t: 2, blow: 'punch', stop: 0.18, at: [0, 2.2, 1.8] });
  return beats;
}

/** Every kind you can execute (more to come: the bosses have none). */
export const EXEC_MOVES: Partial<Record<EnemyKind, ExecMove>> = {
  snake: { held: true, keys: SNAKE, beats: [], end: 'throw', endAt: 1.3, half: 0.42 },
  grunt: {
    held: true,
    keys: [
      { t: 0, grip: null, dir: [0, -1, 0], look: null },
      { t: 0.25, grip: [0.1, 2.05, 1.2], dir: [0, -1, 0.1], look: [0, 12] },
      { t: 0.45, grip: [0.05, 2.75, 1.25], dir: [0, -1, 0.15], look: [0, 30], snap: true },
      { t: 0.65, grip: [-0.6, 3.1, 1.4], dir: [0.8, 0.3, -0.5], look: [0, 42] },
      { t: 0.85, grip: [-0.95, 2.0, 1.15], dir: [1, 0.1, 0], look: [0, 28], snap: true },
    ],
    beats: [{ t: 0.85, blow: 'punch', stop: 0.2, at: [0, 2.05, 1.15] }],
    end: 'burst',
    endAt: 0.88,
    half: 0.5,
  },
  spitter: {
    held: true,
    keys: [
      { t: 0, grip: null, dir: UP, look: null },
      { t: 0.25, grip: [0, 0.6, 1.35], dir: UP, look: [0, -12] },
      { t: 0.5, grip: [1.1, 0.8, 0.55], dir: [0.3, 1, 0], look: [-20, -8], aim: 0.5 },
      { t: 0.72, grip: [0.95, 0.9, -0.55], dir: [0.2, 1, -0.2], look: [-14, -6], aim: 1 },
      { t: 0.9, grip: [0.2, 0.8, 1.4], dir: [0, 1, 0.3], look: [0, -8], aim: 1 },
    ],
    beats: [],
    end: 'wall',
    endAt: 0.9,
    half: 0.15,
  },
  leaper: {
    held: false,
    keys: [
      { t: 0, grip: null, look: null },
      { t: 0.2, grip: [0, 0, 1.3], look: [-8, -16] },
      { t: 0.45, grip: [0, 0, 1.4], look: [-8, -16] },
      { t: 0.5, grip: [0, 0, 1.3], look: [6, -12] },
      { t: 0.72, grip: [0, 0, 1.3], look: [8, -12] },
      { t: 0.85, grip: [0, 0, 1.3], look: [0, -4] },
      { t: 1.0, grip: [0, 0, 1.35], look: [0, -4] },
      { t: 1.2, grip: [0, 0, 1.35], look: [0, -2] },
    ],
    beats: [
      { t: 0.45, blow: 'tear', stop: 0.1, at: [0.45, 1.2, 0.9] },
      { t: 0.72, blow: 'chop', stop: 0.09, at: [-0.7, 1.2, 1.2] },
      { t: 0.85, blow: 'punch', stop: 0.06, at: [0, 1.35, 1.15] },
      { t: 1.0, blow: 'punch', stop: 0.06, at: [0, 1.35, 1.2] },
      { t: 1.2, blow: 'punch', stop: 0.14, at: [0, 1.35, 1.2] },
    ],
    end: 'throw',
    endAt: 1.2,
    half: 0.5,
    lob: 0.6,
  },
  slime: {
    held: false,
    keys: [
      { t: 0, grip: null, look: null },
      { t: 0.15, grip: [0, 0, 1.3], look: [0, -10] },
      { t: 0.3, grip: [0, 0, 1.3], look: [0, 22] },
      { t: 0.5, grip: [0, 0, 1.3], look: [0, -38] },
      { t: 0.6, grip: [0, 0, 1.3], look: [0, -36] },
    ],
    beats: [{ t: 0.5, blow: 'smash', stop: 0.12, at: [0, 0.3, 1.3] }],
    end: 'burst',
    endAt: 0.6,
    half: 0.5,
  },
  frog: { held: true, keys: frogKeys(), beats: [], end: 'throw', endAt: 1.5, half: 0.5, far: 1.2, lob: 2.5, fly: 2 },
  stinger: {
    held: true,
    keys: [
      { t: 0, grip: null, dir: [0, -1, 0], look: null },
      { t: 0.22, grip: [0.25, 1.6, 1.0], dir: [0, -1, 0.05], look: [0, -4] },
      { t: 0.42, grip: [0.3, 2.05, 0.6], dir: [0, 0.4, -0.9], look: [0, 18] },
      { t: 0.55, grip: [0.2, 0.75, 1.15], dir: [0, -0.6, 0.8], look: [0, -34], hit: true },
      { t: 0.75, grip: [0.3, 2.0, 0.65], dir: [0, 0.4, -0.9], look: [0, 16] },
      { t: 0.9, grip: [0.2, 0.72, 1.2], dir: [0, -0.55, 0.83], look: [0, -36], hit: true },
    ],
    beats: [],
    end: 'burst',
    endAt: 0.95,
    half: 0.3,
  },
  wraith: {
    held: true,
    keys: [
      { t: 0, grip: null, dir: UP, look: null },
      { t: 0.22, grip: [0, 1.45, 0.75], dir: UP, look: [0, -4] },
      { t: 0.75, grip: [0, 1.4, 0.7], dir: UP, look: [0, -6] },
      { t: 0.92, grip: [-0.05, 1.42, 0.72], dir: UP, look: [0, -4] },
      { t: 1.05, grip: [0, 1.45, 0.85], dir: [0, 1, 0.3], look: [0, -2], snap: true },
    ],
    beats: [
      { t: 0.5, blow: 'crush', stop: 0.05 },
      { t: 0.72, blow: 'crush', stop: 0.08 },
      { t: 1.05, blow: 'punch', stop: 0.1 },
    ],
    end: 'throw',
    endAt: 1.05,
    half: 0.1,
  },
  wasp: {
    held: true,
    keys: [
      { t: 0, grip: null, dir: [0, -1, 0], look: null },
      { t: 0.25, grip: [-0.3, 1.45, 0.8], dir: [1, -0.1, 0], look: [0, -6] },
      { t: 0.5, grip: [-0.32, 1.45, 0.78], dir: [1, -0.1, 0], look: [0, -6] },
      { t: 0.6, grip: [-0.55, 1.4, 0.7], dir: [0.9, -0.3, 0], look: [4, -8] },
      { t: 0.85, grip: [-0.4, 1.75, 0.6], dir: [0.6, 0.4, 0.2], look: [0, -12] },
    ],
    beats: [{ t: 0.55, blow: 'tear', stop: 0.12, at: [0, 1.45, 0.8] }],
    end: 'throw',
    endAt: 0.85,
    half: 0.35,
    far: 0.3,
    lob: 0,
    fly: 0.5,
  },
  brute: {
    held: false,
    keys: [
      { t: 0, grip: null, look: null },
      { t: 0.2, grip: [0, 0, 1.8], look: [0, -4] },
      { t: 0.8, grip: [0, 0, 1.8], look: [0, -6] },
      { t: 0.9, grip: [0, 0, 1.9], look: [0, 4] },
    ],
    beats: [{ t: 0.8, blow: 'punch', stop: 0.2, at: [0, 1.2, 1.45] }],
    end: 'burst',
    endAt: 0.86,
    half: 0.5,
  },
  spider: {
    held: false,
    keys: [
      { t: 0, grip: null, look: null },
      { t: 0.15, grip: [0, 0, 1.9], look: [-12, -24] },
      { t: 0.45, grip: [0, 0, 1.9], look: [12, -24] },
      { t: 0.7, grip: [0, 0, 1.9], look: [-14, -26] },
      { t: 1.05, grip: [0, 0, 1.9], look: [0, 22] },
      // (Update 0.1.8 — tipped down less, -38° before: its back low enough on screen for the slam's fists to land on.)
      { t: 1.25, grip: [0, 0, 1.9], look: [0, -26] },
    ],
    beats: [
      { t: 0.25, blow: 'chop', stop: 0.1, at: [0.7, 0.75, 1.15] },
      { t: 0.5, blow: 'chop', stop: 0.1, at: [-0.7, 0.75, 1.15] },
      { t: 0.75, blow: 'chop', stop: 0.1, at: [0.9, 0.8, 1.6] },
      { t: 1.25, blow: 'smash', stop: 0.14, at: [0, 0.6, 1.9] },
    ],
    end: 'burst',
    endAt: 1.35,
    half: 0.5,
  },
  ninja: NINJA,
  skeleton: SKELETON,
  blueDemon: {
    held: false,
    keys: [
      { t: 0, grip: null, look: null },
      { t: 0.15, grip: [0, 0, 2.0], look: [0, -2] },
      { t: 1.85, grip: [0, 0, 2.0], look: [0, -2] },
      { t: 2.0, grip: [0, 0, 2.0], look: [0, 14] },
      { t: 2.05, grip: [0, 0, 2.05], look: [0, 14] },
    ],
    beats: barrage(),
    end: 'burst',
    endAt: 2.05,
    half: 0.5,
  },
};

// Update 0.2.2 — the Mushnub's is the slime's. Update 0.2.4 — floor 4's: the Tribal's the Orc's (the same rig), the big
// Cactoro's the Yeti's, the Cactoro's the slime's, the Hywirl's the ghost's (the same rig as the Wraith).
EXEC_MOVES.mushnub = EXEC_MOVES.slime;
EXEC_MOVES.tribal = EXEC_MOVES.grunt;
EXEC_MOVES.cactoroBig = EXEC_MOVES.brute;
EXEC_MOVES.cactoro = EXEC_MOVES.slime;
EXEC_MOVES.hywirl = EXEC_MOVES.wraith;
EXEC_MOVES.dinoBlob = EXEC_MOVES.grunt;
EXEC_MOVES.lizard = EXEC_MOVES.grunt;
EXEC_MOVES.skullOrc = EXEC_MOVES.brute;
// Update 0.2.7 — floor 3's newcomers: the fliers the Wraith's, the Rabbit the Grunt's, the Big Mushnub the Yeti's.
EXEC_MOVES.dragonling = EXEC_MOVES.wraith;
EXEC_MOVES.skullWraith = EXEC_MOVES.wraith;
EXEC_MOVES.rabbit = EXEC_MOVES.grunt;
EXEC_MOVES.bigMushnub = EXEC_MOVES.brute;
EXEC_MOVES.greenBlob = EXEC_MOVES.slime;
EXEC_MOVES.blobling = EXEC_MOVES.slime;
EXEC_MOVES.maskTribal = EXEC_MOVES.wraith;

/** The kinds you can execute. */
export const EXECUTABLE = Object.keys(EXEC_MOVES) as EnemyKind[];
/** `kind`'s moves (the snake's for one that has none), and its size. */
export const moveOf = (kind: EnemyKind): ExecMove => EXEC_MOVES[kind] ?? EXEC_MOVES.snake!;
export const heightOf = (kind: EnemyKind) => ENEMY_STATS[kind]().height;
