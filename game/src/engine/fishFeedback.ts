// Update 0.2.11 — floor 6's moves felt (foeFeedback.ts passes its events here): bubbles bursting where fish strike
// (sparks), rings through the water where big things land (the Manta's drop, the Whale's crashes), the view shaken by
// the big ones (a Tuna's or a Dolphin's ram, the Shark's shakes, the Whale's ram, crashes, song and roar).
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const WATER = 0x9ff0ff;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function fishFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'clownBite':
    case 'angelBite':
    case 'sharkBite':
    case 'mantaBarb':
      f.sparks.spawn(at, back, 10, 0.6);
      return true;
    case 'tunaRam':
    case 'dolphinHit':
    case 'sharkRoll':
      f.sparks.spawn(at, UP, 16, 0.9);
      f.rig.shake.add(0.35 * near(4));
      return true;
    case 'sharkShake':
      f.rig.shake.add(0.3);
      return true;
    case 'mantaDrop':
    case 'whaleCrashDown':
      f.waves.spawn(at, value, WATER);
      f.sparks.spawn(at, UP, 24, 1.2);
      f.rig.shake.add((kind === 'whaleCrashDown' ? 0.8 : 0.45) * near(value + 4));
      return true;
    case 'whaleCrash':
    case 'whaleRam':
    case 'whaleRoar':
      f.rig.shake.add(0.5 * near(30));
      return true;
    case 'whaleSongHit':
    case 'whaleSwallow':
      f.rig.shake.add(0.6);
      return true;
    case 'tunaStun':
    case 'sharkStun':
    case 'sharkFree':
      f.sparks.spawn(at, UP, 12, 0.8);
      return true;
    default:
      return false;
  }
}
