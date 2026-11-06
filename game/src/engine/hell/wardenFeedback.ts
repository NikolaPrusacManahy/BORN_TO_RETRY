// Update 0.3.63 — Hellwarden's moves felt: sparks and the view shaken as its blows land, its throne room breaking, its sword shattering.
import * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import type { FeedbackParts } from '../combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const FIRE = 0xff7a30;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function wardenFeedback(f: FeedbackParts, kind: CombatEvent, at: THREE.Vector3, near: (far: number) => number, value = 0): boolean {
  switch (kind) {
    case 'wardenArc':
      f.sparks.spawn(at, UP, 26, 1.6);
      f.rig.shake.add(0.45 * near(22));
      return true;
    case 'wardenVanish':
      f.sparks.spawn(at, UP, 40, 1.8);
      return true;
    case 'wardenThrust':
      f.sparks.spawn(at, UP, 20, 1.2);
      f.rig.shake.add(0.4 * near(14));
      return true;
    case 'wardenParried':
    case 'wardenDisarmed':
      f.sparks.spawn(at, UP, 36, 1.6);
      f.rig.shake.add(0.6);
      return true;
    case 'wardenBrand':
      f.waves.spawn(at, 8, FIRE);
      f.chunks.spawn(at, UP, 30, 1.5);
      f.rig.shake.add(0.6 * near(30));
      return true;
    case 'wardenErupt':
      f.sparks.spawn(at, UP, 10, 1);
      f.rig.shake.add(0.08 * near(30));
      return true;
    case 'wardenEchoHit':
      f.waves.spawn(at, 5, 0xff3020);
      f.chunks.spawn(at, UP, 18, 1.2);
      f.rig.shake.add(0.4 * near(24));
      return true;
    case 'wardenRoar':
      f.chunks.spawn(at, UP, 60, 2.2);
      f.rig.shake.add(1);
      return true;
    case 'wardenCharge':
      f.rig.shake.add(0.2);
      return true;
    case 'wardenFlash':
      f.rig.shake.add(0.3);
      return true;
    case 'wardenShatter':
      f.sparks.spawn(at, UP, 90, 3);
      f.chunks.spawn(at, UP, 50, 2);
      f.rig.shake.add(1.2);
      return true;
    case 'wardenCleave':
      f.rig.shake.add(1.4);
      return true;
    case 'wardenRift':
      f.chunks.spawn(at, UP, 60, 2);
      f.rig.shake.add(0.6);
      return true;
    // Update 0.3.65 — its show.
    case 'wardenSurge':
      f.waves.spawn(at, 6, FIRE);
      f.sparks.spawn(at, UP, 24, 1.6);
      return true;
    case 'wardenSnap':
      f.sparks.spawn(at, UP, 40, 2.4);
      return true;
    case 'wardenClamp':
      f.sparks.spawn(at, UP, value === 4 ? 90 : 46, value === 4 ? 2.8 : 2);
      if (value === 4) f.waves.spawn(at, 9, FIRE);
      return true;
    case 'wardenSwordRise':
      f.waves.spawn(at, 5, FIRE);
      f.sparks.spawn(at, UP, 30, 2);
      return true;
    case 'wardenMaskOn':
      f.sparks.spawn(at, UP, 18, 1);
      return true;
    case 'wardenLeap':
      f.waves.spawn(at, 7, FIRE);
      f.chunks.spawn(at, UP, 40, 1.8);
      return true;
    case 'wardenLand':
      f.waves.spawn(at, 16, FIRE);
      f.chunks.spawn(at, UP, 80, 2.4);
      f.sparks.spawn(at, UP, 60, 2.8);
      f.rig.shake.add(1.6);
      return true;
    case 'wardenCrack':
      f.sparks.spawn(at, UP, 34, 1.4);
      f.rig.shake.add(0.3);
      return true;
    case 'wardenDoor':
    case 'wardenTorches':
    case 'wardenBones':
    case 'wardenHeat':
    case 'wardenSkull':
    case 'wardenEye':
    case 'wardenHush':
    case 'wardenFreeze':
    case 'wardenThaw':
      return true;
    case 'wardenFlare':
    case 'wardenEmbers':
    case 'wardenWhoosh':
    case 'wardenRaise':
    case 'wardenCall':
    case 'wardenEcho':
    case 'wardenCross':
    case 'wardenThrow':
    case 'wardenFetched':
    case 'wardenVerdict':
      return true;
    default:
      return false;
  }
}
