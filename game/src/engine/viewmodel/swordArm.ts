// M2 — the right arm holding the sword where the sword arm's move has it (a charging pierce trembles too).
// Update 0.1.4 — moved out of viewmodel.ts (it had grown past its size).
import { ARMS } from '../../tuning/arms';
import type { ArmPose, ArmsRig, SwordPose } from './armsRig';
import { viewToModel } from './armsMath';
import type { SwordAnim } from './swordAnim';

/** `charge`: the pierce's charge as shown (0 … 1); `ready`: it's full; `time`: the arms' clock (s). */
export function swordArm(rig: ArmsRig, anim: SwordAnim, charge: number, ready: boolean, time: number, sword: SwordPose, out: ArmPose): ArmPose {
  const v = ARMS.v;
  const s = anim.pose(charge, sword);
  s.grip.x += v.swordSide;
  s.grip.y += v.swordUp;
  s.grip.z -= v.swordForward;
  if (charge > 0.001 && anim.current === 'ready') {
    const t = time * 60;
    const shake = v.chargeTremble * charge * (ready ? 2 : 1);
    s.grip.x += Math.sin(t * 1.7) * shake;
    s.grip.y += Math.sin(t * 2.3 + 1) * shake;
  }
  viewToModel(s.grip, rig.eye);
  viewToModel(s.blade, null);
  viewToModel(s.edge, null);
  viewToModel(s.elbow, null);
  return rig.gripPose(s, out);
}
