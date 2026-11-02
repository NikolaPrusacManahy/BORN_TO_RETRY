// Update 0.3.14 — what floors 6–8's world sets off, seen and felt (out of combatFeedback.ts, which had reached its size):
// floor 7's icicle shattering (shards, a jolt near it); floor 8's press slamming down (grit off its plate, a jolt the
// bigger the press); floor 6's powder keg's blast (fire and debris, a hard jolt the nearer); a body sinking into a pit
// (spray).
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { FEEDBACK } from '../tuning/combat';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);

/** False: not one of these. */
export function depthsFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, near: (far: number) => number): boolean {
  const fb = FEEDBACK.v;
  switch (kind) {
    case 'icicleShatter':
      f.sparks.spawn(at, UP, 26, 1.2);
      f.rig.shake.add(fb.shakeJab * near(8));
      return true;
    case 'pressSlam':
      f.sparks.spawn(at, UP, 16, 1);
      f.rig.shake.add(fb.shakeJab * (0.3 + value / 10) * near(9));
      return true;
    case 'kegBlast':
      f.sparks.spawn(at, UP, 60, 2.2);
      f.chunks.spawn(at, UP, 18, 1.4);
      f.rig.shake.add(fb.shakeHeavy * 1.5 * near(16));
      return true;
    case 'pitSink':
      f.sparks.spawn(at, UP, 14, 0.9);
      return true;
    default:
      return false;
  }
}
