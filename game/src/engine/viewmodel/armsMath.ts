// M1 step 6 — the arm-posing math (ported from tools/blender/cut_arms.py, so the game matches the approved
// previews): two-bone IK for the elbow, and turning a bone so it points one way with the back of the hand
// facing another. Scratch objects only, so posing makes no garbage.
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { ArmPose } from './armsRig';

const u = new Vector3();
const p = new Vector3();
const xAxis = new Vector3();
const yAxis = new Vector3();
const zAxis = new Vector3();
const basis = new Matrix4();

/** Two-bone IK: where the elbow goes so the arm reaches `wrist`, bending towards `pole`. Out-of-reach wrists get
 *  a straight arm pointing at them. */
export function solveElbow(shoulder: Vector3, wrist: Vector3, upper: number, fore: number, pole: Vector3, out: Vector3): Vector3 {
  u.subVectors(wrist, shoulder);
  const d = Math.min(Math.max(u.length(), 1e-6), (upper + fore) * 0.999);
  u.normalize();
  const along = (upper * upper - fore * fore + d * d) / (2 * d);
  const side = Math.sqrt(Math.max(0, upper * upper - along * along));
  p.copy(pole).addScaledVector(u, -pole.dot(u)).normalize();
  return out.copy(shoulder).addScaledVector(u, along).addScaledVector(p, side);
}

/** The rotation whose +y is `y` and whose +z is as close to `z` as it can be. */
export function frameQuat(y: Vector3, z: Vector3, out: Quaternion): Quaternion {
  yAxis.copy(y).normalize();
  zAxis.copy(z).addScaledVector(yAxis, -z.dot(yAxis)).normalize();
  xAxis.crossVectors(yAxis, zAxis);
  basis.makeBasis(xAxis, yAxis, zAxis);
  return out.setFromRotationMatrix(basis);
}

const target = new Quaternion();
const restFrame = new Quaternion();

/**
 * The model-space rotation for a bone: its rest rotation `restQuat` turned so the bone's rest direction
 * `restDir` points along `dir`, and its rest "back" (`restBack`) faces `back`.
 */
export function aimBone(restQuat: Quaternion, restDir: Vector3, restBack: Vector3, dir: Vector3, back: Vector3, out: Quaternion): Quaternion {
  frameQuat(dir, back, target);
  frameQuat(restDir, restBack, restFrame).invert();
  return out.copy(target).multiply(restFrame).multiply(restQuat);
}

/** A blank arm pose. (Moved here from viewmodel.ts in Update 0.0.13.) */
export function pose(): ArmPose {
  return { fist: new Vector3(), knuckles: new Vector3(), back: new Vector3() };
}

/** The approved previews looked ~10° down at the guard; the arms tilt up by the same so the game frames it alike.
 *  (Moved here from viewmodel.ts in Update 0.0.16.) */
export const PREVIEW_PITCH = Math.atan(0.18);
const COS_P = Math.cos(PREVIEW_PITCH);
const SIN_P = Math.sin(PREVIEW_PITCH);

/** A point (`eye`: the model's eye) or direction (`eye` null) from the arms camera's view (before sway) into the model's
 *  space. */
export function viewToModel(v: Vector3, eye: Vector3 | null) {
  const y = v.y * COS_P + v.z * SIN_P;
  const z = -v.y * SIN_P + v.z * COS_P;
  v.set(-v.x, y, -z);
  if (eye) v.add(eye);
}

/** `a` → `b` by `k` into `out` (which may be `a` or `b`). */
export function mixArm(a: ArmPose, b: ArmPose, k: number, out: ArmPose) {
  out.fist.lerpVectors(a.fist, b.fist, k);
  out.knuckles.lerpVectors(a.knuckles, b.knuckles, k).normalize();
  out.back.lerpVectors(a.back, b.back, k).normalize();
}
