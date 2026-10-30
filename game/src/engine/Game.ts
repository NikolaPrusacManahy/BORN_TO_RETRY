// M1 — the shell around the Feel Lab: the renderer, input, sound, the mouse lock and fullscreen, and the frame
// loop. Thin on purpose: the lab itself (player, fists, camera, arms) is LabRun; the main menu is MenuScene.
// Update 0.0.4 — it opens on the main menu's gate scene (engine/menu/); Start opens the gate, then the lab.
// M1 step 8 — the play loop moved to labRun.ts when health and death joined.
// Update 0.0.7 — the menu has a second view: the night camp, where the settings are.
// Update 0.0.8 — and a third: the prison corridor, the character select, which the gate opens onto.
// Update 0.0.12 — Play starts a dungeon run (a new floor plan from a new seed); the way down makes the next floor; a
// death starts a new run. The Feel Lab is a dev key away (F9).
// Update 0.0.19 — the Lab (dev builds: the main menu's Lab): the Feel Lab with its panel (F8): what it asks for
// appears in front of you, and a boss room is a click away (its show, its fight; leaving it, or dying, is back to the
// Lab). The Lab's own waves are off unless switched on.
// Update 0.0.20 — and any floor (1, 2, 3) from the Lab: a real run from there on (the way down goes on to the next
// floor); dying, or Back, is the Lab again.
import { LOADER_HIDES } from './runBase';
import * as THREE from 'three';
import { MAX_FRAME } from '../core/fixedStep';
import { FrameStats } from '../core/frameStats';
import { Input } from '../input/input';
import { AudioEngine } from '../audio/audio';
import { requestLock, releaseLock } from '../platform/pointerLock';
import { FullscreenState, enterFullscreen, exitFullscreen, state as fullscreenState } from '../platform/fullscreen';
import { setLeaveGuard } from '../platform/leaveGuard';
import { CharacterId, ROSTER } from '../sim/characters';
import type { Settings } from '../state/settings';
import { DebugInfo, HudStore, createDebugInfo } from './hudStore';
import { bossRoomLevel, dungeonLevel, labLevel, Level, newSeed } from './level';
import type { LabCommand } from '../sim/lab/labCommands';
import { Run } from './run';
import type { Levels, RunCallbacks } from './runLinks';
import { CampScene } from './menu/campScene';
import { MenuScene } from './menu/menuScene';
import { PrisonScene } from './menu/prisonScene';
import { createRenderer } from './renderer';

/** 'menu': a menu scene, idle; 'intro': Start pressed, the gate opening; 'play': the lab. */
export type GameMode = 'menu' | 'intro' | 'play';
/** Which scene the menu shows: the gate (main menu), the camp (settings) or the prison (character select). */
export type MenuView = 'gate' | 'camp' | 'prison';

export interface GameCallbacks extends RunCallbacks {
  /** The mouse was locked (playing) or released (Esc, a dev panel, alt-tab). */
  onLockChange(locked: boolean): void;
  /** The gate is up: start the fade to black. */
  onIntroFade(): void;
  /** Through the gate: the prison corridor (character select) is showing, under the black. */
  onIntroDone(): void;
  /** The lab is running; `locked`: the mouse is locked (Play's click got it). */
  onRunStart(locked: boolean): void;
}

export class Game {
  readonly stats = new FrameStats();
  readonly debug: DebugInfo = createDebugInfo();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly input: Input;
  private readonly audio: AudioEngine;
  private run: Run | null = null;
  /** F9 (dev): the lab instead of the dungeon. Update 0.0.19 — and the Lab (its boss rooms lead back to it). */
  private inLab = false;
  /** Update 0.0.19 — the Lab's waves (the Feel Lab's knobs) are on. */
  private labWaves = false;
  /** Update 0.1.1 — the Lab's Meter: its Execution Power meter kept full (on at first; never outside the Lab). */
  private labMeter = true;
  private readonly levels: Levels = {
    fresh: () => (this.inLab ? labLevel() : dungeonLevel(newSeed(), 1)),
    next: (l: Level) => (this.inLab && l.bossRoom ? labLevel() : dungeonLevel(l.seed, l.floor + 1)),
    again: (l: Level) => (l.bossRoom ? bossRoomLevel(l.seed, l.floor) : dungeonLevel(l.seed, l.floor)),
  };
  private readonly menu: MenuScene;
  private readonly camp: CampScene;
  private readonly prison: PrisonScene;
  private readonly resizeObs: ResizeObserver;
  private raf = 0;
  private last = performance.now();
  private aspect = 16 / 9;
  private mode: GameMode = 'menu';
  private menuView: MenuView = 'gate';
  private readonly hud: HudStore;

  constructor(
    private readonly host: HTMLElement,
    private settings: Settings,
    hud: HudStore,
    private readonly cb: GameCallbacks,
  ) {
    this.renderer = createRenderer(host);
    this.input = new Input(host);
    this.audio = new AudioEngine(this.volumes());
    this.hud = hud;
    this.menu = new MenuScene(this.audio);
    this.camp = new CampScene(this.audio);
    this.prison = new PrisonScene(this.audio);
    this.setSettings(settings);
    document.addEventListener('pointerlockchange', this.onLockChange);
    window.addEventListener('keydown', this.onEsc);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  private volumes() {
    const s = this.settings;
    return { master: s.volume, sfx: s.sfxVolume, music: s.musicVolume };
  }

  /** Lock the mouse and play. Call from a click or key press. */
  async lock(): Promise<boolean> {
    this.audio.resume();
    const r = await requestLock(this.host);
    if (r.locked) this.debug.rawInput = r.raw;
    return r.locked;
  }

  unlock() {
    releaseLock();
  }

  /** Resolves once the menu's scenes (the gate, the camp, the prison) have loaded. */
  get menuLoaded(): Promise<void> {
    return Promise.all([this.menu.loaded, this.camp.loaded, this.prison.loaded]).then(() => undefined);
  }

  /** The menu's scene: the gate, the camp (settings) or the prison (character select); the camp and the prison
   *  glide their camera in. Called under the fade to black. */
  showMenuView(view: MenuView) {
    if (view === this.menuView) return;
    this.menuView = view;
    if (view === 'camp') this.camp.enter();
    else this.camp.leave();
    if (view === 'prison') this.prison.enter(0);
  }

  /** Start pressed: the gate opens onto the prison (straight there if the gate scene failed to load). */
  startIntro() {
    if (this.mode !== 'menu') return;
    this.audio.resume();
    if (!this.menu.ready) return this.throughTheGate();
    this.mode = 'intro';
    this.menu.startIntro();
  }

  private throughTheGate() {
    this.mode = 'menu';
    this.showMenuView('prison');
    this.cb.onIntroDone();
  }

  /** Character select: the camera moves to cell `index` (its bars lift if the character is playable). */
  selectCell(index: number) {
    this.prison.select(index);
  }

  /** A locked character's bars rattle (Play pressed on one). */
  rattleCell() {
    this.prison.rattle();
  }

  /** Into a new dungeon run as `character` (only playable ones). Call once the screen is black. */
  startRun(character: CharacterId) {
    if (!ROSTER.find((c) => c.id === character)?.available) return;
    this.mode = 'play';
    this.newRun(this.inLab ? labLevel() : this.levels.fresh());
    this.run?.holdFloorTitle(LOADER_HIDES);
    this.input.clear();
    this.cb.onRunStart(document.pointerLockElement === this.host);
  }

  /** Update 0.0.19 — into the Lab (the main menu's Lab, dev builds). Call once the screen is black. */
  startLab() {
    this.inLab = true;
    this.mode = 'play';
    this.newRun(labLevel());
    this.input.clear();
    this.cb.onRunStart(document.pointerLockElement === this.host);
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
   *  Bone King's (floor 3). Update 0.2.4 — or the Dino's (floor 4). */
  labBoss(kind: 'demon' | 'dragon' | 'boneKing' | 'dino') {
    if (this.lab) this.newRun(bossRoomLevel(newSeed(), kind === 'demon' ? 1 : kind === 'dragon' ? 2 : kind === 'boneKing' ? 3 : 4));
  }

  /** Update 0.0.20 — floor `floor` (1–3) from the Lab, from its start. */
  labFloor(floor: number) {
    if (this.lab) this.newRun(dungeonLevel(newSeed(), floor));
  }

  /** Update 0.0.19 — back to the Lab from a boss room (or a floor). */
  backToLab() {
    if (this.lab) this.newRun(labLevel());
  }

  setLabWaves(on: boolean) {
    this.labWaves = on;
    if (this.run && this.inLab) this.run.waves = on;
  }

  setLabMeter(on: boolean) {
    this.labMeter = on;
    if (this.inLab) this.run?.labCommand({ kind: 'meter', on });
  }

  /** Update 0.0.19 — the world holds still (the Lab's panel is open). */
  setLabHold(on: boolean) {
    if (this.run) this.run.hold = on;
  }

  private newRun(level: Level) {
    this.run?.dispose();
    this.run = new Run(level, this.audio, this.renderer, this.hud, this.cb, this.levels);
    this.run.waves = !this.inLab || this.labWaves;
    if (this.inLab) this.run.labCommand({ kind: 'meter', on: this.labMeter });
  }

  /** F9 (dev): swap between the Feel Lab and a fresh dungeon run. */
  toggleLab() {
    this.inLab = !this.inLab;
    if (this.mode === 'play') this.newRun(this.inLab ? labLevel() : this.levels.fresh());
  }

  /** Back to the main menu (the pause menu's Main menu): the mouse freed, the gate shut. */
  toMenu() {
    this.mode = 'menu';
    this.inLab = false;
    this.showMenuView('gate');
    this.menu.reset();
    this.run?.silence();
    releaseLock();
  }

  setSettings(s: Settings) {
    this.settings = s;
    this.input.bindings = s.bindings;
    this.audio.setVolumes(this.volumes());
  }

  /** Back to the start, full health; the targets back in place and whole (F3, Restart). */
  restart() {
    this.run?.restart();
  }

  async toggleFullscreen(): Promise<FullscreenState> {
    const st = fullscreenState().fullscreen ? await exitFullscreen() : await enterFullscreen(document.documentElement);
    this.debug.fullscreen = st.fullscreen;
    this.debug.keyboardLock = st.keyboardLock;
    return st;
  }

  /** With fullscreen keyboard lock on, the browser hands Esc to the page instead of freeing the mouse. */
  private onEsc = (e: KeyboardEvent) => {
    if (e.code === 'Escape' && document.pointerLockElement === this.host) releaseLock();
  };

  private onLockChange = () => {
    const locked = document.pointerLockElement === this.host;
    if (!locked) {
      this.input.clear();
      this.run?.cancelCharge();
    }
    setLeaveGuard(locked);
    this.cb.onLockChange(locked);
  };

  private resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h);
    this.aspect = w / h;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const real = Math.min(Math.max(0, (now - this.last) / 1000), MAX_FRAME);
    this.last = now;
    if (this.mode === 'play' && this.run) this.run.frame(real, this.input, this.settings, this.aspect, this.renderer, this.stats, this.debug);
    else this.menuFrame(real);
  };

  /** The main menu, the gate opening, and the settings camp. Nothing simulates. */
  private menuFrame(real: number) {
    this.input.clearMouse();
    this.stats.push(real * 1000, 0, false);
    if (this.menuView === 'camp' && this.camp.ready) {
      this.camp.update(real);
      this.camp.render(this.renderer, this.aspect);
      return;
    }
    if (this.menuView === 'prison' && this.prison.ready) {
      this.prison.update(real);
      this.prison.render(this.renderer, this.aspect);
      return;
    }
    const ev = this.menu.update(real);
    this.menu.render(this.renderer, this.aspect);
    if (ev === 'fade') this.cb.onIntroFade();
    else if (ev === 'done') this.throughTheGate();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    window.removeEventListener('keydown', this.onEsc);
    setLeaveGuard(false);
    this.resizeObs.disconnect();
    releaseLock();
    this.input.dispose();
    this.audio.dispose();
    this.run?.dispose();
    this.menu.dispose();
    this.camp.dispose();
    this.prison.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
