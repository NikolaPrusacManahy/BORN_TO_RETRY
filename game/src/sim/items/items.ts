// Update 0.0.13 — the items (the designer): what the shop sells and chests hold, and what you carry for the rest of the
// run. The heart heals half your health; the silver armour plate gives a shield of half your health (it takes hits
// before your health does); the gold sword goes into your hand (40 hits); each red ring adds 25% damage, each blue
// ring 20% run speed; a key opens a chest. Pure.
import { HEALTH } from '../../tuning/health';
import { ITEMS } from '../../tuning/items';
import type { CombatState } from '../combat/state';
import { addShield, healPlayer, maxShield } from '../player/health';
import type { PlayerState } from '../player/state';
import { WEAPON_STATS } from '../weapons/catalog';
import { holding, placePickup } from '../weapons/weapons';

export type ItemKind = 'heart' | 'plate' | 'goldSword' | 'redRing' | 'blueRing' | 'key';
export const ITEM_KINDS: readonly ItemKind[] = ['heart', 'plate', 'goldSword', 'redRing', 'blueRing', 'key'];

/** What you carry through the run (lost when you die). */
export interface Inventory {
  keys: number;
  redRings: number;
  blueRings: number;
}

export function createInventory(): Inventory {
  return { keys: 0, redRings: 0, blueRings: 0 };
}

/** Damage you deal, and your run speed, times these. */
export const damageFactor = (inv: Inventory) => 1 + ITEMS.v.redRing * inv.redRings;
export const speedFactor = (inv: Inventory) => 1 + ITEMS.v.blueRing * inv.blueRings;

/** Would taking it do anything? A heart at full health or a plate with a full shield wouldn't. */
export function useful(kind: ItemKind, p: PlayerState): boolean {
  if (kind === 'heart') return p.hp < HEALTH.v.maxHp;
  if (kind === 'plate') return p.shield < maxShield();
  return true;
}

/** Takes an item (bought or found): reports 'item' (value = its index in ITEM_KINDS) where you stand. */
export function takeItem(kind: ItemKind, p: PlayerState, state: CombatState) {
  switch (kind) {
    case 'heart':
      healPlayer(p, HEALTH.v.maxHp * ITEMS.v.heartHeal);
      break;
    case 'plate':
      addShield(p, HEALTH.v.maxHp * ITEMS.v.plateShield);
      break;
    case 'goldSword':
      // The weapon you held lies at your feet.
      if (state.weapon) placePickup(state.pickups, state.weapon.kind, state.weapon.uses, p.pos);
      state.weapon = holding('goldSword', WEAPON_STATS.goldSword().uses);
      break;
    case 'redRing':
      state.items.redRings++;
      break;
    case 'blueRing':
      state.items.blueRings++;
      break;
    case 'key':
      state.items.keys++;
      break;
  }
  p.speedMul = speedFactor(state.items);
  state.events.push('item', ITEM_KINDS.indexOf(kind), p.pos.x, p.pos.y + 1, p.pos.z);
}
