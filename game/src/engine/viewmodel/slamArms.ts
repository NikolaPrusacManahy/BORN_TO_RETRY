// Update 0.1.7 — the ground slam's hands (the designer: "play the join hammer hands for a better ground shake and smash
// effect when landing it"): as the slam drops, both fists come up clasped side by side over the middle of the view, the
// little fingers' edges down, like the slime's execution; landing, they come down hard into the floor before you, hold a
// beat, and go back to the guard. Barehanded only (a weapon's arm keeps its own pose). Poses are in the arms camera's
// view and carried into the model (armsMath.ts `viewToModel`), like bookArms.ts.
import { Vector3 } from 'three';
import { ARMS } from '../../tuning/arms';
import type { ArmPose, ArmsRig } from './armsRig';
import { pose, viewToModel } from './armsMath';
import type { Side } from './guard';

type V3 = readonly [number, number, number];
interface Clasp {
  /** The middle between the two fists (view space, m from the eye), and the way they strike (knuckles lead). */
  at: V3;
  way: V3;
}
/** The fists' middles this far apart (m): side by side, touching (heldGrip.ts's clasp). */
const APART = 0.056;
/** Dropping: raised over the middle of the view. Landed: down into the floor before you. */
const RAISED: Clasp = { at: [0, 0.1, -0.34], way: [0, 1, 0.35] };
const SMASHED: Clasp = { at: [0, -0.29, -0.44], way: [0, -0.9, -0.45] };

const at = new Vector3();
const way = new Vector3();
const side = new Vector3();
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
    place(RAISED, rig, s, this.raised[s]);
    if (this.landed < 0) return copy(this.raised[s], out);
    place(SMASHED, rig, s, this.smashed[s]);
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

/** One fist of a clasp, carried into the model: knuckles the way it strikes, the back of the hand out to its side. */
function place(c: Clasp, rig: ArmsRig, s: Side, out: ArmPose): ArmPose {
  const x = s === 'L' ? -1 : 1;
  at.set(c.at[0] + (x * APART) / 2, c.at[1], c.at[2]);
  way.set(c.way[0], c.way[1], c.way[2]).normalize();
  side.set(x, 0, 0).addScaledVector(way, -x * way.x).normalize();
  viewToModel(out.fist.copy(at), rig.eye);
  viewToModel(out.knuckles.copy(way), null);
  viewToModel(out.back.copy(side), null);
  out.back.addScaledVector(out.knuckles, -out.back.dot(out.knuckles)).normalize();
  return out;
}

function copy(from: ArmPose, to: ArmPose): ArmPose {
  to.fist.copy(from.fist);
  to.knuckles.copy(from.knuckles);
  to.back.copy(from.back);
  return to;
}
