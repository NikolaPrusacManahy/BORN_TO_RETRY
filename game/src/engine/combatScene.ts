// M1 step 6 — everything visible and audible about combat in the world: target meshes, sparks, chunks, sounds,
// and the feedback that drives them from combat events. The Game owns one of these.
// M2 — and the grunts (gruntsView.ts) and weapons on the ground, in flight and in hand (weaponsView.ts).
import * as THREE from 'three';
import type { AudioEngine } from '../audio/audio';
import { CombatSounds } from '../audio/combatSounds';
import type { CombatState } from '../sim/combat/state';
import type { CameraRig } from './cameraRig';
import { CombatFeedback } from './combatFeedback';
import { Burst } from './fx/burst';
import { GruntsView } from './gruntsView';
import { TargetsView } from './targetsView';
import { WeaponsView } from './weaponsView';
import type { Viewmodel } from './viewmodel/viewmodel';

export class CombatScene {
  readonly targets: TargetsView;
  readonly grunts: GruntsView;
  readonly weapons: WeaponsView;
  readonly feedback: CombatFeedback;
  private readonly sparks: Burst;
  private readonly chunks: Burst;

  constructor(scene: THREE.Scene, state: CombatState, audio: AudioEngine, rig: CameraRig, arms: Viewmodel) {
    this.targets = new TargetsView(scene, state);
    this.grunts = new GruntsView(scene);
    this.weapons = new WeaponsView(scene, state, arms, rig.camera);
    this.sparks = new Burst(240, new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), { speed: [4, 11], life: [0.12, 0.3], size: 0.05, gravity: 6, bounce: 0.3 });
    this.chunks = new Burst(160, new THREE.MeshStandardMaterial({ color: 0xb49a76, roughness: 0.85 }), { speed: [3, 7], life: [0.9, 1.4], size: 0.14, gravity: 20, bounce: 0.35 });
    this.chunks.mesh.castShadow = true;
    scene.add(this.sparks.mesh, this.chunks.mesh);
    this.feedback = new CombatFeedback({ rig, arms, sparks: this.sparks, chunks: this.chunks, sounds: new CombatSounds(audio), targets: this.targets });
  }

  /** Reads this frame's combat events (then clears them) and animates. `gameDt` stops during hit-stop; `alpha`: how
   *  far between the last two sim ticks this frame is (moving grunts are placed between them). */
  update(state: CombatState, listener: THREE.Vector3, playerChest: THREE.Vector3, gameDt: number, alpha: number) {
    this.feedback.apply(state, listener);
    state.events.clear();
    this.targets.update(state, playerChest, gameDt);
    this.grunts.update(state, alpha, gameDt);
    this.weapons.update(state, gameDt);
    this.sparks.update(gameDt);
    this.chunks.update(gameDt);
  }

  clear() {
    this.sparks.clear();
    this.chunks.clear();
  }

  dispose() {
    this.targets.dispose();
    this.grunts.dispose();
    this.weapons.dispose();
    for (const b of [this.sparks, this.chunks]) {
      b.mesh.removeFromParent();
      b.dispose();
    }
  }
}
