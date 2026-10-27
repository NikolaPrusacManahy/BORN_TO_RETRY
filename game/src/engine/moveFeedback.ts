// M1 — turns movement events into camera kicks and sounds.
import type { EventQueue } from '../core/eventQueue';
import type { MoveEvent } from '../sim/player/state';
import { SHAKE } from '../tuning/camera';
import type { MoveSounds } from '../audio/moveSounds';
import type { CameraRig } from './cameraRig';
import type { Viewmodel } from './viewmodel/viewmodel';

/** Landings slower than this don't dip the view. */
const DIP_MIN_SPEED = 2;

export function applyMoveEvents(events: EventQueue<MoveEvent>, rig: CameraRig, sounds: MoveSounds, arms: Viewmodel) {
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
    }
  }
}
