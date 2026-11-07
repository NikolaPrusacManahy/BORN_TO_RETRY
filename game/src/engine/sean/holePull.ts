// Update 0.3.89 — a body Gravity Sean's Black Hole has hold of (enemiesView.ts): it's drawn out and leans in towards it, more the nearer it's come, and whirls round. So you can see at a glance who it's got, and it's only how it
// looks: the rules still have it where it was.
import * as THREE from 'three';
import type { Hole } from '../../sim/combat/gravityMeter';
import type { Enemy } from '../../sim/enemies/enemy';

/** How far it leans, from out at its reach to right in close (rad); how much it's drawn out and thinned, at the most; how fast it whirls (per second), out there and in close. */
const LEAN_FROM = 0.4;
const LEAN_TO = 1.05;
const STRETCH = 0.5;
const THIN = 0.2;
const WHIRL_FROM = 0.8;
const WHIRL_TO = 4.5;

const axis = new THREE.Vector3();
const lean = new THREE.Quaternion();
const whirl = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** How hard it's being drawn in (0 … 1), by how near it's come. */
export function pullOn(e: Enemy, h: Hole): number {
  return 1 - Math.min(1, Math.hypot(e.pos.x - h.x, e.pos.z - h.z) / Math.max(0.01, h.reach));
}

/** Onto its model, already placed and turned as usual: `scale`, its usual size. */
export function pullPose(root: THREE.Object3D, e: Enemy, h: Hole, scale: number) {
  const k = pullOn(e, h);
  const dx = h.x - e.pos.x;
  const dz = h.z - e.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  whirl.setFromAxisAngle(UP, h.t * (WHIRL_FROM + (WHIRL_TO - WHIRL_FROM) * k));
  // Its head tips towards the hole.
  axis.set(dz / d, 0, -dx / d);
  lean.setFromAxisAngle(axis, LEAN_FROM + (LEAN_TO - LEAN_FROM) * k);
  root.quaternion.premultiply(whirl).premultiply(lean);
  const open = 0.3 + 0.7 * k;
  root.scale.set(scale * (1 - THIN * open), scale * (1 + STRETCH * open), scale * (1 - THIN * open));
}
