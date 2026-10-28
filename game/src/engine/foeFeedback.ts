// Update 0.0.18 — what you see of floor 2's enemies' blows: the slime's burst (a green ring as wide as it reaches, goo
// thrown up), the spider's landing (a ring, dust, a jolt felt more the closer you are), a fireball or a sting leaving
// (sparks), a bite (sparks). Called by combatFeedback.ts for the events it doesn't know.
// The Dragon: its scream shakes the view; its beam rumbles; its wing sends a pale ring out in front and its tail a
// violet one all round (dust thrown up); a fireball leaves in sparks; an enemy caught in the beam bursts.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { RADIUS } from '../sim/enemies/kinds';
import { DRAGON } from '../tuning/dragon';
import { FOES2 } from '../tuning/foes2';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);

/** `back`: from `at` towards the camera; `near`: 1 at the camera, 0 far off. */
export function foes2Feedback(f: FeedbackParts, kind: CombatEvent, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number) {
  switch (kind) {
    case 'slimeBlast':
      f.waves.spawn(at, FOES2.v.slimeBlast, 0x7cff3a);
      f.chunks.spawn(at, UP, 16, 1);
      f.rig.shake.add(0.35 * near(12));
      break;
    case 'spiderLand':
      f.waves.spawn(at, FOES2.v.spiderReach, 0xff3030);
      f.chunks.spawn(at, UP, 14, 1);
      f.rig.shake.add(0.4 * near(14));
      break;
    case 'dragonScream':
      f.rig.shake.add(DRAGON.v.screamShake);
      break;
    case 'dragonBreath':
      f.rig.shake.add(0.3 * near(30));
      break;
    case 'dragonWing':
      f.waves.spawn(at, DRAGON.v.wingReach, 0xffe8a0);
      f.chunks.spawn(at, UP, 12, 1);
      f.rig.shake.add(0.35 * near(20));
      break;
    case 'dragonTail':
      f.waves.spawn(at, DRAGON.v.tailReach + RADIUS.dragon, 0xb060ff);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.4 * near(20));
      break;
    case 'burnt':
      f.chunks.spawn(at, UP, 12, 1);
      f.sparks.spawn(at, back, 14, 1.2);
      break;
    case 'dragonFireball':
    case 'blueFireball':
    case 'waspSting':
    case 'snakeBite':
    case 'spiderBite':
      f.sparks.spawn(at, back, 6, 0.9);
      break;
    default:
      break;
  }
}
