// Update 0.1.1 — an execution as you see it (sim/combat/execution.ts). The body held: its tail's tip is put in your
// hands, the rest of it laid along the way the moves say (the model's tail-to-head line turned onto it), thrashing,
// its tail held still (the designer: "make it grab the snake's tail": the clip's tail wag would pull it out of your
// fists), and turned about that line so the tail runs across to your right from your hands (left hand on its tip, the
// right beside it: two fists on one spot crossed your arms). It's lifted out of where it stood over the first move, and
// your hands follow its tail where it's drawn (`placeHeld` runs first each frame). Your view is turned where the moves look while you hold it (down at each slam, ahead for the throw); both
// hands hold its tail along its own line, as a rope is held (viewmodel/heldGrip.ts). Placed in place each frame; nothing
// made per frame.
import * as THREE from 'three';
import { Execution, KEYS, LET_GO_AT } from '../sim/combat/execution';
import type { EnemyKind } from '../sim/enemies/kinds';
import type { Look } from './look';
import type { Viewmodel } from './viewmodel/viewmodel';

/** Each executable kind's bones: the tail's tip (in your hands), the next joint along it (the way the tail runs from
 *  your hands), the head (the tail-to-head line is laid on the moves'), and the tail's joints, held still. */
interface GripBones {
  tip: string;
  next: string;
  head: string;
  still: string[];
}
const BONES: Partial<Record<EnemyKind, GripBones>> = { snake: { tip: 'Tail3', next: 'Tail2', head: 'Head', still: ['Tail', 'Tail1', 'Tail2', 'Tail3'] } };
/** How fast the view turns where the moves look (1/s). */
const TURN = 14;
/** The fists take hold over this long (s), and let go over this long. */
const TAKE = 0.12;
const LET_GO = 0.2;
/** The fists hold the tail this far in from its tip (m), so the tip shows. */
const TIP = 0.08;
/** Lifted out of where it stood over the first move (s in). */
const LIFT = KEYS[1].t;

/** A kind's grip at rest, in its model: the tail's tip, its tail-to-head line, and the tail's line from the tip. */
export interface Grip {
  tail: THREE.Vector3;
  axis: THREE.Vector3;
  line: THREE.Vector3;
}
type Still = { bone: THREE.Object3D; rest: THREE.Quaternion; at: THREE.Vector3 }[];
/** Where the held tail was drawn this frame (its tip, and its line from there), for the hands. */
const drawn = { on: false, tip: new THREE.Vector3(), line: new THREE.Vector3() };

const q = new THREE.Quaternion();
const twist = new THREE.Quaternion();
const none = new THREE.Quaternion();
const stood = new THREE.Quaternion();
const stoodAt = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3();
const right = new THREE.Vector3();
const line = new THREE.Vector3();
const end = new THREE.Vector3();

/** `kind`'s grip, from its model at rest (null if it can't be held). */
export function gripOf(kind: EnemyKind, model: THREE.Object3D): Grip | null {
  const names = BONES[kind];
  if (!names) return null;
  model.updateMatrixWorld(true);
  const at = (name: string) => model.getObjectByName(name)?.getWorldPosition(new THREE.Vector3()) ?? null;
  const tip = at(names.tip);
  const next = at(names.next);
  const head = at(names.head);
  if (!tip || !next || !head) return null;
  return { tail: tip, axis: head.sub(tip).normalize(), line: next.sub(tip).normalize() };
}

/** A body's tail joints (`root`: its own clone, at rest) with their rest turns and places, to hold still while it's held
 *  (the clip moves the tail's first joint as well as turning them). */
export function stillOf(kind: EnemyKind, root: THREE.Object3D): Still {
  const out: Still = [];
  for (const name of BONES[kind]?.still ?? []) {
    const bone = root.getObjectByName(name);
    if (bone) out.push({ bone, rest: bone.quaternion.clone(), at: bone.position.clone() });
  }
  return out;
}

/** How the held body is turned (into `out`): its tail-to-head line onto the moves', then about it, so its tail runs from
 *  your hands to your right as far as it can. */
export function heldTurn(ex: Execution, grip: Grip, out: THREE.Quaternion): THREE.Quaternion {
  out.setFromUnitVectors(grip.axis, ex.dir);
  // Both square to the body's line: the tail's way, and your right.
  line.copy(grip.line).applyQuaternion(out).addScaledVector(ex.dir, -line.dot(ex.dir));
  right.set(Math.cos(ex.yaw), 0, -Math.sin(ex.yaw));
  right.addScaledVector(ex.dir, -right.dot(ex.dir));
  const room = Math.min(right.length(), line.length());
  if (room < 1e-3) return out;
  twist.setFromUnitVectors(line.normalize(), right.normalize());
  // Fading out as the body's line comes round to your right (nothing left to turn to).
  return out.premultiply(none.identity().slerp(twist, Math.min(1, room / 0.3)));
}

/** The held body's model placed: its grip in your hands, its tail-to-head line along the moves'; over the first move,
 *  from how it stood (`turn`: its turn standing; `lowest`: its model's lowest point, as it stands on the floor). */
export function placeHeld(root: THREE.Object3D, ex: Execution, scale: number, grip: Grip, turn: number, lowest: number) {
  heldTurn(ex, grip, q);
  root.quaternion.copy(q);
  root.scale.setScalar(scale);
  root.position.copy(ex.grip).sub(v.copy(grip.tail).multiplyScalar(scale).applyQuaternion(q));
  const k = Math.min(1, ex.t / LIFT);
  if (k < 1) {
    const s = k * k * (3 - 2 * k);
    root.quaternion.copy(stood.setFromAxisAngle(UP, turn)).slerp(q, s);
    root.position.lerpVectors(stoodAt.copy(ex.stand).setY(ex.stand.y - lowest * scale), root.position, s);
  }
  drawn.on = true;
  drawn.tip.copy(grip.tail).multiplyScalar(scale).applyQuaternion(root.quaternion).add(root.position);
  drawn.line.copy(grip.line).applyQuaternion(root.quaternion);
}

/** Its tail held still (after its clip has played this frame). */
export function holdStill(root: THREE.Object3D) {
  for (const s of (root.userData.still ?? []) as Still) {
    s.bone.quaternion.copy(s.rest);
    s.bone.position.copy(s.at);
  }
}

/** While you hold it (`held`): the view turns where the moves look, the hands hold its tail; as it's thrown they let
 *  go where it was. */
export function followHeld(ex: Execution, held: boolean, look: Look, arms: Viewmodel, camera: THREE.PerspectiveCamera, real: number) {
  arms.grip.weight = 0;
  const seen = drawn.on;
  drawn.on = false;
  if (!ex.active || !seen) return;
  if (!held) {
    arms.grip.weight = Math.max(0, 1 - (ex.t - LET_GO_AT) / LET_GO);
    return;
  }
  look.turnTo(ex.lookYaw, ex.lookPitch, TURN, real);
  end.copy(drawn.tip).addScaledVector(drawn.line, TIP);
  arms.grip.hold(Math.min(1, ex.t / TAKE), end, drawn.line, camera, arms.camera);
}
