// Update 0.0.16 — the key you'll use, shown in your hand (the designer: an open palm holding the key as you're about to
// open a chest). In front of a chest with keys, the left hand comes up into view, turns palm up and opens, and the
// picked key lies on it, in its aura; switching keys swaps it. As you kneel to open the chest the hand closes and
// goes back (the fists take the lid). The pose is a fist target like the guard's (the arms' IK places it); the fingers
// open by turning their bones (ArmsRig.openHand).
import * as THREE from 'three';
import type { KeyKind } from '../../sim/items/items';
import type { ArmPose, ArmsRig } from './armsRig';
import { pose, viewToModel } from './armsMath';

/** Where the hand goes in the arms camera's view (x right, y up, −z ahead; m), which way its knuckles point and its
 *  back faces (down and away: the palm up and towards you). **(placeholders)** */
export const PALM_FIST = new THREE.Vector3(-0.05, -0.075, -0.31);
export const PALM_KNUCKLES = new THREE.Vector3(0.45, 0.2, -1).normalize();
export const PALM_BACK = new THREE.Vector3(0.1, -0.8, -0.85).normalize();
/** How fast the hand comes up and goes back (per second). */
const RATE = 9;
/** The key on the palm: from the wrist along the hand (m), off the palm (m), its length (m). */
const ALONG = 0.075;
const OFF = 0.028;
const KEY_LENGTH = 0.13;

const smooth = (x: number) => x * x * (3 - 2 * x);
const hand = new THREE.Vector3();
const knuckle = new THREE.Vector3();
const along = new THREE.Vector3();
const up = new THREE.Vector3();
const across = new THREE.Vector3();
const basis = new THREE.Matrix4();

export class KeyPalm {
  /** 0 … 1: how far the hand has come up. */
  weight = 0;
  /** The key that lies on it (in the arms scene). */
  readonly holder = new THREE.Group();
  private kind: KeyKind | null = null;
  private key: THREE.Object3D | null = null;
  private readonly target = pose();

  /** The left arm's pose holding the palm out (model space). */
  pose(rig: ArmsRig): ArmPose {
    const t = this.target;
    viewToModel(t.fist.copy(PALM_FIST), rig.eye);
    viewToModel(t.knuckles.copy(PALM_KNUCKLES), null);
    viewToModel(t.back.copy(PALM_BACK), null);
    return t;
  }

  /** `want`: the key to show (null: none); `look`: a key's model. Real time: it never waits on hit-stop. */
  update(want: KeyKind | null, look: (kind: KeyKind) => THREE.Object3D | null, dt: number) {
    const target = want ? 1 : 0;
    this.weight += (target - this.weight) * (1 - Math.exp(-RATE * dt));
    if (Math.abs(this.weight - target) < 0.002) this.weight = target;
    // The key on the palm is the one picked; while the hand goes back it keeps the last one.
    if (want && want !== this.kind) {
      this.key?.removeFromParent();
      const model = look(want);
      this.key = model ? model.clone() : null;
      if (this.key) {
        // Sized by the key itself (its first part), not its aura.
        const size = new THREE.Box3().setFromObject(this.key.children[0] ?? this.key).getSize(new THREE.Vector3());
        this.key.scale.setScalar(KEY_LENGTH / Math.max(size.x, size.y, size.z, 1e-3));
        this.holder.add(this.key);
      }
      this.kind = want;
    }
    this.holder.visible = this.weight > 0.05 && this.key !== null;
  }

  /** How much of the arm the palm takes (eased). */
  get mix(): number {
    return smooth(this.weight);
  }

  /** Puts the key on the palm as the hand is posed now (after the arms are posed). */
  place(rig: ArmsRig) {
    if (!this.holder.visible || !this.key) return;
    rig.handFrame('L', hand, knuckle, up);
    along.subVectors(knuckle, hand).normalize();
    // The palm faces away from the back of the hand.
    up.negate().addScaledVector(along, -up.dot(along)).normalize();
    across.crossVectors(along, up);
    // The key stands along the hand (its length is its +y), flat on the palm (its face +z).
    basis.makeBasis(across, along, up);
    this.holder.quaternion.setFromRotationMatrix(basis);
    this.holder.position.copy(hand).addScaledVector(along, ALONG).addScaledVector(up, OFF);
  }
}
