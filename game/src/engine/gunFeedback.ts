// Update 0.2.4 — the Pistol's events felt (foeFeedback.ts passes its events here): a shot kicks the arms (gunArms.ts;
// Update 0.2.6: not the view, so the crosshair stays where the bullets go); a bullet in a wall throws sparks and grit;
// the reload's beats (the magazine dropping out, the slide going home) and the whip play on the arms.
import type * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import type { FeedbackParts } from './combatFeedback';

/** Returns false for events it doesn't know. */
export function gunFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3): boolean {
  switch (kind) {
    case 'gunShot':
      f.arms.gun.shot(value);
      return true;
    // Update 0.2.6 — right click: the gun swings (its blow lands as a punch does).
    case 'pistolWhip':
      f.arms.gun.whip();
      return true;
    case 'gunTrace':
      if (value === 0) {
        f.sparks.spawn(at, back, 7, 0.8);
        f.chunks.spawn(at, back, 3, 0.45);
      }
      return true;
    case 'magOut':
      f.arms.gun.magOut();
      return true;
    case 'slideHome':
      f.arms.gun.slideHome();
      return true;
    case 'reloadStart':
    case 'magIn':
    case 'reloadDone':
      return true;
    default:
      return false;
  }
}
