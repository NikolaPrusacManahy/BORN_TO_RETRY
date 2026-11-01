// Update 0.3.5 (the designer: "now right click is parry, make a nice arm block animation to show that the arm is ready
// to parry, but it still has to time the hit with the projectile properly") — barehanded, right click held raises the
// fists into a block: both up before the face, apart (the crosshair clear between them), backs of the hands to the
// enemy, knuckles up, elbows down and in. Pressed, the fists punch forward a hand's width for the parry's moment (its
// window), then settle back into the block while it's held; let go, they drop back to the guard. In the arms model's
// space (guard.ts), from the point between the shoulders, scaled by arm reach as the guard is.
import * as THREE from 'three';
import type { ArmPose, ArmsRig } from './armsRig';
import { REF_REACH, Side } from './guard';

interface BlockArm {
  fist: THREE.Vector3;
  knuckles: THREE.Vector3;
  back: THREE.Vector3;
  pole: THREE.Vector3;
}

export const BLOCK: Record<Side, BlockArm> = {
  L: { fist: new THREE.Vector3(0.15, 0.13, 0.3), knuckles: new THREE.Vector3(-0.2, 1, 0.35).normalize(), back: new THREE.Vector3(0.15, 0.25, 1).normalize(), pole: new THREE.Vector3(0.6, -1, -0.1) },
  R: { fist: new THREE.Vector3(-0.15, 0.12, 0.29), knuckles: new THREE.Vector3(0.2, 1, 0.35).normalize(), back: new THREE.Vector3(-0.15, 0.25, 1).normalize(), pole: new THREE.Vector3(-0.6, -1, -0.1) },
};

/** How fast the block comes up and goes down (1/s), and how far forward and up a parry's moment pushes the fists (m). */
const UP = 22;
const DOWN = 12;
const PUSH = new THREE.Vector3(0, 0.025, 0.1);

const target = { fist: new THREE.Vector3(), knuckles: new THREE.Vector3(), back: new THREE.Vector3() };

export class BlockArms {
  /** How far up the block is (0: the guard, 1: the block). */
  weight = 0;
  private held = false;
  /** The parry's moment: 1 as it opens, falling to 0 as it closes. */
  private swat = 0;

  /** This frame: right click held (barehanded), and how much of the parry's window is left (0–1). */
  set(held: boolean, swat: number) {
    this.held = held;
    this.swat = swat;
  }

  update(dt: number) {
    const want = this.held || this.swat > 0 ? 1 : 0;
    this.weight += (want - this.weight) * Math.min(1, (want > this.weight ? UP : DOWN) * dt);
  }

  /** The block's pose for `side`, mixed into `pose` by the block's weight times `k` (0 where something else has the arm). */
  mix(rig: ArmsRig, side: Side, pose: ArmPose, k: number) {
    const w = this.weight * k;
    if (w <= 0.001) return;
    const b = BLOCK[side];
    target.fist.copy(b.fist).multiplyScalar(rig.reach(side) / REF_REACH).add(rig.between);
    // (A parry's moment: forward and a little up, quick out and eased back.)
    const s = this.swat * this.swat;
    target.fist.addScaledVector(PUSH, s);
    target.knuckles.copy(b.knuckles);
    target.back.copy(b.back);
    pose.fist.lerp(target.fist, w);
    pose.knuckles.lerp(target.knuckles, w).normalize();
    pose.back.lerp(target.back, w).normalize();
  }

  /** Where `side`'s elbow points: `base` turned towards the block's by its weight times `k`. */
  pole(side: Side, base: THREE.Vector3, k: number): THREE.Vector3 {
    return base.lerp(BLOCK[side].pole, this.weight * k);
  }
}
