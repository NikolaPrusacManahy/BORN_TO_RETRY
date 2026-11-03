// Update 0.3.33 — floor 8's martial artists, felt (out of combatFeedback.ts's chain, as depthsFeedback.ts is): sparks off
// a block or a blade, a jolt when a blow lands on you (harder for a kick, a counter, a cut), a leap's landing and the
// Sensei's slam shaking the view nearby, a smoke bomb's burst.
import type * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import { FEEDBACK } from '../../tuning/combat';
import type { FeedbackParts } from '../combatFeedback';
import { Vector3 } from 'three';

const UP = new Vector3(0, 1, 0);

/** False for events it doesn't know. */
export function shrineFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, near: (far: number) => number): boolean {
  const fb = FEEDBACK.v;
  switch (kind) {
    case 'martialBlock':
    case 'senseiGuard':
      f.sparks.spawn(at, UP, 14, 0.9);
      return true;
    case 'martialHit':
      f.rig.shake.add(fb.shakeJab * 1.2);
      return true;
    case 'karateCounter':
    case 'senseiCounter':
      f.rig.shake.add(fb.shakeHeavy * 0.6 * near(6));
      return true;
    case 'dashCut':
    case 'shadowCut':
    case 'katanaCut':
      f.sparks.spawn(at, UP, 8, 0.7);
      return true;
    case 'ninjaLand':
      f.chunks.spawn(at, UP, 8, 0.8);
      f.rig.shake.add(fb.shakeHeavy * 0.7 * near(10));
      return true;
    case 'staffSlam':
      f.chunks.spawn(at, UP, 14, 1.2);
      f.rig.shake.add(fb.shakeHeavy * 1.3 * near(16));
      return true;
    case 'smokeBurst':
      f.rig.shake.add(fb.shakeJab * 0.5 * near(10));
      return true;
    case 'kiPalm':
      f.rig.shake.add(fb.shakeJab * near(12));
      return true;
    default:
      void value;
      return false;
  }
}
