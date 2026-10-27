// M1 step 6 — training dummies: hits flash them, push them (they spring back home) and make them wobble;
// enough damage breaks them, and they come back a moment later.
import type { EventQueue } from '../../core/eventQueue';
import { TARGETS } from '../../tuning/combat';
import type { CombatEvent } from './state';
import type { Dummy } from './targets';

/** Seconds a hit flashes the dummy white. */
export const HIT_FLASH = 0.12;

/** Damages a dummy pushed along (dirX, dirZ) (length 1). Returns true if this hit broke it. */
export function hitDummy(d: Dummy, damage: number, knock: number, dirX: number, dirZ: number): boolean {
  if (d.broken) return false;
  const v = TARGETS.v;
  d.flash = HIT_FLASH;
  // A kick of this size makes the spring peak at about `knock × push` metres.
  const kick = knock * Math.sqrt(v.dummyStiffness);
  d.offsetVel.x += dirX * kick * v.dummyPush;
  d.offsetVel.z += dirZ * kick * v.dummyPush;
  // Pushed along +z the top leans +z (a turn around x); along +x it leans +x (a negative turn around z).
  d.tiltVel.x += dirZ * kick * v.dummyTilt;
  d.tiltVel.z -= dirX * kick * v.dummyTilt;
  d.hp -= damage;
  if (d.hp > 0) return false;
  d.hp = 0;
  d.broken = true;
  d.respawn = v.dummyRespawn;
  return true;
}

export function updateDummy(d: Dummy, events: EventQueue<CombatEvent>, dt: number) {
  const v = TARGETS.v;
  d.flash = Math.max(0, d.flash - dt);
  if (d.broken) {
    d.respawn -= dt;
    if (d.respawn > 0) return;
    d.broken = false;
    d.hp = v.dummyHp;
    d.offset.set(0, 0, 0);
    d.offsetVel.set(0, 0, 0);
    d.tilt.set(0, 0, 0);
    d.tiltVel.set(0, 0, 0);
    events.push('respawn', 0, d.home.x, d.home.y, d.home.z);
    return;
  }
  const k = v.dummyStiffness;
  const c = v.dummyDamping;
  d.offsetVel.x += (-k * d.offset.x - c * d.offsetVel.x) * dt;
  d.offsetVel.z += (-k * d.offset.z - c * d.offsetVel.z) * dt;
  d.offset.x += d.offsetVel.x * dt;
  d.offset.z += d.offsetVel.z * dt;
  d.tiltVel.x += (-k * d.tilt.x - c * d.tiltVel.x) * dt;
  d.tiltVel.z += (-k * d.tilt.z - c * d.tiltVel.z) * dt;
  d.tilt.x += d.tiltVel.x * dt;
  d.tilt.z += d.tiltVel.z * dt;
}
