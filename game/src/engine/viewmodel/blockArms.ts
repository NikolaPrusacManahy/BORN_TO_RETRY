// Update 0.3.5 (the designer: "now right click is parry, make a nice arm block animation to show that the arm is ready
// to parry, but it still has to time the hit with the projectile properly") — the parry's arm. In the arms model's
// space (guard.ts), from the point between the shoulders, scaled by arm reach as the guard is.
// Update 0.3.6 (the designer: "do the quick animation and then continue gameplay, animation stays 0.5 sec on screen, no
// left hand"; and "make the punch animation when a parry has been performed, like they punched the attack") — no block
// held any more: a press snaps the right fist up before the face (back of the hand out, knuckles up, elbow down and in),
// holds it through the parry's window and lets it down: half a second in all. The left hand stays in the guard. A parry
// that lands: the right fist punches the shot instead (seen at its impact, held through the parry's freeze, then back
// to the guard); the raise lets go of the arm while it's out.
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import type { ArmsAnim } from './armsAnim';
import type { ArmPose, ArmsRig } from './armsRig';
import { REF_REACH } from './guard';

/** The right fist raised (where, knuckles, back of the hand) and where its elbow points. */
export const BLOCK = {
  fist: new THREE.Vector3(-0.15, 0.12, 0.29),
  knuckles: new THREE.Vector3(0.2, 1, 0.35).normalize(),
  back: new THREE.Vector3(-0.15, 0.25, 1).normalize(),
  pole: new THREE.Vector3(-0.6, -1, -0.1),
};

/** The raise's times (s from the press): up by UP, held till HOLD, down by LENGTH (the designer's half second). */
const UP = 0.06;
const HOLD = 0.22;
export const LENGTH = 0.5;

const smooth = (x: number) => x * x * (3 - 2 * x);
const target = { fist: new THREE.Vector3(), knuckles: new THREE.Vector3(), back: new THREE.Vector3() };

export class BlockArms {
  /** Seconds since the press (−1: none). */
  private t = -1;

  /** `anim`: the fists' punches (a parry's punch is one). */
  constructor(private readonly anim: ArmsAnim) {}

  /** Right click pressed (barehanded): the fist snaps up. */
  raise() {
    this.t = 0;
  }

  /** A parry landed: the right fist punches the shot, from its impact (and the raise is over). */
  parried() {
    this.t = -1;
    this.anim.punch('R', 'parry', ARMS.v.punchOut);
  }

  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    if (this.t > LENGTH) this.t = -1;
  }

  /** How far up the fist is (0: the guard, 1: raised). */
  get weight(): number {
    const t = this.t;
    if (t < 0) return 0;
    if (t < UP) return smooth(t / UP);
    if (t < HOLD) return 1;
    return 1 - smooth(Math.min(1, (t - HOLD) / (LENGTH - HOLD)));
  }

  /** How much of the raise the arm keeps: none while the fist is out in a punch. */
  private keep() {
    return 1 - Math.max(0, Math.min(1, this.anim.extension('R')));
  }

  /** The raise mixed into the right arm's `pose` by its weight times `k` (0 where something else has the arm). */
  mix(rig: ArmsRig, pose: ArmPose, k: number) {
    const w = this.weight * k * this.keep();
    if (w <= 0.001) return;
    target.fist.copy(BLOCK.fist).multiplyScalar(rig.reach('R') / REF_REACH).add(rig.between);
    target.knuckles.copy(BLOCK.knuckles);
    target.back.copy(BLOCK.back);
    pose.fist.lerp(target.fist, w);
    pose.knuckles.lerp(target.knuckles, w).normalize();
    pose.back.lerp(target.back, w).normalize();
  }

  /** Where the right elbow points: `base` turned towards the raise's by its weight times `k`. */
  pole(base: THREE.Vector3, k: number): THREE.Vector3 {
    return base.lerp(BLOCK.pole, this.weight * k * this.keep());
  }

  reset() {
    this.t = -1;
  }
}
