// Update 0.2.8 — the Velociraptor's moves felt (its new moves; desertFeedback.ts passes its events here): sand thrown
// up by its scrapes, its feint's stop and its kick, its claws' sparks on the wall, its landings (a ring as wide as their
// reach, the view shaken), its sandstorm rising and its screech (the view shaken: harder when it caught you), its
// slashes, reeling when you catch it mid-blitz, and its pin (each bite a jolt).
import * as THREE from 'three';
import type { CombatEvent } from '../../sim/combat/state';
import { RADIUS } from '../../sim/enemies/kinds';
import { DINO } from '../../tuning/dino';
import type { FeedbackParts } from '../combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const DUST = 0xffe0b0;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function raptorFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
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
    case 'dinoKick':
      f.chunks.spawn(at, UP, 30, 1.4);
      if (value) f.rig.shake.add(0.35);
      return true;
    case 'dinoClaws':
      f.sparks.spawn(at, back, 14, 1.1);
      return true;
    case 'dinoStorm':
      f.chunks.spawn(at, UP, 40, 1.6);
      f.rig.shake.add(0.5 * near(40));
      return true;
    case 'dinoScreech':
      f.rig.shake.add(value ? 0.8 : 0.4 * near(40));
      return true;
    case 'dinoSlash':
      f.sparks.spawn(at, back, 8, 1);
      return true;
    case 'dinoReel':
    case 'pinFree':
      f.sparks.spawn(at, UP, 16, 1.2);
      f.rig.shake.add(0.4);
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
    default:
      return false;
  }
}
