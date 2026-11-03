// Update 0.2.9 — the Game's run side, moved out of Game.ts (it had grown past its size; no change in behaviour): the
// renderer, input and sound a run plays with, the run itself and where its levels come from (the next floor, a death's
// new run), and the Lab (dev builds: the main menu's Lab, its panel's commands, its boss rooms and floors, F9's swap).
// Game.ts adds the menus, the lobby, the mouse lock and the frame loop.
// Update 0.3.23 — every level built behind the loader (`covered`: the loader up and painted first, then the build; the
// run keeps it up till the level's ready: levelLoad.ts): the Lab, its floors and boss rooms, the lobby, a run.
import type * as THREE from 'three';
import { FrameStats } from '../core/frameStats';
import { Input } from '../input/input';
import { AudioEngine } from '../audio/audio';
import type { Settings } from '../state/settings';
import type { LabCommand } from '../sim/lab/labCommands';
import { DebugInfo, HudStore, createDebugInfo } from './hudStore';
import type { DealView, InventoryView } from './fateView';
import { bossRoomLevel, dungeonLevel, labLevel, Level, newSeed } from './level';
import { Run } from './run';
import type { Levels, RunCallbacks } from './runLinks';
import type { Difficulty } from '../sim/lobby/difficulty';
import { createRenderer } from './renderer';

/** 'menu': a menu scene, idle; 'intro': Start pressed, the gate opening; 'play': a level (the lobby, a run, the Lab). */
export type GameMode = 'menu' | 'intro' | 'play';

export interface GameCallbacks extends RunCallbacks {
  /** The mouse was locked (playing) or released (Esc, a dev panel, alt-tab). */
  onLockChange(locked: boolean): void;
  /** The gate is up: start the fade to black. */
  onIntroFade(): void;
  /** Through the gate: the lobby is showing, under the black (Update 0.2.9; was the character select). */
  onIntroDone(): void;
  /** The lab is running; `locked`: the mouse is locked (Play's click got it). */
  onRunStart(locked: boolean): void;
}

export abstract class GameBase {
  readonly stats = new FrameStats();
  readonly debug: DebugInfo = createDebugInfo();
  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly input: Input;
  protected readonly audio: AudioEngine;
  protected run: Run | null = null;
  protected mode: GameMode = 'menu';
  /** F9 (dev): the lab instead of the dungeon. Update 0.0.19 — and the Lab (its boss rooms lead back to it). */
  protected inLab = false;
  /** Update 0.0.19 — the Lab's waves (the Feel Lab's knobs) are on. */
  private labWaves = false;
  /** Update 0.1.1 — the Lab's Meter: its Execution Power meter kept full (on at first; never outside the Lab). */
  private labMeter = true;
  private paused = false;
  /** Update 0.2.9 — the difficulty the run was started on (Update 0.2.12: the run plays by it; the Lab's is the real
   *  one). */
  runDifficulty: Difficulty = 'real';
  /** Update 0.2.17 — the run deals Fate Cards (the lobby's stand; the Lab's always do). */
  runCards = true;
  /** Update 0.3.23 — the loader's going up before a build: nothing else runs meanwhile; the game's gone (no build). */
  protected covering = false;
  protected gone = false;
  protected readonly levels: Levels = {
    fresh: () => (this.inLab ? labLevel() : dungeonLevel(newSeed(), 1)),
    next: (l: Level) => (this.inLab && l.bossRoom ? labLevel() : dungeonLevel(l.seed, l.floor + 1)),
    again: (l: Level) => (l.bossRoom ? bossRoomLevel(l.seed, l.floor) : dungeonLevel(l.seed, l.floor)),
  };

  constructor(
    protected readonly host: HTMLElement,
    protected settings: Settings,
    protected readonly hud: HudStore,
    protected readonly cb: GameCallbacks,
  ) {
    this.renderer = createRenderer(host);
    this.input = new Input(host);
    this.audio = new AudioEngine(this.volumes());
  }

  protected volumes() {
    const s = this.settings;
    return { master: s.volume, sfx: s.sfxVolume, music: s.musicVolume };
  }

  /** Update 0.3.23 — the loader up and on screen (two frames), then `build` (a level's made: the run keeps the loader up
   *  till it's ready). */
  protected covered(build: () => void) {
    if (this.covering) return;
    this.covering = true;
    this.cb.onLoading?.(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.covering = false;
        if (!this.gone) build();
      }),
    );
  }

  /** Update 0.0.19 — into the Lab (the main menu's Lab, dev builds). Call once the screen is black. */
  startLab() {
    this.covered(() => {
      this.inLab = true;
      this.mode = 'play';
      this.newRun(labLevel());
      this.input.clear();
      this.cb.onRunStart(document.pointerLockElement === this.host);
    });
  }

  /** Update 0.0.19 — in the Lab (or one of its boss rooms). */
  get lab(): boolean {
    return this.mode === 'play' && this.inLab;
  }

  /** Update 0.0.19 — away from the Lab (one of its boss rooms; Update 0.0.20 — or a floor started from it). */
  get labAway(): boolean {
    return this.lab && (this.run?.floor ?? 0) > 0;
  }

  get labWavesOn(): boolean {
    return this.labWaves;
  }

  get labMeterOn(): boolean {
    return this.labMeter;
  }

  /** Update 0.0.19 — the Lab's panel asked for something. */
  labCommand(cmd: LabCommand) {
    if (this.lab) this.run?.labCommand(cmd);
  }

  /** Update 0.0.19 — the Demon's (floor 1) or the Dragon's (floor 2) boss room, from the Lab. Update 0.2.3 — or the
   *  Bone King's (floor 3). Update 0.2.4 — or the Dino's (floor 4). Update 0.2.10 — or the Drowned King's (floor 5).
   *  Update 0.3.16 — or the Big Shark's (floor 6). */
  labBoss(kind: 'demon' | 'dragon' | 'boneKing' | 'dino' | 'drownedKing' | 'whale' | 'bigShark') {
    if (this.lab) this.covered(() => this.newRun(bossRoomLevel(newSeed(), kind === 'demon' ? 1 : kind === 'dragon' ? 2 : kind === 'boneKing' ? 3 : kind === 'dino' ? 4 : kind === 'drownedKing' ? 5 : 6)));
  }

  /** Update 0.0.20 — floor `floor` (1–3) from the Lab, from its start. Update 0.3.11 — up to 7 (past the run's end:
   *  its way down wins, as the last floor's). */
  labFloor(floor: number) {
    if (this.lab) this.covered(() => this.newRun(dungeonLevel(newSeed(), floor)));
  }

  /** Update 0.0.19 — back to the Lab from a boss room (or a floor). */
  backToLab() {
    if (this.lab) this.covered(() => this.newRun(labLevel()));
  }

  setLabWaves(on: boolean) {
    this.labWaves = on;
    if (this.run && this.inLab) this.run.waves = on;
  }

  setLabMeter(on: boolean) {
    this.labMeter = on;
    if (this.inLab) this.run?.labCommand({ kind: 'meter', on });
  }

  /** Update 0.2.16 — Fate Cards: the deal's card `i` taken; the deal screen done; what you carry (TAB) and the world
   *  held still while it shows. */
  pickCard(i: number) {
    this.run?.pickCard(i);
  }

  endDeal() {
    this.run?.endDeal();
  }

  rerollDeal(): DealView | null {
    return this.run?.rerollDeal() ?? null;
  }

  inventory(): InventoryView | null {
    return this.run?.inventory() ?? null;
  }

  holdInventory(on: boolean) {
    if (this.run) this.run.hold = on;
  }

  /** Update 0.0.19 — the world holds still (the Lab's panel is open). */
  setLabHold(on: boolean) {
    if (this.run) this.run.hold = on;
  }

  /** Update 0.3.12 — the pause menu is up (the designer: "pause menu actually pauses the game"): no time passes. A new
   *  run starts as paused as the last. */
  setPaused(on: boolean) {
    this.paused = on;
    if (this.run) this.run.paused = on;
  }

  protected newRun(level: Level) {
    this.run?.dispose();
    this.run = new Run(level, this.audio, this.renderer, this.hud, this.cb, this.levels, this.inLab ? 'real' : this.runDifficulty, this.inLab || this.runCards);
    this.run.waves = !this.inLab || this.labWaves;
    this.run.paused = this.paused;
    if (this.inLab) this.run.labCommand({ kind: 'meter', on: this.labMeter });
  }

  /** Back to the start, full health; the targets back in place and whole (F3, Restart). */
  restart() {
    this.run?.restart();
  }
}
