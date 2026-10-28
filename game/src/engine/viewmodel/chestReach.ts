// Update 0.0.13 — the hands opening a chest (the designer: crouch and open it with both hands). While you kneel, both
// fists reach for the lid's front edge, rise with it as it swings up, let go once it's well up, and come back to the
// guard. The edge's corners come from the world (treasureView.ts), projected through the world camera and put at the
// same spot on screen at arm's length in the arms camera, so the fists sit on the lid whatever the two FOVs are.
// The arms aim a fist's middle, so while they're fully on the lid each target is nudged until the knuckles you see
// are on its edge (`settle`).
import * as THREE from 'three';

/** Through the opening (0..1): the fists are on the edge by REACH, follow it until HOLD, start back at LET_GO. */
const REACH = 0.24;
const HOLD = 0.5;
const LET_GO = 0.72;
/** How far in front of the arms camera the fists go (m). */
const DEPTH = 0.42;
/** How much of the knuckles' miss is taken up each frame, and the most the targets are moved (m). */
const SETTLE = 0.5;
const MAX_NUDGE = 0.2;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export class ChestReach {
  /** 0 … 1: how far the arms have given way to the reach. */
  weight = 0;
  /** Each fist's target in the arms camera's view (x right, y up, −z ahead), nudged (`aim`). */
  readonly view = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  readonly aim = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  private readonly nudge = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  private readonly ndc = new THREE.Vector3();

  /** `k`: how far through the opening (−1: not opening); `left`, `right`: the lid's front corners in the world. */
  update(k: number, left: THREE.Vector3, right: THREE.Vector3, world: THREE.PerspectiveCamera, arms: THREE.PerspectiveCamera) {
    if (k < 0) {
      this.weight = 0;
      this.nudge.L.set(0, 0, 0);
      this.nudge.R.set(0, 0, 0);
      return;
    }
    this.weight = k < REACH ? smooth(k / REACH) : k > LET_GO ? 1 - smooth((k - LET_GO) / (1 - LET_GO)) : 1;
    // Once the lid is well up the fists stay where they let go of it.
    if (k > HOLD) return;
    world.updateMatrixWorld();
    this.place(left, world, arms, this.view.L);
    this.place(right, world, arms, this.view.R);
  }

  /** Where each target should be for the knuckles to land on it, from where they are now (arms camera space). */
  settle(knuckleL: THREE.Vector3, knuckleR: THREE.Vector3) {
    if (this.weight < 0.99) return;
    this.take(this.nudge.L, this.view.L, knuckleL);
    this.take(this.nudge.R, this.view.R, knuckleR);
  }

  private take(nudge: THREE.Vector3, want: THREE.Vector3, at: THREE.Vector3) {
    nudge.addScaledVector(this.ndc.subVectors(want, at), SETTLE);
    if (nudge.length() > MAX_NUDGE) nudge.setLength(MAX_NUDGE);
  }

  /** The targets with their nudges. */
  aimed() {
    this.aim.L.addVectors(this.view.L, this.nudge.L);
    this.aim.R.addVectors(this.view.R, this.nudge.R);
  }

  private place(p: THREE.Vector3, world: THREE.PerspectiveCamera, arms: THREE.PerspectiveCamera, out: THREE.Vector3) {
    this.ndc.copy(p).project(world);
    const t = Math.tan((arms.fov * Math.PI) / 360);
    out.set(this.ndc.x * DEPTH * t * arms.aspect, this.ndc.y * DEPTH * t, -DEPTH);
  }
}
