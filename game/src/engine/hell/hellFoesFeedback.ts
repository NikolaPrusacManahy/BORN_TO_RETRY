// Update 0.5.4 — floor 10's own fighters felt (out of combatFeedback.ts's chain, as wardenFeedback.ts is): sparks off the Bone Guard's guard
// and more as it breaks; the Bone Axeman's floor split bursting (a ring of fire, chunks, the view shaken nearby), its chop and spin; a jolt as
// the line burns you; the Imp's fireball leaving its hand; a Puglin's rush.
import * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import { FEEDBACK } from '../../tuning/combat';
import type { FeedbackParts } from '../combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const FIRE = 0xff6a20;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function hellFoesFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, near: (far: number) => number): boolean {
  const fb = FEEDBACK.v;
  switch (kind) {
    case 'guardTurn':
      f.sparks.spawn(at, UP, 14, 0.9);
      return true;
    case 'guardBreak':
      f.sparks.spawn(at, UP, 30, 1.4);
      f.rig.shake.add(fb.shakeJab * near(8));
      return true;
    case 'guardRiposte':
      f.rig.shake.add(fb.shakeHeavy * 0.6 * near(6));
      return true;
    case 'axeSplit':
      f.waves.spawn(at, 2.5, FIRE);
      f.chunks.spawn(at, UP, 16, 1.2);
      f.rig.shake.add(fb.shakeHeavy * 1.1 * near(14));
      return true;
    case 'axeChop':
    case 'axeSpin':
      f.rig.shake.add(fb.shakeJab * 0.6 * near(8));
      return true;
    case 'splitBurn':
      f.sparks.spawn(at, UP, 10, 0.8);
      f.rig.shake.add(fb.shakeJab * (value > 0 ? 1.4 : 0.6));
      return true;
    case 'impFire':
      f.sparks.spawn(at, UP, 8, 0.6);
      return true;
    case 'puglinRush':
      f.rig.shake.add(fb.shakeJab * 0.4 * near(8));
      return true;
    default:
      return false;
  }
}
