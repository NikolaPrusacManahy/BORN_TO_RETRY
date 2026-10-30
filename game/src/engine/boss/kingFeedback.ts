// Update 0.2.3 — the Bone King's moves felt (foeFeedback.ts passes its events here): a thrown skeleton smashing on the
// floor (bone bits, a ring as wide as its burst), each jump's take-off and landing (dust, a ring as wide as the smash,
// the view jolting nearer), its grab and your hits held (a jolt each), breaking free and being thrown, its fall to
// pieces and rebuilding, its roar, the skeletons it calls up, its blast charging (the floor trembling more and more)
// and going off (a ring as wide as its reach, the view shaken hard).
import * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import { RADIUS } from '../../sim/enemies/kinds';
import { BONE_KING } from '../../tuning/boneKing';
import type { FeedbackParts } from '../combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const BONE = 0xf0e6d0;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function kingFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'boneCrash':
      f.waves.spawn(at, value, BONE);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.sparks.spawn(at, UP, 10, 0.9);
      f.rig.shake.add(0.35 * near(16));
      return true;
    case 'kingJump':
      f.chunks.spawn(at, UP, 16, 1.1);
      f.rig.shake.add(0.3 * near(25));
      return true;
    case 'kingSmash':
      f.waves.spawn(at, BONE_KING.v.smashReach + RADIUS.boneKing, 0xffe0b0);
      f.chunks.spawn(at, UP, 30, 1.4);
      f.rig.shake.add(0.8 * near(30));
      return true;
    case 'kingGrab':
      f.rig.shake.add(0.5);
      return true;
    case 'kingQteHit':
      f.rig.shake.add(0.12 + 0.02 * value);
      f.sparks.spawn(at, back, 8 + value, 1);
      return true;
    case 'kingFree':
      f.sparks.spawn(at, back, 30, 1.4);
      f.rig.shake.add(0.45);
      return true;
    case 'kingThrowYou':
      f.rig.shake.add(0.8);
      return true;
    case 'kingCollapse':
      f.chunks.spawn(at, UP, 46, 1.6);
      f.rig.shake.add(0.6 * near(30));
      return true;
    case 'kingRise':
      f.sparks.spawn(at, UP, 30, 1.4);
      return true;
    case 'kingRoar':
      f.rig.shake.add(0.55 * near(40));
      return true;
    case 'kingSummon':
      f.chunks.spawn(at, UP, 20, 1.2);
      f.rig.shake.add(0.3);
      return true;
    case 'kingCharge':
      f.rig.shake.add(0.3 * near(40));
      return true;
    case 'kingRumble':
      f.rig.shake.add((0.12 + 0.35 * value) * near(40));
      return true;
    case 'kingBlast':
      f.waves.spawn(at, value, 0xff8a30);
      f.chunks.spawn(at, UP, 80, 2.2);
      f.sparks.spawn(at, UP, 100, 2.4);
      f.rig.shake.add(1);
      return true;
    default:
      return false;
  }
}
