// M2 — the right arm holding the sword where the sword arm's move has it (a charging pierce trembles too).
// Update 0.1.4 — moved out of viewmodel.ts (it had grown past its size).
// Update 0.1.9 — or the left arm holding its own (the Dual Daggers' second): the Arms tab's nudges mirrored. How hard
// a charge trembles is the caller's (still while the daggers' volley is thrown: the designer).
import { ARMS } from '../../tuning/arms';
import type { ArmPose, ArmsRig, SwordPose } from './armsRig';
import { viewToModel } from './armsMath';
import type { Side } from './guard';
import type { SwordAnim } from './swordAnim';

/** `charge`: the pierce's charge as shown (0 … 1); `tremble`: how hard it trembles (1; 2 once it's full; 0 still);
 *  `time`: the arms' clock (s). */
export function swordArm(rig: ArmsRig, anim: SwordAnim, charge: number, tremble: number, time: number, sword: SwordPose, out: ArmPose, side: Side = 'R'): ArmPose {
  const v = ARMS.v;
  const s = anim.pose(charge, sword);
  s.grip.x += side === 'R' ? v.swordSide : -v.swordSide;
  s.grip.y += v.swordUp;
  s.grip.z -= v.swordForward;
  if (charge > 0.001 && anim.current === 'ready') {
    const t = time * 60;
    const shake = v.chargeTremble * charge * tremble;
    s.grip.x += Math.sin(t * 1.7) * shake;
    s.grip.y += Math.sin(t * 2.3 + 1) * shake;
  }
  viewToModel(s.grip, rig.eye);
  viewToModel(s.blade, null);
  viewToModel(s.edge, null);
  viewToModel(s.elbow, null);
  return rig.gripPose(s, out, side);
}
