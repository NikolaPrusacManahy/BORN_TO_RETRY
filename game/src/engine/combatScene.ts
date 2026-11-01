// M1 step 6 — everything visible and audible about combat in the world: target meshes, sparks, chunks, sounds,
// and the feedback that drives them from combat events. The Game owns one of these.
// M2 — and the enemies (enemiesView.ts) and weapons on the ground, in flight and in hand (weaponsView.ts).
// Update 0.0.12 — and shockwaves (slams).
// Update 0.0.15 — and the Demon (boss/demonView.ts) and what its moves draw (boss/demonFx.ts).
// Update 0.0.18 — and the Dragon (boss/dragonView.ts). Update 0.0.21 — and its fire bombs (boss/bombView.ts).
// Update 0.2.3 — and the Bone King's thrown skeletons, its jumps' landings and its blast's reach (boss/kingView.ts).
// Update 0.2.4 — and floor 4's burrowers' sand and warnings, the Dino's pounce landing (desertFx.ts).
// Update 0.2.8 — the Velociraptor's sandstorm, its eyes in it, its blitz's afterimages (boss/raptorFx.ts).
// Update 0.2.10 — floor 5's fins, rings on the water, spikes and lash lines (drownedFx.ts).
// Update 0.2.11 — floor 6's bubble columns, shadows, lanes, rings and jets (fishFx.ts).
// Update 0.2.23 — floor 2's wasps' hives (hivesView.ts), and its tall grass parting round you and the enemies.
// Update 0.2.26 — blood (bloodFx.ts). Update 0.2.27 — the enemies' shots (shotsView.ts). Update 0.2.28 — your
// blows' arcs, dust rings and the hammer's rocks (blowsFx.ts). Update 0.3.0 — the halos (halos.ts): each frame starts
// with none.
// Update 0.1.2 — and executions (exec/execScene.ts: the body, its pieces, the frog's tongue).
// Update 0.1.4 — and the Grimoire's fireballs (fireView.ts). Update 0.1.9 — and the daggers' volley (knivesView.ts).
// Update 0.1.12 — and the skull over the enemy you can execute (execMarkView.ts).
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
import { KingView } from './boss/kingView';
import { DesertFx } from './desertFx';
import { RaptorFx } from './boss/raptorFx';
import { DrownedFx } from './drownedFx';
import { FishFx } from './fishFx';
import { EnemiesView } from './enemiesView';
import { ExecScene } from './exec/execScene';
import { FireView } from './fireView';
import { KnivesView } from './knivesView';
import { CardFx } from './cardFx';
import { GunView } from './gunView';
import { ExecMarkView } from './execMarkView';
import { Shockwaves } from './fx/shockwave';
import { CoinsView } from './coinsView';
import { TargetsView } from './targetsView';
import { HivesView } from './hivesView';
import { BloodFx } from './bloodFx';
import { ShotsView } from './shotsView';
import { BlowsFx } from './blowsFx';
import { HALOS } from './halos';
import { pushGrass } from './grassShader';
import { WeaponsView } from './weaponsView';
import type { Viewmodel } from './viewmodel/viewmodel';

export class CombatScene {
  readonly targets: TargetsView;
  readonly enemies: EnemiesView;
  readonly exec: ExecScene;
  private readonly fire: FireView;
  private readonly knives: KnivesView;
  /** Update 0.2.18 — wave 2's Fate Cards (fire, frost, blood, lightning, blasts). */
  private readonly cards: CardFx;
  private readonly gun: GunView;
  private readonly execMark: ExecMarkView;
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
  private readonly king: KingView;
  private readonly desert: DesertFx;
  private readonly drowned: DrownedFx;
  private readonly fish: FishFx;
  readonly raptor: RaptorFx;
  private readonly hives: HivesView;
  private readonly blood: BloodFx;
  private readonly shots: ShotsView;
  private readonly blows: BlowsFx;
  private readonly camera: THREE.Camera;

  constructor(scene: THREE.Scene, state: CombatState, audio: AudioEngine, rig: CameraRig, arms: Viewmodel) {
    this.targets = new TargetsView(scene, state);
    this.enemies = new EnemiesView(scene);
    this.exec = new ExecScene(scene);
    this.demon = new DemonView(scene);
    this.demonFx = new DemonFx(scene);
    this.dragon = new DragonView(scene);
    this.bombs = new BombView(scene);
    this.king = new KingView(scene);
    this.desert = new DesertFx(scene);
    this.drowned = new DrownedFx(scene);
    this.fish = new FishFx(scene);
    this.raptor = new RaptorFx(scene);
    this.hives = new HivesView(scene, state);
    this.blood = new BloodFx(scene);
    this.shots = new ShotsView(scene, state, this.blood);
    this.blows = new BlowsFx(scene, rig.camera);
    this.camera = rig.camera;
    scene.add(HALOS.mesh);
    this.coins = new CoinsView(scene);
    scene.add(this.waves.group);
    this.weapons = new WeaponsView(scene, state, arms, rig.camera);
    this.fire = new FireView(scene, arms, rig.camera);
    this.knives = new KnivesView(scene, arms, rig.camera);
    this.cards = new CardFx(scene, rig.camera);
    this.gun = new GunView(scene, arms, rig.camera);
    this.execMark = new ExecMarkView(scene, this.rootOf);
    this.sparks = new Burst(240, new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), { speed: [4, 11], life: [0.12, 0.3], size: 0.05, gravity: 6, bounce: 0.3 });
    this.chunks = new Burst(160, new THREE.MeshStandardMaterial({ color: 0xb49a76, roughness: 0.85 }), { speed: [3, 7], life: [0.9, 1.4], size: 0.14, gravity: 20, bounce: 0.35 });
    this.chunks.mesh.castShadow = true;
    scene.add(this.sparks.mesh, this.chunks.mesh);
    this.feedback = new CombatFeedback({ rig, arms, sparks: this.sparks, chunks: this.chunks, sounds: new CombatSounds(audio), targets: this.targets, waves: this.waves });
  }

  /** Reads this frame's combat events (then clears them) and animates. `gameDt` stops during hit-stop; `alpha`: how
   *  far between the last two sim ticks this frame is (moving enemies are placed between them). */
  update(state: CombatState, listener: THREE.Vector3, playerChest: THREE.Vector3, gameDt: number, alpha: number) {
    HALOS.begin(this.camera);
    this.feedback.apply(state, listener);
    this.blood.apply(state, listener);
    this.blows.apply(state);
    this.demonFx.update(state, gameDt);
    this.gun.update(state, gameDt);
    state.events.clear();
    this.targets.update(state, playerChest, gameDt);
    this.hives.update(state, gameDt);
    this.blood.update(gameDt);
    this.shots.update(state, gameDt);
    this.blows.update(gameDt);
    pushGrass(state.enemies, playerChest);
    this.enemies.update(state, alpha, gameDt);
    this.exec.update(state, this.rootOf, gameDt);
    this.execMark.update(state, gameDt);
    this.demon.update(state, listener, alpha, gameDt);
    this.dragon.update(state, listener, alpha, gameDt);
    this.bombs.update(state, gameDt);
    this.king.update(state, gameDt, (i) => this.enemies.rootOf(i));
    this.desert.update(state, gameDt);
    this.drowned.update(state, gameDt);
    this.fish.update(state, gameDt);
    this.raptor.update(state, alpha, gameDt, (i) => this.enemies.headOf(i));
    this.waves.update(gameDt);
    this.coins.update(state.coins, gameDt);
    this.weapons.update(state, gameDt);
    this.fire.update(state, gameDt);
    this.knives.update(state, gameDt);
    this.cards.update(state, gameDt);
    this.sparks.update(gameDt);
    this.chunks.update(gameDt);
  }

  /** Update 0.1.20 — where the execution skull is drawn now (null: none). */
  markAt(): THREE.Vector3 | null {
    return this.execMark.sprite.visible ? this.execMark.sprite.position : null;
  }

  clear() {
    this.sparks.clear();
    this.chunks.clear();
    this.waves.clear();
    this.demonFx.clear();
    this.bombs.clear();
    this.king.clear();
    this.desert.clear();
    this.drowned.clear();
    this.fish.clear();
    this.fire.clear();
    this.knives.clear();
    this.cards.clear();
    this.gun.clear();
    this.execMark.clear();
    this.exec.clear();
  }

  dispose() {
    this.targets.dispose();
    this.enemies.dispose();
    this.exec.dispose();
    this.demon.dispose();
    this.dragon.dispose();
    this.bombs.dispose();
    this.king.dispose();
    this.desert.dispose();
    this.drowned.dispose();
    this.fish.dispose();
    this.raptor.dispose();
    this.hives.dispose();
    this.blood.dispose();
    this.shots.dispose();
    this.blows.dispose();
    HALOS.mesh.removeFromParent();
    this.demonFx.dispose();
    this.waves.dispose();
    this.coins.dispose();
    this.weapons.dispose();
    this.fire.dispose();
    this.gun.dispose();
    this.knives.dispose();
    this.cards.dispose();
    this.execMark.dispose();
    for (const b of [this.sparks, this.chunks]) {
      b.mesh.removeFromParent();
      b.dispose();
    }
  }
}
