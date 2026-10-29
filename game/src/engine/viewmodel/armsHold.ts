// M2 — a fist's hold on a handle: where a held weapon sits in the fist (worked out once from the rest pose), its matrix
// under the hand's bone, and the arm's pose that holds it where a pose says. Update 0.1.1 — either fist's.
// Update 0.1.9 — moved out of armsRig.ts (it had reached its size; no change in behaviour), and the left fist holds a
// weapon too (the Dual Daggers' second one).
import * as THREE from 'three';
import type { ArmPose, SwordPose } from './armsRig';
import { FIST_REACH, REST_BACK } from './guard';

/** Where a held weapon sits in a fist, model space. */
export interface HoldRest {
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

const at = new THREE.Vector3();
const holdM = new THREE.Matrix4();
const xAxis = new THREE.Vector3();
const yAxis = new THREE.Vector3();
const zAxis = new THREE.Vector3();
const holdScale = new THREE.Vector3();
const through = new THREE.Vector3();

/** The fingers are baked closed, so the grip goes where they curl round: the middle of their twelve joints. The way
 *  through the fist runs from the little finger's knuckle to the index finger's. `bone`: a finger bone by its name
 *  (`Index2` …); `hand`: the hand bone, its rest position and its rest direction to the knuckles. */
export function holdOf(bone: (name: string) => THREE.Bone, hand: THREE.Bone, pos: THREE.Vector3, dir: THREE.Vector3): HoldRest {
  const grip = new THREE.Vector3();
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const j of [2, 3, 4]) grip.add(bone(`${f}${j}`).getWorldPosition(at));
  grip.divideScalar(12);
  const y = dir.clone();
  const z = REST_BACK.clone().addScaledVector(y, -REST_BACK.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const thumb = bone('Index2').getWorldPosition(new THREE.Vector3()).sub(bone('Pinky2').getWorldPosition(at));
  thumb.addScaledVector(y, -thumb.dot(y)).addScaledVector(z, -thumb.dot(z)).normalize();
  const off = grip.clone().sub(pos);
  return { hand, handInv: hand.matrixWorld.clone().invert(), grip, y, thumb, offset: new THREE.Vector3(off.dot(x), off.dot(y), off.dot(z)), sign: Math.sign(thumb.dot(x)) };
}

/** A held weapon's matrix under the hand's bone: its grip in the hole the fingers make (`slide` metres up the handle
 *  from the model's origin, its middle), its blade (+y) out of the index finger's side, leaning `tilt` (radians)
 *  towards the knuckles as a real grip crosses the palm, its edge (+x) facing the knuckles. */
export function holdMatrix(r: HoldRest, tilt: number, scale: number, slide: number, into: THREE.Matrix4): THREE.Matrix4 {
  yAxis.copy(r.thumb).multiplyScalar(Math.cos(tilt)).addScaledVector(r.y, Math.sin(tilt));
  xAxis.copy(r.y).multiplyScalar(Math.cos(tilt)).addScaledVector(r.thumb, -Math.sin(tilt));
  zAxis.crossVectors(xAxis, yAxis);
  holdM.makeBasis(xAxis, yAxis, zAxis).scale(holdScale.setScalar(scale));
  holdM.setPosition(through.copy(r.grip).addScaledVector(yAxis, -slide));
  return into.multiplyMatrices(r.handInv, holdM);
}

/** The arm's pose that holds a sword where `sword` says (model space), for `holdMatrix` with its tilt. Exact when
 *  applied with a full wrist bend (`ArmsRig.apply(…, 1)`). */
export function gripPose(r: HoldRest, sword: SwordPose, out: ArmPose): ArmPose {
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

/** Where a fist's grip is now, and the way through it to the index finger's side (world space of the arms' scene). */
export function gripNow(r: HoldRest, atOut: THREE.Vector3, throughOut: THREE.Vector3) {
  holdM.multiplyMatrices(r.hand.matrixWorld, r.handInv);
  atOut.copy(r.grip).applyMatrix4(holdM);
  throughOut.copy(r.thumb).transformDirection(holdM);
}
