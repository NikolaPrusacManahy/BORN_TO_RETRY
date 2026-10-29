// M1 — the play loop: the player, the fists, the targets, the camera and the arms, stepped and drawn each frame. Per
// frame: mouse look → fixed-step sim ticks (health timers, movement, hazards, combat) → events → camera → world
// render → arms render. Hit-stop pauses the ticks; it never pauses the mouse.
// M1 step 8 — dying slows the world and fades to black (DeathFlow); once it's black you're back at the start.
// Update 0.0.12 (was labRun.ts) — it plays a level (level.ts): the Feel Lab, or a dungeon floor with its room loop.
// Taking the way down loads the next floor (your health, coins and weapon come with you); dying in the dungeon starts
// a new run on a new floor plan.
// Update 0.0.13 — the shop and the chests (E at one comes before picking up a weapon); kneeling at a chest turns the
// view to it; your shield, keys and rings come down with you too.
// Update 0.0.15 — the boss room's show (boss/bossShow.ts): its view, no moving or fighting meanwhile, the boss's slow
// death, the gate shot; the way down is the dark beyond the wooden gate, faded to black, the next floor's name after.
// Update 0.0.19 — the Lab: every level has its treasure (the Lab's starts empty: its panel adds chests; items on the
// floor show there too), the Lab's waves can be off, the world holds still while its panel is open, and its panel's
// commands (sim/lab/labCommands.ts). Update 0.1.1 — an execution holds you (no moving, fighting or looking) while the
// view follows the body and the fists grip it (execView.ts).
// Update 0.1.14 — the level's parts, loading and restarting moved to runBase.ts. Dead in the dungeon, once it's black
// the death screen shows (what killed you, the floor, the time, your kills) and the world holds still until Retry.
// Update 0.1.20 — the [E] prompts and item cards (promptView.ts), while you're free to play.
import * as THREE from 'three';
import type { FrameStats } from '../core/frameStats';
import type { Input } from '../input/input';
import { stepCombat } from '../sim/combat/step';
import { AIM_HEIGHT } from '../sim/combat/turret';
import { stepRooms } from '../sim/dungeon/roomLoop';
import { stepTreasure } from '../sim/dungeon/treasure';
import { lavaStep } from '../sim/dungeon/lava';
import { execHeld } from '../sim/combat/execution';
import { followHeld } from './execView';
import { hpBonusOf, moveFactor } from '../sim/items/items';
import { pushPlayerOut } from '../sim/enemies/bodies';
import { BODY } from '../sim/player/body';
import { checkHazards } from '../sim/player/hazards';
import { killPlayer, updateHealth } from '../sim/player/health';
import { stepPlayer } from '../sim/player/step';
import type { Settings } from '../state/settings';
import { CAMERA } from '../tuning/camera';
import { FISTS } from '../tuning/combat';
import { LAB } from '../tuning/lab';
import type { DebugInfo } from './hudStore';
import { readCombatIntent, readPlayerIntent } from './intents';
import { focusOf } from '../sim/items/focus';
import { keyLabel } from '../input/keyLabel';
import { applyMoveEvents } from './moveFeedback';
import { fillDebug } from './overlayFeed';
import { RunBase } from './runBase';

/** A height change bigger than this in one tick on the ground is a step: the camera smooths it (m). */
const STEP_MIN = 0.1;
/** Fall below this and you die (m). */
const KILL_Y = -20;

export class Run extends RunBase {
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
      // The dead don't steer or punch; nor does anyone during the boss room's show.
      const free = !p.dead && !this.show.locked && !execHeld(this.combat.exec);
      readPlayerIntent(input, this.look, this.intent, free);
      readCombatIntent(input, this.look, this.combatIntent, free);
      updateHealth(p, stepDt);
      // (Update 0.1.9 — and the weapon in your hand: the Dual Daggers' +15%.)
      p.speedMul = moveFactor(this.combat);
      p.hpBonus = hpBonusOf(this.combat.items);
      const ci = this.combatIntent;
      if (stepTreasure(this.treasure, p, this.combat, ci.interactPressed, ci.switchKeyPressed, this.fighting, stepDt)) ci.interactPressed = false;
      stepPlayer(p, this.intent, this.level.physics, this.level.arena.pads, stepDt);
      checkHazards(p, this.hazards);
      lavaStep(p, this.lava, this.level.arena.playerStart, d, this.combat);
      stepCombat(this.combat, p, this.combatIntent, this.level.physics, stepDt, d || !this.waves ? [] : this.level.arena.spawns);
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
        else killPlayer(p, 'fall');
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
    const p = this.player;
    const locked = input.locked;
    // Update 0.0.13 — kneeling at a chest, the view turns to it and the mouse waits (and during the boss room's show).
    const kneeling = p.kneel > 0;
    const still = kneeling || this.show.locked || execHeld(this.combat.exec);
    const mouseDx = locked && !still ? input.mouseDX : 0;
    const mouseDy = locked && !still ? input.mouseDY : 0;
    if (locked && !still) this.look.apply(mouseDx, mouseDy, settings);
    if (kneeling) this.look.turnTo(p.kneelYaw, (CAMERA.v.kneelPitch * Math.PI) / 180, CAMERA.v.kneelTurn, real);
    input.clearMouse();

    const frozen = this.combat.hitStop.tick(real) || this.hold || this.told;
    if (locked && !p.dead) this.played += real;
    const scale = LAB.v.timeScale * this.death.timeScale * this.show.timeScale;
    const gameDt = frozen ? 0 : real * scale;
    const steps = frozen ? 0 : this.tick(gameDt, input);
    stats.push(real * 1000, steps, this.clock.dropped);

    applyMoveEvents(p.events, this.rig, this.sounds, this.arms, this.hits);
    p.events.clear();
    if (p.dead && !this.death.active) {
      this.death.start();
      this.cb.onDeath();
    }
    this.sounds.setSliding(p.sliding && p.grounded);
    this.sounds.setWallRunning(p.wallRunning);
    this.rig.update(real * scale, this.clock.alpha, this.prev, p, this.look, settings.fov, aspect);
    // The boss room's show may take the view.
    const shot = this.show.update(real, this.camera, this.look, this.combat);
    this.chest.set(p.pos.x, p.pos.y + AIM_HEIGHT, p.pos.z);
    // The shop and chests read this frame's events before the combat scene clears them; the hands follow a lid.
    const tv = this.treasureView;
    tv.update(this.combat, this.camera.position, gameDt);
    this.arms.chest.update(tv.reach.k, tv.reach.left, tv.reach.right, this.camera, this.arms.camera);
    this.combatScene.update(this.combat, this.camera.position, this.chest, gameDt, this.clock.alpha);
    followHeld(this.combat, this.look, this.arms, this.camera, real);
    const free = locked && !p.dead && !this.show.locked && !shot.cinematic && !execHeld(this.combat.exec);
    const focus = focusOf(this.treasure, this.combat, p, this.fighting, this.focus);
    this.prompts.update(focus, this.camera, renderer, keyLabel(input.bindings.interact), free, this.combatScene.markAt());
    const d = this.level.dungeon;
    if (d) this.view.update?.(gameDt, d, this.camera.position);
    const f = this.combat.fists;
    const choosing = this.treasure.choosing >= 0 ? this.combat.items.keyPick : null;
    this.arms.palm.update(choosing, this.keyLook, real);
    this.arms.update(gameDt, real, mouseDx, mouseDy, p, f.charging ? f.charge / FISTS.v.chargeTime : -1);

    renderer.render(this.scene, this.camera);
    if (!shot.cinematic) this.arms.render(renderer, aspect);

    fillDebug(debug, p, this.combat);
    this.hudFeed.push(real, p, this.combatScene.feedback, this.hits, this.combat, d, this.look.yaw, this.show.hud, choosing ?? '');
    // Dead: once it's black, the death screen (the dungeon: Retry is a new run) or the lab's start. The way down: the
    // next floor.
    if (this.death.update(real)) {
      if (!d) this.restartHere();
      else if (!this.told) {
        this.told = true;
        this.silence();
        this.cb.onDeathScreen({ by: p.hurtBy, floor: this.level.floor, time: this.played, kills: this.combat.kills });
      }
    } else if (shot.descend) this.load(this.levels.next(this.level), true);
  }
}
