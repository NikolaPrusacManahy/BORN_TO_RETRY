// Update 0.3.33 — floor 8's Kunoichi on a wall (sim/enemies/kunoichi.ts): her feet on it, her body across it, up its
// face as she runs along it (the wall run clip's legs going), rolled back upright as she leaps off.
import type * as THREE from 'three';
import type { Enemy } from '../../sim/enemies/enemy';
import { WALLRUN_L, WALLRUN_R } from '../../sim/enemies/shrineShared';

/** She runs this high up the wall (m), her feet this far in to its face (m), her body this far across from upright
 *  (rad); she gets there over this long (s). */
const UP = 1.3;
const IN = 0.5;
const ROLL = 1.25;
const ONTO = 0.15;

/** Poses `root` (already facing her way) for a Kunoichi on a wall; false: not on one (left as it is). */
export function shrinePose(root: THREE.Object3D, e: Enemy): boolean {
  if (e.kind !== 'kunoichi' || e.phase !== 'charge' || (e.move !== WALLRUN_L && e.move !== WALLRUN_R)) return false;
  const k = Math.min(1, e.t / ONTO);
  // (The wall's way: back along its normal, `from`; on her right she rolls her top to her left, and so on.)
  root.position.x -= e.from.x * IN * k;
  root.position.z -= e.from.z * IN * k;
  root.position.y += UP * k;
  root.rotation.order = 'YXZ';
  root.rotation.z = (e.move === WALLRUN_R ? -ROLL : ROLL) * k;
  return true;
}
