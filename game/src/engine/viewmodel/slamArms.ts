// Update 0.1.7 — the ground slam's hands (the designer: "play the join hammer hands for a better ground shake and smash
// effect when landing it"): as the slam drops, both fists come up clasped side by side over the middle of the view;
// landing, they come down hard into the floor before you, hold a beat, and go back to the guard. Barehanded only (a weapon's arm keeps its own pose). Poses are in the arms camera's
// view and carried into the model (armsMath.ts `viewToModel`), like bookArms.ts.
// Update 0.1.8 — the slime's and the spider's execution smashes are this one too (the designer: "use the same ground
// slam … for the slime and spider executions"): their hands' 'slamUp' and 'slamDown' (exec/handMoves.ts) are `slamClasp`,
// the smash brought down onto the body (here it's the floor, at the bottom of your view: the spider's would miss it).
// The designer: "why are the fists turned this way? just let them be normal … JUST STRAIGHT … anatomically wrong": each
// fist carries on its forearm's line (they were bent at the wrist, knuckles straight up or down, palms together), the
// back of the hand towards you.
import { Vector3 } from 'three';
import { ARMS } from '../../tuning/arms';
import type { ArmPose, ArmsRig } from './armsRig';
import { pose, solveElbow, viewToModel } from './armsMath';
import { FIST_REACH, GUARD, Side } from './guard';

type V3 = readonly [number, number, number];
interface Clasp {
  /** The middle between the two fists (view space, m from the eye). */
  at: V3;
}
/** The fists' middles this far apart (m): side by side, touching. (Update 0.1.8 — was 0.056, half of the executions'
 *  old clasp, set in 0.1.3 after they passed through each other: these did too.) */
export const SLAM_APART = 0.16;
/** Dropping: raised over the middle of the view. Landed: down into the floor before you. */
const RAISED: Clasp = { at: [0, 0.1, -0.34] };
const SMASHED: Clasp = { at: [0, -0.29, -0.44] };
/** How far in front of the arms camera the smash is (m) (heldGrip.ts: an execution's, if its reach can't be found). */
export const SLAM_DEPTH = -SMASHED.at[2];

const at = new Vector3();
const up = new Vector3();
const wrist = new Vector3();
const elbow = new Vector3();
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeIn = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t);

export class SlamArms {
  /** Seconds into the drop (−1: not dropping), and since landing (−1: not landed). */
  private drop = -1;
  private landed = -1;
  private readonly raised = { L: pose(), R: pose() };
  private readonly smashed = { L: pose(), R: pose() };

  /** The slam begins: the fists come up. */
  start() {
    this.drop = 0;
    this.landed = -1;
  }

  /** It hits the ground: the fists come down. */
  land() {
    if (this.drop < 0) return;
    this.drop = -1;
    this.landed = 0;
  }

  update(dt: number) {
    if (this.drop >= 0) this.drop += dt;
    if (this.landed >= 0) {
      this.landed += dt;
      const a = ARMS.v;
      if (this.landed > a.slamDown + a.slamHold + a.slamBack) this.landed = -1;
    }
  }

  /** How far the arms are given over to the clasp (0 … 1). */
  get weight(): number {
    const a = ARMS.v;
    if (this.drop >= 0) return ease(this.drop / a.slamRaise);
    if (this.landed >= 0) return 1 - ease((this.landed - a.slamDown - a.slamHold) / a.slamBack);
    return 0;
  }

  /** One arm's pose in the clasp now (model space). */
  pose(rig: ArmsRig, s: Side, out: ArmPose): ArmPose {
    const a = ARMS.v;
    slamClasp(rig, s, false, this.raised[s]);
    if (this.landed < 0) return copy(this.raised[s], out);
    slamClasp(rig, s, true, this.smashed[s]);
    const k = easeIn(this.landed / a.slamDown);
    out.fist.lerpVectors(this.raised[s].fist, this.smashed[s].fist, k);
    out.knuckles.lerpVectors(this.raised[s].knuckles, this.smashed[s].knuckles, k).normalize();
    out.back.lerpVectors(this.raised[s].back, this.smashed[s].back, k).normalize();
    return out;
  }

  reset() {
    this.drop = this.landed = -1;
  }
}

/** The strike into the floor: eased in, as a falling blow speeds up (also the executions' smash, exec/hands.ts). */
export const slamEase = easeIn;

/** One fist of the clasp (raised over your head, or `smashed` down into the floor), carried into the model. */
export function slamClasp(rig: ArmsRig, s: Side, smashed: boolean, out: ArmPose): ArmPose {
  const c = smashed ? SMASHED : RAISED;
  const x = s === 'L' ? -1 : 1;
  viewToModel(out.fist.copy(at.set(c.at[0] + (x * SLAM_APART) / 2, c.at[1], c.at[2])), rig.eye);
  return slamFist(rig, s, out);
}

/** A clasped fist at `out.fist` (model space): its wrist straight, the back of the hand towards you (and up, as it comes
 *  down in front: there it faces away from your eye), thumbs in. */
export function slamFist(rig: ArmsRig, s: Side, out: ArmPose): ArmPose {
  straighten(rig, s, out);
  viewToModel(up.set(0, 1, 0), null);
  out.back.subVectors(rig.eye, out.fist).normalize().add(up);
  out.back.addScaledVector(out.knuckles, -out.back.dot(out.knuckles)).normalize();
  return out;
}

/** `pose.knuckles` along the forearm the arm takes to reach `pose.fist` (its elbow solved as `ArmsRig.apply` does): a
 *  straight wrist, wherever the fist is. */
function straighten(rig: ArmsRig, s: Side, pose: ArmPose) {
  const a = rig.arms[s];
  pose.knuckles.subVectors(pose.fist, a.upper.pos).normalize();
  for (let i = 0; i < 4; i++) {
    wrist.copy(pose.fist).addScaledVector(pose.knuckles, -FIST_REACH);
    solveElbow(a.upper.pos, wrist, a.upperLen, a.foreLen, GUARD[s].pole, elbow);
    pose.knuckles.subVectors(wrist, elbow).normalize();
  }
}

function copy(from: ArmPose, to: ArmPose): ArmPose {
  to.fist.copy(from.fist);
  to.knuckles.copy(from.knuckles);
  to.back.copy(from.back);
  return to;
}
