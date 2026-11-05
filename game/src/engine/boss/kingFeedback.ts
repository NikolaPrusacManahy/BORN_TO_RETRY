// Update 0.2.3 — the Bone King's moves felt (foeFeedback.ts passes its events here).
// Update 0.3.53 — by the Boss Design Bible: its ribs, dust, hands, its arm's landing, its bones out and back, its cage, its
// Colossus and its club across the floor.
import * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import type { FeedbackParts } from '../combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const BONE = 0xf0e6d0;
const GREEN = 0x62ff8a;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function kingFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'kingRibs':
      f.chunks.spawn(at, UP, 10, 0.8);
      f.rig.shake.add(0.2 * near(25));
      return true;
    case 'kingRibBack':
      f.sparks.spawn(at, back, 30, 1.3);
      f.chunks.spawn(at, UP, 18, 1);
      f.rig.shake.add(0.4 * near(30));
      return true;
    case 'kingDust':
      f.chunks.spawn(at, UP, 4, 0.5);
      f.rig.shake.add(0.05 * near(8));
      return true;
    case 'kingHands':
      f.chunks.spawn(at, UP, 24, 1.1);
      f.rig.shake.add(0.35 * near(14));
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
    case 'kingSlam':
      f.waves.spawn(at, 6, 0xffe0b0);
      f.chunks.spawn(at, UP, 34, 1.4);
      f.rig.shake.add(0.9 * near(30));
      return true;
    case 'kingArmUp':
      f.chunks.spawn(at, UP, 10, 0.8);
      return true;
    case 'kingSkull':
      f.sparks.spawn(at, back, 22, 1.2);
      f.rig.shake.add(0.2);
      return true;
    case 'kingShatter':
      f.chunks.spawn(at, UP, 50, 1.8);
      f.sparks.spawn(at, UP, 40, 1.6);
      f.rig.shake.add(0.7 * near(40));
      return true;
    case 'kingBoneHit':
      f.rig.shake.add(0.4);
      return true;
    case 'kingCracks':
      f.chunks.spawn(at, UP, 8, 0.6);
      f.rig.shake.add(0.12 * near(14));
      return true;
    case 'kingCage':
      f.chunks.spawn(at, UP, 26, 1.2);
      f.rig.shake.add(0.45 * near(14));
      return true;
    case 'kingCageShut':
      f.rig.shake.add(0.25);
      return true;
    case 'kingCageBreak':
      f.chunks.spawn(at, UP, 30, 1.2);
      f.sparks.spawn(at, UP, 18, 1);
      f.rig.shake.add(0.45);
      return true;
    case 'kingCrush':
      f.chunks.spawn(at, UP, 30, 1.2);
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
    case 'kingTremble':
      f.rig.shake.add(0.3);
      return true;
    case 'kingGather':
      f.chunks.spawn(at, UP, 30, 1.4);
      return true;
    case 'kingStands':
      f.waves.spawn(at, 10, BONE);
      f.chunks.spawn(at, UP, 40, 1.8);
      return true;
    case 'kingSkullOn':
      f.sparks.spawn(at, UP, 50, 1.6);
      f.waves.spawn(at, 6, GREEN);
      return true;
    case 'kingColossus':
      f.chunks.spawn(at, UP, 40, 1.8);
      f.rig.shake.add(0.7 * near(60));
      return true;
    case 'kingOpen':
      f.waves.spawn(at, 12, GREEN);
      f.rig.shake.add(0.5 * near(60));
      return true;
    case 'kingRumble':
      f.rig.shake.add((0.12 + 0.3 * value) * near(60));
      return true;
    case 'kingSpine':
      f.waves.spawn(at, 20, GREEN);
      f.chunks.spawn(at, UP, 80, 2.4);
      f.sparks.spawn(at, UP, 90, 2.2);
      f.rig.shake.add(1);
      return true;
    case 'kingSpineHit':
      f.sparks.spawn(at, back, 34, 1.5);
      f.rig.shake.add(0.3);
      return true;
    case 'kingClubUp':
      f.rig.shake.add(0.4);
      return true;
    case 'kingClub':
      f.waves.spawn(at, 44, BONE);
      f.chunks.spawn(at, UP, 90, 2.6);
      f.rig.shake.add(1);
      return true;
    default:
      return false;
  }
}
