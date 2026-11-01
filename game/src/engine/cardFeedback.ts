// Update 0.2.15 — the Scars felt. Update 0.2.16 — the Fate Cards' (foeFeedback.ts passes their events here): a crimson
// ring at your feet and a jolt as you take one; sparks and a shake for Shoulder Charge and Bowling's shove, dust for
// Pogo's bounce, sparks for Iron Knuckles and Ricochet, a crimson ring for Bloodbath's blast, a jolt as Killing Spree or
// Giant Killer comes on. Update 0.2.18 — wave 2's: a blast's ring and shake, a fire or frost ring, lightning's sparks
// (their flames and bolts: cardFx.ts).
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import type { FeedbackParts } from './combatFeedback';
import { CARDS } from '../tuning/cards';

const UP = new THREE.Vector3(0, 1, 0);
const CRIMSON = 0xff2a3a;
/** Update 0.2.18 — a blast's ring, a fire ring's; a frost ring's. */
const BLAST = 0xff8a30;
const FROST = 0x9ad8ff;
const feet = new THREE.Vector3();

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function cardFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'cardTaken':
      f.waves.spawn(feet.set(at.x, at.y - 1, at.z), 3, CRIMSON);
      f.rig.shake.add(0.25);
      return true;
    case 'cardBump':
      f.sparks.spawn(at, back, 14, 0.9);
      f.rig.shake.add(0.25 * near(4));
      return true;
    case 'cardPogo':
      f.chunks.spawn(at, UP, 10, 0.8);
      return true;
    case 'cardBlast':
      f.waves.spawn(at, value, CRIMSON);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.4 * near(value + 4));
      return true;
    case 'cardStall':
    case 'cardRicochet':
      f.sparks.spawn(at, back, 10, 0.7);
      return true;
    case 'cardSpree':
    case 'cardGiant':
      f.rig.shake.add(0.3);
      return true;
    // Update 0.2.18 — wave 2's.
    case 'cardBoom':
      f.waves.spawn(feet.set(at.x, Math.max(0.05, at.y - 1), at.z), value, BLAST);
      f.chunks.spawn(at, UP, 10, 1);
      f.rig.shake.add(0.45 * near(value + 6));
      return true;
    case 'cardRing':
      f.waves.spawn(feet.set(at.x, Math.max(0.05, at.y - 1), at.z), CARDS.v.bandRadius, value === 1 ? BLAST : FROST);
      f.rig.shake.add(0.2 * near(8));
      return true;
    case 'cardZap':
      f.sparks.spawn(at, back, 8, 0.6);
      return true;
    case 'cardStorm':
      f.rig.shake.add(0.12);
      return true;
    case 'cardDot':
    case 'cardBlastHit':
    case 'cardPyre':
    case 'cardSpirit':
    case 'cardSplinter':
      return true;
    default:
      return false;
  }
}
