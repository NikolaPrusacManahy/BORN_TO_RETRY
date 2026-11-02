// M1 step 6 — orbs: slow glowing shots from the turret. They hit you (unless you're dashing), pop on walls and
// fizzle after a while. (The parry that sent them back was removed at the designer's request; it returns later.)
// Update 0.2.4 — a shot's look: the Tribal's spear and the Cactoros' spines fly as orbs do.
// Update 0.3.3 — the parry is back (parry.ts): a shot punched back is its business, not these.
import { Quaternion, Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { TARGETS } from '../../tuning/combat';
import type { CollisionWorld } from '../collisionWorld';
import { BODY } from '../player/body';
import { canHurt, damagePlayer } from '../player/health';
import type { Cause, PlayerState } from '../player/state';
import { segmentDistance } from './geometry';
import type { CombatEvent } from './state';
import { ORB_LIFE, Orb } from './targets';

const next = new Vector3();
const dir = new Vector3();
const a = new Vector3();
const b = new Vector3();
const hitAt = new Vector3();
const spin = new Quaternion();

/** Fires an orb from a free slot. Returns false when every slot is in use. */
export function fireOrb(orbs: Orb[], from: Vector3, direction: Vector3, speed: number, damage: number, by: Cause | null = null, look: Orb['look'] = 'fire', home = 0): boolean {
  const o = orbs.find((x) => !x.alive);
  if (!o) return false;
  o.alive = true;
  o.pos.copy(from);
  o.vel.copy(direction).multiplyScalar(speed);
  o.damage = damage;
  o.by = by;
  o.look = look;
  o.parried = false;
  o.life = ORB_LIFE;
  o.home = home;
  return true;
}

function pop(o: Orb, at: Vector3, events: EventQueue<CombatEvent>) {
  o.alive = false;
  events.push('orbPop', 0, at.x, at.y, at.z);
}

export function updateOrbs(orbs: Orb[], player: PlayerState, world: CollisionWorld, events: EventQueue<CombatEvent>, dt: number) {
  const r = TARGETS.v.orbRadius;
  const height = player.sliding ? BODY.crouchHeight : BODY.height;
  for (const o of orbs) {
    if (!o.alive || o.parried) continue;
    o.life -= dt;
    if (o.life <= 0) {
      pop(o, o.pos, events);
      continue;
    }
    // (Update 0.3.18 — a homing one turns after your chest: floor 8's missiles.)
    if (o.home > 0) home(o, player, dt);
    next.copy(o.pos).addScaledVector(o.vel, dt);
    if (canHurt(player)) {
      a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
      b.set(player.pos.x, player.pos.y + height - BODY.radius, player.pos.z);
      if (segmentDistance(o.pos, next, a, b, hitAt) <= r + BODY.radius) {
        o.alive = false;
        damagePlayer(player, o.damage, o.by);
        events.push('orbHitPlayer', o.damage, hitAt.x, hitAt.y, hitAt.z);
        continue;
      }
    }
    const step = o.vel.length() * dt;
    dir.copy(o.vel).divideScalar(Math.max(o.vel.length(), 1e-6));
    const wall = world.rayDistance(o.pos, dir, step + r);
    if (wall <= step + r) {
      hitAt.copy(o.pos).addScaledVector(dir, Math.max(0, wall - r));
      pop(o, hitAt, events);
      continue;
    }
    o.pos.copy(next);
  }
}

/** Turns its flight towards your chest, at most its `home` a second (rad), keeping its speed. */
function home(o: Orb, player: PlayerState, dt: number) {
  const speed = o.vel.length();
  if (speed < 1e-4) return;
  dir.copy(o.vel).divideScalar(speed);
  a.set(player.pos.x - o.pos.x, player.pos.y + BODY.height * 0.6 - o.pos.y, player.pos.z - o.pos.z).normalize();
  const angle = Math.acos(Math.max(-1, Math.min(1, dir.dot(a))));
  if (angle < 1e-4) return;
  b.crossVectors(dir, a);
  const len = b.length();
  if (len < 1e-6) return;
  spin.setFromAxisAngle(b.divideScalar(len), Math.min(angle, o.home * dt));
  o.vel.copy(dir.applyQuaternion(spin)).multiplyScalar(speed);
}
