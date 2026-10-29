// Update 0.0.16 — items lying on the floor (the designer: the Yeti drops a key): one turns where it fell until you walk
// over it, and then it's yours. A small pool, no garbage. Pure.
// Update 0.0.17 — and kill bonuses (bonuses.ts): taking one starts its time; one left lying fades after Bonus lifetime.
// Update 0.1.11 — a chest's item waits for you (the designer: "it has to be collected by players manually with E, I just
// don't want it to be collected automatically"): walking over it doesn't take it, E within Pickup range does, and it
// never fades.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { BONUS } from '../../tuning/bonus';
import { WEAPONS } from '../../tuning/weapons';
import type { CombatEvent, CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { BONUS_KINDS, BonusKind, takeBonus } from './bonuses';
import { ITEM_KINDS, ItemKind, takeItem } from './items';

export type DropKind = ItemKind | BonusKind;
/** Every kind that can lie on the floor (an item's index in ITEM_KINDS, then the bonuses after them). */
export const DROP_KINDS: readonly DropKind[] = [...ITEM_KINDS, ...BONUS_KINDS];

export interface Drop {
  alive: boolean;
  kind: DropKind;
  pos: Vector3;
  /** Seconds left before it fades (Infinity: never; a key). */
  life: number;
  /** Update 0.1.11 — it waits for E (a chest's item), where it was put (not on the floor under it). */
  manual: boolean;
}

export const DROP_POOL = 8;
/** You take one this close to it (m, across), and within this height of it. */
export const TAKE_REACH = 1.3;
const TAKE_HEIGHT = 2;

const isBonus = (kind: DropKind): kind is BonusKind => (BONUS_KINDS as readonly string[]).includes(kind);

export function createDrops(): Drop[] {
  return Array.from({ length: DROP_POOL }, () => ({ alive: false, kind: 'key' as DropKind, pos: new Vector3(), life: 0, manual: false }));
}

/** `kind` falls at `at` (on the floor under it), or (`manual`) waits there for E. Reuses a slot when every one is in
 *  use (one that isn't waiting for E, if it can). */
export function dropItem(drops: Drop[], kind: DropKind, at: Vector3, events: EventQueue<CombatEvent>, manual = false) {
  const d = drops.find((x) => !x.alive) ?? drops.find((x) => !x.manual) ?? drops[0];
  d.alive = true;
  d.kind = kind;
  d.pos.set(at.x, manual ? at.y : 0, at.z);
  d.life = isBonus(kind) && !manual ? BONUS.v.life : Infinity;
  d.manual = manual;
  events.push('itemDrop', DROP_KINDS.indexOf(kind), at.x, d.pos.y + 0.5, at.z);
}

/** Update 0.1.11 — E: takes the nearest item waiting for it in Pickup range. Returns true if one was taken. */
export function takeWaiting(state: CombatState, player: PlayerState): boolean {
  let best: Drop | null = null;
  let bestD = WEAPONS.v.pickupRange;
  for (const d of state.drops) {
    if (!d.alive || !d.manual || Math.abs(player.pos.y - d.pos.y) > TAKE_HEIGHT) continue;
    const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
    if (dist <= bestD) {
      bestD = dist;
      best = d;
    }
  }
  if (!best) return false;
  best.alive = false;
  if (isBonus(best.kind)) takeBonus(state, best.kind, best.pos);
  else takeItem(best.kind, player, state);
  return true;
}

/** Walking over one takes it (not one waiting for E); a bonus left lying fades. */
export function updateDrops(state: CombatState, player: PlayerState, dt: number) {
  for (const d of state.drops) {
    if (!d.alive) continue;
    d.life -= dt;
    if (d.life <= 0) {
      d.alive = false;
      continue;
    }
    if (d.manual || player.dead || Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z) > TAKE_REACH || Math.abs(player.pos.y - d.pos.y) > TAKE_HEIGHT) continue;
    d.alive = false;
    if (isBonus(d.kind)) takeBonus(state, d.kind, d.pos);
    else takeItem(d.kind, player, state);
  }
}
