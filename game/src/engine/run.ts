// M1 — the play loop: the player, the fists, the targets, the camera and the arms, stepped and drawn each frame. Per
// frame: mouse look → fixed-step sim ticks (health timers, movement, hazards, combat) → events → camera → world
// render → arms render. Hit-stop pauses the ticks; it never pauses the mouse.
// M1 step 8 — dying slows the world and fades to black (DeathFlow); once it's black you're back at the start.
// Update 0.0.12 (was labRun.ts) — it plays a level (level.ts): the Feel Lab, or a dungeon floor with its room loop.
// Taking the way down loads the next floor (your health, coins and weapon come with you); dying in the dungeon starts
// a new run on a new floor plan.
import * as THREE from 'three';
import { FixedStep } from '../core/fixedStep';
import type { FrameStats } from '../core/frameStats';
import { createRng } from '../core/rng';
import type { AudioEngine } from '../audio/audio';
import { MoveSounds } from '../audio/moveSounds';
import type { Input } from '../input/input';
import type { MoveResult } from '../sim/collisionWorld';
import { CombatIntent, emptyCombatIntent } from '../sim/combat/fists';
import { CombatState, createCombat, resetCombat } from '../sim/combat/state';
import { stepCombat } from '../sim/combat/step';
import { AIM_HEIGHT } from '../sim/combat/turret';
import { stepRooms } from '../sim/dungeon/roomLoop';
import { pushPlayerOut } from '../sim/enemies/enemy';
import { BODY } from '../sim/player/body';
import { checkHazards } from '../sim/player/hazards';
import { killPlayer, updateHealth } from '../sim/player/health';
import { PlayerIntent, emptyIntent } from '../sim/player/intent';
import { PlayerState, createPlayer, resetPlayer } from '../sim/player/state';
import { stepPlayer } from '../sim/player/step';
import type { Settings } from '../state/settings';
import { FISTS } from '../tuning/combat';
import { LAB } from '../tuning/lab';
import { ArenaBox, hazardsOf } from '../world/arena';
import { CameraRig } from './cameraRig';
import { CombatScene } from './combatScene';
import { DeathFlow } from './deathFlow';
import type { DebugInfo, HudStore } from './hudStore';
import { readCombatIntent, readPlayerIntent } from './intents';
import type { Level, LevelView } from './level';
import { Look } from './look';
import { mapOf } from './mapFeed';
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

/** Where the next level comes from (the Game makes them). */
export interface Levels {
  /** A new run from its first floor (after a death). */
  fresh(): Level;
  /** The next floor down. */
  next(current: Level): Level;
  /** This floor again from its start (F3, Restart). */
  again(current: Level): Level;
}

export class Run {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 400);
  private readonly rig = new CameraRig(this.camera);
  private readonly look = new Look();
  private readonly clock = new FixedStep();
  private readonly sounds: MoveSounds;
  private readonly player: PlayerState;
  private readonly arms = new Viewmodel();
  private readonly hudFeed: HudFeed;
  private readonly death = new DeathFlow();
  private readonly prev = new THREE.Vector3();
  private readonly chest = new THREE.Vector3();
  private readonly intent: PlayerIntent = emptyIntent();
  private readonly combatIntent: CombatIntent = emptyCombatIntent();
  private readonly shove: MoveResult = { grounded: false, hitCeiling: false, wall: false, wallNormal: new THREE.Vector3() };
  private level!: Level;
  private view!: LevelView;
  private combat!: CombatState;
  private combatScene!: CombatScene;
  private hazards: ArenaBox[] = [];
  /** Counts hits on you, for the HUD's hurt flash. */
  private hurts = 0;

  constructor(
    level: Level,
    private readonly audio: AudioEngine,
    private readonly renderer: THREE.WebGLRenderer,
    hud: HudStore,
    private readonly cb: RunCallbacks,
    private readonly levels: Levels,
  ) {
    // Loading the same models again (each floor) comes from memory.
    THREE.Cache.enabled = true;
    this.scene.add(this.camera);
    this.sounds = new MoveSounds(audio);
    const s = level.arena.playerStart;
    this.player = createPlayer(s.x, s.y, s.z, s.yaw);
    this.hudFeed = new HudFeed(hud);
    this.load(level, false);
  }

  get floor(): number {
    return this.level.floor;
  }

  /** Into `level`. `keep`: your health, coins and weapon come along (the way down); otherwise a fresh start. */
  load(level: Level, keep: boolean) {
    const old = this.combat;
    const hp = this.player.hp;
    if (this.level) {
      this.combatScene.dispose();
      this.view.dispose();
      if (this.level.physics !== level.physics) this.level.physics.dispose();
    }
    this.level = level;
    this.view = level.draw(this.scene, this.renderer);
    this.hazards = hazardsOf(level.arena);
    this.combat = createCombat(level.arena, !level.dungeon);
    this.combat.rng = createRng(level.fightSeed);
    this.combatScene = new CombatScene(this.scene, this.combat, this.audio, this.rig, this.arms);
    this.restartHere();
    if (keep && old) {
      this.player.hp = hp;
      this.combat.weapon = old.weapon;
      this.combat.money = old.money;
    }
  }

  /** Back to the level's start, standing still, full health; the targets back in place and whole. */
  private restartHere() {
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
    if (this.death.active) {
      this.death.reset();
      this.cb.onRespawn();
    }
  }

  /** F3 and Restart: the lab from its start; a dungeon floor laid out again from its start. */
  restart() {
    if (this.level.dungeon) this.load(this.levels.again(this.level), false);
    else this.restartHere();
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
    const d = this.level.dungeon;
    let n = 0;
    for (; n < steps; n++) {
      this.prev.copy(p.pos);
      const wasGrounded = p.grounded;
      // The dead don't steer or punch.
      readPlayerIntent(input, this.look, this.intent, !p.dead);
      readCombatIntent(input, this.look, this.combatIntent, !p.dead);
      updateHealth(p, stepDt);
      stepPlayer(p, this.intent, this.level.physics, this.level.arena.pads, stepDt);
      checkHazards(p, this.hazards);
      stepCombat(this.combat, p, this.combatIntent, this.level.physics, stepDt, d ? [] : this.level.arena.spawns);
      if (d) {
        stepRooms(d, p, this.combat, this.combat.rng, stepDt);
        this.level.physics.setGates(d.shut);
      }
      pushPlayerOut(p, this.combat.enemies, this.level.physics, BODY.radius, this.shove);
      input.clearPressed();
      const dy = p.pos.y - this.prev.y;
      if (wasGrounded && p.grounded && Math.abs(dy) > STEP_MIN) this.rig.step(dy);
      // Falling out is a death; invincible (F4), it's straight back to the start.
      if (p.pos.y < KILL_Y) {
        if (LAB.v.god >= 1) this.restartHere();
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
    this.combatScene.update(this.combat, this.camera.position, this.chest, gameDt, this.clock.alpha);
    const d = this.level.dungeon;
    if (d) this.view.update?.(gameDt, d.shut, this.camera.position);
    const f = this.combat.fists;
    this.arms.update(gameDt, real, mouseDx, mouseDy, p, f.charging ? f.charge / FISTS.v.chargeTime : -1);

    renderer.render(this.scene, this.camera);
    this.arms.render(renderer, aspect);

    fillDebug(debug, p, this.combat);
    this.hudFeed.push(real, p, this.combatScene.feedback, this.hurts, this.combat.weapon, this.combat.money, d ? mapOf(d) : null, this.look.yaw);
    // Dead: once it's black, a new run (the dungeon) or the lab's start. The way down: the next floor.
    if (this.death.update(real)) {
      if (d) this.load(this.levels.fresh(), false);
      else this.restartHere();
    } else if (d?.exited) this.load(this.levels.next(this.level), true);
  }

  dispose() {
    this.combatScene.dispose();
    this.view.dispose();
    this.level.physics.dispose();
  }
}
