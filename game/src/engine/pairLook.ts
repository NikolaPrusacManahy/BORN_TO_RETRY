// Update 0.1.9 — the Dual Daggers lie as a pair (on the floor, in flight, on a shop's tile): two of the one dagger
// crossed at their grips, the way a pair hangs on a wall.
import * as THREE from 'three';

/** How far apart the two lean (rad), and how far apart they lie (m) so they don't cut through each other. */
const SPREAD = 0.55;
const APART = 0.02;

/** Two copies of `one` (its blade along +y, flat across x) crossed in the blade's plane. */
export function crossedPair(one: THREE.Object3D): THREE.Group {
  const pair = new THREE.Group();
  for (const side of [-1, 1]) {
    const c = one.clone();
    c.rotation.z += (side * SPREAD) / 2;
    c.position.z += side * APART;
    pair.add(c);
  }
  return pair;
}
