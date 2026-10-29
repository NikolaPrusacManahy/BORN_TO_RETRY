// Update 0.1.9 — the Dual Daggers' throwing stance (the designer: like the Trickster's, "the player's hands shift to a
// position to grab the tip of the daggers, like it flipped the dagger upside down to be able to logically throw them").
// A weapon with a `tip` (weaponMoves.ts) turns end over end in the fist by `flip` (0 … 1), the fist sliding from its
// handle to the blade near the point, so the handle stands out of the top of the fist; the fingers ease open as it
// turns and close tight on the blade. Then (the designer: "tilt the model back like 45° toward the player screen", ready
// to be thrown) it leans back towards you in the fist by Dagger lean back, the hand's pose unchanged. And (the designer:
// "flip the model 180° when in aiming mode, so the dagger faces the right way") it turns half about its own length as
// it goes over, so its edge still faces the knuckles, as it does held by the handle.
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import type { ArmsRig } from './armsRig';
import type { Side } from './guard';
import type { MoveSet } from './weaponMoves';

/** How thick the blade is where the fist closes on it near the point (radius, m, as held): the fingers wrap that. */
const BLADE_GRIP = 0.012;
/** How far the fingers open half-way through the turn (0 … 1). */
const TURN_OPEN = 0.5;

const at = new THREE.Vector3();
const turn = new THREE.Matrix4();
const twist = new THREE.Matrix4();
const shift = new THREE.Matrix4();
const smooth = (x: number) => x * x * (3 - 2 * x);

/** The held weapon's matrix under the hand's bone (`ArmsRig.holdMatrix`), turned over into the tip grip by `flip`. */
export function holdWeapon(rig: ArmsRig, moves: MoveSet, tilt: number, flip: number, into: THREE.Matrix4, side: Side = 'R'): THREE.Matrix4 {
  const scale = ARMS.v.weaponScale * moves.scale();
  if (!moves.tip || flip <= 0) return rig.holdMatrix(tilt, scale, moves.slide(), into, side);
  // The point of the weapon in the fist moves from its handle to the tip as it turns end over end.
  const k = smooth(Math.min(1, flip));
  // (Leaning back is leaning away from the knuckles: a tilt the other way about the grip.)
  rig.holdMatrix(tilt - THREE.MathUtils.degToRad(ARMS.v.daggerLean) * k, scale, 0, into, side);
  at.set(0, moves.slide() / scale, 0).lerp(moves.tip, k);
  // (About the flat of its blade, the point going ahead first: half-way, each points ahead and back, never across to the
  // other hand, as turning about its edge would.)
  turn.makeRotationZ(-Math.PI * k);
  // (Half about its length, the left's the mirror of the right's: end over end alone would leave its edge facing back.)
  twist.makeRotationY((side === 'L' ? -1 : 1) * Math.PI * k);
  shift.makeTranslation(-at.x, -at.y, -at.z);
  return into.multiply(turn).multiply(twist).multiply(shift);
}

/** How thick the fingers close round it: its handle, or the blade near the point. */
export function wrapOf(moves: MoveSet, flip: number): number {
  return moves.tip ? moves.grip() + (BLADE_GRIP - moves.grip()) * smooth(Math.min(1, flip)) : moves.grip();
}

/** How far the fingers open as it turns over. */
export const turnOpen = (moves: MoveSet, flip: number) => (moves.tip && flip > 0 && flip < 1 ? TURN_OPEN * Math.sin(Math.PI * flip) : 0);
