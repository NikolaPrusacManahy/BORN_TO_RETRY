// Update 0.1.5 — a weapon held in both hands (the Hammer): the left hand closes on the handle `up` metres along it from
// the right fist (below it: negative), its knuckles the same way as the right's, so the two hands grip it one above the
// other as a real two-handed hold does. Model space, from the sword arm's pose (swordArm.ts) once it has been carried
// into the model.
import type { ArmPose, ArmsRig, SwordPose } from './armsRig';
import { copySword, emptySword } from './swordPoses';

const left = emptySword();

export function leftGrip(rig: ArmsRig, held: SwordPose, up: number, out: ArmPose): ArmPose {
  copySword(held, left);
  left.grip.addScaledVector(held.blade, up);
  return rig.gripPose(left, out, 'L');
}
