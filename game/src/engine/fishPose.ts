// Update 0.2.11 — floor 6's fish posed in code (the designer's fish have only their swim clip): nose up or down as they
// climb or dive, a wriggle as they wind up, thrashing in the Shark's death roll, keeled over stunned, belly up as they
// die.
// Update 0.3.33 — and floor 8's Kunoichi on a wall (shrine/shrinePose.ts).
import type * as THREE from 'three';
import { shrinePose } from './shrine/shrinePose';
import type { Enemy } from '../sim/enemies/enemy';
import { SWIMS } from '../sim/enemies/kinds6';

/** The steepest it tips (rad); how fast its tip follows its climb (1/s); dead, it turns belly up over this long (s). */
const MAX_PITCH = 0.7;
const FOLLOW = 6;
const BELLY_UP = 0.8;

/** Turns `root` (already facing its way) for fish `e`; `dt`: the frame's game time. */
export function fishPose(root: THREE.Object3D, e: Enemy, dt: number) {
  if (shrinePose(root, e) || !SWIMS.has(e.kind)) return;
  const dy = e.pos.y - e.prev.y;
  const flat = Math.hypot(e.pos.x - e.prev.x, e.pos.z - e.prev.z);
  const want = e.phase === 'dead' || flat + Math.abs(dy) < 1e-5 ? 0 : Math.max(-MAX_PITCH, Math.min(MAX_PITCH, Math.atan2(dy, flat)));
  const pitch = (root.userData.pitch ?? 0) + (want - (root.userData.pitch ?? 0)) * Math.min(1, FOLLOW * dt);
  root.userData.pitch = pitch;
  let roll = 0;
  if (e.phase === 'dead') roll = Math.PI * Math.min(1, e.t / BELLY_UP);
  else if (e.phase === 'windup') roll = Math.sin(e.t * 30) * 0.12;
  else if (e.phase === 'grab') roll = Math.sin(e.t * 18) * 0.6;
  else if (e.phase === 'stun') roll = 0.5;
  // (Its own heading first, then its nose up (its front is +z), then its roll.)
  root.rotation.order = 'YXZ';
  root.rotation.x = -pitch;
  root.rotation.z = roll;
}
