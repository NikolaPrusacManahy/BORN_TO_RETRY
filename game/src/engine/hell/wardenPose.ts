// Update 0.3.64 — Hellwarden posed over its clips where they have nothing for it: its sword raised straight over its head in its show, both
// arms up through Last Verdict. Two-bone reaches (boss/kingPose.ts), its hand turned so its blade points where it should. Pure maths on the
// skeleton.
import * as THREE from 'three';
import { SHOW_RAISE } from '../../sim/dungeon/wardenShow';
import type { Enemy } from '../../sim/enemies/enemy';
import { VERDICT } from '../../sim/enemies/wardenMoves';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { type Limb, reach } from '../boss/kingPose';

/** Its forearm's length (m on its 6 m). */
const FORE = 1;

const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const hand = new THREE.Vector3();
const pole = new THREE.Vector3();
const d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const handQ = new THREE.Quaternion();
const parentQ = new THREE.Quaternion();
const delta = new THREE.Quaternion();

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

function limbOf(root: THREE.Object3D, a: string, b: string): Limb | null {
  const upper = root.getObjectByName(a);
  const lower = root.getObjectByName(b);
  return upper && lower ? { upper, lower } : null;
}

/** Poses it for now (its clip has just been applied; `root` scaled and placed). `tip`: its sword's tip in its right hand's frame. */
export function poseWarden(root: THREE.Object3D, e: Enemy, tip: THREE.Vector3 | null) {
  const raising = e.phase === 'intro' && e.move === SHOW_RAISE;
  const verdict = e.phase === 'blast' && e.move === VERDICT;
  if (!raising && !verdict) return;
  const armR = limbOf(root, 'upperarm_r', 'lowerarm_r');
  const armL = limbOf(root, 'upperarm_l', 'lowerarm_l');
  const h = HELLWARDEN.v.height;
  const size = h / 6;
  const w = smooth(e.t / 0.35);
  fw.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
  rt.set(Math.cos(e.facing), 0, -Math.sin(e.facing));
  const at = (forward: number, right: number, up: number) => hand.copy(e.pos).addScaledVector(fw, forward * h).addScaledVector(rt, right * h).setY(e.pos.y + up * h);
  root.updateMatrixWorld(true);
  if (armR) {
    at(0.06, 0.06, 1.12);
    pole.copy(rt).multiplyScalar(0.8).setY(-0.5);
    reach(armR, hand, pole, FORE * size, false, w);
  }
  if (armL) {
    at(0.06, verdict ? -0.06 : -0.3, verdict ? 1.12 : 0.62);
    pole.copy(rt).multiplyScalar(-0.8).setY(-0.5);
    reach(armL, hand, pole, FORE * size, false, w);
  }
  root.updateMatrixWorld(true);
  // Its blade up.
  const handR = root.getObjectByName('hand_r');
  if (!handR || !tip || !handR.parent) return;
  handR.getWorldQuaternion(handQ);
  d.copy(tip).normalize().applyQuaternion(handQ);
  delta.setFromUnitVectors(d, UP).slerp(new THREE.Quaternion(), 1 - w);
  handR.parent.getWorldQuaternion(parentQ);
  handR.quaternion.copy(parentQ.invert()).multiply(delta).multiply(handQ);
  root.updateMatrixWorld(true);
}
