// M1 step 6 — turns combat events into everything you see and hear: the arms punching, sparks, chunks, shake,
// camera kick, hit markers, the hurt flash and sounds.
// M2 — and sword slashes, pierces and throws (the sword arm's moves), weapons breaking, and enemies arriving.
// Update 0.0.12 — the slams (yours and the brute's) and the spitter's spit.
// Update 0.0.13 — the leaper's landing, the stinger's dive and the wraith's cast; a chest's loot bursting out.
// Update 0.0.15 — the Demon: its charge crashing, its landing, its roar, its gore and the quakes (felt more the closer
// you are); its show's rumble; killed, a heavy jolt; its body bursting (chunks, sparks, a ring); the wooden gate.
// Update 0.0.16 — a key falling to the floor, and more sparks from a chest the rarer what's in it.
import * as THREE from 'three';
import type { CombatSounds } from '../audio/combatSounds';
import type { CombatState } from '../sim/combat/state';
import { FEEDBACK } from '../tuning/combat';
import type { CameraRig } from './cameraRig';
import type { Burst } from './fx/burst';
import type { Shockwaves } from './fx/shockwave';
import { ENEMIES } from '../tuning/enemies';
import { FOES } from '../tuning/foes';
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
  waves: Shockwaves;
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

  /** 1 at `at`, falling to 0 `far` m away. */
  private near(at: THREE.Vector3, listener: THREE.Vector3, far: number) {
    return Math.max(0, 1 - at.distanceTo(listener) / far);
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
        case 'heavy': {
          const [side, style] = Viewmodel.styleFor(e.kind);
          this.f.arms.punch(side, style);
          break;
        }
        case 'slash':
          this.f.arms.slash();
          break;
        case 'pierce':
          this.f.arms.sword('pierce');
          break;
        case 'throwStart':
          this.f.arms.sword('throw');
          break;
        case 'chargeStart':
          if (this.f.arms.armed) this.f.arms.sword('ready');
          break;
        case 'hitSlash':
          this.hit(1.3, fb.shakeJab * 1.4, fb.kickJab * 1.2, 'hit');
          break;
        case 'hitPierce':
          this.hit(2, fb.shakeHeavy, fb.kickHeavy, 'heavy');
          break;
        case 'hitThrown':
          this.hit(2.4, fb.shakeHeavy * 1.2, fb.kickHeavy, 'heavy');
          this.f.chunks.spawn(at, back, 8, 1);
          break;
        case 'thrownBreak':
          this.f.sparks.spawn(at, back, 16, 1.3);
          break;
        case 'enemySpawn':
          this.f.chunks.spawn(at, UP, 10, 0.8);
          break;
        // Update 0.0.12 — slams: a ring racing out over the floor and dust thrown up.
        case 'slamImpact':
          this.f.waves.spawn(at, e.value, 0xbfd8ff);
          this.f.chunks.spawn(at, UP, 18, 1.1);
          break;
        case 'bruteSlam': {
          this.f.waves.spawn(at, ENEMIES.v.bruteSlamRadius, 0xff6a2a);
          this.f.chunks.spawn(at, UP, 14, 1);
          // Felt more the closer you are.
          const near = Math.max(0, 1 - at.distanceTo(listener) / 14);
          this.f.rig.shake.add(0.45 * near);
          break;
        }
        case 'gatesShut':
          this.f.rig.shake.add(0.35);
          break;
        case 'spit':
        case 'wraithCast':
          this.f.sparks.spawn(at, back, 5, 0.8);
          break;
        case 'leaperLand': {
          this.f.waves.spawn(at, FOES.v.leaperReach, 0xb070ff);
          this.f.chunks.spawn(at, UP, 10, 0.9);
          this.f.rig.shake.add(0.3 * Math.max(0, 1 - at.distanceTo(listener) / 12));
          break;
        }
        case 'stingerDive':
          this.f.sparks.spawn(at, back, 6, 1);
          break;
        case 'chestLoot':
          this.f.sparks.spawn(at, UP, 24, 1.2);
          break;
        case 'chestRarity':
          if (e.value > 0) this.f.sparks.spawn(at, UP, 12 * e.value, 1 + 0.2 * e.value);
          break;
        case 'itemDrop':
          this.f.sparks.spawn(at, UP, 14, 0.9);
          break;
        case 'demonCrash':
          this.f.chunks.spawn(at, back, 22, 1.2);
          this.f.rig.shake.add(0.55 * this.near(at, listener, 30));
          break;
        case 'demonSlam':
          this.f.chunks.spawn(at, UP, 26, 1.3);
          this.f.rig.shake.add(0.7 * this.near(at, listener, 30));
          break;
        case 'demonRoar':
          this.f.rig.shake.add(0.5);
          break;
        case 'demonGore':
        case 'quakeHit':
          this.f.rig.shake.add(0.45);
          break;
        case 'bossRise':
          this.f.chunks.spawn(at, UP, 30, 1.4);
          break;
        case 'bossDown':
          this.f.rig.shake.add(0.8);
          this.f.sparks.spawn(at, back, 40, 1.6);
          this.hits++;
          this.marker = 'kill';
          break;
        case 'bossBurst':
          this.f.chunks.spawn(at, UP, 80, 2.2);
          this.f.sparks.spawn(at, UP, 120, 2.4);
          this.f.waves.spawn(at.set(at.x, 0, at.z), 14, 0xffd0a0);
          this.f.rig.shake.add(0.9);
          break;
        case 'woodGateOpen':
          this.f.rig.shake.add(0.2);
          break;
        case 'hitSlam':
          this.hit(1.6, fb.shakeJab, fb.kickJab, 'heavy');
          break;
        case 'hitJab':
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
