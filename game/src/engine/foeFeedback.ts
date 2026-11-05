// Update 0.0.18 — what you see of floor 2's enemies' blows: the slime's burst (a green ring as wide as it reaches, goo
// thrown up), the spider's landing (a ring, dust, a jolt felt more the closer you are), a fireball or a sting leaving
// (sparks), a bite (sparks). Called by combatFeedback.ts for the events it doesn't know.
// The Dragon: its scream shakes the view; its fire rumbles; its wind sends a pale ring out; a fireball leaves in sparks.
// Update 0.0.21 — its fire bombs bursting (a ring as wide as each, dust, a jolt felt more the closer), its blast (a great
// ring of fire, a hard jolt).
// Update 0.1.2 — an execution's are execFeedback.ts's.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { RADIUS } from '../sim/enemies/kinds';
import { DRAGON } from '../tuning/dragon';
import { FOES2 } from '../tuning/foes2';
import type { FeedbackParts } from './combatFeedback';
import { execFeedback } from './execFeedback';
import { kingFeedback } from './boss/kingFeedback';
import { desertFeedback } from './desertFeedback';
import { gunFeedback } from './gunFeedback';
import { foes3bFeedback } from './foes3bFeedback';
import { drownedFeedback } from './drownedFeedback';
import { fishFeedback } from './fishFeedback';
import { cardFeedback } from './cardFeedback';

const UP = new THREE.Vector3(0, 1, 0);

/** `back`: from `at` towards the camera; `near`: 1 at the camera, 0 far off. */
export function foes2Feedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number) {
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
      f.waves.spawn(at, RADIUS.dragon + 4, 0xffe8a0);
      f.chunks.spawn(at, UP, 12, 1);
      f.rig.shake.add(0.35 * near(20));
      break;
    case 'dragonTail':
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.5 * near(24));
      break;
    // Update 0.3.49 — the Boss Design Bible's Dragon: rubble torn up; its dive hitting the floor; the ground shaking
    // through its core's charge, harder as it goes; the core breaking.
    case 'dragonRubble':
      f.chunks.spawn(at, UP, 5, 0.7);
      break;
    case 'dragonSlam':
      f.waves.spawn(at, DRAGON.v.diveRadius, 0xff7a20);
      f.chunks.spawn(at, UP, 34, 1.4);
      f.sparks.spawn(at, UP, 24, 1.4);
      f.rig.shake.add(0.9 * near(30));
      break;
    case 'dragonCore':
      f.waves.spawn(at, RADIUS.dragon + 6, 0xffa040);
      f.sparks.spawn(at, back, 26, 1.4);
      f.rig.shake.add(0.5);
      break;
    case 'dragonRumble':
      f.rig.shake.add(0.14 + 0.26 * value);
      break;
    case 'dragonCoreBroken':
      f.waves.spawn(at, RADIUS.dragon + 8, 0xfff0c0);
      f.chunks.spawn(at, back, 28, 1.3);
      f.sparks.spawn(at, back, 60, 2);
      f.rig.shake.add(0.9);
      break;
    case 'bombBlast':
      f.waves.spawn(at, value, 0xff7a20);
      f.chunks.spawn(at, UP, 14, 1.1);
      f.sparks.spawn(at, UP, 16, 1.3);
      f.rig.shake.add(0.45 * near(18));
      break;
    case 'dragonBurst':
      f.waves.spawn(at, 34, 0xfff0c0);
      f.chunks.spawn(at, UP, 40, 1.6);
      f.sparks.spawn(at, UP, 60, 2.2);
      f.rig.shake.add(1.3);
      break;
    case 'dragonFireball':
    case 'blueFireball':
    case 'waspSting':
    case 'snakeBite':
    case 'spiderBite':
    case 'skeletonStrike':
    case 'mushnubBite':
    case 'ninjaStrike':
      f.sparks.spawn(at, back, 6, 0.9);
      break;
    // Update 0.1.19 — floor 3's: a Skeleton falls to pieces (bones fly) and rises again (a shimmer); the Ninja's
    // teleport (a puff where it vanished, another where it appears).
    case 'skeletonCollapse':
      f.chunks.spawn(at, UP, 14, 0.8);
      break;
    case 'skeletonRise':
      f.sparks.spawn(at, UP, 12, 0.6);
      break;
    case 'ninjaVanish':
    case 'ninjaAppear':
      f.sparks.spawn(at, UP, 18, 1);
      f.chunks.spawn(at, UP, 6, 0.6);
      break;
    default:
      // (Update 0.2.3 — the Bone King's; Update 0.2.4 — floor 4's; Update 0.2.10 — floor 5's; Update 0.2.11 — floor 6's.)
      if (!kingFeedback(f, kind, value, at, back, near) && !desertFeedback(f, kind, value, at, back, near) && !gunFeedback(f, kind, value, at, back) && !foes3bFeedback(f, kind, value, at, back, near) && !drownedFeedback(f, kind, value, at, back, near) && !fishFeedback(f, kind, value, at, back, near) && !cardFeedback(f, kind, value, at, back, near)) execFeedback(f, kind, value, at, back, near);
      break;
  }
}
