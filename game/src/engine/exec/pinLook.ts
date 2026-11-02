// Update 0.3.8 (the designer: "they hit the enemy 2 times, one left and right hand, they grab the head and pin the enemy
// on the ground and join fist with a ground smash and they explode") — the wall finisher as you see it
// (sim/combat/execPin.ts): your hands, and the body held by its head, bursting into its pieces at the end. A left hook
// to its head, a right; its head between your palms as it's pulled in, pressed down as it's slammed to the floor; then
// the ground slam's clasped fists up and down on it (handMoves.ts `slam`). Whatever kind is pinned, the same: each held by its head (its rig's Head to
// its Hips), cut as a humanoid is (the Skeleton into its bones).
// Update 0.3.9 — the pillar finisher's hands (sim/combat/execPin.ts): a right jab to its head, a left; the right drawn
// back and shaking, then a heavy punch into its chest that carries on out after it as it goes through the pillar.
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

/** A jab to its head; the right drawn back for the heavy, shaking harder; the heavy, and the arm carried on out. */
const jab = (x: number): HandAt => ({ mode: 'fist', on: 'Head', off: [x, 0, 0.12] });
const wind = (shake: number): HandAt => ({ mode: 'fist', me: [0.3, 1.56, 0.24], way: [-0.15, 0.1, 1], shake });

export const PILLAR_HANDS: readonly HandKey[] = [
  { t: 0, L: G, R: G },
  { t: 0.1, L: COCK_L, R: COCK_R },
  { t: 0.22, L: COCK_L, R: jab(0.05) },
  { t: 0.32, L: COCK_L, R: COCK_R },
  { t: 0.42, L: jab(-0.05), R: COCK_R },
  { t: 0.5, L: COCK_L, R: wind(0.008) },
  { t: 0.62, L: COCK_L, R: wind(0.014) },
  { t: 0.7, L: COCK_L, R: { mode: 'fist', on: 'Torso', off: [0, 0.12, 0.3] } },
  { t: 0.85, L: COCK_L, R: { mode: 'fist', me: [0.12, 1.45, 0.95], way: [0, 0, 1] } },
  { t: 1.05, L: G, R: G },
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

/** Its hands: the pillar finisher's, the wall finisher's, or its kind's. */
export const handsFor = (ex: Execution): readonly HandKey[] | undefined => (!ex.pinned ? HAND_MOVES[ex.kind] : ex.pillar >= 0 ? PILLAR_HANDS : PIN_HANDS);

/** Its pieces are cut once per kind, and once more for the finishers' cuts. */
export const piecesKey = (ex: Execution) => (ex.pinned ? `${ex.kind}:pinned` : ex.kind);
