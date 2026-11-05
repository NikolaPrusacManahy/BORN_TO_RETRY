// Update 0.3.56 — the Frost Roc posed for the bible's moves, over its clips: its knee lifted to stomp, its wings spread at head height
// and brought together, the pillar on its shoulder and across its front, its wings straight up on the cliff through Mountain Fall.
// Two-bone reaches (boss/kingPose.ts). The bones' +y runs along them. L on its left. Pure maths on the skeleton.
import * as THREE from 'three';
import type { Enemy } from '../../sim/enemies/enemy';
import { BREATH, CLAP, FALL, FAULT, HIGH_AT, HURL, LOW_AT, ROAR, STOMP, SWING, swingAngle } from '../../sim/enemies/rocMoves';
import { rocWindup } from '../../sim/enemies/frostRoc';
import { FROST_ROC } from '../../tuning/frostRoc';
import { type Limb, reach } from '../boss/kingPose';

/** Its height, its forearm's length to its wingtip and its shin's, in the model's own measure. */
const MODEL_TALL = 3.12;
const WING = 0.92;
const SHIN = 0.5;
/** A clap's meeting lasts this long (s); a fault's and a hurl's follow-through. */
const FOLLOW = 0.28;

export interface RocBones {
  armR: Limb;
  armL: Limb;
  legR: Limb;
  legL: Limb;
}

export function rocBonesOf(root: THREE.Object3D): RocBones | null {
  const limb = (a: string, b: string): Limb | null => {
    const upper = root.getObjectByName(a);
    const lower = root.getObjectByName(b);
    return upper && lower ? { upper, lower } : null;
  };
  const armR = limb('UpperArmR', 'LowerArmR');
  const armL = limb('UpperArmL', 'LowerArmL');
  const legR = limb('UpperLegR', 'LowerLegR');
  const legL = limb('UpperLegL', 'LowerLegL');
  return armR && armL && legR && legL ? { armR, armL, legR, legL } : null;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const handR = new THREE.Vector3();
const handL = new THREE.Vector3();
const foot = new THREE.Vector3();
const pole = new THREE.Vector3();

/** Poses it for now (its clip has just been applied; `root` scaled and placed). */
export function poseRoc(root: THREE.Object3D, bones: RocBones, e: Enemy) {
  const v = FROST_ROC.v;
  const h = v.rocHeight;
  const scale = h / MODEL_TALL;
  fw.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
  rt.set(Math.cos(e.facing), 0, -Math.sin(e.facing));
  const at = (out: THREE.Vector3, forward: number, right: number, up: number) => out.copy(e.pos).addScaledVector(fw, forward * h).addScaledVector(rt, right * h).setY(e.pos.y + up * h);
  let rw = 0;
  let lw = 0;
  let knee = 0;
  const tell = rocWindup(e.move, e.stage);
  const k = e.t / Math.max(0.1, tell);
  // Its pillar, once it has one: over its shoulder.
  if (e.deeds > 0) {
    rw = 1;
    at(handR, 0.14, 0.34, 0.5);
  }
  switch (e.phase) {
    case 'windup':
      if (e.move === STOMP) {
        // Its knee high, the ground trembling.
        knee = smooth(k * 2);
      } else if (e.move === CLAP) {
        // Its wings spread wide at head height.
        rw = lw = smooth(k * 2.5);
        at(handR, 0.05, 0.62, 0.68);
        at(handL, 0.05, -0.62, 0.68);
      } else if (e.move === HURL) {
        // Its talons into the ground: it'll come up with a block.
        rw = smooth(k * 2.5);
        at(handR, 0.36, 0.2, 0.02);
      } else if (e.move === FAULT) {
        // Its wing drawn high to punch.
        rw = smooth(k * 2.5);
        at(handR, 0.12, 0.24, 1);
      } else if (e.move === ROAR) {
        rw = lw = smooth(k * 2);
        at(handR, 0.05, 0.5, 0.82);
        at(handL, 0.05, -0.5, 0.82);
      } else if (e.move === BREATH) {
        // (Its clips rear it.)
      }
      break;
    case 'recover':
      if (e.move === CLAP && e.t < FOLLOW) {
        // They meet.
        rw = lw = 1 - smooth((e.t - FOLLOW * 0.5) / (FOLLOW * 0.5));
        at(handR, 0.42, 0.02, 0.62);
        at(handL, 0.42, -0.02, 0.62);
      } else if (e.move === FAULT && e.t < FOLLOW * 2) {
        rw = 1 - smooth((e.t - FOLLOW) / FOLLOW);
        at(handR, 0.36, 0.16, 0);
      }
      break;
    case 'dive': {
      // Its pillar drawn back, then across: hands at the grip.
      const r = e.roc;
      if (e.move !== SWING || !r) break;
      const long = v.swingTell / (e.stage > 0 ? v.ragePace : 1);
      const a = e.facing + swingAngle(r.swingSide, e.t < long ? 0 : Math.min(1, (e.t - long) / v.swingFor));
      const y = r.swingLow ? LOW_AT : HIGH_AT;
      handR.set(e.pos.x - Math.sin(a) * 0.32 * h, e.pos.y + y, e.pos.z - Math.cos(a) * 0.32 * h);
      handL.copy(handR).addScaledVector(rt, -0.08 * h);
      rw = lw = 1;
      break;
    }
    case 'blast':
      // Up on the cliff.
      if (e.move === FALL) {
        rw = lw = smooth(e.t / 0.4);
        at(handR, 0.03, 0.26, 1.04);
        at(handL, 0.03, -0.26, 1.04);
      }
      break;
    default:
      break;
  }
  root.updateMatrixWorld(true);
  const wing = WING * scale;
  if (rw > 0) {
    pole.copy(rt).multiplyScalar(0.8).setY(-0.6);
    reach(bones.armR, handR, pole, wing, false, rw);
  }
  if (lw > 0) {
    pole.copy(rt).multiplyScalar(-0.8).setY(-0.6);
    reach(bones.armL, handL, pole, wing, false, lw);
  }
  if (knee > 0) {
    // Its right foot up, its knee out in front.
    at(foot, 0.1, 0.11, 0.3);
    reach(bones.legR, foot, fw, SHIN * scale, false, knee);
  }
  root.updateMatrixWorld(true);
}
