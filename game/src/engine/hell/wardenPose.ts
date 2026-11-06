// Update 0.3.64 — Hellwarden posed over its clips where they have nothing for it: both arms up through Last Verdict. Two-bone reaches (boss/kingPose.ts),
// its hand turned so its blade points where it should. Pure maths on the skeleton.
// Update 0.3.65 — its show (the designer's shot list; sim/dungeon/wardenShow.ts): head bowed and arms hanging as it rises out of the lava; arms out and
// head back as its armor clamps on, each piece jolting it; its right arm down for its sword; its sword drawn across it through its left claws, the flat
// of the blade to you, hilt to tip; its head going up to meet the skull.
import * as THREE from 'three';
import { CLAMPS, clawsShare, HEAT_UP, heatForward, heatRightShare, heatShare, SHOW_AIR, SHOW_CROUCH, SHOW_FORGE, SHOW_HEAT, SHOW_MASK, SHOW_RISE, SHOW_SLAM, SHOW_SWORD, SHOW_UNDER, wardenBeats } from '../../sim/dungeon/wardenShow';
import type { Enemy } from '../../sim/enemies/enemy';
import { VERDICT } from '../../sim/enemies/wardenMoves';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { type Limb, reach } from '../boss/kingPose';

/** Its forearm's length (m on its 6 m). */
const FORE = 1;
/** Its blade in its leap: this much up, this much out to its left. */
const LEAP_BLADE_UP = 0.8;
const LEAP_BLADE_OUT = 0.6;

const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const hand = new THREE.Vector3();
const pole = new THREE.Vector3();
const d = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const Y = new THREE.Vector3(0, 1, 0);
const handQ = new THREE.Quaternion();
const parentQ = new THREE.Quaternion();
const delta = new THREE.Quaternion();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const local = new THREE.Matrix4();
const world = new THREE.Matrix4();

const smooth = (k: number) => {
  const c0 = Math.max(0, Math.min(1, k));
  return c0 * c0 * (3 - 2 * c0);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

/** Update 0.3.66 — the bones it poses. The mixer only writes a bone when its clip's value changes, so where a clip holds still, last frame's pose is still there, and a turn turns it again:
 *  its head, frame after frame, right round behind its collar (the designer: "he is supposed to have his skull face on here"). So each frame starts from the clip's pose. */
const POSED = ['spine_02', 'neck_01', 'Head', 'upperarm_r', 'lowerarm_r', 'hand_r', 'upperarm_l', 'lowerarm_l', 'hand_l'];

interface Held {
  bone: THREE.Object3D;
  clip: THREE.Quaternion;
  posed: THREE.Quaternion;
  on: boolean;
}

const heldOf = new WeakMap<THREE.Object3D, Held[]>();

/** Back to the clip's pose: what the mixer's just written, or if it hasn't, what it wrote before it was posed. */
function unpose(root: THREE.Object3D): Held[] {
  let held = heldOf.get(root);
  if (!held) {
    held = [];
    for (const name of POSED) {
      const bone = root.getObjectByName(name);
      if (bone) held.push({ bone, clip: new THREE.Quaternion(), posed: new THREE.Quaternion(), on: false });
    }
    heldOf.set(root, held);
  }
  for (const h of held) {
    if (h.on && h.bone.quaternion.equals(h.posed)) h.bone.quaternion.copy(h.clip);
    h.clip.copy(h.bone.quaternion);
    h.on = false;
  }
  return held;
}

function remember(held: Held[]) {
  for (const h of held) {
    h.posed.copy(h.bone.quaternion);
    h.on = true;
  }
}

function limbOf(root: THREE.Object3D, n1: string, n2: string): Limb | null {
  const upper = root.getObjectByName(n1);
  const lower = root.getObjectByName(n2);
  return upper && lower ? { upper, lower } : null;
}

/** Turns a bone about a world axis (the rest of the chain goes with it). */
function turnBone(bone: THREE.Object3D | undefined, axis: THREE.Vector3, angle: number) {
  if (!bone || !bone.parent || angle === 0) return;
  bone.getWorldQuaternion(q0);
  q0.premultiply(q1.setFromAxisAngle(axis, angle));
  bone.parent.getWorldQuaternion(q2).invert();
  bone.quaternion.copy(q2).multiply(q0);
}

/** What its sword is, seen from its hand: its point, and the way across its blade (`wardenFx.ts` measures them). */
export interface BladeFrame {
  tip: THREE.Vector3;
  wide: THREE.Vector3;
}

/** Turns its right hand so its blade runs along `along`, the width of it along `across`, by `w`. */
function holdBlade(handR: THREE.Object3D, blade: BladeFrame, along: THREE.Vector3, across: THREE.Vector3, w: number) {
  a.copy(blade.tip).normalize();
  b.copy(blade.wide).addScaledVector(a, -blade.wide.dot(a)).normalize();
  c.crossVectors(a, b);
  local.makeBasis(a, b, c);
  a.copy(along).normalize();
  b.copy(across).addScaledVector(a, -across.dot(a)).normalize();
  c.crossVectors(a, b);
  world.makeBasis(a, b, c);
  q0.setFromRotationMatrix(world).multiply(q1.setFromRotationMatrix(local).invert());
  handR.getWorldQuaternion(handQ);
  handR.parent!.getWorldQuaternion(parentQ).invert();
  handR.quaternion.copy(parentQ).multiply(q2.copy(handQ).slerp(q0, w));
}

/** Where its right hand is as its sword's drawn through its left (0..1: hilt to tip), and where its claws touch it. */
function heatHands(k: number, h: number, size: number, e: Enemy, rightAt: THREE.Vector3, clawsAt: THREE.Vector3, tipLong: number) {
  rightAt.copy(e.pos).addScaledVector(fw, heatForward(k) * h).addScaledVector(rt, heatRightShare(k) * h).setY(e.pos.y + HEAT_UP * h);
  clawsAt.copy(rightAt).addScaledVector(rt, -clawsShare(k) * tipLong).setY(rightAt.y + 0.03 * size);
}

function poseShow(root: THREE.Object3D, e: Enemy, blade: BladeFrame | null) {
  const v = HELLWARDEN.v;
  const h = v.height;
  const size = h / 6;
  const s = wardenBeats();
  const t = e.warden?.showT ?? 0;
  const armR = limbOf(root, 'upperarm_r', 'lowerarm_r');
  const armL = limbOf(root, 'upperarm_l', 'lowerarm_l');
  const neck = root.getObjectByName('neck_01');
  const head = root.getObjectByName('Head');
  const chest = root.getObjectByName('spine_02');
  const at = (forward: number, right: number, up: number) => hand.copy(e.pos).addScaledVector(fw, forward * h).addScaledVector(rt, right * h).setY(e.pos.y + up * h);
  const left = () => pole.copy(rt).multiplyScalar(-0.8).setY(-0.5);
  const right = () => pole.copy(rt).multiplyScalar(0.8).setY(-0.5);
  root.updateMatrixWorld(true);
  if (e.move === SHOW_UNDER || e.move === SHOW_RISE) {
    // Head down, arms hanging; lifting its head as it clears the lava.
    const k = (t - s.riseFrom) / Math.max(0.1, s.riseTo - s.riseFrom);
    const bow = 0.95 - 0.7 * smooth((k - 0.72) / 0.28);
    turnBone(chest, rt, -0.2 * (1 - smooth(k)));
    turnBone(neck, rt, -bow * 0.6);
    turnBone(head, rt, -bow * 0.4);
    root.updateMatrixWorld(true);
    if (armR) reach(armR, at(0.05, 0.2, 0.42), right(), FORE * size, false, 1);
    if (armL) reach(armL, at(0.05, -0.2, 0.42), left(), FORE * size, false, 1);
  } else if (e.move === SHOW_FORGE) {
    // Arms out, chest out, head back; each piece hitting home jolts it.
    const out = smooth(e.t / 0.5);
    let jolt = 0;
    for (let i = 0; i < CLAMPS; i++) jolt += pulse(t - s.clamps[i], 0.22);
    turnBone(chest, rt, 0.1 * out - 0.14 * jolt);
    turnBone(neck, rt, 0.12 * out + 0.1 * jolt);
    root.updateMatrixWorld(true);
    const lift = 0.42 + 0.26 * out;
    const wide = 0.2 + 0.2 * out;
    if (armR) reach(armR, at(0.05, wide, lift), right(), FORE * size, false, 1);
    if (armL) reach(armL, at(0.05, -wide, lift), left(), FORE * size, false, 1);
  } else if (e.move === SHOW_SWORD) {
    // Its right arm down and out, for its sword; its left still out.
    const k = smooth(e.t / 0.3);
    const jolt = pulse(t - s.swordAt, 0.2);
    turnBone(chest, rt, 0.1 * (1 - k) - 0.1 * jolt);
    root.updateMatrixWorld(true);
    if (armR) reach(armR, at(0.05 + 0.2 * k, 0.4 - 0.2 * k, 0.68 - 0.2 * k), right(), FORE * size, false, 1);
    if (armL) reach(armL, at(0.05, -0.4 + 0.06 * k, 0.68 - 0.1 * k), left(), FORE * size, false, 1);
  } else if ((e.move === SHOW_HEAT || e.move === SHOW_MASK) && blade) {
    // Its sword across it, drawn out through its left claws; it lets go of the pose as the skull comes.
    const w = e.move === SHOW_HEAT ? smooth(e.t / 0.12) : 1 - smooth(e.t / 0.3);
    const k = heatShare(t);
    const long = blade.tip.length() * root.scale.y;
    const rightAt = new THREE.Vector3();
    const claws = new THREE.Vector3();
    heatHands(k, h, size, e, rightAt, claws, long);
    if (armR) reach(armR, rightAt, right(), FORE * size, false, w);
    root.updateMatrixWorld(true);
    const handR = root.getObjectByName('hand_r');
    d.copy(rt).negate();
    if (handR && handR.parent) holdBlade(handR, blade, d, UP, w);
    root.updateMatrixWorld(true);
    // Its left wrist over its claws, a little back toward its shoulder; its fingers down onto the blade.
    const wrist = new THREE.Vector3().copy(claws).addScaledVector(UP, 0.42 * size).addScaledVector(fw, 0.2 * size).addScaledVector(rt, -0.42 * size);
    if (armL) reach(armL, wrist, left(), FORE * size, false, w);
    root.updateMatrixWorld(true);
    const handL = root.getObjectByName('hand_l');
    if (handL) aimY(handL, claws, w);
    if (e.move === SHOW_MASK) {
      // Its head going up to meet the skull; settling as it's on.
      const meet = smooth(e.t / 0.5) * (1 - smooth((t - s.skullAt + 0.1) / 0.2));
      turnBone(neck, rt, 0.34 * meet);
      turnBone(head, rt, 0.1 * meet - 0.22 * pulse(t - s.skullAt, 0.3));
    }
  } else if ((e.move === SHOW_CROUCH || e.move === SHOW_AIR || e.move === SHOW_SLAM) && blade) {
    // Its leap: its clip's pose, but its blade up and out over it, the flat of it to you, so it shows against the sky; down with the clip's slam.
    const w = e.move === SHOW_CROUCH ? smooth(e.t / v.showCrouch) : e.move === SHOW_AIR ? 1 : 1 - smooth(e.t / v.showFall);
    const handR = root.getObjectByName('hand_r');
    d.copy(UP).multiplyScalar(LEAP_BLADE_UP).addScaledVector(rt, -LEAP_BLADE_OUT).normalize();
    c.crossVectors(fw, d);
    if (handR && handR.parent) holdBlade(handR, blade, d.clone(), c.clone(), w);
    root.updateMatrixWorld(true);
  }
  root.updateMatrixWorld(true);
}

/** Turns `bone` so that its +y points at `target`, by `w`. */
function aimY(bone: THREE.Object3D, target: THREE.Vector3, w: number) {
  bone.getWorldPosition(a);
  bone.getWorldQuaternion(q0);
  c.copy(Y).applyQuaternion(q0);
  b.subVectors(target, a).normalize();
  q1.setFromUnitVectors(c, b);
  q0.premultiply(q1);
  bone.parent!.getWorldQuaternion(q2).invert();
  q1.copy(q2).multiply(q0);
  bone.quaternion.slerp(q1, w);
}

/** Poses it for now (its clip has just been applied; `root` scaled and placed). `blade`: its sword seen from its right hand. */
export function poseWarden(root: THREE.Object3D, e: Enemy, blade: BladeFrame | null) {
  fw.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
  rt.set(Math.cos(e.facing), 0, -Math.sin(e.facing));
  const held = unpose(root);
  if (e.phase === 'intro') {
    root.updateMatrixWorld(true);
    poseShow(root, e, blade);
    remember(held);
    return;
  }
  if (e.phase !== 'blast' || e.move !== VERDICT) return;
  const armR = limbOf(root, 'upperarm_r', 'lowerarm_r');
  const armL = limbOf(root, 'upperarm_l', 'lowerarm_l');
  const h = HELLWARDEN.v.height;
  const size = h / 6;
  const w = smooth(e.t / 0.35);
  const at = (forward: number, right: number, up: number) => hand.copy(e.pos).addScaledVector(fw, forward * h).addScaledVector(rt, right * h).setY(e.pos.y + up * h);
  root.updateMatrixWorld(true);
  if (armR) {
    at(0.06, 0.06, 1.12);
    pole.copy(rt).multiplyScalar(0.8).setY(-0.5);
    reach(armR, hand, pole, FORE * size, false, w);
  }
  if (armL) {
    at(0.06, -0.06, 1.12);
    pole.copy(rt).multiplyScalar(-0.8).setY(-0.5);
    reach(armL, hand, pole, FORE * size, false, w);
  }
  root.updateMatrixWorld(true);
  // Its blade up.
  const handR = root.getObjectByName('hand_r');
  if (!handR || !blade || !handR.parent) return;
  handR.getWorldQuaternion(handQ);
  d.copy(blade.tip).normalize().applyQuaternion(handQ);
  delta.setFromUnitVectors(d, UP).slerp(new THREE.Quaternion(), 1 - w);
  handR.parent.getWorldQuaternion(parentQ);
  handR.quaternion.copy(parentQ.invert()).multiply(delta).multiply(handQ);
  root.updateMatrixWorld(true);
  remember(held);
}
