// Update 0.2.4 — the Pistol's rules (the designer: "we can aim with right click and it aims like a normal fps game,
// reload animation top notch, throw with q key, max 15 bullets"). Left click fires one bullet a click (no faster than
// Pistol fire rate; a click a moment early is kept): a hitscan shot from your eye, off your aim by its spread (wide from
// the hip, tight aimed, wider for each shot in a row, fading), stopped by the first wall, landing on the first target
// it passes (every dodge and guard applies, as to any blow). Right click held aims down the sights (Pistol aim time;
// the view narrows, the mouse slows: the engine's). R reloads; so does a click with the magazine empty, and the last
// bullet fired starts it by itself. A reload's beats (shared with the arms): the magazine drops out, the new one goes
// in (the bullets count in then), and from empty the slide is released. Its uses are all its bullets: none left, the
// next click throws it (step.ts), as Q always does. Then (the designer): 8 a magazine, 40 in all; a Grunt in 5 bullets
// (fists take 6): a weak option, a little better at range. Pure.
import { Vector3 } from 'three';
import { ENEMIES } from '../../tuning/enemies';
import { GUN } from '../../tuning/gun';
import type { CollisionWorld } from '../collisionWorld';
import type { CombatIntent } from '../combat/fists';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import { SHOOTS } from './catalog';
import type { HeldWeapon } from './weapons';

export interface GunState {
  /** 0 … 1: aimed down the sights. */
  aim: number;
  /** Seconds into a reload (−1: none), and whether it began empty (the slide locked back). */
  reload: number;
  empty: boolean;
  /** The reload's beats heard so far (0 … 3). */
  beats: number;
  /** Spread added by the shots just fired (degrees). */
  bloom: number;
  /** A click kept this long for when the gun's ready (s). */
  queued: number;
}

/** A reload's beats, as shares of its time: the magazine drops out, the new one is in, the slide goes home (from empty). */
export const MAG_OUT = 0.16;
export const MAG_IN = 0.56;
export const SLIDE_HOME = 0.8;
/** A click this early is kept (s). */
const QUEUE = 0.12;
/** A bullet's radius (m): what it passes this close to, it hits. */
const BULLET = 0.06;
/** Bloom tops out at this many degrees. */
const BLOOM_MAX = 4;

const end = new Vector3();
const shot = new Vector3();
const side = new Vector3();
const up = new Vector3();
const hit = emptyTargetHit();

export function createGun(): GunState {
  return { aim: 0, reload: -1, empty: false, beats: 0, bloom: 0, queued: 0 };
}

/** The gun isn't in your hand (put away, thrown, a throw winding up): no aim, no reload. */
export function dropGun(g: GunState) {
  g.aim = 0;
  g.reload = -1;
  g.queued = 0;
}

/** How far you're aimed down the sights, eased (0 with no gun in hand). */
export function aimedOf(state: CombatState): number {
  const a = state.weapon && SHOOTS[state.weapon.kind] ? state.gun.aim : 0;
  return a * a * (3 - 2 * a);
}

/** Aimed, the view narrows and the mouse slows: times your field of view, times your sensitivity. */
export const viewZoom = (state: CombatState) => 1 - (1 - GUN.v.pistolZoom) * aimedOf(state);
export const aimTurn = (state: CombatState) => 1 - (1 - GUN.v.pistolAimTurn) * aimedOf(state);

/** A bullet's damage: a Grunt's health over Pistol shots a Grunt (rounded up, so it takes exactly that many). */
export const pistolDamage = () => Math.ceil(ENEMIES.v.gruntHp / Math.max(1, Math.round(GUN.v.pistolShots)));

export const magSize = () => Math.max(1, Math.round(GUN.v.pistolMag));
export const reloadTime = (empty: boolean) => (empty ? GUN.v.pistolReloadEmpty : GUN.v.pistolReload);

/** One tick with the gun in hand. `eye`, `dir`: where you look from and along (length 1); `rate`: green rings quicken
 *  its fire. */
export function updateGun(state: CombatState, w: HeldWeapon, intent: CombatIntent, eye: Vector3, dir: Vector3, world: CollisionWorld, dt: number, rate = 1) {
  const v = GUN.v;
  const g = state.gun;
  w.cooldown = Math.max(0, w.cooldown - dt);
  g.bloom = Math.max(0, g.bloom - v.pistolBloomFade * dt);
  g.queued = intent.attackPressed ? QUEUE : Math.max(0, g.queued - dt);
  if (g.reload < 0 && intent.reloadPressed && w.mag < magSize() && w.uses > w.mag) startReload(state, w);
  // Empty with bullets to spare: a click (or the last shot, once the slide's back) reloads.
  if (g.reload < 0 && w.mag === 0 && w.uses > 0 && w.cooldown <= 0) startReload(state, w);
  if (g.reload >= 0) stepReload(state, w, dt);
  const aiming = intent.heavyHeld && g.reload < 0;
  g.aim = Math.max(0, Math.min(1, g.aim + ((aiming ? 1 : -1) * dt) / Math.max(0.01, v.pistolAimIn)));
  if (g.queued <= 0 || g.reload >= 0 || w.cooldown > 0 || w.mag <= 0) return;
  g.queued = 0;
  fire(state, w, eye, dir, world, rate);
}

function startReload(state: CombatState, w: HeldWeapon) {
  const g = state.gun;
  g.reload = 0;
  g.empty = w.mag === 0;
  g.beats = 0;
  g.queued = 0;
  state.events.push('reloadStart', g.empty ? 1 : 0);
}

function stepReload(state: CombatState, w: HeldWeapon, dt: number) {
  const g = state.gun;
  g.reload += dt;
  const k = g.reload / reloadTime(g.empty);
  if (g.beats < 1 && k >= MAG_OUT) {
    g.beats = 1;
    state.events.push('magOut', w.mag);
  }
  if (g.beats < 2 && k >= MAG_IN) {
    g.beats = 2;
    w.mag = Math.min(magSize(), w.uses);
    state.events.push('magIn', w.mag);
  }
  if (g.beats < 3 && g.empty && k >= SLIDE_HOME) {
    g.beats = 3;
    state.events.push('slideHome');
  }
  if (k < 1) return;
  g.reload = -1;
  state.events.push('reloadDone');
}

/** One bullet along `dir`, off it by the spread. */
function fire(state: CombatState, w: HeldWeapon, eye: Vector3, dir: Vector3, world: CollisionWorld, rate: number) {
  const v = GUN.v;
  const g = state.gun;
  w.cooldown = v.pistolInterval / rate;
  w.mag--;
  w.uses = Math.max(0, w.uses - 1);
  const spread = ((v.pistolSpread + (v.pistolAimSpread - v.pistolSpread) * g.aim + g.bloom) * Math.PI) / 180;
  g.bloom = Math.min(BLOOM_MAX, g.bloom + v.pistolBloom);
  // Off the aim within a cone (evenly over its disc).
  const off = spread * Math.sqrt(state.rng());
  const turn = 2 * Math.PI * state.rng();
  side.set(-dir.z, 0, dir.x);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  up.crossVectors(side, dir).normalize();
  shot
    .copy(dir)
    .multiplyScalar(Math.cos(off))
    .addScaledVector(side, Math.sin(off) * Math.cos(turn))
    .addScaledVector(up, Math.sin(off) * Math.sin(turn))
    .normalize();
  state.events.push('gunShot', w.mag, eye.x, eye.y, eye.z);
  const far = Math.min(v.pistolRange, world.rayDistance(eye, shot, v.pistolRange));
  end.copy(eye).addScaledVector(shot, far);
  let ends = far < v.pistolRange ? 0 : -1;
  if (nearestTarget(state, eye, end, BULLET, hit)) {
    end.copy(eye).addScaledVector(shot, far * hit.s);
    const flat = Math.hypot(shot.x, shot.z) || 1;
    landHit(state, hit, pistolDamage(), v.pistolKnock, shot.x / flat, shot.z / flat, 'hitShot', 1);
    ends = 1;
  }
  // Where it ended: on a target (1), a wall (0), or nowhere in range (−1).
  state.events.push('gunTrace', ends, end.x, end.y, end.z);
  if (w.uses === 0) state.events.push('weaponBroken');
}
