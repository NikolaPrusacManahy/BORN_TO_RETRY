// M1 — the Feel Lab run: the player, the fists, the targets, the camera and the arms, stepped and drawn each
// frame. Per frame: mouse look → fixed-step sim ticks (health timers, movement, hazards, combat) → events → camera
// → world render → arms render. Hit-stop pauses the ticks; it never pauses the mouse.
// M1 step 8 — split out of Game.ts when health and death joined. Dying slows the world and fades to black
// (DeathFlow); once it's black you're back at the start.
import * as THREE from 'three';
import { FixedStep } from '../core/fixedStep';
import type { FrameStats } from '../core/frameStats';
import type { AudioEngine } from '../audio/audio';
import { MoveSounds } from '../audio/moveSounds';
import type { Input } from '../input/input';
import type { RapierWorld } from '../physics/rapierWorld';
import { CombatIntent, emptyCombatIntent } from '../sim/combat/fists';
import { CombatState, createCombat, resetCombat } from '../sim/combat/state';
import { stepCombat } from '../sim/combat/step';
import { AIM_HEIGHT } from '../sim/combat/turret';
import { checkHazards } from '../sim/player/hazards';
import { killPlayer, updateHealth } from '../sim/player/health';
import { PlayerIntent, emptyIntent } from '../sim/player/intent';
import { PlayerState, createPlayer, resetPlayer } from '../sim/player/state';
import { stepPlayer } from '../sim/player/step';
import type { Settings } from '../state/settings';
import { FISTS } from '../tuning/combat';
import { LAB } from '../tuning/lab';
import { Arena, ArenaBox, hazardsOf } from '../world/arena';
import { ArenaView, buildArenaView } from './arenaView';
import { CameraRig } from './cameraRig';
import { CombatScene } from './combatScene';
import { DeathFlow } from './deathFlow';
import type { DebugInfo, HudStore } from './hudStore';
import { readCombatIntent, readPlayerIntent } from './intents';
import { Look } from './look';
import { applyMoveEvents } from './moveFeedback';
import { HudFeed, fillDebug } from './overlayFeed';
import { Viewmodel } from './viewmodel/viewmodel';

/** A height change bigger than this in one tick on the ground is a step: the camera smooths it (m). */
const STEP_MIN = 0.1;
/** Fall below this and you die (m). */
const KILL_Y = -20;

export interface RunCallbacks {
  /** You died: start the fade to black (it lasts HEALTH.deathFade). */
  onDeath(): void;
  /** You're back at the start: clear the black. */
  onRespawn(): void;
}

export class LabRun {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 400);
  private readonly rig = new CameraRig(this.camera);
  private readonly look = new Look();
  private readonly clock = new FixedStep();
  private readonly view: ArenaView;
  private readonly sounds: MoveSounds;
  private readonly player: PlayerState;
  private readonly combat: CombatState;
  private readonly arms = new Viewmodel();
  private readonly combatScene: CombatScene;
  private readonly hudFeed: HudFeed;
  private readonly hazards: ArenaBox[];
  private readonly death = new DeathFlow();
  private readonly prev = new THREE.Vector3();
  private readonly chest = new THREE.Vector3();
  private readonly intent: PlayerIntent = emptyIntent();
  private readonly combatIntent: CombatIntent = emptyCombatIntent();
  /** Counts hits on you, for the HUD's hurt flash. */
  private hurts = 0;

  constructor(
    private readonly arena: Arena,
    private readonly physics: RapierWorld,
    audio: AudioEngine,
    renderer: THREE.WebGLRenderer,
    hud: HudStore,
    private readonly cb: RunCallbacks,
  ) {
    this.view = buildArenaView(this.scene, arena, renderer);
    this.scene.add(this.camera);
    this.sounds = new MoveSounds(audio);
    const s = arena.playerStart;
    this.player = createPlayer(s.x, s.y, s.z, s.yaw);
    this.combat = createCombat(arena);
    this.combatScene = new CombatScene(this.scene, this.combat, audio, this.rig, this.arms);
    this.hudFeed = new HudFeed(hud);
    this.hazards = hazardsOf(arena);
    this.restart();
  }

  /** Back to the start, standing still, full health; the targets back in place and whole (F3, and after a death). */
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
    if (this.death.active) {
      this.death.reset();
      this.cb.onRespawn();
    }
  }

  /** The mouse was freed: a charge in progress is cancelled rather than thrown. */
  cancelCharge() {
    this.combat.fists.charging = false;
    this.combat.fists.chargeReady = false;
  }

  /** Loops off (leaving for the menu). */
  silence() {
    this.sounds.setSliding(false);
    this.sounds.setWallRunning(false);
  }

  /** Runs this frame's sim ticks. Stops early when a hit starts a hit-stop, so the freeze begins on the hit. */
  private tick(gameDt: number, input: Input): number {
    const p = this.player;
    const stepDt = 1 / LAB.v.simHz;
    const steps = this.clock.advance(gameDt, stepDt, LAB.v.maxSteps);
    let n = 0;
    for (; n < steps; n++) {
      this.prev.copy(p.pos);
      const wasGrounded = p.grounded;
      // The dead don't steer or punch.
      readPlayerIntent(input, this.look, this.intent, !p.dead);
      readCombatIntent(input, this.look, this.combatIntent, !p.dead);
      updateHealth(p, stepDt);
      stepPlayer(p, this.intent, this.physics, this.arena.pads, stepDt);
      checkHazards(p, this.hazards);
      stepCombat(this.combat, p, this.combatIntent, this.physics, stepDt);
      input.clearPressed();
      const dy = p.pos.y - this.prev.y;
      if (wasGrounded && p.grounded && Math.abs(dy) > STEP_MIN) this.rig.step(dy);
      // Falling out is a death; invincible (F4), it's straight back to the start.
      if (p.pos.y < KILL_Y) {
        if (LAB.v.god >= 1) this.restart();
        else killPlayer(p);
      }
      if (this.combat.hitStop.active) {
        this.clock.reset();
        n++;
        break;
      }
    }
    return n;
  }

  frame(real: number, input: Input, settings: Settings, aspect: number, renderer: THREE.WebGLRenderer, stats: FrameStats, debug: DebugInfo) {
    const locked = input.locked;
    const mouseDx = locked ? input.mouseDX : 0;
    const mouseDy = locked ? input.mouseDY : 0;
    if (locked) this.look.apply(mouseDx, mouseDy, settings);
    input.clearMouse();

    const p = this.player;
    const frozen = this.combat.hitStop.tick(real);
    const scale = LAB.v.timeScale * this.death.timeScale;
    const gameDt = frozen ? 0 : real * scale;
    const steps = frozen ? 0 : this.tick(gameDt, input);
    stats.push(real * 1000, steps, this.clock.dropped);

    this.hurts += applyMoveEvents(p.events, this.rig, this.sounds, this.arms);
    p.events.clear();
    if (p.dead && !this.death.active) {
      this.death.start();
      this.cb.onDeath();
    }
    this.sounds.setSliding(p.sliding && p.grounded);
    this.sounds.setWallRunning(p.wallRunning);
    this.rig.update(real * scale, this.clock.alpha, this.prev, p, this.look, settings.fov, aspect);
    this.chest.set(p.pos.x, p.pos.y + AIM_HEIGHT, p.pos.z);
    this.combatScene.update(this.combat, this.camera.position, this.chest, gameDt);
    const f = this.combat.fists;
    this.arms.update(gameDt, real, mouseDx, mouseDy, p, f.charging ? f.charge / FISTS.v.chargeTime : -1);

    renderer.render(this.scene, this.camera);
    this.arms.render(renderer, aspect);

    fillDebug(debug, p, this.combat);
    this.hudFeed.push(real, p, this.combatScene.feedback, this.hurts);
    if (this.death.update(real)) this.restart();
  }

  dispose() {
    this.combatScene.dispose();
    this.view.dispose();
  }
}
