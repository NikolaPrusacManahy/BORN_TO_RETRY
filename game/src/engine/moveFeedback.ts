// M1 — turns movement events into camera kicks and sounds. M1 step 8 — and the player's hurts and death.
import type { EventQueue } from '../core/eventQueue';
import type { MoveEvent } from '../sim/player/state';
import { SHAKE } from '../tuning/camera';
import { HEALTH } from '../tuning/health';
import type { MoveSounds } from '../audio/moveSounds';
import type { CameraRig } from './cameraRig';
import type { Viewmodel } from './viewmodel/viewmodel';

/** Landings slower than this don't dip the view. */
const DIP_MIN_SPEED = 2;

/** Returns how many times the player was hurt (for the HUD's hurt flash). */
export function applyMoveEvents(events: EventQueue<MoveEvent>, rig: CameraRig, sounds: MoveSounds, arms: Viewmodel): number {
  let hurts = 0;
  for (let i = 0; i < events.length; i++) {
    const { kind, value } = events.at(i);
    sounds.play(kind, value);
    if (kind === 'land') {
      if (value > DIP_MIN_SPEED) {
        rig.land(value);
        arms.land(value);
      }
      if (value > SHAKE.v.hardLandSpeed) rig.shake.add((value - SHAKE.v.hardLandSpeed) * SHAKE.v.hardLand);
    } else if (kind === 'slamLand') {
      rig.land(value);
      arms.land(value);
      rig.shake.add(SHAKE.v.slamLand);
    } else if (kind === 'dash') {
      rig.shake.add(SHAKE.v.dash);
    } else if (kind === 'hurt') {
      rig.shake.add(HEALTH.v.shakeHurt);
      hurts++;
    } else if (kind === 'death') {
      rig.shake.add(1);
    }
  }
  return hurts;
}
