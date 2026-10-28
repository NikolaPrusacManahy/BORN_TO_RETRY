// Update 0.1.4 — the Grimoire's fire (the designer: a book held open, fire in the other palm, cast forward; spec
// MD_UPDATES/U014_GRIMOIRE.md). Left click casts a fireball every Cast interval while held; right click held charges
// one (kiCharge.ts) and letting go casts it. Each cast burns the book's uses, hit or miss. A fireball flies straight
// from your eye to where you aim; it bursts on the first target it passes or the first wall, hurting what's near (a
// charged one is bigger, slower, and hits harder and wider). Pure.
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { WEAPONS } from '../../tuning/weapons';
import type { CollisionWorld } from '../collisionWorld';
import type { CombatIntent } from '../combat/fists';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import { isLive } from '../enemies/enemy';
import { kiFull, KiPower, kiPower } from './kiCharge';
import type { HeldWeapon } from './weapons';

export interface Fireball {
  alive: boolean;
  pos: Vector3;
  vel: Vector3;
  /** Seconds left before it bursts on its own. */
  life: number;
  /** Seconds it was charged (0: a plain one). */
  charge: number;
}

export const FIREBALL_POOL = 12;
/** It leaves this far ahead of your eye (m). */
const LEAD = 0.5;

const next = new Vector3();
const dir = new Vector3();
const where = new Vector3();
const hit = emptyTargetHit();
const power: KiPower = { damage: 0, splash: 0, burst: 0, size: 0, speed: 0, knock: 0 };

export function createFireballs(): Fireball[] {
  return Array.from({ length: FIREBALL_POOL }, () => ({ alive: false, pos: new Vector3(), vel: new Vector3(), life: 0, charge: 0 }));
}

/** Left click with the Grimoire: a cast every Cast interval while held (`rate`: green rings quicken it). Returns true
 *  when one is cast this tick. */
export function updateCasts(w: HeldWeapon, intent: CombatIntent, dt: number, rate = 1): boolean {
  w.cooldown = Math.max(0, w.cooldown - dt);
  if (!(intent.attackPressed || intent.attackHeld) || w.cooldown > 0) return false;
  w.cooldown = WEAPONS.v.castInterval / rate;
  return true;
}

/** A fireball from `eye` along `dir` (length 1), charged `charge` s. It burns `cost` of the book's uses (a charge has
 *  paid as it built). */
export function castFireball(state: CombatState, w: HeldWeapon, eye: Vector3, dir: Vector3, charge: number, cost: number) {
  let f = state.fireballs[0];
  for (const q of state.fireballs)
    if (!q.alive) {
      f = q;
      break;
    }
  kiPower(charge, power);
  f.alive = true;
  f.charge = charge;
  f.pos.copy(eye).addScaledVector(dir, LEAD);
  f.vel.copy(dir).multiplyScalar(power.speed);
  // (A slower, charged one flies as far as a plain one.)
  f.life = (WEAPONS.v.fireLife * WEAPONS.v.fireSpeed) / power.speed;
  w.uses = Math.max(0, w.uses - cost);
  state.events.push('cast', charge, f.pos.x, f.pos.y, f.pos.z);
  if (w.uses === 0) state.events.push('weaponBroken');
}

export function updateFireballs(state: CombatState, world: CollisionWorld, dt: number) {
  for (const f of state.fireballs) {
    if (!f.alive) continue;
    f.life -= dt;
    next.copy(f.pos).addScaledVector(f.vel, dt);
    kiPower(f.charge, power);
    if (nearestTarget(state, f.pos, next, power.size, hit)) {
      const flat = Math.hypot(f.vel.x, f.vel.z) || 1;
      const kind = hit.kind;
      const index = hit.index;
      landHit(state, hit, power.damage, power.knock, f.vel.x / flat, f.vel.z / flat, charged(f) ? 'hitHeavy' : 'hitJab', 1);
      burst(state, f, f.pos.lerp(next, hit.s), kind === 'enemy' ? index : -1, kind === 'dummy' ? index : -1);
      continue;
    }
    const step = f.pos.distanceTo(next);
    dir.subVectors(next, f.pos).divideScalar(Math.max(step, 1e-6));
    const wall = world.rayDistance(f.pos, dir, step);
    if (wall <= step || f.life <= 0) {
      burst(state, f, wall <= step ? f.pos.addScaledVector(dir, wall) : f.pos, -1, -1);
      continue;
    }
    f.pos.copy(next);
  }
}

/** Charged at least one step: it hits as a heavy blow does. */
const charged = (f: Fireball) => f.charge >= WEAPONS.v.kiStep;

/** It bursts at `at`: what's near it (not the enemy or dummy it hit) is hurt and pushed away. A charged one freezes the
 *  game a moment (longer the more it was charged). */
function burst(state: CombatState, f: Fireball, at: Vector3, struck: number, struckDummy: number) {
  f.alive = false;
  state.events.push('fireballBurst', f.charge, at.x, at.y, at.z);
  kiPower(f.charge, power);
  const event = charged(f) ? 'hitHeavy' : 'hitJab';
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (i !== struck && isLive(e)) splash(state, 'enemy', i, e.pos, at, event);
  }
  // (The lab's dummies too.)
  for (let i = 0; i < state.dummies.length; i++) {
    const d = state.dummies[i];
    if (i !== struckDummy && !d.broken) splash(state, 'dummy', i, where.copy(d.home).add(d.offset), at, event);
  }
  if (charged(f)) state.hitStop.request(FEEDBACK.v.stopHeavy + (WEAPONS.v.kiStop - FEEDBACK.v.stopHeavy) * Math.min(1, f.charge / Math.max(1e-3, kiFull())));
}

function splash(state: CombatState, kind: 'enemy' | 'dummy', i: number, pos: Vector3, at: Vector3, event: 'hitHeavy' | 'hitJab') {
  const dx = pos.x - at.x;
  const dz = pos.z - at.z;
  const d = Math.hypot(dx, dz);
  if (d > power.burst || Math.abs(pos.y - at.y) > power.burst + 1) return;
  hit.kind = kind;
  hit.index = i;
  hit.point.copy(pos);
  landHit(state, hit, power.splash, power.knock, d > 1e-3 ? dx / d : 0, d > 1e-3 ? dz / d : 1, event, 1);
}
