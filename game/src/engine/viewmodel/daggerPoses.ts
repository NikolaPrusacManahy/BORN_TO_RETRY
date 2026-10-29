// Update 0.1.9 — the Dual Daggers' own key poses (the designer's rule: every weapon its own grip and moves), as the arms
// camera sees them (x right, y up, −z ahead; metres from the eye), like swordPoses.ts. The right hand's are written out;
// the left hand's are their mirror (x turned over), so the two hands do the same moves on their own sides.
// Held ready low in each corner like the fists' guard, the blade up and leaning ahead, edge forward; a cut is a short
// slash from high on its side down through the middle (shorter than the sword's, so it never reaches the other hand).
// The volley (the designer: like the Trickster's stance, the daggers flipped to be held by the tip and thrown): as it
// charges both fists come up, each dagger turned over in the fist (tipHold.ts) so its handle stands up and back over the
// shoulder; each throw whips that arm over and out at the crosshair, the dagger gone from the hand (a toss). These were
// solved for a straight wrist: the knuckles along the forearm the arm's IK gives (wrist bends under 1°).
import { Vector3 } from 'three';
import type { SwordPose } from './armsRig';
import { pose } from './swordPoses';

type V = [number, number, number];
/** Elbow out to the right. */
const OUT: V = [1, 0, 0.3];

export const DAGGER_READY = pose([0.2, -0.19, -0.38], [-0.15, 0.8, -0.55], [-0.1, -0.4, -0.9], 25, OUT);

/** Where the fist closes on a dagger turned over for throwing: on the blade near the point, which just shows past the
 *  little finger (the dagger model's own metres). */
export const DAGGER_TIP = new Vector3(0, 0.6, 0);

/** The throwing stance (as the volley charges, and between throws): the fist up on the right, the knuckles forward, the
 *  dagger held by its tip with the handle standing up and back over the shoulder. ("Blade" here is the way out of the
 *  top of the fist: with the dagger turned over, its handle.) */
// (The designer: "a bit up when in aim mode": 4 cm higher than first built.)
export const DAGGER_COCKED = pose([0.2, -0.12, -0.36], [0.281, 0.876, 0.391], [-0.104, 0.433, -0.895], 0, [1, -0.7, 0.2]);
/** A throw's follow-through: the arm whipped over and out at the crosshair, the hand empty. */
export const DAGGER_TOSSED = pose([0.08, -0.13, -0.5], [-0.158, 0.956, -0.249], [-0.512, -0.295, -0.807], 30, [1, -0.3, 0.3]);

/** A cut, from ready (0) to its end low in the middle (1): up high on the right, down through the middle. */
export const DAGGER_CUT: readonly SwordPose[] = [
  DAGGER_READY,
  pose([0.24, -0.02, -0.4], [0.05, 0.95, -0.2], [-0.5, 0, -0.85], 45, OUT),
  pose([0.12, -0.14, -0.48], [-0.6, 0.4, -0.7], [0.05, -0.88, -0.48], 60, OUT),
  pose([0.03, -0.2, -0.45], [-0.8, 0.05, -0.6], [-0.1, -0.99, 0.14], 60, OUT),
  pose([-0.03, -0.24, -0.42], [-0.7, 0.25, -0.66], [-0.5, -0.78, 0.3], 60, OUT),
];

/** A pose as the left hand does it: everything turned over left to right. */
export function mirrored(p: SwordPose): SwordPose {
  const m = pose([-p.grip.x, p.grip.y, p.grip.z], [-p.blade.x, p.blade.y, p.blade.z], [-p.edge.x, p.edge.y, p.edge.z], 0, [-p.elbow.x, p.elbow.y, p.elbow.z]);
  m.tilt = p.tilt;
  return m;
}

export const DAGGER_READY_L = mirrored(DAGGER_READY);
export const DAGGER_COCKED_L = mirrored(DAGGER_COCKED);
export const DAGGER_TOSSED_L = mirrored(DAGGER_TOSSED);
export const DAGGER_CUT_L: readonly SwordPose[] = DAGGER_CUT.map(mirrored);
