// Update 0.3.53 — the Bone King posed for its moves, over whichever clip is playing (the model has only five, none of them
// the bible's). Its arms long (a lanky thing, for a walkway), reaching for what each move wants; its body bowed down with a
// hand planted, its right shoulder exactly where the rules' ramp ends (sim/enemies/kingBody.ts) and its arm lying along it, its
// feet staying on the floor (two-bone reaches, knee and elbow); its head still up and watching you; rebuilt wrong, its spine
// crooked. The bones' +y runs along them, their +x forward, their +z to its right. The model's L bones are on its right. Pure
// maths on the skeleton.
import * as THREE from 'three';
import { CAGE, CLUB_DROP, COLOSSUS, GRASP, RIBS, SHATTER, SLAM } from '../../sim/enemies/boneKingMoves';
import { kingTell } from '../../sim/enemies/boneKing';
import type { Enemy } from '../../sim/enemies/enemy';
import { handDownAt, kingTall, shoulderAt } from '../../sim/enemies/kingBody';
import { BONE_KING } from '../../tuning/boneKing';

/** Its arms, longer than the model's; its forearm's length in the model's own measure, to its fingertips; its height, too. */
const LONG = 1.25;
const FORE = 0.8;
const MODEL_TALL = 5.09;
/** Bowed right down: how far it tips forward (rad), and its head back up (a share of that). */
const BOW = 0.85;
const HEAD_UP = 0.85;
/** Its feet, its arm down: how far behind its middle and out to the sides (shares of its height). */
const FEET_BACK = 0.14;
const FEET_OUT = 0.1;
/** Quick in and out of a pose (s). */
const EASE_IN = 0.14;
const EASE_OUT = 0.35;

interface Limb {
  upper: THREE.Object3D;
  lower: THREE.Object3D;
}

export interface KingBones {
  hips: THREE.Object3D;
  torso: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  /** Its right and left arms (L is on its right), and its legs. */
  armR: Limb;
  armL: Limb;
  legR: Limb;
  legL: Limb;
}

export function kingBonesOf(root: THREE.Object3D): KingBones | null {
  const of = (n: string) => root.getObjectByName(n);
  const hips = of('Hips');
  const torso = of('Torso');
  const neck = of('Neck');
  const head = of('Head');
  const limb = (a: string, b: string): Limb | null => {
    const upper = of(a);
    const lower = of(b);
    return upper && lower ? { upper, lower } : null;
  };
  const armR = limb('LUpperLeg001', 'LDownLeg001');
  const armL = limb('RUpperLeg001', 'RDownLeg001');
  const legR = limb('LUpperLeg', 'LDownLeg');
  const legL = limb('RUpperLeg', 'RDownLeg');
  return hips && torso && neck && head && armR && armL && legR && legL ? { hips, torso, neck, head, armR, armL, legR, legL } : null;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const UP = new THREE.Vector3(0, 1, 0);
const Y = new THREE.Vector3(0, 1, 0);
const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const axis = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();
const d = new THREE.Vector3();
const way = new THREE.Vector3();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const tipQ = new THREE.Quaternion();
const m = new THREE.Matrix4();
const handR = new THREE.Vector3();
const handL = new THREE.Vector3();
const ramp = new THREE.Vector3();
const shoulder = new THREE.Vector3();

/** Sets a bone's world place and turn. */
function setWorld(bone: THREE.Object3D, pos: THREE.Vector3, quat: THREE.Quaternion) {
  const p = bone.parent!;
  m.copy(p.matrixWorld).invert();
  bone.position.copy(pos).applyMatrix4(m);
  p.getWorldQuaternion(q2).invert();
  bone.quaternion.copy(q2).multiply(quat);
  bone.updateMatrixWorld(true);
}

/** Turns `bone` to point at `target` (world), by `w`. */
function aim(bone: THREE.Object3D, target: THREE.Vector3, w: number) {
  bone.getWorldPosition(a);
  bone.getWorldQuaternion(q0);
  way.copy(Y).applyQuaternion(q0);
  b.subVectors(target, a).normalize();
  q1.setFromUnitVectors(way, b);
  q0.premultiply(q1);
  bone.parent!.getWorldQuaternion(q2).invert();
  q1.copy(q2).multiply(q0);
  bone.quaternion.slerp(q1, w);
  bone.updateMatrixWorld(true);
}

/** A limb's knee or elbow, to reach `target`, bending towards `pole`; or dead straight, stretched (an arm), if it's too far. */
function reach(limb: Limb, target: THREE.Vector3, pole: THREE.Vector3, lowerLong: number, stretch: boolean, w: number) {
  limb.upper.getWorldPosition(a);
  limb.lower.getWorldPosition(b);
  const l1 = a.distanceTo(b);
  const start = a.clone();
  const far = start.distanceTo(target);
  if (far >= l1 + lowerLong) {
    if (stretch) limb.upper.scale.y *= 1 + (far / (l1 + lowerLong) - 1) * w;
    aim(limb.upper, target, w);
    aim(limb.lower, target, w);
    return;
  }
  const along = (l1 * l1 - lowerLong * lowerLong + far * far) / (2 * far);
  const out = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  c.subVectors(target, start).normalize();
  d.copy(pole).addScaledVector(c, -pole.dot(c)).normalize();
  const elbow = start.clone().addScaledVector(c, along).addScaledVector(d, out);
  aim(limb.upper, elbow, w);
  aim(limb.lower, target, w);
}

/** Its hand: where an arm's forearm ends (world). */
export function handOfLimb(limb: Limb, scale: number, out: THREE.Vector3): THREE.Vector3 {
  limb.lower.getWorldPosition(out);
  limb.lower.getWorldQuaternion(q0);
  return out.addScaledVector(way.copy(Y).applyQuaternion(q0), FORE * scale * limb.upper.scale.y);
}

const easeOut = (e: Enemy, long: number) => smooth(Math.min(e.t / EASE_IN, (long - e.t) / EASE_OUT));

/** Poses it for now (its clip has just been applied; `root` scaled and placed). `time`: to rattle. */
export function poseKing(root: THREE.Object3D, bones: KingBones, e: Enemy, time: number) {
  const v = BONE_KING.v;
  const h = kingTall(e);
  const scale = h / MODEL_TALL;
  fw.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
  rt.set(Math.cos(e.facing), 0, -Math.sin(e.facing));
  const at = (out: THREE.Vector3, forward: number, right: number, up: number) => out.copy(e.pos).addScaledVector(fw, forward * h).addScaledVector(rt, right * h).addScaledVector(UP, up * h);
  // What it wants: its body bowed this far, this far up; each arm's reach, and how much.
  let bow = 0;
  let rw = 0;
  let lw = 0;
  let down = false;
  let rattle = 0;
  const tell = kingTell(e.move, e.stage);
  const k = e.t / Math.max(0.1, tell);
  switch (e.phase) {
    case 'windup':
      if (e.move === RIBS) {
        // Its hand into its own chest.
        rw = smooth(k * 3);
        at(handR, 0.14, 0.03, 0.47);
        at(handL, 0.04, -0.2, 0.3);
      } else if (e.move === GRASP) {
        // Its fingers driven into the floor.
        bow = 0.55 * smooth(k * 2.5);
        rw = lw = smooth(k * 2.5);
        at(handR, 0.42, 0.16, 0);
        at(handL, 0.42, -0.16, 0);
      } else if (e.move === SLAM) {
        // Its arm raised high, the long pause.
        rw = lw = smooth(k * 2.5);
        lw *= 0.4;
        at(handR, 0.16, 0.26, 1.08);
        at(handL, 0.1, -0.24, 0.25);
      } else if (e.move === SHATTER) {
        // Its arms out, its whole body rattling.
        rw = lw = smooth(k * 2);
        rattle = k;
        at(handR, 0.05, 0.5, 0.52);
        at(handL, 0.05, -0.5, 0.52);
      } else if (e.move === CAGE) {
        // Its hands lifting: up come the ribs.
        rw = lw = smooth(k * 2);
        at(handR, 0.34, 0.3, 0.3 + 0.4 * k);
        at(handL, 0.34, -0.3, 0.3 + 0.4 * k);
      }
      break;
    case 'grab':
      bow = 0.55;
      rw = lw = 1;
      at(handR, 0.42, 0.16, 0);
      at(handL, 0.42, -0.16, 0);
      break;
    case 'recover':
      if (e.move === RIBS) {
        // Its hand out after them.
        rw = easeOut(e, v.ribTime);
        at(handR, 0.42, 0.14, 0.62);
      } else if (e.move === SLAM) {
        bow = down_w(e, v.slamHold);
        rw = lw = bow;
        down = true;
      } else if (e.move === GRASP) {
        rw = lw = smooth(1 - e.t / EASE_OUT);
        bow = 0.55 * rw;
        at(handR, 0.42, 0.16, 0);
        at(handL, 0.42, -0.16, 0);
      }
      break;
    case 'blast':
      if (e.move !== COLOSSUS) break;
      if (e.shots === 0) {
        // Its arms wide, every bone coming to it.
        rw = lw = smooth(e.t / 0.5);
        at(handR, 0.05, 0.42, 0.72);
        at(handL, 0.05, -0.42, 0.72);
      } else if (e.shots === 1) {
        // Its arm down to the floor; its club going up.
        bow = rw = smooth(e.t / 0.3);
        lw = 1;
        down = true;
        const rise = 1 - e.ult.left / Math.max(0.1, e.ult.window);
        at(handL, 0.06, -0.26, 0.5 + 0.55 * rise);
      } else {
        // Its club comes down in front of it.
        const fall = smooth(e.t / CLUB_DROP);
        lw = 1;
        at(handL, 0.06 + 0.4 * fall, -0.26 + 0.16 * fall, 1.05 - 1.0 * fall);
        const left = 1 - smooth((e.t - CLUB_DROP - 0.3) / 0.5);
        lw *= left;
        bow = 0.4 * fall * left;
      }
      break;
    default:
      break;
  }
  bones.armR.upper.scale.y = LONG;
  bones.armL.upper.scale.y = LONG;
  root.updateMatrixWorld(true);
  // Rebuilt wrong: its spine crooked, its head askew.
  if (e.stage > 0) {
    bones.torso.rotateX(0.24);
    bones.torso.rotateZ(-0.1);
    bones.neck.rotateX(-0.42);
    bones.head.rotateX(0.26);
    root.updateMatrixWorld(true);
  }
  if (rattle > 0) {
    const shake = 0.05 + 0.09 * rattle;
    bones.torso.rotateX(Math.sin(time * 61) * shake);
    bones.head.rotateZ(Math.sin(time * 47) * shake);
    bones.hips.rotateY(Math.sin(time * 53) * shake * 0.6);
    root.updateMatrixWorld(true);
  }
  if (bow > 0) {
    // Tipped forward about its right, so that its right shoulder comes where it wants it.
    axis.crossVectors(UP, fw).normalize();
    tipQ.setFromAxisAngle(axis, BOW * bow);
    bones.hips.getWorldPosition(c);
    bones.hips.getWorldQuaternion(q0);
    const toShoulder = new THREE.Vector3();
    bones.armR.upper.getWorldPosition(toShoulder).sub(c).applyQuaternion(tipQ);
    shoulderAt(e, h, shoulder);
    const goal = new THREE.Vector3().copy(shoulder).sub(toShoulder);
    c.lerp(goal, bow);
    const turned = q0.clone().premultiply(tipQ);
    setWorld(bones.hips, c, turned);
    root.updateMatrixWorld(true);
    // Its feet stay on the floor.
    for (const [leg, side] of [[bones.legR, 1], [bones.legL, -1]] as [Limb, number][]) {
      const foot = new THREE.Vector3();
      at(foot, -FEET_BACK * bow, side * FEET_OUT, 0.02);
      const pole = new THREE.Vector3().copy(fw).addScaledVector(rt, side * 0.5);
      bones.hips.updateMatrixWorld(true);
      reach(leg, foot, pole, 0.77 * scale, false, 1);
    }
    // Its head stays up, on you.
    bones.head.getWorldQuaternion(q0);
    q0.premultiply(q1.setFromAxisAngle(axis, -BOW * bow * HEAD_UP));
    bones.head.parent!.getWorldQuaternion(q2).invert();
    bones.head.quaternion.copy(q2).multiply(q0);
    root.updateMatrixWorld(true);
  }
  if (down) {
    // Lying along the ramp, and its other braced.
    handDownAt(e, h, ramp);
    handR.copy(ramp);
    if (e.phase !== 'blast') at(handL, 0.42, -0.2, 0);
  }
  const lowerR = FORE * scale * LONG;
  const elbowOut = new THREE.Vector3().copy(rt).multiplyScalar(0.7).addScaledVector(fw, -0.6);
  if (rw > 0) reach(bones.armR, handR, elbowOut, lowerR, true, rw);
  elbowOut.copy(rt).multiplyScalar(-0.7).addScaledVector(fw, -0.6);
  if (lw > 0) reach(bones.armL, handL, elbowOut, lowerR, true, lw);
  root.updateMatrixWorld(true);
}

/** Bowed, its arm down: quickly on the slam, slowly off at the end of its hold. */
function down_w(e: Enemy, long: number): number {
  return Math.min(smooth(e.t / 0.08), smooth((long - e.t) / EASE_OUT));
}

/** (For the tests.) */
export const KING_POSE = { LONG, FORE, MODEL_TALL };
