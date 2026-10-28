// M1 step 6 — orbs: slow glowing shots from the turret. They hit you (unless you're dashing), pop on walls and
// fizzle after a while. (The parry that sent them back was removed at the designer's request; it returns later.)
// Update 0.0.18 — a poisoned one (the wasp's sting) poisons you too.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { TARGETS } from '../../tuning/combat';
import type { CollisionWorld } from '../collisionWorld';
import { BODY } from '../player/body';
import { canHurt, damagePlayer, poisonPlayer } from '../player/health';
import { FOES2 } from '../../tuning/foes2';
import type { PlayerState } from '../player/state';
import { segmentDistance } from './geometry';
import type { CombatEvent } from './state';
import { ORB_LIFE, Orb } from './targets';

const next = new Vector3();
const dir = new Vector3();
const a = new Vector3();
const b = new Vector3();
const hitAt = new Vector3();

/** Fires an orb from a free slot. Returns false when every slot is in use. */
export function fireOrb(orbs: Orb[], from: Vector3, direction: Vector3, speed: number, damage: number, poison = 0): boolean {
  const o = orbs.find((x) => !x.alive);
  if (!o) return false;
  o.alive = true;
  o.pos.copy(from);
  o.vel.copy(direction).multiplyScalar(speed);
  o.damage = damage;
  o.life = ORB_LIFE;
  o.poison = poison;
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
    if (!o.alive) continue;
    o.life -= dt;
    if (o.life <= 0) {
      pop(o, o.pos, events);
      continue;
    }
    next.copy(o.pos).addScaledVector(o.vel, dt);
    if (canHurt(player)) {
      a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
      b.set(player.pos.x, player.pos.y + height - BODY.radius, player.pos.z);
      if (segmentDistance(o.pos, next, a, b, hitAt) <= r + BODY.radius) {
        o.alive = false;
        if (damagePlayer(player, o.damage) && o.poison > 0) poisonPlayer(player, FOES2.v.poisonDps, o.poison);
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
