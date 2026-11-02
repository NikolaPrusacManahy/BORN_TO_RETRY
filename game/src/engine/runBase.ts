// Update 0.1.14 — a run's level, moved out of run.ts (it had grown past its size; no change in behaviour): its parts
// (the player, the camera and the arms, the combat and its scene, the treasure, the boss room's show), loading a level
// (the next floor keeps what you carry; otherwise a fresh start), back to its start, and the Lab's commands. The play
// loop (the ticks and the frame) is run.ts's.
// Update 0.1.14 — the time played since the run's start, and the death screen up (Restart, its Retry, is a new run).
// Update 0.2.12 — the run plays by its difficulty (the designer): on WEAKLING EXPERIENCE a death sends you back to the
// checkpoint (`respawn`); on ARE YOU EVEN HUMAN? there's nothing to find (`CombatState.bare`) and no shop.
import { groundOf } from '../sim/dungeon/ground';
import * as THREE from 'three';
import { FixedStep } from '../core/fixedStep';
import { createRng } from '../core/rng';
import type { AudioEngine } from '../audio/audio';
import { MoveSounds } from '../audio/moveSounds';
import type { MoveResult } from '../sim/collisionWorld';
import { CombatIntent, emptyCombatIntent } from '../sim/combat/fists';
import { carryOver, CombatState, createCombat, resetCombat } from '../sim/combat/state';
import { emptyTreasure, Treasure } from '../sim/dungeon/treasure';
import { stockShop } from '../sim/cards/shopCard';
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
import { ChestShot } from './chestShot';
import { emptyFocus } from '../sim/items/focus';
import { HudFeed } from './overlayFeed';
import { Viewmodel } from './viewmodel/viewmodel';
import { cancelCharges } from '../sim/weapons/kiCharge';
import { pickCard, rerollDeal } from '../sim/cards/deal';
import { DealView, dealView, InventoryView, inventoryView } from './fateView';
import type { Difficulty } from '../sim/lobby/difficulty';
import { abandonAll } from '../sim/dungeon/checkpoint';
import { maxHpOf } from '../sim/player/health';
import { hpBonusOf } from '../sim/items/items';
import { createHives } from '../sim/dungeon/hives';

/** Update 0.2.8 (the designer: display "FLOOR 1" when they start playing) — a new run starts under the loader (at
 *  least its LOAD_MIN, 1 s) and its black clearing (0.5 s): its floor's name waits that long. */
export const LOADER_HIDES = 1.5;

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
  /** Update 0.2.0 — the view going to a chest rising out of the floor. */
  protected readonly chestShot = new ChestShot();
  protected level!: Level;
  protected view!: LevelView;
  protected combat!: CombatState;
  protected combatScene!: CombatScene;
  protected hazards: ArenaBox[] = [];
  /** Update 0.0.20 — lava: falling in sends you back to the level's start. */
  protected lava: ArenaBox[] = [];
  /** Counts hits on you (and, Update 0.0.13, on your shield), for the HUD's flashes. Update 0.2.11 — and your kicks
   *  under water (bubbles). */
  protected readonly hits = { hurts: 0, shields: 0, kicks: 0 };
  /** Update 0.0.13 — the shop and the chests. Update 0.0.19 — every level's (the Lab's: chests from its panel). */
  protected treasure: Treasure = emptyTreasure();
  protected treasureView!: TreasureView;
  /** Update 0.0.19 — the Lab's waves come (the Feel Lab's knobs); the world holds still (the Lab's panel is open). */
  waves = true;
  hold = false;
  /** Update 0.3.12 — the pause menu is up: no time passes at all (Run.frame). */
  paused = false;
  /** Update 0.2.16 — a deal of Fate Cards is up (the world holds still till you've taken one and the screen's done). */
  protected dealing = false;
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
    readonly difficulty: Difficulty = 'real',
    /** Update 0.2.17 — chests deal Fate Cards (the lobby's stand). */
    readonly cards = true,
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
    // (Update 0.2.12 — ARE YOU EVEN HUMAN?: no shop.)
    if (this.difficulty === 'human') this.treasure.offers.length = 0;
    this.show = new BossShow(level.dungeon);
    // (Back to the Lab from its boss room: no floor's name.) Update 0.2.8 (the designer: display "FLOOR 1" when they start
    // playing): every floor's start shows its name, a new run's and a Retry's too; not the Lab's lone boss room.
    if (level.dungeon && !level.bossRoom) this.show.arrive(level.floor);
    this.hazards = hazardsOf(level.arena);
    this.lava = lavaOf(level.arena);
    // (Update 0.2.9 — the lobby has no enemies: no walk grids.)
    this.combat = createCombat(level.arena, !level.dungeon && !level.lobby);
    this.combat.hives = createHives(level.dungeon?.level.hives ?? []);
    this.combat.ground = groundOf(level.dungeon?.level);
    this.combat.rng = createRng(level.fightSeed);
    this.combat.bare = this.difficulty === 'human';
    this.combat.fate = this.cards;
    this.combatScene = new CombatScene(this.scene, this.combat, this.audio, this.rig, this.arms);
    this.restartHere();
    if (keep && old) {
      this.player.hp = hp;
      this.player.shield = shield;
      carryOver(old, this.combat);
    }
    // (Update 0.2.20 — the shop's Fate Card, by what you carry down; then the shop and chests are drawn.)
    stockShop(this.treasure, this.combat);
    this.treasureView = new TreasureView(this.scene, this.treasure);
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

  /** Update 0.2.12 — WEAKLING EXPERIENCE (the designer: "no one life punishment, player just respawn"): dead, you're
   *  back at the checkpoint (outside the door of the room you died in), full health, all you carry kept; the fight
   *  starts over when you go back in, the boss's too. */
  protected respawn() {
    const d = this.level.dungeon;
    const at = d?.checkpoint ?? this.level.arena.playerStart;
    if (d) abandonAll(d, this.combat);
    resetPlayer(this.player, at.x, at.y, at.z, at.yaw);
    this.player.hpBonus = hpBonusOf(this.combat.items);
    this.player.hp = maxHpOf(this.player);
    this.arms.reset();
    this.combatScene.clear();
    this.prev.copy(this.player.pos);
    this.look.yaw = at.yaw;
    this.look.pitch = 0;
    this.rig.reset();
    this.clock.reset();
    this.death.reset();
    this.cb.onRespawn();
  }

  /** Update 0.2.9 — in the lobby (its stations, the main gate). */
  get inLobby(): boolean {
    return !!this.level.lobby;
  }

  /** Update 0.2.9 — turned back at the gate: just in front of it, facing it, the portcullis shut. */
  backFromGate(spot: { x: number; y: number; z: number; yaw: number }) {
    const l = this.level.lobby;
    if (!l) return;
    l.opening = false;
    resetPlayer(this.player, spot.x, spot.y, spot.z, spot.yaw);
    this.prev.copy(this.player.pos);
    this.look.yaw = spot.yaw;
    this.look.pitch = 0;
    this.rig.reset();
  }

  /** Update 0.2.8 — the floor's name waits `secs` (a new run's loader and its black still cover the screen: Game's
   *  startRun, LOADER_HIDES). */
  holdFloorTitle(secs: number) {
    if (this.level.dungeon && !this.level.bossRoom) this.show.arrive(this.level.floor, secs);
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

  /** Update 0.2.16 — the deal's card `i` is taken (the deal screen still shows it flying to your coins). */
  pickCard(i: number) {
    pickCard(this.combat, this.player, i);
  }

  /** Update 0.2.22 — the deal is dealt again, paid for: what it shows now (null: you couldn't pay). */
  rerollDeal(): DealView | null {
    return rerollDeal(this.combat) ? dealView(this.combat) : null;
  }

  /** Update 0.2.16 — the deal screen is done: play on. */
  endDeal() {
    this.dealing = false;
    this.hold = false;
  }

  /** Update 0.2.16 — what you carry (TAB). */
  inventory(): InventoryView {
    return inventoryView(this.combat, this.player);
  }

  /** The mouse was freed: a charge in progress is cancelled rather than thrown (Update 0.1.4: and the Grimoire's). */
  cancelCharge() {
    cancelCharges(this.combat);
  }

  /** Loops off (leaving for the menu). */
  silence() {
    this.sounds.setSliding(false);
    this.sounds.setWallRunning(false);
    this.audio.muffle(false);
  }

  dispose() {
    this.combatScene.dispose();
    this.view.dispose();
    this.treasureView.dispose();
    this.prompts.dispose();
    this.level.physics.dispose();
  }
}
