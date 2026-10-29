// M1 step 6 — the loaded arms: finds the arm bones, remembers their rest pose, and poses each arm from a fist
// target (IK elbow, then upper arm → forearm → hand). Fingers are already closed in the model.
// Update 0.0.16 — a hand can open (its finger bones turned back by the curl cut_arms.py baked in: 1.4 rad a joint),
// and says where it is and which way its back faces (for the key shown on the palm).
// Update 0.1.6 — the fingers are posed live (handPose.ts): a proper punching fist, a grip round a handle, open.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARMS } from '../../tuning/arms';
import { aimBone, solveElbow } from './armsMath';
import { EYE_FROM_HEAD, FIST_REACH, GUARD, REF_REACH, REST_BACK, Side } from './guard';
import { HandBones } from './handPose';

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

/** M2 — where a held weapon sits in the right fist, worked out once from the rest pose (model space). */
interface HoldRest {
  hand: THREE.Bone;
  /** The hand's rest model matrix, inverted (model space → the hand's space). */
  handInv: THREE.Matrix4;
  /** The hole the curled fingers make (the middle of the grip). */
  grip: THREE.Vector3;
  /** The hand's rest frame as the arm posing sees it: y wrist → knuckles, z the back of the hand, x = y × z. */
  y: THREE.Vector3;
  /** The way through the fist to the index finger's side, where a blade comes out (along ±x). */
  thumb: THREE.Vector3;
  /** The grip from the wrist, in that frame. */
  offset: THREE.Vector3;
  /** +1 if the index side is +x, −1 if it is −x. */
  sign: number;
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

const holdM = new THREE.Matrix4();
const xAxis = new THREE.Vector3();
const yAxis = new THREE.Vector3();
const zAxis = new THREE.Vector3();
const holdScale = new THREE.Vector3();
const through = new THREE.Vector3();

export class ArmsRig {
  readonly root: THREE.Object3D;
  /** The eye in model space (where the camera sits). */
  readonly eye = new THREE.Vector3();
  /** Between the shoulders, model space. */
  readonly between = new THREE.Vector3();
  /** (Update 0.1.8 — read by slamArms.ts to straighten a wrist.) */
  readonly arms: Record<Side, ArmRest>;
  private readonly holds: Record<Side, HoldRest>;
  private readonly hold: HoldRest;
  /** Update 0.0.16 — each hand's fingers (Update 0.1.6: posed by handPose.ts), the back of the hand in the hand bone's
   *  own space. */
  private readonly hands: Record<Side, HandBones>;
  private readonly backLocal: Record<Side, THREE.Vector3>;

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
      const r = { parentQuat: (upper.parent ?? root).getWorldQuaternion(new THREE.Quaternion()), upper: rest(upper, fore), fore: rest(fore, hand), hand: rest(hand, knuckle), knuckle, upperLen: 0, foreLen: 0 };
      r.upperLen = r.fore.pos.distanceTo(r.upper.pos);
      r.foreLen = r.hand.pos.distanceTo(r.fore.pos);
      return r;
    };
    this.arms = { L: arm('L'), R: arm('R') };
    find('Head').getWorldPosition(this.eye).add(EYE_FROM_HEAD);
    this.between.addVectors(this.arms.L.upper.pos, this.arms.R.upper.pos).multiplyScalar(0.5);
    // M2 — the right fist's hold (Update 0.1.1 — and the left's: both hold an execution's tail). The fingers are baked
    // closed, so the grip goes where they curl round: the middle of their twelve joints. The way through the fist runs
    // from the little finger's knuckle to the index finger's.
    const holdOf = (side: Side): HoldRest => {
      const h = this.arms[side].hand;
      const grip = new THREE.Vector3();
      for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const j of [2, 3, 4]) grip.add(find(boneName(`${f}${j}`, side)).getWorldPosition(dir));
      grip.divideScalar(12);
      const y = h.dir.clone();
      const z = REST_BACK.clone().addScaledVector(y, -REST_BACK.dot(y)).normalize();
      const x = new THREE.Vector3().crossVectors(y, z);
      const thumb = find(boneName('Index2', side)).getWorldPosition(new THREE.Vector3()).sub(find(boneName('Pinky2', side)).getWorldPosition(dir));
      thumb.addScaledVector(y, -thumb.dot(y)).addScaledVector(z, -thumb.dot(z)).normalize();
      const off = grip.clone().sub(h.pos);
      return { hand: h.bone, handInv: h.bone.matrixWorld.clone().invert(), grip, y, thumb, offset: new THREE.Vector3(off.dot(x), off.dot(y), off.dot(z)), sign: Math.sign(thumb.dot(x)) };
    };
    this.holds = { L: holdOf('L'), R: holdOf('R') };
    this.hold = this.holds.R;
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
    const handOf = (side: Side) => new HandBones(side, fingers[side], thumbOf(side), reachOf(side, 0.5) > reachOf(side, -0.5) ? 1 : -1, this.holds[side].grip, this.holds[side].thumb, this.holds[side].y);
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

  static async load(url: string): Promise<ArmsRig> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new ArmsRig(gltf.scene);
  }

  /** From an already-loaded model (tests parse the .glb themselves). */
  static fromScene(root: THREE.Object3D): ArmsRig {
    return new ArmsRig(root);
  }

  /** Update 0.0.13 — where a fist's middle knuckle is now (world space of the arms' scene) into `out`. */
  knuckle(side: Side, out: THREE.Vector3): THREE.Vector3 {
    return this.arms[side].knuckle.getWorldPosition(out);
  }

  /** Update 0.0.16 — opens a hand by `k` (0: closed, 1: open, fingers straight). Update 0.1.6 — closed into the
   *  punching fist, or round a handle of radius `grip` (m) leaning `tilt` (rad) in the fist by `hold` (0 … 1):
   *  handPose.ts. */
  openHand(side: Side, k: number, grip = 0, hold = 0, tilt?: number) {
    this.hands[side].pose(k, grip, hold, tilt);
  }

  /** Update 0.0.16 — where a hand is now (its wrist and its middle knuckle) and which way its back faces (world space
   *  of the arms' scene). */
  handFrame(side: Side, wristOut: THREE.Vector3, knuckleOut: THREE.Vector3, backOut: THREE.Vector3) {
    const hand = this.arms[side].hand.bone;
    hand.getWorldPosition(wristOut);
    this.arms[side].knuckle.getWorldPosition(knuckleOut);
    backOut.copy(this.backLocal[side]).applyQuaternion(hand.getWorldQuaternion(handQ));
  }

  /** M2 — the right hand's bone (a held weapon hangs off it). */
  get holdBone(): THREE.Bone {
    return this.hold.hand;
  }

  /** M2 — a held weapon's matrix under the right hand's bone: its grip in the hole the fingers make (`slide` metres up
   *  the handle from the model's origin, its middle), its blade (+y) out of the index finger's side, leaning `tilt`
   *  (radians) towards the knuckles as a real grip crosses the palm, its edge (+x) facing the knuckles. */
  holdMatrix(tilt: number, scale: number, slide: number, into: THREE.Matrix4): THREE.Matrix4 {
    const r = this.hold;
    yAxis.copy(r.thumb).multiplyScalar(Math.cos(tilt)).addScaledVector(r.y, Math.sin(tilt));
    xAxis.copy(r.y).multiplyScalar(Math.cos(tilt)).addScaledVector(r.thumb, -Math.sin(tilt));
    zAxis.crossVectors(xAxis, yAxis);
    holdM.makeBasis(xAxis, yAxis, zAxis).scale(holdScale.setScalar(scale));
    holdM.setPosition(through.copy(r.grip).addScaledVector(yAxis, -slide));
    return into.multiplyMatrices(r.handInv, holdM);
  }

  /** M2 — the right arm's pose that holds a sword where `sword` says (model space), for `holdMatrix` with its tilt.
   *  Exact when applied with a full wrist bend (`apply(…, 1)`). Update 0.1.1 — either arm's. */
  gripPose(sword: SwordPose, out: ArmPose, side: Side = 'R'): ArmPose {
    const r = this.holds[side];
    const c = Math.cos(sword.tilt);
    const s = Math.sin(sword.tilt);
    // Undo the tilt: the way through the fist, and the knuckles (the edge faces them).
    through.copy(sword.blade).multiplyScalar(c).addScaledVector(sword.edge, -s);
    out.knuckles.copy(sword.blade).multiplyScalar(s).addScaledVector(sword.edge, c);
    xAxis.copy(through).multiplyScalar(r.sign);
    out.back.crossVectors(xAxis, out.knuckles);
    // The wrist sits back from the grip by the grip's rest offset, turned with the hand.
    out.fist.copy(sword.grip).addScaledVector(xAxis, -r.offset.x).addScaledVector(out.knuckles, -r.offset.y).addScaledVector(out.back, -r.offset.z);
    out.fist.addScaledVector(out.knuckles, FIST_REACH);
    return out;
  }

  /** Update 0.1.1 — where a fist's grip is now, and the way through it to the index finger's side (world space of the
   *  arms' scene). */
  gripNow(side: Side, at: THREE.Vector3, through: THREE.Vector3) {
    const r = this.holds[side];
    holdM.multiplyMatrices(r.hand.matrixWorld, r.handInv);
    at.copy(r.grip).applyMatrix4(holdM);
    through.copy(r.thumb).transformDirection(holdM);
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
