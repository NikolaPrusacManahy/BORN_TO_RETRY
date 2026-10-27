// M1 — wires the Feel Lab together and runs the frame loop. Thin on purpose: every mechanic lives in its own
// module (sim/, engine/, audio/). Per frame: mouse look → fixed-step sim ticks → events → camera → render.
import * as THREE from 'three';
import { FixedStep, MAX_FRAME } from '../core/fixedStep';
import { FrameStats } from '../core/frameStats';
import { Input } from '../input/input';
import { AudioEngine } from '../audio/audio';
import { MoveSounds } from '../audio/moveSounds';
import { requestLock, releaseLock } from '../platform/pointerLock';
import { FullscreenState, enterFullscreen, exitFullscreen, state as fullscreenState } from '../platform/fullscreen';
import { setLeaveGuard } from '../platform/leaveGuard';
import type { RapierWorld } from '../physics/rapierWorld';
import { PlayerIntent, emptyIntent } from '../sim/player/intent';
import { PlayerState, createPlayer, flatSpeed, moveMode, resetPlayer } from '../sim/player/state';
import { stepPlayer } from '../sim/player/step';
import type { Settings } from '../state/settings';
import { DASH } from '../tuning/movement';
import { LAB } from '../tuning/lab';
import type { Arena } from '../world/arena';
import { ArenaView, buildArenaView } from './arenaView';
import { CameraRig } from './cameraRig';
import { DebugInfo, HudStore, createDebugInfo } from './hudStore';
import { Look } from './look';
import { applyMoveEvents } from './moveFeedback';
import { createRenderer } from './renderer';

/** A height change bigger than this in one tick on the ground is a step: the camera smooths it (m). */
const STEP_MIN = 0.1;
/** Fall below this and you're put back at the start (m). */
const KILL_Y = -20;
/** HUD refresh interval (s). */
const HUD_EVERY = 0.05;

export interface GameCallbacks {
  /** The mouse was locked (playing) or released (Esc, a dev panel, alt-tab). */
  onLockChange(locked: boolean): void;
}

export class Game {
  readonly stats = new FrameStats();
  readonly debug: DebugInfo = createDebugInfo();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 400);
  private readonly rig = new CameraRig(this.camera);
  private readonly look = new Look();
  private readonly input: Input;
  private readonly clock = new FixedStep();
  private readonly view: ArenaView;
  private readonly audio: AudioEngine;
  private readonly sounds: MoveSounds;
  private readonly player: PlayerState;
  private readonly prev = new THREE.Vector3();
  private readonly intent: PlayerIntent = emptyIntent();
  private readonly resizeObs: ResizeObserver;
  private raf = 0;
  private last = performance.now();
  private hudTimer = 0;
  private aspect = 16 / 9;

  constructor(
    private readonly host: HTMLElement,
    private settings: Settings,
    private readonly hud: HudStore,
    private readonly cb: GameCallbacks,
    private readonly physics: RapierWorld,
    private readonly arena: Arena,
  ) {
    this.renderer = createRenderer(host);
    this.view = buildArenaView(this.scene, arena, this.renderer);
    this.scene.add(this.camera);
    this.input = new Input(host);
    this.audio = new AudioEngine(this.volumes());
    this.sounds = new MoveSounds(this.audio);
    const s = arena.playerStart;
    this.player = createPlayer(s.x, s.y, s.z, s.yaw);
    this.restart();
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

  setSettings(s: Settings) {
    this.settings = s;
    this.input.bindings = s.bindings;
    this.audio.setVolumes(this.volumes());
  }

  /** Back to the start, standing still. */
  restart() {
    const s = this.arena.playerStart;
    resetPlayer(this.player, s.x, s.y, s.z, s.yaw);
    this.prev.copy(this.player.pos);
    this.look.yaw = s.yaw;
    this.look.pitch = 0;
    this.rig.reset();
    this.clock.reset();
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
    if (!locked) this.input.clear();
    setLeaveGuard(locked);
    this.cb.onLockChange(locked);
  };

  private resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h);
    this.aspect = w / h;
  }

  private buildIntent() {
    const i = this.intent;
    const inp = this.input;
    const live = inp.locked;
    i.yaw = this.look.yaw;
    i.moveX = live ? (inp.action('right') ? 1 : 0) - (inp.action('left') ? 1 : 0) : 0;
    i.moveZ = live ? (inp.action('forward') ? 1 : 0) - (inp.action('back') ? 1 : 0) : 0;
    i.jumpPressed = live && inp.actionPressed('jump');
    i.dashPressed = live && inp.actionPressed('dash');
    i.slidePressed = live && inp.actionPressed('slide');
    i.slideHeld = live && inp.action('slide');
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const real = Math.min(Math.max(0, (now - this.last) / 1000), MAX_FRAME);
    this.last = now;

    if (this.input.locked) this.look.apply(this.input.mouseDX, this.input.mouseDY, this.settings);
    this.input.clearMouse();

    const p = this.player;
    const scale = LAB.v.timeScale;
    const stepDt = 1 / LAB.v.simHz;
    const steps = this.clock.advance(real * scale, stepDt, LAB.v.maxSteps);
    for (let n = 0; n < steps; n++) {
      this.prev.copy(p.pos);
      const wasGrounded = p.grounded;
      this.buildIntent();
      stepPlayer(p, this.intent, this.physics, this.arena.pads, stepDt);
      this.input.clearPressed();
      const dy = p.pos.y - this.prev.y;
      if (wasGrounded && p.grounded && Math.abs(dy) > STEP_MIN) this.rig.step(dy);
      if (p.pos.y < KILL_Y) this.restart();
    }
    this.stats.push(real * 1000, steps, this.clock.dropped);

    applyMoveEvents(p.events, this.rig, this.sounds);
    p.events.clear();
    this.sounds.setSliding(p.sliding && p.grounded);
    this.rig.update(real * scale, this.clock.alpha, this.prev, p, this.look, this.settings.fov, this.aspect);
    this.renderer.render(this.scene, this.camera);

    const d = this.debug;
    d.speed = flatSpeed(p);
    d.vSpeed = p.vel.y;
    d.mode = moveMode(p);
    d.dashCharges = p.dashCharges;
    d.wallJumpsLeft = p.wallJumpsLeft;
    this.hudTimer -= real;
    if (this.hudTimer <= 0) {
      this.hudTimer = HUD_EVERY;
      this.hud.set({ dashCharges: Math.floor(p.dashCharges * 20) / 20, dashMax: DASH.v.charges, mode: d.mode });
    }
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    window.removeEventListener('keydown', this.onEsc);
    setLeaveGuard(false);
    this.resizeObs.disconnect();
    releaseLock();
    this.input.dispose();
    this.audio.dispose();
    this.view.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.physics.dispose();
  }
}
