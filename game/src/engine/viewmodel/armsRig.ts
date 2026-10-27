// M1 step 6 — the loaded arms: finds the arm bones, remembers their rest pose, and poses each arm from a fist
// target (IK elbow, then upper arm → forearm → hand). Fingers are already closed in the model.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARMS } from '../../tuning/arms';
import { aimBone, solveElbow } from './armsMath';
import { EYE_FROM_HEAD, FIST_REACH, GUARD, REF_REACH, REST_BACK, Side } from './guard';

interface BoneRest {
  bone: THREE.Bone;
  /** Rest rotation and position in model space. */
  quat: THREE.Quaternion;
  pos: THREE.Vector3;
  /** Rest direction to the next joint, model space. */
  dir: THREE.Vector3;
}

interface ArmRest {
  /** The shoulder bone's rest rotation (the upper arm's parent; it never moves). */
  parentQuat: THREE.Quaternion;
  upper: BoneRest;
  fore: BoneRest;
  hand: BoneRest;
  upperLen: number;
  foreLen: number;
}

/** What one arm should do this frame (model space). */
export interface ArmPose {
  fist: THREE.Vector3;
  knuckles: THREE.Vector3;
  back: THREE.Vector3;
}

// GLTFLoader drops '.' from node names: "UpperArm.L" arrives as "UpperArmL".
const boneName = (base: string, side: Side) => `${base}${side}`;

const qUpper = new THREE.Quaternion();
const qFore = new THREE.Quaternion();
const qHand = new THREE.Quaternion();
const tmpQ = new THREE.Quaternion();
const wrist = new THREE.Vector3();
const elbow = new THREE.Vector3();
const dir = new THREE.Vector3();
const upperBack = new THREE.Vector3();
const handDir = new THREE.Vector3();

export class ArmsRig {
  readonly root: THREE.Object3D;
  /** The eye in model space (where the camera sits). */
  readonly eye = new THREE.Vector3();
  /** Between the shoulders, model space. */
  readonly between = new THREE.Vector3();
  private readonly arms: Record<Side, ArmRest>;

  private constructor(root: THREE.Object3D) {
    this.root = root;
    root.updateMatrixWorld(true);
    const find = (name: string) => {
      const b = root.getObjectByName(name);
      if (!(b instanceof THREE.Bone)) throw new Error(`arms model: missing bone ${name}`);
      return b;
    };
    const rest = (b: THREE.Bone, next: THREE.Object3D): BoneRest => {
      const pos = b.getWorldPosition(new THREE.Vector3());
      return { bone: b, quat: b.getWorldQuaternion(new THREE.Quaternion()), pos, dir: next.getWorldPosition(new THREE.Vector3()).sub(pos).normalize() };
    };
    const arm = (side: Side): ArmRest => {
      const upper = find(boneName('UpperArm', side));
      const fore = find(boneName('LowerArm', side));
      const hand = find(boneName('Hand', side));
      const knuckle = find(boneName('Middle2', side));
      const r = { parentQuat: (upper.parent ?? root).getWorldQuaternion(new THREE.Quaternion()), upper: rest(upper, fore), fore: rest(fore, hand), hand: rest(hand, knuckle), upperLen: 0, foreLen: 0 };
      r.upperLen = r.fore.pos.distanceTo(r.upper.pos);
      r.foreLen = r.hand.pos.distanceTo(r.fore.pos);
      return r;
    };
    this.arms = { L: arm('L'), R: arm('R') };
    find('Head').getWorldPosition(this.eye).add(EYE_FROM_HEAD);
    this.between.addVectors(this.arms.L.upper.pos, this.arms.R.upper.pos).multiplyScalar(0.5);
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.frustumCulled = false; // posed arms leave their bind-pose bounds
        const m = o.material as THREE.MeshStandardMaterial;
        m.roughness = 0.85;
        m.metalness = 0;
      }
    });
  }

  static async load(url: string): Promise<ArmsRig> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new ArmsRig(gltf.scene);
  }

  /** From an already-loaded model (tests parse the .glb themselves). */
  static fromScene(root: THREE.Object3D): ArmsRig {
    return new ArmsRig(root);
  }

  /** How far this arm reaches (upper arm + forearm). */
  reach(side: Side): number {
    return this.arms[side].upperLen + this.arms[side].foreLen;
  }

  /** The approved guard for one arm, with the F1 nudges, written into `out`. */
  guard(side: Side, out: ArmPose) {
    const g = GUARD[side];
    const v = ARMS.v;
    out.fist.copy(g.fist).multiplyScalar(this.reach(side) / REF_REACH).add(this.between);
    // Nudges are in screen terms: "sideways" is to the right on screen, which is model −x.
    if (side === 'L') out.fist.add(dir.set(-v.leftSide, v.leftUp, v.leftForward));
    else out.fist.add(dir.set(-v.rightSide, v.rightUp, v.rightForward));
    out.knuckles.copy(g.knuckles);
    out.back.copy(g.back).applyAxisAngle(g.knuckles, THREE.MathUtils.degToRad(side === 'L' ? v.leftRoll : v.rightRoll));
  }

  /** Poses one arm so its fist sits at `pose.fist`, pointing along `pose.knuckles`, back facing `pose.back`. */
  apply(side: Side, pose: ArmPose) {
    const a = this.arms[side];
    const g = GUARD[side];
    wrist.copy(pose.fist).addScaledVector(pose.knuckles, -FIST_REACH);
    solveElbow(a.upper.pos, wrist, a.upperLen, a.foreLen, g.pole, elbow);
    // The upper arm's back sits half-way between up and the hand's, so the elbow never twists hard.
    upperBack.copy(pose.back).normalize().add(REST_BACK);
    aimBone(a.upper.quat, a.upper.dir, REST_BACK, dir.subVectors(elbow, a.upper.pos), upperBack, qUpper);
    aimBone(a.fore.quat, a.fore.dir, REST_BACK, dir.subVectors(wrist, elbow), pose.back, qFore);
    handDir.subVectors(wrist, elbow).normalize().lerp(pose.knuckles, ARMS.v.wristBend);
    aimBone(a.hand.quat, a.hand.dir, REST_BACK, handDir, pose.back, qHand);
    // Model-space rotations → each bone's local rotation under its (posed) parent.
    a.upper.bone.quaternion.copy(tmpQ.copy(a.parentQuat).invert().multiply(qUpper));
    a.fore.bone.quaternion.copy(tmpQ.copy(qUpper).invert().multiply(qFore));
    a.hand.bone.quaternion.copy(tmpQ.copy(qFore).invert().multiply(qHand));
  }
}
