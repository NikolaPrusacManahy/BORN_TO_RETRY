// Update 0.3.8 (the designer: "they hit the enemy 2 times, one left and right hand, they grab the head and pin the enemy
// on the ground and join fist with a ground smash and they explode") — the wall finisher as you see it
// (sim/combat/execPin.ts): your hands, and the body held by its head, bursting into its pieces at the end. A left hook
// to its head, a right; its head between your palms as it's pulled in, pressed down as it's slammed to the floor; then
// the ground slam's clasped fists up and down on it (handMoves.ts `slam`). Whatever kind is pinned, the same: each held by its head (its rig's Head to
// its Hips), cut as a humanoid is (the Skeleton into its bones).
import type { Execution } from '../../sim/combat/execution';
import { G, HandAt, HandKey, HAND_MOVES, palms, slam } from './handMoves';
import { EXEC_LOOKS, ExecLook, HUMANOID } from './looks';

/** Held by its head, its body hanging to its hips, its front to you. */
export const PIN_GRIP = { at: 'Head', to: 'Hips', face: [0, 0, 1] as const };

/** A fist drawn back for a hook, and the hook on its head. */
const COCK_L: HandAt = { mode: 'fist', me: [-0.28, 1.5, 0.28], way: [0.35, 0, 1] };
const COCK_R: HandAt = { mode: 'fist', me: [0.28, 1.5, 0.28], way: [-0.35, 0, 1] };
const hook = (x: number): HandAt => ({ mode: 'fist', on: 'Head', off: [x, 0.02, 0.12] });
/** Both palms pressing its head down to the floor (the backs of the hands up). */
const press = (x: number): HandAt => ({ mode: 'palm', on: 'Head', off: [x, 0.2, 0], way: [0, 1, 0.1] });

export const PIN_HANDS: readonly HandKey[] = [
  { t: 0, L: G, R: G },
  { t: 0.13, L: COCK_L, R: G },
  { t: 0.25, L: hook(-0.06), R: COCK_R },
  { t: 0.37, L: COCK_L, R: COCK_R },
  { t: 0.5, L: COCK_L, R: hook(0.06) },
  // Its head between your palms, pulled in; slammed down and pressed to the floor.
  { t: 0.62, ...palms('Head', 0.26) },
  { t: 0.8, ...palms('Head', 0.26) },
  { t: 0.95, L: press(-0.13), R: press(0.13) },
  { t: 1.05, L: press(-0.13), R: press(0.13) },
  // The ground slam's clasped fists, down onto it.
  ...slam(1.12, 1.5, 'Torso'),
];

const looks = new Map<string, ExecLook>();

/** How an execution's body is drawn: the wall finisher's (held by its head, burst), or its kind's. */
export function lookFor(ex: Execution): ExecLook | undefined {
  if (!ex.pinned) return EXEC_LOOKS[ex.kind];
  let look = looks.get(ex.kind);
  if (!look) {
    look = { grip: PIN_GRIP, pieces: ex.kind === 'skeleton' ? EXEC_LOOKS.skeleton?.pieces : HUMANOID, burst: true };
    looks.set(ex.kind, look);
  }
  return look;
}

/** Its hands: the wall finisher's, or its kind's. */
export const handsFor = (ex: Execution): readonly HandKey[] | undefined => (ex.pinned ? PIN_HANDS : HAND_MOVES[ex.kind]);

/** Its pieces are cut once per kind, and once more for the wall finisher's cuts. */
export const piecesKey = (ex: Execution) => (ex.pinned ? `${ex.kind}:pinned` : ex.kind);
