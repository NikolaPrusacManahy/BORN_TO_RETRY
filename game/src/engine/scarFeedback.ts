// Update 0.2.15 — the Scars felt (foeFeedback.ts passes their events here): sparks as one comes out of a chest, dust as
// it lands, sparks as the rest fade, a crimson ring at your feet and a jolt as you take one; sparks and a shake for Shoulder Charge and
// Bowling's shove, dust for Pogo's bounce, sparks for Iron Knuckles and Ricochet, a crimson ring for Bloodbath's blast.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const CRIMSON = 0xff2a3a;
const feet = new THREE.Vector3();

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function scarFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'scarOffer':
      f.sparks.spawn(at, UP, 16, 0.8);
      return true;
    case 'scarLand':
      f.chunks.spawn(at, UP, 6, 0.5);
      f.sparks.spawn(at, UP, 8, 0.5);
      return true;
    case 'scar':
      f.waves.spawn(feet.set(at.x, at.y - 1, at.z), 3, CRIMSON);
      f.rig.shake.add(0.25);
      return true;
    case 'scarGone':
      f.sparks.spawn(at, UP, 8, 0.5);
      return true;
    case 'scarBump':
      f.sparks.spawn(at, back, 14, 0.9);
      f.rig.shake.add(0.25 * near(4));
      return true;
    case 'scarPogo':
      f.chunks.spawn(at, UP, 10, 0.8);
      return true;
    case 'scarBlast':
      f.waves.spawn(at, value, CRIMSON);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.4 * near(value + 4));
      return true;
    case 'scarStall':
    case 'scarRicochet':
      f.sparks.spawn(at, back, 10, 0.7);
      return true;
    default:
      return false;
  }
}
