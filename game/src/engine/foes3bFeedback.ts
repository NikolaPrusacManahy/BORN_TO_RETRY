// Update 0.2.7 — floor 3's newcomers' moves felt (foeFeedback.ts passes its events here): the Dragonling's darting
// off (a puff of smoke); the White Rabbit's bonk; the Big Mushnub's smash (a ring as wide as its reach, dust, the view
// shaken), its spin (a ring all round), its split (spores).
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { RADIUS } from '../sim/enemies/kinds';
import { FOES3B } from '../tuning/foes3b';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function foes3bFeedback(f: FeedbackParts, kind: CombatEvent, _value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'bratFlit':
      f.chunks.spawn(at, UP, 5, 0.5);
      return true;
    case 'rabbitBonk':
      f.sparks.spawn(at, back, 4, 0.6);
      return true;
    case 'mushSmash':
      f.waves.spawn(at, FOES3B.v.smashReach, 0x9ad0ff);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.5 * near(20));
      return true;
    case 'mushSpin':
      f.waves.spawn(at, FOES3B.v.spinReach + RADIUS.bigMushnub, 0x9ad0ff);
      f.rig.shake.add(0.25 * near(15));
      return true;
    case 'mushSplit':
      f.waves.spawn(at, 1.6, 0x8ec8ff);
      f.chunks.spawn(at, UP, 14, 0.9);
      return true;
    case 'bratWindup':
    case 'bratSpit':
    case 'rabbitWindup':
    case 'rabbitThrow':
    case 'mushWindup':
      return true;
    default:
      return false;
  }
}
