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
// Update 0.2.0 — a chest rising out of the floor takes the view to it and back (chestShot.ts); you don't move meanwhile.
// Update 0.2.2 — the last floor's way down ends the run: once it's black, the same screen, saying you survived.
// Update 0.2.3 — held in the Bone King's hand (sim/combat/grab.ts): no moving, the view on its skull, your attacks
// still yours (each a hit on it).
// Update 0.2.8 — pinned by the Velociraptor (sim/combat/pin.ts): no moving, the view up at its jaws, your dash key
// still yours (a twist out of a bite).
// Update 0.2.9 — the lobby (sim/lobby/lobby.ts): its stations used with E and their cards, walking into the main gate;
// what happens there is passed on (a choice to save, the gate) with its sound.
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
import { endsRun } from './runLinks';
import { skullOf } from '../sim/combat/grab';
import { jawsOf } from '../sim/combat/pin';
import { sandSlow } from '../sim/dungeon/quicksand';
import { Lobby, lobbyFocus, stepLobby } from '../sim/lobby/lobby';
import { playLobby } from '../audio/lobbySounds';

/** Update 0.2.3 — held in the Bone King's hand, the view turns to its skull this fast (1/s) (Update 0.2.8: pinned, to
 *  the Velociraptor's jaws). */
const GRAB_TURN = 10;
/** A height change bigger than this in one tick on the ground is a step: the camera smooths it (m). */
const STEP_MIN = 0.1;
/** Fall below this and you die (m). */
const KILL_Y = -20;

export class Run extends RunBase {
  private readonly skull = new THREE.Vector3();

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
      const free = !p.dead && !this.show.locked && !this.chestShot.locked && !execHeld(this.combat.exec);
      const held = this.combat.grab.on || this.combat.pin.on;
      readPlayerIntent(input, this.look, this.intent, free && !held);
      readCombatIntent(input, this.look, this.combatIntent, free);
      updateHealth(p, stepDt);
      // (Update 0.1.9 — and the weapon in your hand: the Dual Daggers' +15%.)
      // (Update 0.2.4 — and quicksand.)
      p.speedMul = moveFactor(this.combat) * (d ? sandSlow(p, d.level.sand) : 1);
      p.hpBonus = hpBonusOf(this.combat.items);
      const ci = this.combatIntent;
      if (stepTreasure(this.treasure, p, this.combat, ci.interactPressed, ci.switchKeyPressed, this.fighting, stepDt)) ci.interactPressed = false;
      const lobby = this.level.lobby;
      if (lobby && stepLobby(lobby, p, ci.interactPressed && free)) ci.interactPressed = false;
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
    const grab = this.combat.grab;
    const pin = this.combat.pin;
    const still = kneeling || this.show.locked || this.chestShot.locked || execHeld(this.combat.exec) || grab.on || pin.on;
    const mouseDx = locked && !still ? input.mouseDX : 0;
    const mouseDy = locked && !still ? input.mouseDY : 0;
    if (locked && !still) this.look.apply(mouseDx, mouseDy, settings);
    if (kneeling) this.look.turnTo(p.kneelYaw, (CAMERA.v.kneelPitch * Math.PI) / 180, CAMERA.v.kneelTurn, real);
    if (grab.on || pin.on) {
      // Held: the view on its skull (pinned: on its jaws).
      if (grab.on) skullOf(this.combat, grab.slot, this.skull);
      else jawsOf(this.combat, pin.slot, this.skull);
      const dx = this.skull.x - p.pos.x;
      const dz = this.skull.z - p.pos.z;
      this.look.turnTo(Math.atan2(-dx, -dz), Math.atan2(this.skull.y - p.pos.y - CAMERA.v.eyeHeight, Math.hypot(dx, dz)), GRAB_TURN, real);
    }
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
    const chestShot = !shot.cinematic && this.chestShot.update(real, this.treasure, this.camera);
    if (chestShot) this.show.hud.cine = true;
    this.chest.set(p.pos.x, p.pos.y + AIM_HEIGHT, p.pos.z);
    // The shop and chests read this frame's events before the combat scene clears them; the hands follow a lid.
    const tv = this.treasureView;
    tv.update(this.combat, this.camera.position, gameDt);
    this.arms.chest.update(tv.reach.k, tv.reach.left, tv.reach.right, this.camera, this.arms.camera);
    this.combatScene.update(this.combat, this.camera.position, this.chest, gameDt, this.clock.alpha);
    followHeld(this.combat, this.look, this.arms, this.camera, real);
    const free = locked && !p.dead && !this.show.locked && !shot.cinematic && !chestShot && !execHeld(this.combat.exec);
    const lobby = this.level.lobby;
    const focus = lobby ? lobbyFocus(lobby, this.focus) : focusOf(this.treasure, this.combat, p, this.fighting, this.focus);
    this.prompts.update(focus, this.camera, renderer, keyLabel(input.bindings.interact), free, this.combatScene.markAt());
    const d = this.level.dungeon;
    if (d) this.view.update?.(gameDt, d, this.camera.position);
    else this.view.frame?.(real, this.camera.position);
    if (lobby) this.lobbyNews(lobby);
    // (The Velociraptor's sandstorm over the dungeon's haze.)
    this.combatScene.raptor.sky(this.scene, this.combat);
    const f = this.combat.fists;
    const choosing = this.treasure.choosing >= 0 ? this.combat.items.keyPick : null;
    this.arms.palm.update(choosing, this.keyLook, real);
    this.arms.update(gameDt, real, mouseDx, mouseDy, p, f.charging ? f.charge / FISTS.v.chargeTime : -1);

    renderer.render(this.scene, this.camera);
    if (!shot.cinematic && !chestShot) this.arms.render(renderer, aspect);

    fillDebug(debug, p, this.combat);
    this.hudFeed.attackKey = keyLabel(input.bindings.attack);
    this.hudFeed.dashKey = keyLabel(input.bindings.dash);
    this.hudFeed.push(real, p, this.combatScene.feedback, this.hits, this.combat, d, this.look.yaw, this.show.hud, choosing ?? '');
    // Dead: once it's black, the death screen (the dungeon: Retry is a new run) or the lab's start. The way down: the
    // next floor (Update 0.2.2: off the last, the run is won).
    if (this.death.update(real)) {
      if (!d) this.restartHere();
      else this.tell(false);
    } else if (shot.descend) {
      if (d && endsRun(this.level.floor)) this.tell(true);
      else this.load(this.levels.next(this.level), true);
    }
  }

  /** Update 0.2.9 — what happened in the lobby since the last frame: its sound, and the App told. */
  private lobbyNews(l: Lobby) {
    for (const e of l.events) {
      playLobby(this.audio, e);
      if (e === 'pick') this.cb.onLobbyPick(l.difficulty, l.character);
      else if (e === 'gate') this.cb.onLobbyGate();
    }
    l.events.length = 0;
  }

  /** Update 0.2.9 — through the gate: the portcullis rises. */
  openGate() {
    const l = this.level.lobby;
    if (!l || l.opening) return;
    l.opening = true;
    playLobby(this.audio, 'open');
  }

  /** It's black: the death screen (or, `won`, the run's end); the world holds still until Retry. */
  private tell(won: boolean) {
    if (this.told) return;
    this.told = true;
    this.silence();
    const p = this.player;
    this.cb.onDeathScreen({ by: won ? null : p.hurtBy, floor: this.level.floor, time: this.played, kills: this.combat.kills, won });
  }
}
