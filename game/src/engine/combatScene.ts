// M1 step 6 — everything visible and audible about combat in the world: target meshes, sparks, chunks, sounds,
// and the feedback that drives them from combat events. The Game owns one of these.
// M2 — and the enemies (enemiesView.ts) and weapons on the ground, in flight and in hand (weaponsView.ts).
// Update 0.0.12 — and shockwaves (slams).
// Update 0.0.15 — and the Demon (boss/demonView.ts) and what its moves draw (boss/demonFx.ts).
// Update 0.0.18 — and the Dragon (boss/dragonView.ts). Update 0.0.21 — and its fire bombs (boss/bombView.ts).
// Update 0.1.2 — and executions (exec/execScene.ts: the body, its pieces, the frog's tongue).
// Update 0.1.4 — and the Grimoire's fireballs (fireView.ts). Update 0.1.9 — and the daggers' volley (knivesView.ts).
import * as THREE from 'three';
import type { AudioEngine } from '../audio/audio';
import { CombatSounds } from '../audio/combatSounds';
import type { CombatState } from '../sim/combat/state';
import type { CameraRig } from './cameraRig';
import { CombatFeedback } from './combatFeedback';
import { Burst } from './fx/burst';
import { DemonFx } from './boss/demonFx';
import { DemonView } from './boss/demonView';
import { DragonView } from './boss/dragonView';
import { BombView } from './boss/bombView';
import { EnemiesView } from './enemiesView';
import { ExecScene } from './exec/execScene';
import { FireView } from './fireView';
import { KnivesView } from './knivesView';
import { Shockwaves } from './fx/shockwave';
import { CoinsView } from './coinsView';
import { TargetsView } from './targetsView';
import { WeaponsView } from './weaponsView';
import type { Viewmodel } from './viewmodel/viewmodel';

export class CombatScene {
  readonly targets: TargetsView;
  readonly enemies: EnemiesView;
  readonly exec: ExecScene;
  private readonly fire: FireView;
  private readonly knives: KnivesView;
  private readonly rootOf = (i: number) => this.enemies.rootOf(i);
  private readonly waves = new Shockwaves();
  private readonly coins: CoinsView;
  readonly weapons: WeaponsView;
  readonly feedback: CombatFeedback;
  private readonly sparks: Burst;
  private readonly chunks: Burst;
  private readonly demon: DemonView;
  private readonly demonFx: DemonFx;
  private readonly dragon: DragonView;
  private readonly bombs: BombView;

  constructor(scene: THREE.Scene, state: CombatState, audio: AudioEngine, rig: CameraRig, arms: Viewmodel) {
    this.targets = new TargetsView(scene, state);
    this.enemies = new EnemiesView(scene);
    this.exec = new ExecScene(scene);
    this.demon = new DemonView(scene);
    this.demonFx = new DemonFx(scene);
    this.dragon = new DragonView(scene);
    this.bombs = new BombView(scene);
    this.coins = new CoinsView(scene);
    scene.add(this.waves.group);
    this.weapons = new WeaponsView(scene, state, arms, rig.camera);
    this.fire = new FireView(scene, arms, rig.camera);
    this.knives = new KnivesView(scene, arms, rig.camera);
    this.sparks = new Burst(240, new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), { speed: [4, 11], life: [0.12, 0.3], size: 0.05, gravity: 6, bounce: 0.3 });
    this.chunks = new Burst(160, new THREE.MeshStandardMaterial({ color: 0xb49a76, roughness: 0.85 }), { speed: [3, 7], life: [0.9, 1.4], size: 0.14, gravity: 20, bounce: 0.35 });
    this.chunks.mesh.castShadow = true;
    scene.add(this.sparks.mesh, this.chunks.mesh);
    this.feedback = new CombatFeedback({ rig, arms, sparks: this.sparks, chunks: this.chunks, sounds: new CombatSounds(audio), targets: this.targets, waves: this.waves });
  }

  /** Reads this frame's combat events (then clears them) and animates. `gameDt` stops during hit-stop; `alpha`: how
   *  far between the last two sim ticks this frame is (moving enemies are placed between them). */
  update(state: CombatState, listener: THREE.Vector3, playerChest: THREE.Vector3, gameDt: number, alpha: number) {
    this.feedback.apply(state, listener);
    this.demonFx.update(state, gameDt);
    state.events.clear();
    this.targets.update(state, playerChest, gameDt);
    this.enemies.update(state, alpha, gameDt);
    this.exec.update(state, this.rootOf, gameDt);
    this.demon.update(state, listener, alpha, gameDt);
    this.dragon.update(state, listener, alpha, gameDt);
    this.bombs.update(state, gameDt);
    this.waves.update(gameDt);
    this.coins.update(state.coins, gameDt);
    this.weapons.update(state, gameDt);
    this.fire.update(state, gameDt);
    this.knives.update(state, gameDt);
    this.sparks.update(gameDt);
    this.chunks.update(gameDt);
  }

  clear() {
    this.sparks.clear();
    this.chunks.clear();
    this.waves.clear();
    this.demonFx.clear();
    this.bombs.clear();
    this.fire.clear();
    this.knives.clear();
    this.exec.clear();
  }

  dispose() {
    this.targets.dispose();
    this.enemies.dispose();
    this.exec.dispose();
    this.demon.dispose();
    this.dragon.dispose();
    this.bombs.dispose();
    this.demonFx.dispose();
    this.waves.dispose();
    this.coins.dispose();
    this.weapons.dispose();
    this.fire.dispose();
    this.knives.dispose();
    for (const b of [this.sparks, this.chunks]) {
      b.mesh.removeFromParent();
      b.dispose();
    }
  }
}
