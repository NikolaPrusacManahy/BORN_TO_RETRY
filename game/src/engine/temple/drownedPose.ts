// Update 0.3.58 — the Drowned King posed for the bible's moves, over its clips (the way boss/kingPose.ts and norse/rocPose.ts do): its
// shoulders hunched and claws up for its Frenzy Combo, each claw across in turn, the third held high (the wait) before it falls; leaning
// back for its Riptide, then its tail whipped; its arms thrown wide and back through its Maw of Many, its chest open; slumped, jammed.
// Two-bone reaches for its arms, and its whole body tilted about its feet. Pure maths on the skeleton.
import * as THREE from 'three';
import type { Enemy } from '../../sim/enemies/enemy';
import { clawAt } from '../../sim/enemies/drownedJaws';
import { DIVE, FRENZY, JAWS, MAW, RIPTIDE } from '../../sim/enemies/drownedKingMoves';
import { drownedWindup } from '../../sim/enemies/drownedKing';
import { SHOW_DOWN, SHOW_LAND, SHOW_UP } from '../../sim/dungeon/drownedShow';
import { DROWNED } from '../../tuning/drowned';
import { type Limb, reach } from '../boss/kingPose';

/** Its forearm's length to its fingertips, its height in the model's measure. */
const MODEL_TALL = 3.63;
const FORE = 0.82;
/** How far it tilts: hunched forward, leaned back (rad). */
const HUNCH = 0.26;
const BACK = 0.34;
const JAM = 0.2;
/** A claw swings across over this long (s). */
const SWING = 0.22;

export interface DrownedBones {
  armR: Limb;
  armL: Limb;
}

export function drownedBonesOf(root: THREE.Object3D): DrownedBones | null {
  const limb = (a: string, b: string): Limb | null => {
    const upper = root.getObjectByName(a);
    const lower = root.getObjectByName(b);
    return upper && lower ? { upper, lower } : null;
  };
  const armR = limb('UpperArmR', 'LowerArmR');
  const armL = limb('UpperArmL', 'LowerArmL');
  return armR && armL ? { armR, armL } : null;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const handR = new THREE.Vector3();
const handL = new THREE.Vector3();
const pole = new THREE.Vector3();
const tiltAt = new THREE.Vector3();

/** Poses it for now (its clip has just been applied; `root` scaled and placed). */
export function poseDrowned(root: THREE.Object3D, bones: DrownedBones, e: Enemy) {
  const v = DROWNED.v;
  const h = v.kingHeight;
  const scale = h / MODEL_TALL;
  fw.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
  rt.set(Math.cos(e.facing), 0, -Math.sin(e.facing));
  const at = (out: THREE.Vector3, forward: number, right: number, up: number) => out.copy(e.pos).addScaledVector(fw, forward * h).addScaledVector(rt, right * h).setY(e.pos.y + up * h);
  let rw = 0;
  let lw = 0;
  let tilt = 0;
  const tell = drownedWindup(e.move, e.stage);
  const k = e.t / Math.max(0.1, tell);
  switch (e.phase) {
    case 'windup':
      if (e.move === FRENZY) {
        // Its shoulders up, its claws out, its body over you.
        rw = lw = smooth(k * 2);
        tilt = HUNCH * rw;
        at(handR, 0.22, 0.34, 0.56);
        at(handL, 0.22, -0.34, 0.56);
      } else if (e.move === RIPTIDE) {
        // It leans back, its arms going with it.
        rw = lw = smooth(k * 1.6);
        tilt = -BACK * rw;
        at(handR, -0.04, 0.42, 0.5);
        at(handL, -0.04, -0.42, 0.5);
      } else if (e.move === JAWS) {
        // Its arms out of its heads' way.
        rw = lw = smooth(k * 2) * 0.7;
        at(handR, 0.02, 0.44, 0.34);
        at(handL, 0.02, -0.44, 0.34);
      } else if (e.move === DIVE) {
        // (Its clip sinks it.)
      }
      break;
    case 'dive':
      if (e.move === FRENZY) {
        // Right, left, then both from high: and that one waits.
        tilt = HUNCH;
        const after = (n: number) => e.t - clawAt(e, n);
        if (e.shots <= 1) {
          const a = smooth(after(0) / SWING);
          rw = lw = 1;
          at(handR, 0.14 + 0.2 * a, 0.34 - 0.5 * a, 0.5 - 0.24 * a);
          at(handL, 0.22, -0.34, 0.56);
        } else if (e.shots === 2) {
          const a = smooth(after(1) / SWING);
          const up = smooth((after(1) - SWING) / 0.3);
          rw = lw = 1;
          tilt = HUNCH * (1 - up * 1.4);
          // Its left comes across, then both go up, and hold.
          at(handL, 0.3 - 0.26 * up, -0.34 + 0.5 * a * (1 - up) - 0.04 * up, 0.28 + 0.48 * up);
          at(handR, 0.14 - 0.1 * up, 0.3 * up - 0.16 * (1 - up), 0.3 + 0.46 * up);
        } else {
          // It falls.
          const a = smooth(after(2) / (SWING * 0.8));
          rw = lw = 1 - smooth((after(2) - SWING) / 0.2);
          tilt = HUNCH * (-0.4 + 1.7 * a);
          at(handR, 0.04 + 0.34 * a, 0.3 - 0.14 * a, 0.76 - 0.6 * a);
          at(handL, 0.04 + 0.34 * a, -0.3 + 0.14 * a, 0.76 - 0.6 * a);
        }
      }
      break;
    case 'blast':
      if (e.move === MAW) {
        // Thrown wide and back, its chest open to you.
        rw = lw = smooth(e.t / 0.4);
        tilt = -JAM * rw;
        at(handR, -0.1, 0.46, 0.52);
        at(handL, -0.1, -0.46, 0.52);
      } else if (e.move === RIPTIDE) {
        // Its whip's done: forward, arms down.
        rw = lw = 1 - smooth(e.t / 0.6);
        tilt = BACK * 0.5 * Math.sin(Math.min(1, e.t / 0.5) * Math.PI);
        at(handR, 0.1, 0.4, 0.3);
        at(handL, 0.1, -0.4, 0.3);
      }
      break;
    case 'intro':
      // (Update 0.3.59 — its show: arms flung wide over everything, up as it comes down, then down, claws out at you.)
      if (e.move === SHOW_UP) {
        rw = lw = smooth(e.t / 0.3);
        at(handR, 0.08, 0.46, 0.52);
        at(handL, 0.08, -0.46, 0.52);
      } else if (e.move === SHOW_DOWN) {
        rw = lw = 1;
        at(handR, 0.02, 0.36, 0.7);
        at(handL, 0.02, -0.36, 0.7);
      } else if (e.move === SHOW_LAND) {
        rw = lw = smooth(e.t / 0.3);
        tilt = HUNCH * rw;
        at(handR, 0.22, 0.34, 0.5);
        at(handL, 0.22, -0.34, 0.5);
      }
      break;
    case 'stun':
      if (e.move === MAW) {
        // Jammed: its arms hanging, head back, its maw stuck open.
        rw = lw = 1;
        tilt = -JAM;
        at(handR, 0.08, 0.34, 0.12);
        at(handL, 0.08, -0.34, 0.12);
      } else if (e.move === FRENZY) {
        rw = lw = 1 - smooth((e.t - 0.3) / 0.5);
        tilt = -JAM * Math.sin(Math.min(1, e.t / 0.5) * Math.PI);
        at(handR, -0.02, 0.44, 0.6);
        at(handL, -0.02, -0.44, 0.6);
      }
      break;
    default:
      break;
  }
  if (tilt !== 0) {
    // (About its feet, sideways through it.)
    tiltAt.copy(rt);
    root.rotateOnWorldAxis(tiltAt, -tilt);
  }
  root.updateMatrixWorld(true);
  const fore = FORE * scale;
  if (rw > 0) {
    pole.copy(rt).multiplyScalar(0.8).setY(-0.6);
    reach(bones.armR, handR, pole, fore, false, rw);
  }
  if (lw > 0) {
    pole.copy(rt).multiplyScalar(-0.8).setY(-0.6);
    reach(bones.armL, handL, pole, fore, false, lw);
  }
  root.updateMatrixWorld(true);
}
