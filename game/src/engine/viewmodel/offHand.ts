// Update 0.1.9 — the left hand holding a weapon of its own (the Dual Daggers' second, the designer: one in each hand):
// it plays the weapon's `pair` moves on a second SwordAnim, its arm is posed to hold the second model where those say,
// and the model hangs in the left fist. The hands take turns cutting: right, left, right…
import * as THREE from 'three';
import type { ArmPose, ArmsRig, SwordPose } from './armsRig';
import { pose } from './armsMath';
import { GUARD } from './guard';
import { swordArm } from './swordArm';
import { holdWeapon } from './tipHold';
import { SwordAnim, SwordMove } from './swordAnim';
import { emptySword } from './swordPoses';
import type { MoveSet } from './weaponMoves';

export class OffHand {
  readonly anim = new SwordAnim();
  /** This frame's pose of the left weapon (model space, once posed). */
  readonly sword: SwordPose = emptySword();
  private readonly arm = pose();
  private model: THREE.Object3D | null = null;
  private rig: ArmsRig | null = null;
  /** The left hand cuts next. */
  private leftNext = false;

  /** Holding a second weapon. */
  get active(): boolean {
    return this.model !== null;
  }

  /** The second model (null: none). */
  get held(): THREE.Object3D | null {
    return this.model;
  }

  get moves(): MoveSet {
    return this.anim.moves;
  }

  attach(rig: ArmsRig) {
    this.rig = rig;
    if (this.model) rig.holdBone('L').add(this.model);
  }

  /** The weapon in hand's second model and the left hand's moves (null: one weapon, the left hand free). */
  take(model: THREE.Object3D | null, moves: MoveSet | null) {
    if (this.model === model) return;
    this.model?.removeFromParent();
    this.model = moves ? model : null;
    if (!this.model || !moves) return;
    this.anim.use(moves);
    this.anim.reset();
    this.leftNext = false;
    this.model.matrixAutoUpdate = false;
    this.rig?.holdBone('L').add(this.model);
  }

  /** A cut: returns true if it's the left hand's turn (it swings), false for the right's. */
  slash(): boolean {
    const left = this.leftNext;
    this.leftNext = !left;
    if (left) this.anim.slash();
    return left;
  }

  start(move: SwordMove) {
    this.anim.start(move);
  }

  /** The left arm's pose holding it (`charge`: a volley's charge as shown, 0 … 1; `tremble`: as swordArm's). */
  pose(rig: ArmsRig, charge: number, tremble: number, time: number): ArmPose {
    return swordArm(rig, this.anim, charge, tremble, time, this.sword, this.arm, 'L');
  }

  /** The way the left elbow bends out: the guard's, turned to the weapon's pose by `k`. */
  pole(k: number, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(GUARD.L.pole).lerp(this.sword.elbow, k);
  }

  /** The model in the left fist (after the arm is posed), shown when `shown`, turned over for throwing by `flip`. */
  place(rig: ArmsRig, shown: boolean, flip: number) {
    const m = this.model;
    if (!m) return;
    m.visible = shown && !this.anim.empty;
    holdWeapon(rig, this.moves, this.sword.tilt, flip, m.matrix, 'L');
    m.matrixWorldNeedsUpdate = true;
  }

  reset() {
    this.anim.reset();
    this.leftNext = false;
  }
}
