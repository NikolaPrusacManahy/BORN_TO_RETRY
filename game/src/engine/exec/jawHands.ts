// Update 0.3.16 — your hands in the Big Shark's jaws (sim/combat/jaws.ts; the designer: "the hands will hold the jaws and
// prevent it to close on the player -> left hand up -> right hand hold the bottom Jaw, as you have to press left click
// fast to then hit the sharks throat"): your left palm up against its upper jaw, your right palm down on its lower jaw,
// both shaking with the strain; its lower jaw forced open a little more with each click and closing as its time runs
// out; then your right fist into its throat as you break free. Posed by the executions' hands (hands.ts, worked out;
// viewmodel/heldGrip.ts, posed).
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { BIG_SHARK } from '../../tuning/bigShark';
import type { Viewmodel } from '../viewmodel/viewmodel';
import { boneOf } from './bones';
import type { HandAt, HandKey } from './handMoves';
import { Drawn, HandFrame, handsAt } from './hands';

/** Its jaws apart (your right, up, ahead of your feet: m): your left palm pushing its upper jaw up and away, your right
 *  fist gripping its lower jaw's edge, holding it down. */
const UPPER: HandAt = { mode: 'palm', me: [-0.22, 1.7, 0.66], way: [0.15, 0.55, 1], shake: 0.006 };
const LOWER: HandAt = { mode: 'fist', me: [0.16, 1.42, 0.72], way: [-0.05, -0.45, 1], shake: 0.006 };
/** Your right fist drawn back, then in its throat. */
const COCK: HandAt = { mode: 'fist', me: [0.24, 1.38, 0.28], way: [-0.15, 0.1, 1] };
const THROAT: HandAt = { mode: 'fist', me: [0.04, 1.52, 1.15], way: [0, 0.05, 1] };
const G: HandAt = { mode: 'guard' };

const HOLD: HandKey[] = [
  { t: 0, L: UPPER, R: LOWER },
  { t: 1e9, L: UPPER, R: LOWER },
];
const PUNCH: HandKey[] = [
  { t: 0, L: UPPER, R: COCK },
  { t: 0.12, L: UPPER, R: THROAT },
  { t: 0.22, L: UPPER, R: THROAT },
  { t: 0.35, L: G, R: G },
];

/** How far its lower jaw is forced open (rad): at least, as your clicks force it, and as its time closes it. */
const SHUT = 0.12;
const PRIED = 0.55;
const CLOSING = 0.35;

const frame: HandFrame = { yaw: 0, origin: new THREE.Vector3(), middle: new THREE.Vector3() };
const none: Drawn = { root: null, tip: new THREE.Vector3(), line: new THREE.Vector3(0, 0, -1) };

/** Each frame, after the executions' hands: while its jaws have you, your hands on them (or in its throat), its jaw
 *  forced open. `rootOf`: the body drawn for an enemy slot. */
export function followJaws(state: CombatState, arms: Viewmodel, camera: THREE.PerspectiveCamera, yaw: number, feet: THREE.Vector3, rootOf: (i: number) => THREE.Object3D | null) {
  const g = state.grab;
  const k = g.on ? state.enemies[g.slot] : null;
  if (!k || k.kind !== 'bigShark') return;
  frame.yaw = yaw;
  frame.origin.copy(feet);
  frame.middle.copy(k.pos);
  const punching = g.fly >= 0;
  if (!handsAt(punching ? PUNCH : HOLD, punching ? g.fly : g.t, frame, true, none, camera, arms.grip.hand)) return;
  arms.grip.weight = 1;
  arms.grip.world = camera;
  // Its lower jaw, forced open.
  const jaw = rootOf(g.slot) ? boneOf(rootOf(g.slot)!, 'LowerJaw') : null;
  if (!jaw) return;
  const v = BIG_SHARK.v;
  const forced = Math.min(1, g.hits / Math.max(1, Math.round(v.holdHits)));
  const closing = Math.min(1, g.t / Math.max(0.1, v.holdTime));
  jaw.rotateX(-(SHUT + PRIED * forced + CLOSING * (1 - closing)));
}
