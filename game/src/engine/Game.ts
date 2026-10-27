// M1 — wires the Feel Lab together and runs the frame loop. Thin on purpose: every mechanic lives in its own
// module (sim/, engine/, audio/). Per frame: mouse look → fixed-step sim ticks (movement, then combat) → events
// → camera → world render → arms render. Hit-stop pauses the ticks; it never pauses the mouse.
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
import { CombatIntent, emptyCombatIntent } from '../sim/combat/fists';
import { CombatState, createCombat, resetCombat } from '../sim/combat/state';
import { stepCombat } from '../sim/combat/step';
import { AIM_HEIGHT } from '../sim/combat/turret';
import type { Settings } from '../state/settings';
import { DASH } from '../tuning/movement';
import { FISTS } from '../tuning/combat';
import { LAB } from '../tuning/lab';
import type { Arena } from '../world/arena';
import { ArenaView, buildArenaView } from './arenaView';
import { CameraRig } from './cameraRig';
import { CombatScene } from './combatScene';
import { DebugInfo, HudStore, createDebugInfo } from './hudStore';
import { readCombatIntent, readPlayerIntent } from './intents';
import { Look } from './look';
import { applyMoveEvents } from './moveFeedback';
import { createRenderer } from './renderer';
import { Viewmodel } from './viewmodel/viewmodel';

/** A height change bigger than this in one tick on the ground is a step: the camera smooths it (m). */
const STEP_MIN = 0.1;
/** Fall below this and you're put back at the start (m). */
const KILL_Y = -20;
/** HUD refresh interval (s); hits and hurts push at once. */
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
  private readonly combat: CombatState;
  private readonly arms = new Viewmodel();
  private readonly combatScene: CombatScene;
  private readonly prev = new THREE.Vector3();
  private readonly chest = new THREE.Vector3();
  private readonly intent: PlayerIntent = emptyIntent();
  private readonly combatIntent: CombatIntent = emptyCombatIntent();
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
    this.combat = createCombat(arena);
    this.combatScene = new CombatScene(this.scene, this.combat, this.audio, this.rig, this.arms);
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

  /** Back to the start, standing still; the targets back in place and whole (F3). */
  restart() {
    const s = this.arena.playerStart;
    resetPlayer(this.player, s.x, s.y, s.z, s.yaw);
    resetCombat(this.combat, this.arena);
    this.arms.reset();
    this.combatScene.clear();
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
    if (!locked) {
      this.input.clear();
      // Freeing the mouse mid-charge cancels it rather than throwing it.
      this.combat.fists.charging = false;
      this.combat.fists.chargeReady = false;
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

  /** Runs this frame's sim ticks. Stops early when a hit starts a hit-stop, so the freeze begins on the hit. */
  private tick(gameDt: number): number {
    const p = this.player;
    const stepDt = 1 / LAB.v.simHz;
    const steps = this.clock.advance(gameDt, stepDt, LAB.v.maxSteps);
    let n = 0;
    for (; n < steps; n++) {
      this.prev.copy(p.pos);
      const wasGrounded = p.grounded;
      readPlayerIntent(this.input, this.look, this.intent);
      readCombatIntent(this.input, this.look, this.combatIntent);
      stepPlayer(p, this.intent, this.physics, this.arena.pads, stepDt);
      stepCombat(this.combat, p, this.combatIntent, this.physics, stepDt);
      this.input.clearPressed();
      const dy = p.pos.y - this.prev.y;
      if (wasGrounded && p.grounded && Math.abs(dy) > STEP_MIN) this.rig.step(dy);
      if (p.pos.y < KILL_Y) this.restart();
      if (this.combat.hitStop.active) {
        this.clock.reset();
        n++;
        break;
      }
    }
    return n;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const real = Math.min(Math.max(0, (now - this.last) / 1000), MAX_FRAME);
    this.last = now;

    const locked = this.input.locked;
    const mouseDx = locked ? this.input.mouseDX : 0;
    const mouseDy = locked ? this.input.mouseDY : 0;
    if (locked) this.look.apply(mouseDx, mouseDy, this.settings);
    this.input.clearMouse();

    const p = this.player;
    const frozen = this.combat.hitStop.tick(real);
    const scale = LAB.v.timeScale;
    const gameDt = frozen ? 0 : real * scale;
    const steps = frozen ? 0 : this.tick(gameDt);
    this.stats.push(real * 1000, steps, this.clock.dropped);

    applyMoveEvents(p.events, this.rig, this.sounds, this.arms);
    p.events.clear();
    this.sounds.setSliding(p.sliding && p.grounded);
    this.sounds.setWallRunning(p.wallRunning);
    this.rig.update(real * scale, this.clock.alpha, this.prev, p, this.look, this.settings.fov, this.aspect);
    this.chest.set(p.pos.x, p.pos.y + AIM_HEIGHT, p.pos.z);
    this.combatScene.update(this.combat, this.camera.position, this.chest, gameDt);
    const f = this.combat.fists;
    this.arms.update(gameDt, real, mouseDx, mouseDy, p, f.charging ? f.charge / FISTS.v.chargeTime : -1);

    this.renderer.render(this.scene, this.camera);
    this.arms.render(this.renderer, this.aspect);

    this.updateDebug();
    this.pushHud(real);
  };

  private updateDebug() {
    const p = this.player;
    const d = this.debug;
    d.speed = flatSpeed(p);
    d.vSpeed = p.vel.y;
    d.mode = moveMode(p);
    d.dashCharges = p.dashCharges;
    d.wallJumpsLeft = p.wallJumpsLeft;
    d.hitStop = this.combat.hitStop.remaining * 1000;
  }

  private pushHud(real: number) {
    const fb = this.combatScene.feedback;
    const cur = this.hud.get();
    this.hudTimer -= real;
    if (this.hudTimer > 0 && cur.hits === fb.hits && cur.hurts === fb.hurts) return;
    this.hudTimer = HUD_EVERY;
    const p = this.player;
    this.hud.set({ dashCharges: Math.floor(p.dashCharges * 20) / 20, dashMax: DASH.v.charges, mode: moveMode(p), hits: fb.hits, marker: fb.marker, hurts: fb.hurts });
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
    this.combatScene.dispose();
    this.view.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.physics.dispose();
  }
}
