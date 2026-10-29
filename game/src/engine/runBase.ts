// Update 0.1.14 — a run's level, moved out of run.ts (it had grown past its size; no change in behaviour): its parts
// (the player, the camera and the arms, the combat and its scene, the treasure, the boss room's show), loading a level
// (the next floor keeps what you carry; otherwise a fresh start), back to its start, and the Lab's commands. The play
// loop (the ticks and the frame) is run.ts's.
// Update 0.1.14 — the time played since the run's start, and the death screen up (Restart, its Retry, is a new run).
import * as THREE from 'three';
import { FixedStep } from '../core/fixedStep';
import { createRng } from '../core/rng';
import type { AudioEngine } from '../audio/audio';
import { MoveSounds } from '../audio/moveSounds';
import type { MoveResult } from '../sim/collisionWorld';
import { CombatIntent, emptyCombatIntent } from '../sim/combat/fists';
import { carryOver, CombatState, createCombat, resetCombat } from '../sim/combat/state';
import { emptyTreasure, Treasure } from '../sim/dungeon/treasure';
import { LabCommand, runLab } from '../sim/lab/labCommands';
import type { KeyKind } from '../sim/items/items';
import { PlayerIntent, emptyIntent } from '../sim/player/intent';
import { PlayerState, createPlayer, resetPlayer } from '../sim/player/state';
import { ArenaBox, hazardsOf, lavaOf } from '../world/arena';
import { CameraRig } from './cameraRig';
import { CombatScene } from './combatScene';
import { DeathFlow } from './deathFlow';
import type { HudStore } from './hudStore';
import type { Level, LevelView } from './level';
import type { Levels, RunCallbacks } from './runLinks';
import { Look } from './look';
import { BossShow } from './boss/bossShow';
import { TreasureView } from './treasureView';
import { PromptView } from './promptView';
import { emptyFocus } from '../sim/items/focus';
import { HudFeed } from './overlayFeed';
import { Viewmodel } from './viewmodel/viewmodel';
import { cancelCharges } from '../sim/weapons/kiCharge';

export abstract class RunBase {
  protected readonly scene = new THREE.Scene();
  protected readonly camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 400);
  protected readonly rig = new CameraRig(this.camera);
  protected readonly look = new Look();
  protected readonly clock = new FixedStep();
  protected readonly sounds: MoveSounds;
  protected readonly player: PlayerState;
  protected readonly arms = new Viewmodel();
  protected readonly hudFeed: HudFeed;
  protected readonly death = new DeathFlow();
  protected readonly prev = new THREE.Vector3();
  protected readonly chest = new THREE.Vector3();
  protected readonly intent: PlayerIntent = emptyIntent();
  protected readonly combatIntent: CombatIntent = emptyCombatIntent();
  protected readonly shove: MoveResult = { grounded: false, hitCeiling: false, wall: false, wallNormal: new THREE.Vector3() };
  /** Update 0.1.20 — the [E] prompts and item cards, and what they're about. */
  protected readonly prompts: PromptView;
  protected readonly focus = emptyFocus();
  protected level!: Level;
  protected view!: LevelView;
  protected combat!: CombatState;
  protected combatScene!: CombatScene;
  protected hazards: ArenaBox[] = [];
  /** Update 0.0.20 — lava: falling in sends you back to the level's start. */
  protected lava: ArenaBox[] = [];
  /** Counts hits on you (and, Update 0.0.13, on your shield), for the HUD's flashes. */
  protected readonly hits = { hurts: 0, shields: 0 };
  /** Update 0.0.13 — the shop and the chests. Update 0.0.19 — every level's (the Lab's: chests from its panel). */
  protected treasure: Treasure = emptyTreasure();
  protected treasureView!: TreasureView;
  /** Update 0.0.19 — the Lab's waves come (the Feel Lab's knobs); the world holds still (the Lab's panel is open). */
  waves = true;
  hold = false;
  protected show = new BossShow(null);
  /** Update 0.1.14 — seconds played since this start (the death screen), and the death screen is up. */
  protected played = 0;
  protected told = false;
  /** Update 0.0.16 — a key's look, for the palm (made once). */
  protected readonly keyLook = (kind: KeyKind) => this.treasureView.look(kind);
  /** Is a dungeon room fighting (made once: no closure per tick; −1: the Lab's chests, never). */
  protected readonly fighting = (room: number) => this.level.dungeon?.rooms[room]?.state === 'fighting';

  constructor(
    level: Level,
    protected readonly audio: AudioEngine,
    protected readonly renderer: THREE.WebGLRenderer,
    hud: HudStore,
    protected readonly cb: RunCallbacks,
    protected readonly levels: Levels,
  ) {
    // Loading the same models again (each floor) comes from memory.
    THREE.Cache.enabled = true;
    this.scene.add(this.camera);
    this.sounds = new MoveSounds(audio);
    const s = level.arena.playerStart;
    this.player = createPlayer(s.x, s.y, s.z, s.yaw);
    this.hudFeed = new HudFeed(hud);
    this.prompts = new PromptView(renderer.domElement.parentElement);
    this.load(level, false);
  }

  get floor(): number {
    return this.level.floor;
  }

  /** Into `level`. `keep`: your health, coins and weapon come along (the way down); otherwise a fresh start. */
  load(level: Level, keep: boolean) {
    const old = this.combat;
    const hp = this.player.hp;
    const shield = this.player.shield;
    if (this.level) {
      this.combatScene.dispose();
      this.view.dispose();
      this.treasureView.dispose();
      if (this.level.physics !== level.physics) this.level.physics.dispose();
    }
    this.level = level;
    if (!keep) this.played = 0;
    this.view = level.draw(this.scene, this.renderer);
    this.treasure = level.dungeon?.treasure ?? emptyTreasure();
    this.treasureView = new TreasureView(this.scene, this.treasure);
    this.show = new BossShow(level.dungeon);
    // (Back to the Lab from its boss room: no floor's name.)
    if (keep && level.dungeon) this.show.arrive(level.floor);
    this.hazards = hazardsOf(level.arena);
    this.lava = lavaOf(level.arena);
    this.combat = createCombat(level.arena, !level.dungeon);
    this.combat.rng = createRng(level.fightSeed);
    this.combatScene = new CombatScene(this.scene, this.combat, this.audio, this.rig, this.arms);
    this.restartHere();
    if (keep && old) {
      this.player.hp = hp;
      this.player.shield = shield;
      carryOver(old, this.combat);
    }
  }

  /** Back to the level's start, standing still, full health; the targets back in place and whole. */
  protected restartHere() {
    const s = this.level.arena.playerStart;
    resetPlayer(this.player, s.x, s.y, s.z, s.yaw);
    resetCombat(this.combat, this.level.arena);
    this.combat.rng = createRng(this.level.fightSeed);
    this.arms.reset();
    this.combatScene.clear();
    this.prev.copy(this.player.pos);
    this.look.yaw = s.yaw;
    this.look.pitch = 0;
    this.rig.reset();
    this.clock.reset();
    this.told = false;
    if (this.death.active) {
      this.death.reset();
      this.cb.onRespawn();
    }
  }

  /** F3 and Restart: the lab from its start; a dungeon floor laid out again from its start. Update 0.1.14 — the
   *  death screen's Retry: a new run. */
  restart() {
    if (this.told) this.load(this.levels.fresh(), false);
    else if (this.level.dungeon) this.load(this.levels.again(this.level), false);
    else this.restartHere();
  }

  /** Update 0.0.19 — the Lab's panel asked for something (in front of where you look). */
  labCommand(cmd: LabCommand) {
    runLab(cmd, this.combat, this.player, this.look.yaw, this.treasure);
  }

  /** The mouse was freed: a charge in progress is cancelled rather than thrown (Update 0.1.4: and the Grimoire's). */
  cancelCharge() {
    cancelCharges(this.combat);
  }

  /** Loops off (leaving for the menu). */
  silence() {
    this.sounds.setSliding(false);
    this.sounds.setWallRunning(false);
  }

  dispose() {
    this.combatScene.dispose();
    this.view.dispose();
    this.treasureView.dispose();
    this.prompts.dispose();
    this.level.physics.dispose();
  }
}
