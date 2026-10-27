// M1 step 6 — turns combat events into everything you see and hear: the arms punching, sparks, chunks, shake,
// camera kick, hit markers, the hurt flash and sounds.
import * as THREE from 'three';
import type { CombatSounds } from '../audio/combatSounds';
import type { CombatState } from '../sim/combat/state';
import { FEEDBACK } from '../tuning/combat';
import type { CameraRig } from './cameraRig';
import type { Burst } from './fx/burst';
import type { MarkerKind } from './hudStore';
import type { TargetsView } from './targetsView';
import { Viewmodel } from './viewmodel/viewmodel';

const at = new THREE.Vector3();
const back = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export interface FeedbackParts {
  rig: CameraRig;
  arms: Viewmodel;
  sparks: Burst;
  chunks: Burst;
  sounds: CombatSounds;
  targets: TargetsView;
}

export class CombatFeedback {
  /** HUD counters: each change restarts the marker animation. */
  hits = 0;
  marker: MarkerKind = 'hit';

  constructor(private readonly f: FeedbackParts) {}

  private hit(scale: number, shake: number, kick: number, marker: MarkerKind) {
    this.f.sparks.spawn(at, back, Math.round(FEEDBACK.v.sparks * scale), 0.9);
    this.f.rig.shake.add(shake);
    this.f.rig.kick(kick);
    this.hits++;
    this.marker = marker;
  }

  /** `listener`: the camera position (sparks fly back towards it; far sounds are quieter). */
  apply(state: CombatState, listener: THREE.Vector3) {
    const fb = FEEDBACK.v;
    const ev = state.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev.at(i);
      at.set(e.x, e.y, e.z);
      back.subVectors(listener, at).normalize();
      this.f.sounds.play(e.kind, e.value, at.distanceTo(listener));
      switch (e.kind) {
        case 'jabL':
        case 'jabR':
        case 'heavy':
        case 'quick': {
          const [side, style] = Viewmodel.styleFor(e.kind);
          this.f.arms.punch(side, style);
          break;
        }
        case 'hitJab':
        case 'hitQuick':
          this.hit(1, fb.shakeJab, fb.kickJab, 'hit');
          break;
        case 'hitFinisher':
          this.hit(1.5, fb.shakeFinisher, fb.kickJab * 1.5, 'heavy');
          break;
        case 'hitHeavy': {
          const k = 0.5 + 0.5 * e.value;
          this.hit(2 * k, fb.shakeHeavy * k, fb.kickHeavy * k, 'heavy');
          break;
        }
        case 'kill':
          this.f.chunks.spawn(at, UP, 26, 1.3);
          this.f.rig.shake.add(fb.shakeKill);
          this.hits++;
          this.marker = 'kill';
          break;
        case 'orbPop':
          this.f.sparks.spawn(at, back, 4, 1.2);
          break;
        case 'orbHitPlayer':
          // The hurt itself (shake, flash, sound) comes from the player's 'hurt' event (M1 step 8).
          this.f.sparks.spawn(at, back, 6, 1.4);
          break;
        case 'respawn':
          this.f.targets.respawned(state, e.x, e.z);
          break;
        default:
          break;
      }
    }
  }
}
