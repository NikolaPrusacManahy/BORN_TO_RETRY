// Update 0.0.16 — items lying on the floor (the designer: the Yeti drops a key): one turns where it fell until you walk
// over it, and then it's yours. A small pool, no garbage. Pure.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import type { CombatEvent, CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { ITEM_KINDS, ItemKind, takeItem } from './items';

export interface Drop {
  alive: boolean;
  kind: ItemKind;
  pos: Vector3;
}

export const DROP_POOL = 4;
/** You take one this close to it (m, across), and within this height of it. */
export const TAKE_REACH = 1.3;
const TAKE_HEIGHT = 2;

export function createDrops(): Drop[] {
  return Array.from({ length: DROP_POOL }, () => ({ alive: false, kind: 'key' as ItemKind, pos: new Vector3() }));
}

/** `kind` falls at `at` (on the floor under it). Reuses the first slot when every one is in use. */
export function dropItem(drops: Drop[], kind: ItemKind, at: Vector3, events: EventQueue<CombatEvent>) {
  const d = drops.find((x) => !x.alive) ?? drops[0];
  d.alive = true;
  d.kind = kind;
  d.pos.set(at.x, 0, at.z);
  events.push('itemDrop', ITEM_KINDS.indexOf(kind), at.x, 0.5, at.z);
}

/** Walking over one takes it. */
export function updateDrops(state: CombatState, player: PlayerState) {
  if (player.dead) return;
  for (const d of state.drops) {
    if (!d.alive || Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z) > TAKE_REACH || Math.abs(player.pos.y - d.pos.y) > TAKE_HEIGHT) continue;
    d.alive = false;
    takeItem(d.kind, player, state);
  }
}
