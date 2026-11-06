// Update 0.2.8 — the Velociraptor's moves felt (desertFeedback.ts passes its events here): sand thrown up by its scrapes, its landings
// (a ring as wide as their reach, the view shaken) and its pin (each bite a jolt).
// Update 0.3.60 — by the Boss Design Bible: its skid, its spin, its trip, the light dying, blinded.
import * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import { RADIUS } from '../../sim/enemies/kinds';
import { DINO } from '../../tuning/dino';
import type { FeedbackParts } from '../combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const DUST = 0xffe0b0;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function raptorFeedback(f: FeedbackParts, kind: CombatEvent, _value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'dinoCrash':
      f.chunks.spawn(at, UP, 26, 1.3);
      f.rig.shake.add(0.6 * near(30));
      return true;
    case 'dinoLand':
      f.waves.spawn(at, DINO.v.pounceReach + RADIUS.dino, DUST);
      f.chunks.spawn(at, UP, 26, 1.3);
      f.rig.shake.add(0.7 * near(30));
      return true;
    case 'dinoScrape':
    case 'dinoFeint':
      f.chunks.spawn(at, UP, kind === 'dinoFeint' ? 14 : 8, 0.8);
      return true;
    case 'dinoSkid':
      f.chunks.spawn(at, UP, 24, 1.2);
      f.rig.shake.add(0.25 * near(20));
      return true;
    case 'dinoTail':
      f.chunks.spawn(at, UP, 18, 1.2);
      return true;
    case 'dinoEmerge':
      f.chunks.spawn(at, UP, 16, 1);
      return true;
    case 'dinoTrip':
    case 'pinFree':
      f.sparks.spawn(at, UP, 16, 1.2);
      f.rig.shake.add(0.4);
      return true;
    case 'dinoPackIn':
      f.chunks.spawn(at, UP, 12, 0.8);
      return true;
    case 'dinoDark':
      f.rig.shake.add(0.35);
      return true;
    case 'dinoEyes':
      f.rig.shake.add(0.2);
      return true;
    case 'dinoBlinded':
      f.sparks.spawn(at, back, 34, 1.8);
      f.chunks.spawn(at, UP, 30, 1.5);
      f.rig.shake.add(0.8);
      return true;
    case 'dinoPin':
      f.chunks.spawn(at, UP, 20, 1.2);
      f.rig.shake.add(0.8);
      return true;
    case 'pinBite':
      f.rig.shake.add(0.6);
      return true;
    case 'pinSnap':
      f.rig.shake.add(0.2);
      return true;
    case 'dinoRoar':
      f.rig.shake.add(0.55 * near(40));
      return true;
    case 'dinoSand':
      f.chunks.spawn(at, UP, 30, 1.4);
      return true;
    case 'dinoShowLand':
      f.waves.spawn(at, 22, DUST);
      f.chunks.spawn(at, UP, 60, 2);
      f.rig.shake.add(0.9);
      return true;
    case 'dinoHiss':
    case 'dinoClick':
    case 'dinoFlick':
    case 'dinoBark':
    case 'dinoHeart':
      return true;
    default:
      return false;
  }
}
