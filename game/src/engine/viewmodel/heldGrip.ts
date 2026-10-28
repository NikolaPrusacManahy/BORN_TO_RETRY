// Update 0.1.1 — both hands round something held in the world (an execution's tail: the designer, "make it grab the
// snake's tail"), the way you'd hold a rope: it runs through each fist, in at the little finger and out at the thumb
// towards its end. The left hand holds the end, the right a fist's width further down it. Each fist points the way its
// arm reaches; the rope crosses it, leaning in the grip as a sword's blade does for a pierce when it runs along the reach
// (`ArmsRig.gripPose`). The end and the way it runs are carried from the world camera into the arms camera (the same
// spot on screen, the same slant), so the fists sit on it whatever the two FOVs are.
import * as THREE from 'three';
import type { ArmPose, ArmsRig } from './armsRig';
import type { Side } from './guard';
import { emptySword } from './swordPoses';

/** How far in front of the arms camera the held end is (m), as a chest's lid is. */
const DEPTH = 0.42;
/** The right fist this far further down it (m): a fist's width. */
const SPACING = 0.1;
/** The most it leans in a fist (rad), as a pierce's blade does. */
const MAX_LEAN = 1;
const UP = new THREE.Vector3(0, 1, 0);

const ndc = new THREE.Vector3();
const p = new THREE.Vector3();
const k = new THREE.Vector3();
const r = new THREE.Vector3();
const q = new THREE.Quaternion();
const held = emptySword();

export class HeldGrip {
  /** 0 … 1: how far the arms have given way to the grip (0: nothing held). */
  weight = 0;
  /** The held end and the way it runs from there, in the arms camera's view (x right, y up, −z ahead). */
  private readonly end = new THREE.Vector3();
  readonly along = new THREE.Vector3();

  /** Holds `end` (world), the rest running along `dir` (world), `weight` of the way; call it each frame. */
  hold(weight: number, end: THREE.Vector3, dir: THREE.Vector3, world: THREE.PerspectiveCamera, arms: THREE.PerspectiveCamera) {
    this.weight = weight;
    world.updateMatrixWorld();
    ndc.copy(end).project(world);
    const t = Math.tan((arms.fov * Math.PI) / 360);
    this.end.set(ndc.x * DEPTH * t * arms.aspect, ndc.y * DEPTH * t, -DEPTH);
    // A slant carries over as the lens does: across the screen by the FOVs' ratio, depth as it is.
    const s = t / Math.tan((world.fov * Math.PI) / 360);
    this.along.copy(dir).transformDirection(world.matrixWorldInverse);
    this.along.x *= s;
    this.along.y *= s;
    this.along.normalize();
  }

  /** One arm's pose holding it (model space; `holder`: the model's parent under the arms `camera`, both up to date). */
  pose(rig: ArmsRig, side: Side, holder: THREE.Object3D, camera: THREE.Camera, out: ArmPose): ArmPose {
    p.copy(this.end).addScaledVector(this.along, side === 'L' ? 0 : SPACING);
    held.grip.copy(holder.worldToLocal(camera.localToWorld(p)));
    // Out of the thumb side towards its end.
    holder.getWorldQuaternion(q).invert();
    held.blade.copy(this.along).transformDirection(camera.matrixWorld).applyQuaternion(q).negate();
    // The fist points the way the arm reaches (from between the shoulders); it leans in the grip to let it (sin: how far
    // the rope runs along the reach).
    r.subVectors(held.grip, rig.between).normalize();
    const along = r.dot(held.blade);
    k.copy(r).addScaledVector(held.blade, -along);
    if (k.lengthSq() < 1e-4) k.copy(UP).addScaledVector(held.blade, -held.blade.y);
    held.edge.copy(k.normalize());
    held.tilt = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, Math.asin(Math.max(-1, Math.min(1, along)))));
    return rig.gripPose(held, out, side);
  }
}
