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
// Update 0.2.9 — the character select's prison corridor is gone (the designer: "rework the game character selection and
// scrap it"): the gate opens onto the lobby, a hall you walk round in first person (a level the run plays: its
// stations choose your difficulty and character; its main gate starts the run, after the App's questions). The menu's
// scenes moved to menu/menuScenes.ts, the run side (the run, its levels, the Lab) to gameBase.ts.
import { LOADER_HIDES } from './runBase';
import { MAX_FRAME } from '../core/fixedStep';
import { requestLock, releaseLock } from '../platform/pointerLock';
import { FullscreenState, enterFullscreen, exitFullscreen, state as fullscreenState } from '../platform/fullscreen';
import { setLeaveGuard } from '../platform/leaveGuard';
import { CharacterId, ROSTER } from '../sim/characters';
import type { Difficulty } from '../sim/lobby/difficulty';
import { createLobby } from '../sim/lobby/lobby';
import { GATE_BACK } from '../world/lobby/spots';
import type { Settings } from '../state/settings';
import type { HudStore } from './hudStore';
import { labLevel, lobbyLevel } from './level';
import { GameBase, GameCallbacks } from './gameBase';
import { MenuScenes, MenuView } from './menu/menuScenes';
import { preloadLobby } from './lobby/lobbyView';

export type { GameCallbacks, GameMode } from './gameBase';
export type { MenuView };

/** Update 0.2.9 — what you've chosen in the lobby. */
export interface LobbyChoice {
  difficulty: Difficulty;
  character: CharacterId;
}

export class Game extends GameBase {
  private readonly menus: MenuScenes;
  /** Update 0.2.9 — what you chose in the lobby last (the run's difficulty: GameBase.runDifficulty). */
  private choice: LobbyChoice = { difficulty: 'real', character: 'adventurer' };
  private readonly resizeObs: ResizeObserver;
  private raf = 0;
  private last = performance.now();
  private aspect = 16 / 9;

  constructor(host: HTMLElement, settings: Settings, hud: HudStore, cb: GameCallbacks) {
    super(host, settings, hud, cb);
    this.menus = new MenuScenes(this.audio);
    this.setSettings(settings);
    document.addEventListener('pointerlockchange', this.onLockChange);
    window.addEventListener('keydown', this.onEsc);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
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

  /** The mouse is locked to the game. */
  get locked(): boolean {
    return document.pointerLockElement === this.host;
  }

  /** Resolves once the menu's scenes (the gate, the camp) have loaded, and the lobby's models (Update 0.2.9). */
  get menuLoaded(): Promise<void> {
    return Promise.all([this.menus.loaded, preloadLobby()]).then(() => undefined);
  }

  /** The menu's scene: the gate or the camp (settings). Called under the fade to black. */
  showMenuView(view: MenuView) {
    this.menus.show(view);
  }

  /** Start pressed: the gate opens onto the lobby (straight there if the gate scene failed to load), where `choice` is
   *  what you chose last. */
  startIntro(choice: LobbyChoice) {
    if (this.mode !== 'menu') return;
    this.choice = { ...choice };
    this.audio.resume();
    if (!this.menus.gateReady) return this.throughTheGate();
    this.mode = 'intro';
    this.menus.startIntro();
  }

  private throughTheGate() {
    this.enterLobby();
    this.cb.onIntroDone();
  }

  /** Update 0.2.9 — into the lobby, at its start. */
  private enterLobby() {
    this.inLab = false;
    this.mode = 'play';
    this.newRun(lobbyLevel(createLobby(this.choice.difficulty, this.choice.character)));
    this.input.clear();
  }

  /** Update 0.2.9 — walking round the lobby. */
  get inLobby(): boolean {
    return this.mode === 'play' && !!this.run?.inLobby;
  }

  /** Update 0.2.9 — the lobby holds still (the gate's questions are up). */
  holdLobby(on: boolean) {
    if (this.inLobby && this.run) this.run.hold = on;
  }

  /** Update 0.2.9 — turned back at the gate: you stand a few steps from it, facing it. */
  backFromGate() {
    if (this.inLobby) this.run?.backFromGate(GATE_BACK);
  }

  /** Update 0.2.9 — through the gate: its portcullis rises (under the fade into the run). */
  openGate() {
    if (this.inLobby) this.run?.openGate();
  }

  /** Into a new dungeon run as `character` (only playable ones) on `difficulty`. Call once the screen is black. */
  startRun(character: CharacterId, difficulty: Difficulty) {
    if (!ROSTER.find((c) => c.id === character)?.available) return;
    this.runDifficulty = difficulty;
    this.mode = 'play';
    this.newRun(this.inLab ? labLevel() : this.levels.fresh());
    this.run?.holdFloorTitle(LOADER_HIDES);
    this.input.clear();
    this.cb.onRunStart(document.pointerLockElement === this.host);
  }

  /** F9 (dev): swap between the Feel Lab and a fresh dungeon run (not from the lobby). */
  toggleLab() {
    if (this.inLobby) return;
    this.inLab = !this.inLab;
    if (this.mode === 'play') this.newRun(this.inLab ? labLevel() : this.levels.fresh());
  }

  /** Back to the main menu (the pause menu's Main menu): the mouse freed, the gate shut. */
  toMenu() {
    this.mode = 'menu';
    this.inLab = false;
    this.menus.reset();
    this.run?.silence();
    releaseLock();
  }

  setSettings(s: Settings) {
    this.settings = s;
    this.input.bindings = s.bindings;
    this.audio.setVolumes(this.volumes());
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
    const ev = this.menus.frame(real, this.renderer, this.aspect);
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
    this.menus.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
