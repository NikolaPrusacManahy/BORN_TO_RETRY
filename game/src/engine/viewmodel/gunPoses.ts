// Update 0.2.4 — the Pistol's poses (the designer: "hand holding it, we do not see left hand, … reload animation top
// notch"). Each pose says where the rear sight is (the
// arms camera's view: x right, y up, −z ahead, metres from the eye), where the gun points (its sights' line), its cant
// (a roll about that line, + tops it to the left) and the way the elbow bends out. It sits low right, turned in a
// little. (Update 0.2.6 — no aimed pose: right click whips it.) A one-handed reload: the gun cants over to show its grip, the magazine drops out, the
// hand dips out of sight for the new one (the magazine goes in there), comes back up canted, and from empty the thumb
// lets the slide go home; then it settles. A throw: drawn back by the ear, then flung.
import * as THREE from 'three';
import type { SwordPose } from './armsRig';

const rad = THREE.MathUtils.degToRad;

export interface GunPose {
  /** The rear sight (view space). */
  sight: THREE.Vector3;
  /** Where the sights point, far ahead (view space). */
  aim: THREE.Vector3;
  /** Cant (rad). */
  roll: number;
  elbow: THREE.Vector3;
}

const pose = (sight: [number, number, number], aim: [number, number, number], rollDeg: number, elbow: [number, number, number]): GunPose => ({
  sight: new THREE.Vector3(...sight),
  aim: new THREE.Vector3(...aim),
  roll: rad(rollDeg),
  elbow: new THREE.Vector3(...elbow).normalize(),
});

/** From the hip: low right, turned in a little so its left side shows, canted in. */
export const HIP = pose([0.11, -0.085, -0.3], [-1.1, 0.3, -4], 10, [1, -0.7, 0.2]);

/** A key of the reload or the throw: its time (share), the rear sight moved (m, view), the gun turned (degrees: muzzle
 *  up, muzzle left, cant). */
export interface Key {
  t: number;
  move: [number, number, number];
  up: number;
  left: number;
  roll: number;
}

const key = (t: number, move: [number, number, number], up: number, left: number, roll: number): Key => ({ t, move, up, left, roll });
const REST = (t: number) => key(t, [0, 0, 0], 0, 0, 0);
/** Canted over to the left, the grip turned to you: the magazine drops out here. */
const SHOW = (t: number) => key(t, [-0.045, 0.085, 0.035], 22, 6, 40);
/** Down out of sight (the new magazine goes in there). */
const DOWN = (t: number) => key(t, [0.06, -0.33, 0.1], -28, -6, 22);
/** Back up, canted, the slide's catch under the thumb. */
const UP = (t: number) => key(t, [-0.035, 0.02, 0.025], 6, 5, 26);

/** From a bullet still in (beats in sim/weapons/gun.ts: the magazine out at 0.16, in at 0.56). */
export const RELOAD: readonly Key[] = [REST(0), SHOW(0.13), SHOW(0.24), DOWN(0.4), DOWN(0.6), UP(0.76), key(0.88, [0.004, -0.004, 0], -1.5, 0, -2), REST(1)];
/** From empty: the same, and the thumb lets the slide go home at 0.8 (the gun jolts there). */
export const RELOAD_EMPTY: readonly Key[] = [REST(0), SHOW(0.13), SHOW(0.24), DOWN(0.4), DOWN(0.6), UP(0.74), UP(0.79), key(0.84, [0, 0.01, 0.012], 7, 0, 18), key(0.93, [0.004, -0.004, 0], -1.5, 0, -2), REST(1)];
/** Update 0.2.6 — right click (the designer: "a close range gun hit with it, like we are punching"): a pistol-whip, as
 *  shares of its swing (sim/weapons/gun.ts WHIP_TIME; it lands at WHIP_HIT, ~0.4): drawn back a little, then thrust
 *  out like a jab, turned on its side so its frame leads, held a moment, and back. */
export const WHIP: readonly Key[] = [REST(0), key(0.25, [0.015, -0.015, 0.015], 6, -3, -8), key(0.42, [-0.08, 0.02, -0.2], 4, 2, 60), key(0.6, [-0.07, 0.015, -0.18], 2, 2, 58), REST(1)];
/** A throw (its wind-up's share; then it's gone): drawn back up by the ear, then flung ahead. */
export const THROW: readonly Key[] = [REST(0), key(0.6, [0.15, 0.06, 0.1], 30, -25, -30), key(1, [0.02, 0.04, -0.1], -15, 5, 0)];

const smooth = (x: number) => x * x * (3 - 2 * x);

/** The keys at `k` (0 … 1) into `out`, eased between them. */
export function keyAt(keys: readonly Key[], k: number, out: Key): Key {
  let i = 0;
  while (i < keys.length - 2 && k > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const s = smooth(Math.max(0, Math.min(1, (k - a.t) / Math.max(1e-6, b.t - a.t))));
  for (let j = 0; j < 3; j++) out.move[j] = a.move[j] + (b.move[j] - a.move[j]) * s;
  out.up = a.up + (b.up - a.up) * s;
  out.left = a.left + (b.left - a.left) * s;
  out.roll = a.roll + (b.roll - a.roll) * s;
  return out;
}

export const blankKey = (): Key => key(0, [0, 0, 0], 0, 0, 0);

const VIEW_UP = new THREE.Vector3(0, 1, 0);
const u = new THREE.Vector3();
const s = new THREE.Vector3();
const side = new THREE.Vector3();
const turn = new THREE.Quaternion();

/** The gun's frame for the arm (a `SwordPose`: its grip, +y up the grip as `blade`, +x across it ahead as `edge`, the
 *  tilt in the fist so the knuckles point along the sights): the rear sight at `sight`, the sights along `along`,
 *  canted `roll`, then turned up by `kick` about its grip (a shot's recoil) and pushed back `back` m. `rear`: the rear
 *  sight in the gun's own metres, `slope`: its sights' line from its +x (rad), `scale`: its size. */
export function gunFrame(sight: THREE.Vector3, along: THREE.Vector3, roll: number, kick: number, back: number, rear: THREE.Vector3, slope: number, scale: number, elbow: THREE.Vector3, out: SwordPose): SwordPose {
  s.copy(along).normalize();
  u.copy(VIEW_UP).addScaledVector(s, -VIEW_UP.dot(s)).normalize();
  // + cants the top to the left: about the line pointing ahead, a turn the other way round.
  u.applyQuaternion(turn.setFromAxisAngle(s, -roll));
  const c = Math.cos(slope);
  const n = Math.sin(slope);
  out.edge.copy(s).multiplyScalar(c).addScaledVector(u, -n);
  out.blade.copy(s).multiplyScalar(n).addScaledVector(u, c);
  side.crossVectors(out.edge, out.blade);
  out.grip.copy(sight).addScaledVector(out.edge, -rear.x * scale).addScaledVector(out.blade, -rear.y * scale).addScaledVector(side, -rear.z * scale);
  // The recoil: the muzzle up about the grip (the wrist), the whole gun back towards you.
  if (kick !== 0) {
    turn.setFromAxisAngle(side, kick);
    out.edge.applyQuaternion(turn);
    out.blade.applyQuaternion(turn);
  }
  out.grip.addScaledVector(s, -back);
  out.tilt = slope;
  out.elbow.copy(elbow);
  return out;
}
