// Update 0.0.21 — the Dragon's fire bombs (the designer: in its second phase it flies up and bombs the ground with
// massive fireballs; you can see where each will land). A bomb is lobbed from its mouth to a spot on the floor and lands
// after its fall time; the spot is marked from the moment it's thrown (engine/boss/bombView.ts). Landing, it bursts:
// within its radius on the ground, you're hurt and thrown. A small pool, no garbage. Pure.
// Update 0.2.3 — the Bone King throws skeletons the same way (`look` 'bones': they smash, 'boneCrash').
// Update 0.2.4 — the Lizard's poison glob (`look` 'poison'): it splashes into a puddle (puddles.ts), no blast.
// Update 0.2.10 — the Drowned King's geysers (`look` 'geyser'): nothing falls, the floor rings where it'll burst up
// ('geyserBurst'), throwing you high.
// Update 0.3.15 — floor 6's Bomber's powder bombs (`look` 'powder'): landed, it sits burning its `fuse`, then blows
// ('powderBlast': enemies and powder kegs in it too, dungeon/powder.ts, where a punch bats one back).
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { damagePlayer } from '../player/health';
import type { Cause, PlayerState } from '../player/state';
import type { CombatEvent } from './state';
import { addPuddle, Puddle } from './puddles';

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
  /** (Update 0.2.10 — 'bubble': floor 5's Big Glub's; it pops, 'bubblePop'. 'geyser': the Drowned King's.) */
  look: 'fire' | 'bones' | 'poison' | 'bubble' | 'geyser' | 'powder';
  /** Update 0.3.15 — landed, it burns this long before it goes (s). */
  fuse: number;
}

export const BOMB_POOL = 12;
/** How high its arc rises over the straight line (m). */
const ARC = 3;
/** A geyser throws you up this fast (m/s); a blast, this. */
const GEYSER_UP = 11;
const BLAST_UP = 6;

export function createBombs(): Bomb[] {
  return Array.from({ length: BOMB_POOL }, () => ({ alive: false, from: new Vector3(), to: new Vector3(), pos: new Vector3(), t: 0, fall: 1, radius: 1, damage: 0, shove: 0, by: null, look: 'fire' as Bomb['look'], fuse: 0 }));
}

/** Throws one from `from` to land at `to` (on the floor). False if every slot is in use. */
export function dropBomb(bombs: Bomb[], from: Vector3, to: Vector3, fall: number, radius: number, damage: number, shove: number, by: Cause | null = null, look: Bomb['look'] = 'fire', fuse = 0): boolean {
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
  b.fuse = fuse;
  return true;
}

export function clearBombs(bombs: Bomb[]) {
  for (const b of bombs) b.alive = false;
}

/** Each bomb falls; landing, it bursts ('bombBlast', value = its radius). */
export function updateBombs(bombs: Bomb[], player: PlayerState, events: EventQueue<CombatEvent>, dt: number, puddles: Puddle[] = []) {
  for (const b of bombs) {
    if (!b.alive) continue;
    b.t += dt;
    const k = Math.min(1, b.t / b.fall);
    b.pos.lerpVectors(b.from, b.to, k);
    b.pos.y += Math.sin(Math.PI * k) * ARC;
    if (k < 1 || b.t < b.fall + b.fuse) continue;
    b.alive = false;
    if (b.look === 'poison') {
      addPuddle(puddles, b.to.x, b.to.y, b.to.z, events);
      continue;
    }
    events.push(b.look === 'bones' ? 'boneCrash' : b.look === 'bubble' ? 'bubblePop' : b.look === 'geyser' ? 'geyserBurst' : b.look === 'powder' ? 'powderBlast' : 'bombBlast', b.radius, b.to.x, b.to.y, b.to.z);
    const dx = player.pos.x - b.to.x;
    const dz = player.pos.z - b.to.z;
    const d = Math.hypot(dx, dz);
    if (d > b.radius || player.pos.y - b.to.y > b.radius * 0.8 || !damagePlayer(player, b.damage, b.by)) continue;
    const nx = d > 1e-3 ? dx / d : 1;
    const nz = d > 1e-3 ? dz / d : 0;
    player.vel.x += nx * b.shove;
    player.vel.z += nz * b.shove;
    player.vel.y = Math.max(player.vel.y, b.look === 'geyser' ? GEYSER_UP : BLAST_UP);
    player.grounded = false;
  }
}
