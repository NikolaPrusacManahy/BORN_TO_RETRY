// M1 — the shell around the Feel Lab: the renderer, input, sound, the mouse lock and fullscreen, and the frame
// loop. Thin on purpose: the lab itself (player, fists, camera, arms) is LabRun; the main menu is MenuScene.
// Update 0.0.4 — it opens on the main menu's gate scene (engine/menu/); Start opens the gate, then the lab.
// M1 step 8 — the play loop moved to labRun.ts when health and death joined.
import * as THREE from 'three';
import { MAX_FRAME } from '../core/fixedStep';
import { FrameStats } from '../core/frameStats';
import { Input } from '../input/input';
import { AudioEngine } from '../audio/audio';
import { requestLock, releaseLock } from '../platform/pointerLock';
import { FullscreenState, enterFullscreen, exitFullscreen, state as fullscreenState } from '../platform/fullscreen';
import { setLeaveGuard } from '../platform/leaveGuard';
import type { RapierWorld } from '../physics/rapierWorld';
import type { Settings } from '../state/settings';
import type { Arena } from '../world/arena';
import { DebugInfo, HudStore, createDebugInfo } from './hudStore';
import { LabRun, RunCallbacks } from './labRun';
import { MenuScene } from './menu/menuScene';
import { createRenderer } from './renderer';

/** 'menu': the gate scene, idle; 'intro': Start pressed, the gate opening; 'play': the lab. */
export type GameMode = 'menu' | 'intro' | 'play';

export interface GameCallbacks extends RunCallbacks {
  /** The mouse was locked (playing) or released (Esc, a dev panel, alt-tab). */
  onLockChange(locked: boolean): void;
  /** The gate is up: start the fade to black. */
  onIntroFade(): void;
  /** The lab is running; `locked`: the mouse is still locked (Esc wasn't pressed meanwhile). */
  onIntroDone(locked: boolean): void;
}

export class Game {
  readonly stats = new FrameStats();
  readonly debug: DebugInfo = createDebugInfo();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly input: Input;
  private readonly audio: AudioEngine;
  private readonly run: LabRun;
  private readonly menu: MenuScene;
  private readonly resizeObs: ResizeObserver;
  private raf = 0;
  private last = performance.now();
  private aspect = 16 / 9;
  private mode: GameMode = 'menu';

  constructor(
    private readonly host: HTMLElement,
    private settings: Settings,
    hud: HudStore,
    private readonly cb: GameCallbacks,
    private readonly physics: RapierWorld,
    arena: Arena,
  ) {
    this.renderer = createRenderer(host);
    this.input = new Input(host);
    this.audio = new AudioEngine(this.volumes());
    this.run = new LabRun(arena, physics, this.audio, this.renderer, hud, cb);
    this.menu = new MenuScene(this.audio);
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

  /** Resolves once the main menu's scene has loaded. */
  get menuLoaded(): Promise<void> {
    return this.menu.loaded;
  }

  /** Start pressed: the gate opens, then the lab (straight to the lab if the menu scene failed to load). */
  startIntro() {
    if (this.mode !== 'menu') return;
    this.audio.resume();
    if (!this.menu.ready) return this.enterPlay();
    this.mode = 'intro';
    this.menu.startIntro();
  }

  /** Back to the main menu (the pause menu's Main menu): the mouse freed, the gate shut. */
  toMenu() {
    this.mode = 'menu';
    this.menu.reset();
    this.run.silence();
    releaseLock();
  }

  private enterPlay() {
    this.mode = 'play';
    this.restart();
    this.input.clear();
    this.cb.onIntroDone(document.pointerLockElement === this.host);
  }

  setSettings(s: Settings) {
    this.settings = s;
    this.input.bindings = s.bindings;
    this.audio.setVolumes(this.volumes());
  }

  /** Back to the start, full health; the targets back in place and whole (F3). */
  restart() {
    this.run.restart();
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
      this.run.cancelCharge();
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
    if (this.mode === 'play') this.run.frame(real, this.input, this.settings, this.aspect, this.renderer, this.stats, this.debug);
    else this.menuFrame(real);
  };

  /** The main menu and the gate opening: the gate scene only. Nothing simulates. */
  private menuFrame(real: number) {
    this.input.clearMouse();
    this.stats.push(real * 1000, 0, false);
    const ev = this.menu.update(real);
    this.menu.render(this.renderer, this.aspect);
    if (ev === 'fade') this.cb.onIntroFade();
    else if (ev === 'done') this.enterPlay();
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
    this.run.dispose();
    this.menu.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.physics.dispose();
  }
}
