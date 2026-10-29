// Update 0.1.9 — the Dual Daggers' volley (the designer: "when holding right click, we hold like 3 seconds and player
// throws a series of 20 daggers in continuous rhythm", the Trickster's Main Event in Dead by Daylight). Right click held
// charges it: the arms cock both daggers back (the fists' charge fields show it, as the axe's throw does). Held to the
// full Volley charge, the stream starts by itself: a dagger every Volley rhythm, the hands taking turns, each from your
// eye where you aim at that moment, a use each. Let go before then and it's called off; a stream, once started, runs
// out (or the pair's uses do). A thrown dagger flies fast on a flat arc and hits the first thing it passes (and is gone),
// or sticks in a wall a moment. Pure.
import { Vector3 } from 'three';
import { FISTS } from '../../tuning/combat';
import { WEAPONS } from '../../tuning/weapons';
import type { CollisionWorld } from '../collisionWorld';
import { aim } from '../combat/punch';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import type { PlayerState } from '../player/state';
import type { WeaponKind } from './catalog';
import { HeldWeapon, THROWN_GRAVITY } from './weapons';

export interface Knife {
  alive: boolean;
  /** Stuck where it hit a wall (else flying). */
  stuck: boolean;
  pos: Vector3;
  vel: Vector3;
  /** Seconds left: flying, before it drops away; stuck, before it's gone. */
  life: number;
  /** The hand that threw it (0 right, 1 left): where it's seen leaving from. Update 0.1.10 — and whose (the gold pair's
   *  are drawn gold). */
  hand: number;
  kind: WeaponKind;
}

export interface Volley {
  /** Seconds right click has been held for it (−1: not charging). */
  charge: number;
  /** Daggers still to throw in the stream (0: none). */
  left: number;
  /** Seconds to the next one. */
  timer: number;
  /** The hand that throws next (0 right, 1 left). */
  hand: number;
}

export const KNIFE_POOL = 32;
/** A dagger leaves this far ahead of your eye (m). */
const LEAD = 0.5;

const eye = new Vector3();
const dir = new Vector3();
const next = new Vector3();
const hit = emptyTargetHit();

export function createKnives(): Knife[] {
  return Array.from({ length: KNIFE_POOL }, () => ({ alive: false, stuck: false, pos: new Vector3(), vel: new Vector3(), life: 0, hand: 0, kind: 'daggers' as WeaponKind }));
}

export function createVolley(): Volley {
  return { charge: -1, left: 0, timer: 0, hand: 0 };
}

/** Charging a volley or throwing one: right click is the volley's, and nothing else attacks. */
export const volleyBusy = (v: Volley) => v.charge >= 0 || v.left > 0;

/** Called off (the daggers put away, thrown, an execution): the arms let go of the charge. */
export function dropVolley(state: CombatState) {
  const v = state.volley;
  if (!volleyBusy(v)) return;
  v.charge = -1;
  v.left = 0;
  endCharge(state);
}

function endCharge(state: CombatState) {
  const f = state.fists;
  f.charging = f.chargeReady = false;
  f.charge = 0;
}

/** Right click (`held`) with the daggers in hand (`rate`: green rings quicken the rhythm). */
export function updateVolley(state: CombatState, w: HeldWeapon, player: PlayerState, held: boolean, yaw: number, pitch: number, dt: number, rate = 1) {
  const v = state.volley;
  const f = state.fists;
  if (v.left <= 0) {
    if (!held || w.uses <= 0) {
      if (v.charge >= 0) {
        v.charge = -1;
        endCharge(state);
        state.events.push('chargeCancel');
      }
      return;
    }
    const full = Math.max(1e-3, WEAPONS.v.volleyCharge);
    if (v.charge < 0) {
      v.charge = 0;
      f.charging = true;
      f.chargeReady = false;
      f.charge = 0;
      state.events.push('chargeStart');
      return;
    }
    v.charge = Math.min(full, v.charge + dt);
    // (The arms come up into the throwing stance over Volley stance, as a charged punch's draw-back shows.)
    f.charge = Math.min(1, v.charge / Math.max(1e-3, WEAPONS.v.volleyStance)) * FISTS.v.chargeTime;
    // (Held its time in ticks: a hair under, added up.)
    if (v.charge < full - 1e-6) return;
    // Full: the stream starts, the first dagger this tick. The arms stay cocked till it's over.
    f.chargeReady = true;
    state.events.push('chargeReady');
    v.charge = -1;
    v.left = Math.max(1, Math.round(WEAPONS.v.volleyCount));
    v.timer = 0;
    v.hand = 0;
  } else v.timer -= dt;
  while (v.left > 0 && v.timer <= 0 && w.uses > 0) {
    throwKnife(state, w, player, yaw, pitch, v.hand);
    v.hand = 1 - v.hand;
    v.left--;
    v.timer += WEAPONS.v.volleyInterval / rate;
  }
  if (v.left <= 0 || w.uses <= 0) {
    v.left = 0;
    endCharge(state);
  }
}

/** One dagger from your eye along your aim, thrown by `hand`: a use. */
function throwKnife(state: CombatState, w: HeldWeapon, player: PlayerState, yaw: number, pitch: number, hand: number) {
  aim(player, yaw, pitch, eye, dir);
  // (All in use: the one stuck in a wall longest goes, else the oldest.)
  const k = state.knives.find((q) => !q.alive) ?? state.knives.find((q) => q.stuck) ?? state.knives[0];
  k.alive = true;
  k.stuck = false;
  k.pos.copy(eye).addScaledVector(dir, LEAD);
  k.vel.copy(dir).multiplyScalar(WEAPONS.v.knifeSpeed);
  k.life = WEAPONS.v.knifeLife;
  k.hand = hand;
  k.kind = w.kind;
  w.uses = Math.max(0, w.uses - 1);
  state.events.push('knifeThrow', hand, k.pos.x, k.pos.y, k.pos.z);
  if (w.uses === 0) state.events.push('weaponBroken');
}

/** The daggers in flight: each hits the first thing it passes, or sticks in a wall, or drops away. */
export function updateKnives(state: CombatState, world: CollisionWorld, dt: number) {
  const v = WEAPONS.v;
  for (const k of state.knives) {
    if (!k.alive) continue;
    k.life -= dt;
    if (k.stuck) {
      if (k.life <= 0) k.alive = false;
      continue;
    }
    k.vel.y -= THROWN_GRAVITY * dt;
    next.copy(k.pos).addScaledVector(k.vel, dt);
    if (nearestTarget(state, k.pos, next, v.knifeRadius, hit)) {
      const flat = Math.hypot(k.vel.x, k.vel.z) || 1;
      landHit(state, hit, v.knifeDamage, v.knifeKnock, k.vel.x / flat, k.vel.z / flat, 'hitKnife', 0);
      k.alive = false;
      continue;
    }
    const step = k.pos.distanceTo(next);
    dir.subVectors(next, k.pos).divideScalar(Math.max(step, 1e-6));
    const wall = world.rayDistance(k.pos, dir, step);
    if (wall <= step) {
      k.pos.addScaledVector(dir, wall);
      k.stuck = true;
      k.life = v.knifeStick;
      state.events.push('knifeStick', 0, k.pos.x, k.pos.y, k.pos.z);
      continue;
    }
    if (k.life <= 0) {
      k.alive = false;
      continue;
    }
    k.pos.copy(next);
  }
}
