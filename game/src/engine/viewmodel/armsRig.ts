// M1 step 6 — the loaded arms: finds the arm bones, remembers their rest pose, and poses each arm from a fist
// target (IK elbow, then upper arm → forearm → hand). Fingers are already closed in the model.
// Update 0.0.16 — a hand can open (its finger bones turned back by the curl cut_arms.py baked in: 1.4 rad a joint),
// and says where it is and which way its back faces (for the key shown on the palm).
// Update 0.1.6 — the fingers are posed live (handPose.ts): a proper punching fist, a grip round a handle, open.
// Update 0.1.9 — a fist's hold on a weapon moved to armsHold.ts; the left fist holds one too (the Dual Daggers).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARMS } from '../../tuning/arms';
import { aimBone, solveElbow } from './armsMath';
import { gripNow, gripPose, HoldRest, holdMatrix, holdOf } from './armsHold';
import { EYE_FROM_HEAD, FIST_REACH, GUARD, REF_REACH, REST_BACK, Side } from './guard';
import { HandBones, type HandFit } from './handPose';

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
  /** Update 0.0.13 — the middle finger's knuckle (where a fist meets what it touches). */
  knuckle: THREE.Bone;
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
const X_AXIS = new THREE.Vector3(1, 0, 0);
const turnQ = new THREE.Quaternion();
const handQ = new THREE.Quaternion();

interface Finger {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
}

/** M2 — a sword in the hand: its grip, the way its blade points, the way its edge faces (across it), how far the blade
 *  leans in the fist towards the knuckles (radians), and the way the elbow bends out. */
export interface SwordPose {
  grip: THREE.Vector3;
  blade: THREE.Vector3;
  edge: THREE.Vector3;
  tilt: number;
  elbow: THREE.Vector3;
}

export class ArmsRig {
  readonly root: THREE.Object3D;
  /** The eye in model space (where the camera sits). */
  readonly eye = new THREE.Vector3();
  /** Between the shoulders, model space. */
  readonly between = new THREE.Vector3();
  /** Update 0.3.73 — where this character's punch ends, if it's its own (null: at the crosshair). */
  readonly strike: HandFit['strike'] | null;
  /** (Update 0.1.8 — read by slamArms.ts to straighten a wrist.) */
  readonly arms: Record<Side, ArmRest>;
  private readonly holds: Record<Side, HoldRest>;
  /** Update 0.0.16 — each hand's fingers (Update 0.1.6: posed by handPose.ts), the back of the hand in the hand bone's
   *  own space. */
  private readonly hands: Record<Side, HandBones>;
  private readonly backLocal: Record<Side, THREE.Vector3>;

  private constructor(root: THREE.Object3D, fit?: HandFit) {
    this.strike = fit?.strike ?? null;
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
      const r = { parentQuat: (upper.parent ?? root).getWorldQuaternion(new THREE.Quaternion()), upper: rest(upper, fore), fore: rest(fore, hand), hand: rest(hand, knuckle), knuckle, upperLen: 0, foreLen: 0 };
      r.upperLen = r.fore.pos.distanceTo(r.upper.pos);
      r.foreLen = r.hand.pos.distanceTo(r.fore.pos);
      return r;
    };
    this.arms = { L: arm('L'), R: arm('R') };
    find('Head').getWorldPosition(this.eye).add(EYE_FROM_HEAD);
    this.between.addVectors(this.arms.L.upper.pos, this.arms.R.upper.pos).multiplyScalar(0.5);
    // M2 — the right fist's hold (Update 0.1.1 — and the left's: both hold an execution's tail): armsHold.ts.
    const holdFor = (side: Side) => holdOf((name) => find(boneName(name, side)), this.arms[side].hand.bone, this.arms[side].hand.pos, this.arms[side].hand.dir, fit?.hole);
    this.holds = { L: holdFor('L'), R: holdFor('R') };
    // Update 0.0.16 — the fingers: which way opens them is the way that takes the middle finger's tip from the wrist.
    const fingersOf = (side: Side): Finger[] => ['Index', 'Middle', 'Ring', 'Pinky'].flatMap((f) => [2, 3, 4].map((j) => find(boneName(`${f}${j}`, side)))).map((bone) => ({ bone, rest: bone.quaternion.clone() }));
    const thumbOf = (side: Side): Finger[] => [2, 3].map((j) => find(boneName(`Thumb${j}`, side))).map((bone) => ({ bone, rest: bone.quaternion.clone() }));
    const fingers = { L: fingersOf('L'), R: fingersOf('R') };
    const reachOf = (side: Side, angle: number) => {
      for (const j of [2, 3]) {
        const b = find(boneName(`Middle${j}`, side));
        b.quaternion.multiply(turnQ.setFromAxisAngle(X_AXIS, angle));
      }
      root.updateMatrixWorld(true);
      const d = find(boneName('Middle4', side)).getWorldPosition(dir).distanceTo(this.arms[side].hand.pos);
      for (const f of fingers[side]) f.bone.quaternion.copy(f.rest);
      root.updateMatrixWorld(true);
      return d;
    };
    const handOf = (side: Side) => new HandBones(side, fingers[side], thumbOf(side), reachOf(side, 0.5) > reachOf(side, -0.5) ? 1 : -1, this.holds[side].grip, this.holds[side].thumb, this.holds[side].y, fit);
    this.hands = { L: handOf('L'), R: handOf('R') };
    this.backLocal = {
      L: REST_BACK.clone().applyQuaternion(this.arms.L.hand.quat.clone().invert()),
      R: REST_BACK.clone().applyQuaternion(this.arms.R.hand.quat.clone().invert()),
    };
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.frustumCulled = false; // posed arms leave their bind-pose bounds
        const m = o.material as THREE.MeshStandardMaterial;
        m.roughness = 0.85;
        m.metalness = 0;
      }
    });
  }

  static async load(url: string, fit?: HandFit): Promise<ArmsRig> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new ArmsRig(gltf.scene, fit);
  }

  /** From an already-loaded model (tests parse the .glb themselves). */
  static fromScene(root: THREE.Object3D, fit?: HandFit): ArmsRig {
    return new ArmsRig(root, fit);
  }

  /** Update 0.0.13 — where a fist's middle knuckle is now (world space of the arms' scene) into `out`. */
  knuckle(side: Side, out: THREE.Vector3): THREE.Vector3 {
    return this.arms[side].knuckle.getWorldPosition(out);
  }

  /** Update 0.0.16 — opens a hand by `k` (0: closed, 1: open, fingers straight). Update 0.1.6 — closed into the
   *  punching fist, or round a handle of radius `grip` (m) leaning `tilt` (rad) in the fist by `hold` (0 … 1):
   *  handPose.ts. Update 0.3.79 — `sign`: into the Playable Demon's hand sign (0 … 1). Update 0.3.89 — `flat`: fingers side by side (0 … 1). */
  openHand(side: Side, k: number, grip = 0, hold = 0, tilt?: number, sign = 0, flat = 0) {
    this.hands[side].pose(k, grip, hold, tilt, sign, flat);
  }

  /** Update 0.0.16 — where a hand is now (its wrist and its middle knuckle) and which way its back faces (world space
   *  of the arms' scene). */
  handFrame(side: Side, wristOut: THREE.Vector3, knuckleOut: THREE.Vector3, backOut: THREE.Vector3) {
    const hand = this.arms[side].hand.bone;
    hand.getWorldPosition(wristOut);
    this.arms[side].knuckle.getWorldPosition(knuckleOut);
    backOut.copy(this.backLocal[side]).applyQuaternion(hand.getWorldQuaternion(handQ));
  }

  /** M2 — the right hand's bone (a held weapon hangs off it). Update 0.1.9 — or the left's (the second dagger). */
  holdBone(side: Side = 'R'): THREE.Bone {
    return this.holds[side].hand;
  }

  /** M2 — a held weapon's matrix under the hand's bone (armsHold.ts). Update 0.1.9 — either hand's. */
  holdMatrix(tilt: number, scale: number, slide: number, into: THREE.Matrix4, side: Side = 'R'): THREE.Matrix4 {
    return holdMatrix(this.holds[side], tilt, scale, slide, into);
  }

  /** M2 — the right arm's pose that holds a sword where `sword` says (model space), for `holdMatrix` with its tilt.
   *  Exact when applied with a full wrist bend (`apply(…, 1)`). Update 0.1.1 — either arm's. */
  gripPose(sword: SwordPose, out: ArmPose, side: Side = 'R'): ArmPose {
    return gripPose(this.holds[side], sword, out);
  }

  /** Update 0.1.1 — where a fist's grip is now, and the way through it to the index finger's side (world space of the
   *  arms' scene). */
  gripNow(side: Side, at: THREE.Vector3, through: THREE.Vector3) {
    gripNow(this.holds[side], at, through);
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

  /** Poses one arm so its fist sits at `pose.fist`, pointing along `pose.knuckles`, back facing `pose.back`. `bend`: how
   *  far the hand turns from the forearm's line to the knuckles (M2: 1 holding a sword, so the grip is exact); `pole`:
   *  the way the elbow bends out (M2: a sword's swing lifts it). */
  apply(side: Side, pose: ArmPose, bend = ARMS.v.wristBend, pole = GUARD[side].pole) {
    const a = this.arms[side];
    wrist.copy(pose.fist).addScaledVector(pose.knuckles, -FIST_REACH);
    solveElbow(a.upper.pos, wrist, a.upperLen, a.foreLen, pole, elbow);
    // The upper arm's back sits half-way between up and the hand's, so the elbow never twists hard.
    upperBack.copy(pose.back).normalize().add(REST_BACK);
    aimBone(a.upper.quat, a.upper.dir, REST_BACK, dir.subVectors(elbow, a.upper.pos), upperBack, qUpper);
    aimBone(a.fore.quat, a.fore.dir, REST_BACK, dir.subVectors(wrist, elbow), pose.back, qFore);
    handDir.subVectors(wrist, elbow).normalize().lerp(pose.knuckles, bend);
    aimBone(a.hand.quat, a.hand.dir, REST_BACK, handDir, pose.back, qHand);
    // Model-space rotations → each bone's local rotation under its (posed) parent.
    a.upper.bone.quaternion.copy(tmpQ.copy(a.parentQuat).invert().multiply(qUpper));
    a.fore.bone.quaternion.copy(tmpQ.copy(qUpper).invert().multiply(qFore));
    a.hand.bone.quaternion.copy(tmpQ.copy(qFore).invert().multiply(qHand));
  }
}
