// M1 step 6 — the gameplay guard, in the arms model's own space (glTF: +y up, the character faces +z, its left
// is +x). Converted from GUARD in tools/blender/cut_arms.py (Blender x, y, z → glTF x, z, −y).
//   fist: from the point between the shoulders, scaled by arm reach / REF_REACH; knuckles: the way the fist
//   points; back: the way the back of the hand faces; pole: the way the elbow bends out.
// Update 0.0.3 — the first guard (after a boxing photo) put the left fist almost on the crosshair, which the
// designer found uncomfortable to play with. Now both fists sit in the lower corners (knuckles at about 29% / 70%
// and 73% / 75% of a 2:1 screen), pointing forward, backs of the hands towards you.
import { Vector3 } from 'three';

export type Side = 'L' | 'R';

export interface GuardArm {
  fist: Vector3;
  knuckles: Vector3;
  back: Vector3;
  pole: Vector3;
}

export const GUARD: Record<Side, GuardArm> = {
  L: { fist: new Vector3(0.27, -0.032, 0.3), knuckles: new Vector3(-0.204, 0.153, 0.967).normalize(), back: new Vector3(0.7, 0.6, -0.35), pole: new Vector3(1, -0.6, -0.3) },
  R: { fist: new Vector3(-0.26, -0.042, 0.25), knuckles: new Vector3(0.304, 0.202, 0.931).normalize(), back: new Vector3(-0.7, 0.6, -0.35), pole: new Vector3(-1, -0.8, -0.2) },
};

/** Upper arm + forearm of the Adventurer, which the guard was tuned on (m). */
export const REF_REACH = 0.417;
/** Wrist to the fist's centre (m). */
export const FIST_REACH = 0.09;
/** The eye, from the head bone: a little up and forward, then pulled back so short arms frame the guard. */
export const EYE_FROM_HEAD = new Vector3(0, 0.03, 0.06 - 0.12);
/** In the T-pose the back of the hand (palms down) faces up. */
export const REST_BACK = new Vector3(0, 1, 0);
/** Forward for the character (glTF +z). */
export const FORWARD = new Vector3(0, 0, 1);
