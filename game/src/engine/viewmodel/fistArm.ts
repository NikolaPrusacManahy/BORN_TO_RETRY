// M1 step 6 — the fists' pose for one arm: the guard, a punch reaching for the crosshair, a charging right fist drawn
// back and trembling; M2 — the left arm dropped out of view while a one-handed weapon is held. (Moved out of
// viewmodel.ts in Update 0.1.5, which had grown past its size; no change in behaviour.)
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import type { ArmPose, ArmsRig } from './armsRig';
import type { ArmsAnim } from './armsAnim';
import { pose, PREVIEW_PITCH } from './armsMath';
import { FORWARD, REST_BACK, Side } from './guard';

/** Punches aim a little below the eye line and spread apart so the two fists don't meet in the middle (m). */
const STRIKE_DROP = 0.06;
const STRIKE_SPREAD = 0.05;
/** M2 — the left arm out of view: its fist this far down and back from the guard (model space), pointing down. */
const LOWERED = new THREE.Vector3(0.04, -0.42, -0.12);
const LOWERED_KNUCKLES = new THREE.Vector3(0, -1, 0.25).normalize();

const guard = { L: pose(), R: pose() };
const strike = new THREE.Vector3();
const to = new THREE.Vector3();

/** The fists' pose for one arm, into `out`. `charge`: how far the right fist is drawn back (0..1); `ready`: the charge
 *  is full (it trembles harder). `armed`: how far the left arm has dropped out of view (M2). `time`: the arms' clock. */
export function fistArm(rig: ArmsRig, anim: ArmsAnim, time: number, side: Side, charge: number, ready: boolean, armed: number, out: ArmPose): ArmPose {
  const g = guard[side];
  rig.guard(side, g);
  if (side === 'L' && armed > 0) {
    g.fist.addScaledVector(LOWERED, armed);
    g.knuckles.lerp(LOWERED_KNUCKLES, armed).normalize();
  }
  const e = anim.extension(side);
  // Where a punch aims: at the crosshair (the arms are tilted up by PREVIEW_PITCH, so aim that much lower in
  // the model), a little low, a little to this fist's side.
  // (Update 0.3.73 — unless these arms have their own.)
  const own = rig.strike;
  const d = own ? own.ahead : ARMS.v.strikeDistance;
  const spread = own ? own.side : STRIKE_SPREAD;
  strike.copy(rig.eye).addScaledVector(FORWARD, d * Math.cos(PREVIEW_PITCH));
  strike.y -= d * Math.sin(PREVIEW_PITCH) + (own ? own.drop : STRIKE_DROP);
  strike.x += side === 'L' ? spread : -spread;
  out.fist.copy(g.fist).lerp(strike, Math.max(e, 0));
  if (e < 0) out.fist.addScaledVector(to.subVectors(g.fist, strike).normalize(), -e * 0.1);
  out.knuckles.copy(g.knuckles).lerp(to.subVectors(strike, rig.between).normalize(), Math.max(e, 0)).normalize();
  out.back.copy(g.back).normalize().lerp(REST_BACK, Math.max(e, 0));
  // A charging right fist draws back and trembles, harder once the charge is full.
  if (side === 'R' && charge > 0.001) {
    const t = time * 60;
    const shake = ARMS.v.chargeTremble * charge * (ready ? 2 : 1);
    out.fist.addScaledVector(to.subVectors(g.fist, strike).normalize(), ARMS.v.chargePull * charge);
    out.fist.x += Math.sin(t * 1.7) * shake;
    out.fist.y += Math.sin(t * 2.3 + 1) * shake;
  }
  return out;
}
