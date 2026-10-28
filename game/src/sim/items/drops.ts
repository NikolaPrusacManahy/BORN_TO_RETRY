// Update 0.0.16 — items lying on the floor (the designer: the Yeti drops a key): one turns where it fell until you walk
// over it, and then it's yours. A small pool, no garbage. Pure.
// Update 0.0.17 — and kill bonuses (bonuses.ts): taking one starts its time; one left lying fades after Bonus lifetime.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { BONUS } from '../../tuning/bonus';
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
}

export const DROP_POOL = 8;
/** You take one this close to it (m, across), and within this height of it. */
export const TAKE_REACH = 1.3;
const TAKE_HEIGHT = 2;

const isBonus = (kind: DropKind): kind is BonusKind => (BONUS_KINDS as readonly string[]).includes(kind);

export function createDrops(): Drop[] {
  return Array.from({ length: DROP_POOL }, () => ({ alive: false, kind: 'key' as DropKind, pos: new Vector3(), life: 0 }));
}

/** `kind` falls at `at` (on the floor under it). Reuses the first slot when every one is in use. */
export function dropItem(drops: Drop[], kind: DropKind, at: Vector3, events: EventQueue<CombatEvent>) {
  const d = drops.find((x) => !x.alive) ?? drops[0];
  d.alive = true;
  d.kind = kind;
  d.pos.set(at.x, 0, at.z);
  d.life = isBonus(kind) ? BONUS.v.life : Infinity;
  events.push('itemDrop', DROP_KINDS.indexOf(kind), at.x, 0.5, at.z);
}

/** Walking over one takes it; a bonus left lying fades. */
export function updateDrops(state: CombatState, player: PlayerState, dt: number) {
  for (const d of state.drops) {
    if (!d.alive) continue;
    d.life -= dt;
    if (d.life <= 0) {
      d.alive = false;
      continue;
    }
    if (player.dead || Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z) > TAKE_REACH || Math.abs(player.pos.y - d.pos.y) > TAKE_HEIGHT) continue;
    d.alive = false;
    if (isBonus(d.kind)) takeBonus(state, d.kind, d.pos);
    else takeItem(d.kind, player, state);
  }
}
