// Update 0.2.15 — the Scars felt. Update 0.2.16 — the Fate Cards' (foeFeedback.ts passes their events here): a crimson
// ring at your feet and a jolt as you take one; sparks and a shake for Shoulder Charge and Bowling's shove, dust for
// Pogo's bounce, sparks for Iron Knuckles and Ricochet, a crimson ring for Bloodbath's blast, a jolt as Killing Spree or
// Giant Killer comes on.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const CRIMSON = 0xff2a3a;
const feet = new THREE.Vector3();

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function cardFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'cardTaken':
      f.waves.spawn(feet.set(at.x, at.y - 1, at.z), 3, CRIMSON);
      f.rig.shake.add(0.25);
      return true;
    case 'cardBump':
      f.sparks.spawn(at, back, 14, 0.9);
      f.rig.shake.add(0.25 * near(4));
      return true;
    case 'cardPogo':
      f.chunks.spawn(at, UP, 10, 0.8);
      return true;
    case 'cardBlast':
      f.waves.spawn(at, value, CRIMSON);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.4 * near(value + 4));
      return true;
    case 'cardStall':
    case 'cardRicochet':
      f.sparks.spawn(at, back, 10, 0.7);
      return true;
    case 'cardSpree':
    case 'cardGiant':
      f.rig.shake.add(0.3);
      return true;
    default:
      return false;
  }
}
