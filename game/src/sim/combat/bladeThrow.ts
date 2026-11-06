// Update 0.3.73 — the Playable Demon's Blade Throw (the bible): the sword thrown, spinning through all it meets, and called back, cutting everything on the way.
// While it's out you fight with your gauntlets, by the fists' rules. It stops in the first wall it meets, or hangs in the air at the end of its flight,
// spinning, cutting what touches it. Coming back it goes through anything (it can't be lost). Pure.
// Update 0.3.74 — the designer: "right mouse click is the throw and regain blade button, the E is the simple teleport … when the blade is thrown the E key becomes
// available". You can only go to it if you can see it (no walking through a shut gate); `canBlink` says so, for the HUD.
import { Vector3 } from 'three';
import { CAMERA } from '../../tuning/camera';
import { DEMON } from '../../tuning/demon';
import type { CollisionWorld } from '../collisionWorld';
import { launch } from '../enemies/flight';
import type { PlayerState } from '../player/state';
import { aim } from './punch';
import type { CombatState } from './state';
import { landHit } from './strike';
import { sweepTargets, targetId } from './sweep';

export type BladeStage = 'hand' | 'flying' | 'hanging' | 'stuck' | 'back';

export interface ThrownBlade {
  stage: BladeStage;
  pos: Vector3;
  /** Its way (length 1), and how far it's come. */
  dir: Vector3;
  flown: number;
  /** What it's cut on this leg. */
  struck: Set<string>;
  /** Hanging: till it cuts what's touching it again. */
  burn: number;
  /** Could you go to it now, and till that's looked at again (s)? */
  canBlink: boolean;
  look: number;
}

export const createThrownBlade = (): ThrownBlade => ({ stage: 'hand', pos: new Vector3(), dir: new Vector3(0, 0, -1), flown: 0, struck: new Set(), burn: 0, canBlink: false, look: 0 });

/** It's out of your hand. */
export const bladeAway = (state: CombatState) => state.blade.flying.stage !== 'hand';

/** It leaves this far ahead of your eye (m), no further than the wall; it stops this far short of what it's flying into. */
const LEAVES = 1;
const TIP = 0.2;
/** Caught this near your chest (m). */
const CATCH = 0.6;
/** It goes for your chest: this far under your eye (m). */
const CHEST = 0.4;
/** You arrive this far short of it, then this much further back at a time until there's room (m), so many times. */
const SHORT = 0.7;
const ROOM = 0.6;
const TRIES = 6;
/** How often the HUD's "can you go to it" is looked at (s). */
const LOOK_EVERY = 0.1;
const DOWN = new Vector3(0, -1, 0);

const next = new Vector3();
const to = new Vector3();
const eye = new Vector3();
const way = new Vector3();
const spot = new Vector3();
const feet = new Vector3();

/** The throw's let go: from `eye` along `dir` (length 1). */
export function launchBlade(state: CombatState, from: Vector3, dir: Vector3, world: CollisionWorld) {
  const t = state.blade.flying;
  const clear = world.rayDistance(from, dir, LEAVES + TIP);
  t.stage = 'flying';
  t.pos.copy(from).addScaledVector(dir, Math.min(LEAVES, clear - TIP));
  t.dir.copy(dir);
  t.flown = 0;
  t.look = 0;
  t.struck.clear();
  state.blade.step = -1;
  state.events.push('bladeThrown', 0, t.pos.x, t.pos.y, t.pos.z);
}

/** Right click, with it out: it comes back. */
export function regainBlade(state: CombatState) {
  const t = state.blade.flying;
  if (t.stage === 'hand' || t.stage === 'back') return;
  t.stage = 'back';
  t.struck.clear();
  state.events.push('bladeRecall', 0, t.pos.x, t.pos.y, t.pos.z);
}

/** In your hand again, wherever it was. */
export function catchBlade(state: CombatState) {
  const t = state.blade.flying;
  if (t.stage === 'hand') return;
  t.stage = 'hand';
  state.events.push('bladeCaught', 0, t.pos.x, t.pos.y, t.pos.z);
}

/** Where you'd stand going to it (`feet`): on the floor if it's near one, else in the air with your eye at it. False: no room, or you can't see it. */
function arrival(player: PlayerState, t: ThrownBlade, yaw: number, pitch: number, world: CollisionWorld): boolean {
  aim(player, yaw, pitch, eye, way);
  way.subVectors(t.pos, eye);
  const far = way.length();
  if (far < 1e-3) return false;
  way.divideScalar(far);
  if (world.rayDistance(eye, way, far) < far - SHORT) return false;
  const height = CAMERA.v.eyeHeight;
  for (let i = 0; i < TRIES; i++) {
    spot.copy(t.pos).addScaledVector(way, -Math.min(far, SHORT + i * ROOM));
    feet.set(spot.x, spot.y - Math.min(world.rayDistance(spot, DOWN, height), height), spot.z);
    if (world.canStand(feet)) return true;
  }
  return false;
}

/** E, with it out: you go to it, and it's in your hand. If you can't, nothing but a sound. */
export function blinkToBlade(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld): boolean {
  const t = state.blade.flying;
  if (t.stage === 'hand') return false;
  if (!arrival(player, t, yaw, pitch, world)) {
    state.events.push('bladeNoWay', 0, t.pos.x, t.pos.y, t.pos.z);
    return false;
  }
  player.pos.copy(feet);
  player.vel.set(0, 0, 0);
  // (Not on the ground till the next tick says so: no smoothing the view over a step that high.)
  player.grounded = false;
  player.slamming = false;
  player.dashTime = 0;
  player.invuln = Math.max(player.invuln, DEMON.v.blinkGuard);
  state.events.push('bladeBlink', 0, feet.x, feet.y, feet.z);
  catchBlade(state);
  return true;
}

/** `stop`: the freeze a hit takes (ms). */
function cut(state: CombatState, t: ThrownBlade, from: Vector3, end: Vector3, damage: number, stop = 0) {
  const v = DEMON.v;
  const flat = Math.hypot(t.dir.x, t.dir.z) || 1;
  const fx = t.dir.x / flat;
  const fz = t.dir.z / flat;
  sweepTargets(state, from, end, v.throwWidth, (hit) => {
    const id = targetId(hit);
    if (t.struck.has(id)) return;
    t.struck.add(id);
    const killed = landHit(state, hit, damage, v.throwKnock, fx, fz, 'hitSlash', damage);
    if (killed && hit.kind === 'enemy') launch(state.enemies[hit.index], fx, fz);
    if (stop > 0) state.hitStop.request(stop);
  });
}

/** One tick of it out of your hand. */
export function stepThrown(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const t = state.blade.flying;
  const v = DEMON.v;
  t.look -= dt;
  if (t.look <= 0) {
    t.look = LOOK_EVERY;
    t.canBlink = arrival(player, t, yaw, pitch, world);
  }
  if (t.stage === 'flying') {
    const step = v.throwSpeed * dt;
    const wall = world.rayDistance(t.pos, t.dir, step + TIP);
    next.copy(t.pos).addScaledVector(t.dir, Math.min(step, wall));
    cut(state, t, t.pos, next, v.throwDamage, v.farStop);
    t.pos.copy(next);
    t.flown += step;
    if (wall <= step + TIP) {
      t.stage = 'stuck';
      state.events.push('bladeStuck', 0, t.pos.x, t.pos.y, t.pos.z);
    } else if (t.flown >= v.throwRange) {
      t.stage = 'hanging';
      t.burn = v.hangTick;
      t.struck.clear();
    }
  } else if (t.stage === 'hanging') {
    t.burn -= dt;
    if (t.burn <= 0) {
      t.burn = v.hangTick;
      t.struck.clear();
    }
    cut(state, t, t.pos, t.pos, v.hangDamage);
  } else if (t.stage === 'back') {
    to.set(player.pos.x, player.pos.y + CAMERA.v.eyeHeight - CHEST, player.pos.z).sub(t.pos);
    const far = to.length();
    const step = v.recallSpeed * dt;
    if (far <= step + CATCH) {
      catchBlade(state);
      return;
    }
    t.dir.copy(to).divideScalar(far);
    next.copy(t.pos).addScaledVector(t.dir, step);
    cut(state, t, t.pos, next, v.recallDamage, v.farStop);
    t.pos.copy(next);
  }
}
