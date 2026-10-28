// Update 0.1.1 — what you see of an execution's blows: each slam into the floor (dust, chips, a ring, a hard jolt: the
// second harder), the landing (a burst of dust).
// Update 0.1.2 — every enemy's: a punch, a chop, a tear, a crush or a smash (execMoves.ts BLOWS: sparks, chips, a jolt
// as heavy as the blow), and its burst (a great ring, chunks and sparks, the hardest jolt). (Moved out of foeFeedback.ts.)
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { BLOWS } from '../sim/combat/execMoves';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);

/** Returns false for events it doesn't know. `back`: from `at` towards the camera; `near`: 1 at the camera. */
export function execFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'execSlam':
      f.waves.spawn(at, 2.2, 0xffe0c0);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.sparks.spawn(at, UP, 14, 1.2);
      f.rig.shake.add(value >= 2 ? 0.75 : 0.55);
      f.rig.kick(value >= 2 ? 2.6 : 1.8);
      return true;
    case 'execLand':
      f.chunks.spawn(at, UP, 20, 1.2);
      f.waves.spawn(at, 3, 0xff8060);
      f.rig.shake.add(0.3 * near(20));
      return true;
    case 'execBlow':
      switch (BLOWS[value]) {
        case 'punch':
          f.sparks.spawn(at, back, 8, 1);
          f.rig.shake.add(0.12);
          break;
        case 'chop':
          // Update 0.1.3 — harder.
          f.sparks.spawn(at, back, 20, 1.5);
          f.chunks.spawn(at, UP, 14, 1.1);
          f.rig.shake.add(0.5);
          f.rig.kick(1.6);
          break;
        case 'tear':
          f.chunks.spawn(at, back, 16, 1.1);
          f.rig.shake.add(0.45);
          f.rig.kick(1.4);
          break;
        case 'crush':
          f.chunks.spawn(at, UP, 10, 0.7);
          f.rig.shake.add(0.3);
          break;
        case 'smash':
          f.waves.spawn(at, 2.6, 0xffe0c0);
          f.chunks.spawn(at, UP, 22, 1.2);
          f.sparks.spawn(at, UP, 16, 1.2);
          f.rig.shake.add(0.7);
          f.rig.kick(2.4);
          break;
      }
      return true;
    case 'execBurst':
      f.waves.spawn(at, 3.5, 0xff8060);
      f.chunks.spawn(at, UP, 30, 1.5);
      f.sparks.spawn(at, UP, 30, 1.6);
      f.rig.shake.add(0.8 * near(20));
      f.rig.kick(2.8);
      return true;
    default:
      return false;
  }
}
