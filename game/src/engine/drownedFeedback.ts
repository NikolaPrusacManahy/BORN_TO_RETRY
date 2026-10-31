// Update 0.2.10 — floor 5's moves felt (foeFeedback.ts passes its events here): splashes where things dive or burst out
// of the water (rings on it, spray), a Jelly's shock (a ring as wide as it reached, the view jolted if it got you), a
// bubble popping, the Deep One's slam and the Bog Brute's landing (the view shaken), an Urchin's spikes. The Drowned
// King: its roars and its bursting up shake the view; its dive, its surfacing, its jet, its wall and its geysers splash.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { RADIUS } from '../sim/enemies/kinds';
import { FOES5B } from '../tuning/foes5b';
import { DROWNED } from '../tuning/drowned';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const WATER = 0x7ae6ff;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function drownedFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'snapperDive':
    case 'snapperBite':
      f.waves.spawn(at, 1.2, WATER);
      f.sparks.spawn(at, UP, 10, 0.6);
      return true;
    case 'bogDive':
      f.waves.spawn(at, 2.6, WATER);
      f.sparks.spawn(at, UP, 20, 1);
      return true;
    case 'jellyShock':
      f.waves.spawn(at, value, 0xff70e0);
      f.sparks.spawn(at, UP, 16, 1.2);
      f.rig.shake.add(0.2 * near(value + 2));
      return true;
    case 'bubblePop':
      f.waves.spawn(at, value, WATER);
      f.sparks.spawn(at, UP, 14, 0.8);
      return true;
    case 'urchinHit':
    case 'urchinThorns':
      f.sparks.spawn(at, back, 8, 0.6);
      return true;
    case 'deepSlam':
      f.waves.spawn(at, 2.4, 0xc060ff);
      f.rig.shake.add(0.5 * near(10));
      return true;
    case 'bogSlam':
      f.waves.spawn(at, FOES5B.v.slamReach + RADIUS.bogBrute, WATER);
      f.waves.spawn(at, FOES5B.v.waveReach, 0xff6a30);
      f.sparks.spawn(at, UP, 26, 1.3);
      f.rig.shake.add(0.55 * near(20));
      return true;
    case 'deepCatch':
      f.rig.shake.add(0.3);
      return true;
    case 'drownedRoar':
    case 'drownedRisen':
      f.rig.shake.add(0.55 * near(40));
      return true;
    case 'drownedSurface':
      f.waves.spawn(at, 3, WATER);
      f.sparks.spawn(at, UP, 20, 1.1);
      return true;
    case 'drownedSpout':
      f.sparks.spawn(at, UP, 24, 1.4);
      f.rig.shake.add(0.2 * near(30));
      return true;
    case 'drownedTide':
      f.waves.spawn(at, 6, WATER);
      f.rig.shake.add(0.4 * near(40));
      return true;
    case 'drownedSurf':
      f.waves.spawn(at, 4, WATER);
      f.sparks.spawn(at, UP, 26, 1.3);
      return true;
    case 'drownedDive':
      f.waves.spawn(at, 4, WATER);
      f.sparks.spawn(at, UP, 30, 1.4);
      return true;
    case 'drownedRise':
      f.waves.spawn(at, DROWNED.v.lungeReach, WATER);
      f.sparks.spawn(at, UP, 40, 1.8);
      f.rig.shake.add(0.6 * near(25));
      return true;
    case 'drownedBite':
      f.sparks.spawn(at, back, 10, 0.8);
      f.rig.shake.add(0.2 * near(12));
      return true;
    case 'geyserBurst':
      f.waves.spawn(at, value, WATER);
      f.sparks.spawn(at, UP, 36, 2.2);
      f.rig.shake.add(0.25 * near(value + 6));
      return true;
    case 'squidleInk':
      f.sparks.spawn(at, back, 10, 0.5);
      return true;
    case 'snapperWindup':
    case 'snapperLunge':
    case 'snapperRise':
    case 'urchinCurl':
    case 'urchinRoll':
    case 'urchinStop':
    case 'urchinOpen':
    case 'jellyGlow':
    case 'glubWindup':
    case 'glubSpit':
    case 'bubbleWindup':
    case 'bubbleLob':
    case 'squidleWindup':
    case 'squidleDive':
    case 'spawnWindup':
    case 'spawnBite':
    case 'deepClawWindup':
    case 'deepClaw':
    case 'deepLashWindup':
    case 'deepLash':
    case 'bogSwipeWindup':
    case 'bogSwipe':
    case 'bogRise':
    case 'bogCrouch':
    case 'bogLeap':
    case 'tideRise':
    case 'tideFall':
    case 'drownedRiseWarn':
    case 'drownedBiteWindup':
    case 'drownedUndertow':
    case 'drownedSpoutWindup':
    case 'drownedTideWindup':
    case 'drownedSurfWindup':
    case 'drownedGeyserCall':
      return true;
    default:
      return false;
  }
}
