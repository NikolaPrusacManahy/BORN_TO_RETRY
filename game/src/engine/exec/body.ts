// Update 0.1.1 — the held body placed: its grip in your hands, the rest laid along the way the moves say (the model's
// grip-to-head line turned onto it), turned about that line so a tail runs across to your right from your hands (two
// fists on one spot crossed your arms), lifted out of where it stood over the first move; its tail held still (the
// clip's wag would pull it out of your fists).
// Update 0.1.2 — every enemy's (looks.ts): a body held whole is turned to show you its front; one standing turns to
// face you, jolts back with each blow, and tumbles if it's sent flying; an arm reaching into your hand; a piece's bones
// folded away once it's off.
import * as THREE from 'three';
import { Execution, moveOf } from '../../sim/combat/execution';
import type { EnemyKind } from '../../sim/enemies/kinds';
import { solveElbow } from '../viewmodel/armsMath';
import { boneOf } from './bones';
import { EXEC_LOOKS } from './looks';

/** A kind's grip at rest, in its model: the held bone, its line to the head, and the line the hands hold from there or
 *  the side it shows you. */
export interface Grip {
  tail: THREE.Vector3;
  axis: THREE.Vector3;
  line: THREE.Vector3 | null;
  face: THREE.Vector3 | null;
}
type Still = { bone: THREE.Object3D; rest: THREE.Quaternion; at: THREE.Vector3 }[];

/** A standing body jolts back this far (m) with each blow, over this long (s). */
const JOLT = 0.06;
const JOLT_TIME = 0.08;

const q = new THREE.Quaternion();
const stood = new THREE.Quaternion();
const twist = new THREE.Quaternion();
const none = new THREE.Quaternion();
const v = new THREE.Vector3();
const w = new THREE.Vector3();
const want = new THREE.Vector3();
const right = new THREE.Vector3();
const mid = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const pole = new THREE.Vector3();
const elbow = new THREE.Vector3();

/** `kind`'s grip, from its model at rest (null if it isn't held). */
export function gripOf(kind: EnemyKind, model: THREE.Object3D): Grip | null {
  const g = EXEC_LOOKS[kind]?.grip;
  if (!g) return null;
  model.updateMatrixWorld(true);
  const at = (name: string) => model.getObjectByName(name)?.getWorldPosition(new THREE.Vector3()) ?? null;
  const tip = at(g.at);
  const head = at(g.to);
  if (!tip || !head) return null;
  let line: THREE.Vector3 | null = null;
  if (typeof g.line === 'string') line = at(g.line)?.sub(tip).normalize() ?? null;
  else if (g.line) line = new THREE.Vector3(...g.line).normalize();
  return { tail: tip, axis: head.sub(tip).normalize(), line, face: g.face ? new THREE.Vector3(...g.face).normalize() : null };
}

/** A body's still joints (`root`: its own clone, at rest) with their rest turns and places (the clip moves a tail's
 *  first joint as well as turning them). */
export function stillOf(kind: EnemyKind, root: THREE.Object3D): Still {
  const out: Still = [];
  for (const name of EXEC_LOOKS[kind]?.still ?? []) {
    const bone = root.getObjectByName(name);
    if (bone) out.push({ bone, rest: bone.quaternion.clone(), at: bone.position.clone() });
  }
  return out;
}

/** Its still joints back at rest (after its clip has played this frame). */
export function holdStill(root: THREE.Object3D) {
  for (const s of (root.userData.still ?? []) as Still) {
    s.bone.quaternion.copy(s.rest);
    s.bone.position.copy(s.at);
  }
}

/** How the held body is turned (into `out`): its grip-to-head line onto the moves', then about it: a held line to your
 *  right, or its front towards you, as far as it can. */
export function heldTurn(ex: Execution, grip: Grip, out: THREE.Quaternion): THREE.Quaternion {
  out.setFromUnitVectors(grip.axis, ex.dir);
  const from = grip.line ?? grip.face;
  if (!from) return out;
  v.copy(from).applyQuaternion(out);
  v.addScaledVector(ex.dir, -v.dot(ex.dir));
  if (grip.line) right.set(Math.cos(ex.yaw), 0, -Math.sin(ex.yaw));
  else right.set(Math.sin(ex.yaw), 0, Math.cos(ex.yaw));
  right.addScaledVector(ex.dir, -right.dot(ex.dir));
  const room = Math.min(right.length(), v.length());
  if (room < 1e-3) return out;
  twist.setFromUnitVectors(v.normalize(), right.normalize());
  // Fading out as the body's line comes round to that way (nothing left to turn to).
  return out.premultiply(none.identity().slerp(twist, Math.min(1, room / 0.3)));
}

/** The held body placed (`turn`: how it stood; `lowest`: its model's lowest point, standing on the floor). */
export function placeHeld(root: THREE.Object3D, ex: Execution, scale: number, grip: Grip, turn: number, lowest: number) {
  heldTurn(ex, grip, q);
  root.quaternion.copy(q);
  root.scale.setScalar(scale);
  root.position.copy(ex.grip).sub(v.copy(grip.tail).multiplyScalar(scale).applyQuaternion(q));
  const k = Math.min(1, ex.t / moveOf(ex.kind).keys[1].t);
  if (k < 1) {
    const s = k * k * (3 - 2 * k);
    root.quaternion.copy(stood.setFromAxisAngle(UP, turn)).slerp(q, s);
    root.position.lerpVectors(w.copy(ex.stand).setY(ex.stand.y - lowest * scale), root.position, s);
  }
}

/** A standing body (already placed where it stands, `turn` its turn): turned to face you over the first move, jolted
 *  back by each blow, tumbling once it's sent flying (`height`: its size). */
export function placeStood(root: THREE.Object3D, ex: Execution, facing: number, turn: number, height: number) {
  const move = moveOf(ex.kind);
  const dx = ex.origin.x - root.position.x;
  const dz = ex.origin.z - root.position.z;
  const toYou = Math.atan2(-dx, -dz);
  const k = Math.min(1, ex.t / 0.15);
  root.rotation.set(0, turn + Math.atan2(Math.sin(toYou - facing), Math.cos(toYou - facing)) * k, 0);
  // Jolted back by each blow.
  let jolt = 0;
  for (const b of move.beats) if (ex.t >= b.t && ex.t < b.t + JOLT_TIME) jolt = Math.max(jolt, 1 - (ex.t - b.t) / JOLT_TIME);
  const back = Math.atan2(dx, dz);
  root.position.x -= Math.sin(back) * JOLT * jolt;
  root.position.z -= Math.cos(back) * JOLT * jolt;
  if (ex.thrown) {
    // Tumbling end over end about its middle.
    const f = Math.min(1, (ex.t - move.endAt) / Math.max(0.05, ex.flight));
    right.set(Math.cos(ex.aimYaw), 0, -Math.sin(ex.aimYaw));
    q.setFromAxisAngle(right, -f * Math.PI * 3);
    mid.copy(root.position).addScaledVector(UP, height / 2);
    root.position.sub(mid).applyQuaternion(q).add(mid);
    root.quaternion.premultiply(q);
  }
}

/** An arm (its upper arm and forearm bones) reaching for `target` (world), its elbow bending out and down (two-bone,
 *  as the arms' own: viewmodel/armsMath.ts). */
export function reachArm(root: THREE.Object3D, upperName: string, foreName: string, target: THREE.Vector3) {
  const upper = boneOf(root, upperName);
  const fore = boneOf(root, foreName);
  const hand = fore?.children[0];
  if (!upper || !fore || !hand) return;
  root.updateMatrixWorld(true);
  const s = upper.getWorldPosition(v);
  const a = s.distanceTo(fore.getWorldPosition(w));
  const b = w.distanceTo(hand.getWorldPosition(want));
  // Out from its middle and down.
  pole.set(s.x - root.position.x, 0, s.z - root.position.z).normalize();
  pole.y = -0.8;
  solveElbow(s, target, a, b, pole, elbow);
  turnBone(upper, w.sub(s), want.copy(elbow).sub(s));
  upper.updateMatrixWorld(true);
  fore.getWorldPosition(w);
  hand.getWorldPosition(want);
  turnBone(fore, want.sub(w), mid.copy(target).sub(elbow));
}

/** A bone turned (in the world) so its way `from` goes `to`. */
function turnBone(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  if (!bone.parent) return;
  q.setFromUnitVectors(from.normalize(), to.normalize());
  bone.getWorldQuaternion(qa);
  bone.parent.getWorldQuaternion(qb);
  bone.quaternion.copy(qb.invert().multiply(q.multiply(qa)));
}

/** Bones folded away (a piece that's come off). */
export function fold(root: THREE.Object3D, names: readonly string[]) {
  for (const name of names) boneOf(root, name)?.scale.setScalar(1e-3);
}
