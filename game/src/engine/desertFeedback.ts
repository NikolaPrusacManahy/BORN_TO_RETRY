// Update 0.2.4 — floor 4's moves felt (foeFeedback.ts passes its events here): sand thrown up as a Cactoro digs in or
// bursts up, its spines' ring, the big one bursting up under you (a ring as wide as its reach), a blow turned by its
// thorns (sparks); a Hywirl's gust catching you; the Dino's crash, its stomps and landing (rings and the view shaken),
// its tail's sweep, its roar.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { RADIUS } from '../sim/enemies/kinds';
import { DINO } from '../tuning/dino';
import { FOES4 } from '../tuning/foes4';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);
const SAND = 0xe6c27e;

/** Returns false for events it doesn't know. `near`: 1 at the camera, 0 far off. */
export function desertFeedback(f: FeedbackParts, kind: CombatEvent, _value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'cactoroDig':
      f.chunks.spawn(at, UP, 10, 0.8);
      return true;
    case 'cactoroSpines':
      f.waves.spawn(at, FOES4.v.spinesReach, 0xa0ff60);
      f.chunks.spawn(at, UP, 12, 0.9);
      f.rig.shake.add(0.25 * near(12));
      return true;
    case 'cactoroErupt':
      f.waves.spawn(at, FOES4.v.ambushReach + RADIUS.cactoroBig, SAND);
      f.chunks.spawn(at, UP, 30, 1.4);
      f.rig.shake.add(0.6 * near(20));
      return true;
    case 'cactoroBlock':
      f.sparks.spawn(at, back, 10, 1);
      return true;
    case 'cactoroGuard':
      f.sparks.spawn(at, UP, 16, 1.2);
      return true;
    case 'hywirlHit':
      f.rig.shake.add(0.35);
      return true;
    case 'dinoCrash':
      f.chunks.spawn(at, UP, 26, 1.3);
      f.rig.shake.add(0.6 * near(30));
      return true;
    case 'dinoStomp':
    case 'dinoLand':
      f.waves.spawn(at, kind === 'dinoLand' ? DINO.v.pounceReach + RADIUS.dino : 4, 0xffe0b0);
      f.chunks.spawn(at, UP, 26, 1.3);
      f.rig.shake.add(0.7 * near(30));
      return true;
    case 'dinoTail':
      f.waves.spawn(at, DINO.v.tailReach + RADIUS.dino, 0xffc080);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.rig.shake.add(0.4 * near(20));
      return true;
    case 'poisonSplash':
      f.waves.spawn(at, FOES4.v.puddleRadius, 0x60ff40);
      f.chunks.spawn(at, UP, 8, 0.7);
      return true;
    case 'blobSplit':
      f.waves.spawn(at, 1.6, 0x60ff40);
      f.chunks.spawn(at, UP, 14, 0.9);
      return true;
    case 'blobLand':
      f.rig.shake.add(0.15 * near(10));
      return true;
    case 'maskWard':
    case 'wardBlock':
    case 'orcBlock':
      f.sparks.spawn(at, kind === 'maskWard' ? UP : back, 12, 1);
      return true;
    case 'orcSlam':
      f.waves.spawn(at, FOES4.v.orcLeapReach + RADIUS.skullOrc, 0xffe0b0);
      f.chunks.spawn(at, UP, 22, 1.2);
      f.rig.shake.add(0.6 * near(25));
      return true;
    case 'dinoRoar':
      f.rig.shake.add(0.55 * near(40));
      return true;
    default:
      return false;
  }
}
