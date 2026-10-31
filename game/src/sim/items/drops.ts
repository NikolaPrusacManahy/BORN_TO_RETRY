// Update 0.0.16 — items lying on the floor (the designer: the Yeti drops a key): one turns where it fell until you walk
// over it, and then it's yours. A small pool, no garbage. Pure.
// Update 0.0.17 — and kill bonuses (bonuses.ts): taking one starts its time; one left lying fades after Bonus lifetime.
// Update 0.1.11 — a chest's item waits for you (the designer: "it has to be collected by players manually with E, I just
// don't want it to be collected automatically"): walking over it doesn't take it, E within Pickup range does, and it
// never fades.
// Update 0.2.15 — and the Scars on offer before a chest (sim/scars/scarOffer.ts): they bounce out of it and land on the
// floor (nothing takes one before it's down); taking one fades the rest of its offer.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { BONUS } from '../../tuning/bonus';
import { WEAPONS } from '../../tuning/weapons';
import type { CombatEvent, CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { BONUS_KINDS, BonusKind, takeBonus } from './bonuses';
import { ITEM_KINDS, ItemKind, takeItem } from './items';
import { isScar, ScarKind, SCAR_KINDS, takeScar } from '../scars/scars';

export type DropKind = ItemKind | BonusKind | ScarKind;
/** Every kind that can lie on the floor (an item's index in ITEM_KINDS, then the bonuses after them, then the Scars). */
export const DROP_KINDS: readonly DropKind[] = [...ITEM_KINDS, ...BONUS_KINDS, ...SCAR_KINDS];

export interface Drop {
  alive: boolean;
  kind: DropKind;
  pos: Vector3;
  /** Seconds left before it fades (Infinity: never; a key). */
  life: number;
  /** Update 0.1.11 — it waits for E (a chest's item), where it was put (not on the floor under it). */
  manual: boolean;
  /** Update 0.2.15 — a Scar on offer: the chest whose offer it's in (−1: none); seconds before it lands (0: down), and
   *  where it was thrown from (the chest). */
  offer: number;
  land: number;
  from: Vector3;
}

/** (Update 0.2.15 — 12: a boss's chest puts out its two items and three Scars.) */
export const DROP_POOL = 12;
/** You take one this close to it (m, across), and within this height of it. */
export const TAKE_REACH = 1.3;
export const TAKE_HEIGHT = 2;

const isBonus = (kind: DropKind): kind is BonusKind => (BONUS_KINDS as readonly string[]).includes(kind);

export function createDrops(): Drop[] {
  return Array.from({ length: DROP_POOL }, () => ({ alive: false, kind: 'key' as DropKind, pos: new Vector3(), life: 0, manual: false, offer: -1, land: 0, from: new Vector3() }));
}

const isKey = (k: DropKind) => k === 'key' || k === 'whiteKey' || k === 'goldKey';

/** `kind` falls at `at` (on the floor under it, `ground` m up), or (`manual`) waits there for E. Reuses a slot when
 *  every one is in use (one that isn't waiting for E, if it can). Update 0.2.5 — never a key's: a bonus lying there goes
 *  first (a key overwritten left a chest with no key to open it). Update 0.2.15 — `offer`: a Scar on offer's chest. */
export function dropItem(drops: Drop[], kind: DropKind, at: Vector3, events: EventQueue<CombatEvent>, manual = false, ground = 0, offer = -1): Drop {
  const d = drops.find((x) => !x.alive) ?? drops.find((x) => !x.manual && isBonus(x.kind)) ?? drops.find((x) => !x.manual && !isKey(x.kind)) ?? drops.find((x) => !x.manual) ?? drops[0];
  d.alive = true;
  d.kind = kind;
  d.pos.set(at.x, manual ? at.y : ground, at.z);
  d.life = isBonus(kind) && !manual ? BONUS.v.life : Infinity;
  d.manual = manual;
  d.offer = offer;
  d.land = 0;
  if (offer >= 0 && isScar(kind)) events.push('scarOffer', SCAR_KINDS.indexOf(kind), at.x, d.pos.y + 0.6, at.z);
  else events.push('itemDrop', DROP_KINDS.indexOf(kind), at.x, d.pos.y + 0.5, at.z);
  return d;
}

/** Update 0.2.15 — down where it was going (not still flying out of a chest). */
export const landed = (d: Drop) => d.land <= 0;

/** Update 0.2.15 — takes what `d` is (an item, a kill bonus or a Scar). */
function take(state: CombatState, player: PlayerState, d: Drop) {
  d.alive = false;
  if (isBonus(d.kind)) takeBonus(state, d.kind, d.pos);
  else if (isScar(d.kind)) takeScar(state, player, d.kind, d.offer);
  else takeItem(d.kind, player, state);
}

/** Update 0.1.11 — E: takes the nearest item waiting for it in Pickup range. Returns true if one was taken. */
export function takeWaiting(state: CombatState, player: PlayerState): boolean {
  let best: Drop | null = null;
  let bestD = WEAPONS.v.pickupRange;
  for (const d of state.drops) {
    if (!d.alive || !d.manual || !landed(d) || Math.abs(player.pos.y - d.pos.y) > TAKE_HEIGHT) continue;
    const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
    if (dist <= bestD) {
      bestD = dist;
      best = d;
    }
  }
  if (!best) return false;
  take(state, player, best);
  return true;
}

/** Walking over one takes it (not one waiting for E); a bonus left lying fades. */
export function updateDrops(state: CombatState, player: PlayerState, dt: number) {
  for (const d of state.drops) {
    if (!d.alive) continue;
    // (Update 0.2.15 — a Scar flying out of its chest: it lands.)
    if (d.land > 0) {
      d.land = Math.max(0, d.land - dt);
      if (d.land === 0 && isScar(d.kind)) state.events.push('scarLand', SCAR_KINDS.indexOf(d.kind), d.pos.x, d.pos.y, d.pos.z);
      continue;
    }
    d.life -= dt;
    if (d.life <= 0) {
      d.alive = false;
      continue;
    }
    if (d.manual || player.dead || Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z) > TAKE_REACH || Math.abs(player.pos.y - d.pos.y) > TAKE_HEIGHT) continue;
    take(state, player, d);
  }
}
