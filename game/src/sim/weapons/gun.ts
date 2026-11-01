// Update 0.2.4 — the Pistol's rules (the designer: "reload animation top notch, throw with q key"). Left click fires one
// bullet a click (no faster than Pistol fire rate; a click a moment early is kept): a hitscan shot from your eye,
// stopped by the first wall, landing on the first target it passes (every dodge and guard applies, as to any blow). R
// reloads; so does a click with the magazine empty, and the last bullet fired starts it by itself. A reload's beats
// (shared with the arms): the magazine drops out, the new one goes in (the bullets count in then), and from empty the
// slide is released. Its uses are all its bullets: none left, the next click throws it (step.ts), as Q always does.
// Then (the designer): 8 a magazine, 40 in all; a Grunt in 5 bullets (fists take 6): a weak option, a little better at
// range.
// Update 0.2.6 (the designer: "the bullets is trying to be realistic and not shooting straight where I am aiming";
// "right click is only a hit with the gun, like a close range gun hit with it, like we are punching, no aiming"; "the
// bullet is going straight toward the crosshair"): no spread and no aiming down the sights: every bullet goes exactly
// along your look, to the crosshair. Right click is a pistol-whip: a strike with the gun at a fist's reach (Pistol whip
// damage, every Pistol whip rate while held; no bullet spent), landing Whip hit into its swing; not while it reloads,
// and no shot while it swings. Pure.
import { Vector3 } from 'three';
import { FISTS } from '../../tuning/combat';
import { ENEMIES } from '../../tuning/enemies';
import { GUN } from '../../tuning/gun';
import type { CollisionWorld } from '../collisionWorld';
import { emptyPunch } from '../combat/fists';
import type { CombatIntent } from '../combat/fists';
import { resolvePunch } from '../combat/punch';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import type { HeldWeapon } from './weapons';
import { handsRate } from '../cards/cardMoves';

export interface GunState {
  /** Seconds into a reload (−1: none), and whether it began empty (the slide locked back). */
  reload: number;
  empty: boolean;
  /** The reload's beats heard so far (0 … 3). */
  beats: number;
  /** A click kept this long for when the gun's ready (s). */
  queued: number;
  /** Update 0.2.6 — seconds into a pistol-whip (−1: none), whether it has struck yet, and the rest before the next. */
  whip: number;
  struck: boolean;
  whipRest: number;
}

/** A reload's beats, as shares of its time: the magazine drops out, the new one is in, the slide goes home (from empty). */
export const MAG_OUT = 0.16;
export const MAG_IN = 0.56;
export const SLIDE_HOME = 0.8;
/** Update 0.2.6 — a pistol-whip's swing (s), and when in it the gun lands (s). */
export const WHIP_TIME = 0.32;
export const WHIP_HIT = 0.13;
/** A click this early is kept (s). */
const QUEUE = 0.12;
/** A bullet's radius (m): what it passes this close to, it hits. */
const BULLET = 0.06;

const end = new Vector3();
const hit = emptyTargetHit();
const whack = emptyPunch();

export function createGun(): GunState {
  return { reload: -1, empty: false, beats: 0, queued: 0, whip: -1, struck: false, whipRest: 0 };
}

/** The gun isn't in your hand (put away, thrown, a throw winding up): no reload, no swing. */
export function dropGun(g: GunState) {
  g.reload = -1;
  g.queued = 0;
  g.whip = -1;
}

/** A bullet's damage: a Grunt's health over Pistol shots a Grunt (rounded up, so it takes exactly that many). */
export const pistolDamage = () => Math.ceil(ENEMIES.v.gruntHp / Math.max(1, Math.round(GUN.v.pistolShots)));

export const magSize = () => Math.max(1, Math.round(GUN.v.pistolMag));
export const reloadTime = (empty: boolean) => (empty ? GUN.v.pistolReloadEmpty : GUN.v.pistolReload);

/** One tick with the gun in hand. `eye`, `dir`: where you look from and along (length 1); `rate`: green rings quicken
 *  its fire and its whip. */
export function updateGun(state: CombatState, w: HeldWeapon, intent: CombatIntent, eye: Vector3, dir: Vector3, world: CollisionWorld, dt: number, rate = 1) {
  const v = GUN.v;
  const g = state.gun;
  w.cooldown = Math.max(0, w.cooldown - dt);
  g.whipRest = Math.max(0, g.whipRest - dt);
  const swinging = g.whip >= 0;
  // (A click while the gun swings is kept till the swing ends.)
  g.queued = intent.attackPressed ? QUEUE : swinging ? g.queued : Math.max(0, g.queued - dt);
  if (!swinging && g.reload < 0 && intent.reloadPressed && w.mag < magSize() && w.uses > w.mag) startReload(state, w);
  // Empty with bullets to spare: a click (or the last shot, once the slide's back) reloads.
  if (!swinging && g.reload < 0 && w.mag === 0 && w.uses > 0 && w.cooldown <= 0) startReload(state, w);
  if (g.reload >= 0) stepReload(state, w, dt);
  // Right click: the whip.
  if (!swinging && g.reload < 0 && intent.heavyHeld && g.whipRest <= 0) {
    g.whip = 0;
    g.struck = false;
    g.whipRest = v.pistolWhipRate / rate;
    state.events.push('pistolWhip');
  }
  if (g.whip >= 0) {
    g.whip += dt;
    if (!g.struck && g.whip >= WHIP_HIT) {
      g.struck = true;
      whip(state, eye, dir, world);
    }
    if (g.whip >= WHIP_TIME) g.whip = -1;
    return;
  }
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
  // (Update 0.2.16 — Quick Hands, a Fate Card: quicker.)
  g.reload += dt * handsRate(state);
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

/** The whip lands: a blow at a fist's reach, as a finisher punch lands (its hit, its stop, its knock). */
function whip(state: CombatState, eye: Vector3, dir: Vector3, world: CollisionWorld) {
  const v = GUN.v;
  whack.kind = 'finisher';
  whack.damage = v.pistolWhipDamage;
  whack.knock = v.pistolWhipKnock;
  whack.charge = 0;
  whack.reach = FISTS.v.reach;
  whack.radius = FISTS.v.radius;
  resolvePunch(whack, state, eye, dir, world);
}

/** One bullet straight along `dir`: to the crosshair. */
function fire(state: CombatState, w: HeldWeapon, eye: Vector3, dir: Vector3, world: CollisionWorld, rate: number) {
  const v = GUN.v;
  w.cooldown = v.pistolInterval / rate;
  w.mag--;
  w.uses = Math.max(0, w.uses - 1);
  state.events.push('gunShot', w.mag, eye.x, eye.y, eye.z);
  const far = Math.min(v.pistolRange, world.rayDistance(eye, dir, v.pistolRange));
  end.copy(eye).addScaledVector(dir, far);
  let ends = far < v.pistolRange ? 0 : -1;
  if (nearestTarget(state, eye, end, BULLET, hit)) {
    end.copy(eye).addScaledVector(dir, far * hit.s);
    const flat = Math.hypot(dir.x, dir.z) || 1;
    landHit(state, hit, pistolDamage(), v.pistolKnock, dir.x / flat, dir.z / flat, 'hitShot', 1);
    ends = 1;
  }
  // Where it ended: on a target (1), a wall (0), or nowhere in range (−1).
  state.events.push('gunTrace', ends, end.x, end.y, end.z);
  if (w.uses === 0) state.events.push('weaponBroken');
}
