// Update 0.0.21 — the Dragon's fire bombs (the designer: in its second phase it flies up and bombs the ground with
// massive fireballs; you can see where each will land). A bomb is lobbed from its mouth to a spot on the floor and lands
// after its fall time; the spot is marked from the moment it's thrown (engine/boss/bombView.ts). Landing, it bursts:
// within its radius on the ground, you're hurt and thrown. A small pool, no garbage. Pure.
// Update 0.2.3 — the Bone King throws skeletons the same way (`look` 'bones': they smash, 'boneCrash').
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { damagePlayer } from '../player/health';
import type { Cause, PlayerState } from '../player/state';
import type { CombatEvent } from './state';

export interface Bomb {
  alive: boolean;
  from: Vector3;
  to: Vector3;
  /** Where it is in its fall (for the view). */
  pos: Vector3;
  /** Seconds since it was thrown, and how long its fall takes. */
  t: number;
  fall: number;
  radius: number;
  damage: number;
  shove: number;
  /** Update 0.1.14 — who threw it. */
  by: Cause | null;
  /** Update 0.2.3 — a fireball, or a skeleton (the Bone King's). */
  look: 'fire' | 'bones';
}

export const BOMB_POOL = 12;
/** How high its arc rises over the straight line (m). */
const ARC = 3;

export function createBombs(): Bomb[] {
  return Array.from({ length: BOMB_POOL }, () => ({ alive: false, from: new Vector3(), to: new Vector3(), pos: new Vector3(), t: 0, fall: 1, radius: 1, damage: 0, shove: 0, by: null, look: 'fire' as Bomb['look'] }));
}

/** Throws one from `from` to land at `to` (on the floor). False if every slot is in use. */
export function dropBomb(bombs: Bomb[], from: Vector3, to: Vector3, fall: number, radius: number, damage: number, shove: number, by: Cause | null = null, look: Bomb['look'] = 'fire'): boolean {
  const b = bombs.find((x) => !x.alive);
  if (!b) return false;
  b.alive = true;
  b.from.copy(from);
  b.to.copy(to);
  b.pos.copy(from);
  b.t = 0;
  b.fall = Math.max(0.1, fall);
  b.radius = radius;
  b.damage = damage;
  b.shove = shove;
  b.by = by;
  b.look = look;
  return true;
}

export function clearBombs(bombs: Bomb[]) {
  for (const b of bombs) b.alive = false;
}

/** Each bomb falls; landing, it bursts ('bombBlast', value = its radius). */
export function updateBombs(bombs: Bomb[], player: PlayerState, events: EventQueue<CombatEvent>, dt: number) {
  for (const b of bombs) {
    if (!b.alive) continue;
    b.t += dt;
    const k = Math.min(1, b.t / b.fall);
    b.pos.lerpVectors(b.from, b.to, k);
    b.pos.y += Math.sin(Math.PI * k) * ARC;
    if (k < 1) continue;
    b.alive = false;
    events.push(b.look === 'bones' ? 'boneCrash' : 'bombBlast', b.radius, b.to.x, b.to.y, b.to.z);
    const dx = player.pos.x - b.to.x;
    const dz = player.pos.z - b.to.z;
    const d = Math.hypot(dx, dz);
    if (d > b.radius || player.pos.y - b.to.y > b.radius * 0.8 || !damagePlayer(player, b.damage, b.by)) continue;
    const nx = d > 1e-3 ? dx / d : 1;
    const nz = d > 1e-3 ? dz / d : 0;
    player.vel.x += nx * b.shove;
    player.vel.z += nz * b.shove;
    player.vel.y = Math.max(player.vel.y, 6);
    player.grounded = false;
  }
}
