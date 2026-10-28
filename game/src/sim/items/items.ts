// Update 0.0.13 — the items (the designer): what the shop sells and chests hold, and what you carry for the rest of the
// run. The heart heals half your health; the silver armour plate gives a shield of half your health (it takes hits
// before your health does); the gold sword goes into your hand (40 hits); each red ring adds 25% damage, each blue
// ring 20% run speed; a key opens a chest. Pure.
// Update 0.0.16 — three keys (the designer): the normal key, the white key (no common or uncommon loot) and the gold key
// (only epic or legendary); the key you'll use at a chest (`keyPick`), switched between the ones you carry.
import { HEALTH } from '../../tuning/health';
import { ITEMS } from '../../tuning/items';
import type { CombatState } from '../combat/state';
import { addShield, healPlayer, maxShield } from '../player/health';
import type { PlayerState } from '../player/state';
import { WEAPON_STATS } from '../weapons/catalog';
import { holding, placePickup } from '../weapons/weapons';

export type ItemKind = 'heart' | 'plate' | 'goldSword' | 'redRing' | 'blueRing' | 'key' | 'whiteKey' | 'goldKey';
export const ITEM_KINDS: readonly ItemKind[] = ['heart', 'plate', 'goldSword', 'redRing', 'blueRing', 'key', 'whiteKey', 'goldKey'];
export type KeyKind = 'key' | 'whiteKey' | 'goldKey';
export const KEY_KINDS: readonly KeyKind[] = ['key', 'whiteKey', 'goldKey'];

/** What you carry through the run (lost when you die). */
export interface Inventory {
  keys: number;
  whiteKeys: number;
  goldKeys: number;
  redRings: number;
  blueRings: number;
  /** The key you'd use at a chest. */
  keyPick: KeyKind;
}

export function createInventory(): Inventory {
  return { keys: 0, whiteKeys: 0, goldKeys: 0, redRings: 0, blueRings: 0, keyPick: 'key' };
}

const KEY_FIELD: Record<KeyKind, 'keys' | 'whiteKeys' | 'goldKeys'> = { key: 'keys', whiteKey: 'whiteKeys', goldKey: 'goldKeys' };

/** How many of a key you carry. */
export const keysOf = (inv: Inventory, kind: KeyKind) => inv[KEY_FIELD[kind]];
export const anyKey = (inv: Inventory) => inv.keys + inv.whiteKeys + inv.goldKeys > 0;

/** The key you'd use is one you carry (the first you do, if not). */
export function checkPick(inv: Inventory) {
  if (keysOf(inv, inv.keyPick) > 0) return;
  inv.keyPick = KEY_KINDS.find((k) => keysOf(inv, k) > 0) ?? 'key';
}

/** The next key you carry after the one picked. */
export function nextKey(inv: Inventory) {
  const at = KEY_KINDS.indexOf(inv.keyPick);
  for (let n = 1; n <= KEY_KINDS.length; n++) {
    const k = KEY_KINDS[(at + n) % KEY_KINDS.length];
    if (keysOf(inv, k) > 0) {
      inv.keyPick = k;
      return;
    }
  }
}

/** Uses one of the picked key. */
export function useKey(inv: Inventory): KeyKind {
  const k = inv.keyPick;
  inv[KEY_FIELD[k]]--;
  return k;
}

/** A key by its odds (normal, white, gold), from a roll in [0, 1). */
export function keyFor(roll: number): KeyKind {
  const v = ITEMS.v;
  let r = roll * (v.keyOdds + v.whiteKeyOdds + v.goldKeyOdds);
  if ((r -= v.keyOdds) < 0) return 'key';
  return r - v.whiteKeyOdds < 0 ? 'whiteKey' : 'goldKey';
}

export const isKey = (kind: ItemKind): kind is KeyKind => kind === 'key' || kind === 'whiteKey' || kind === 'goldKey';

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
    case 'whiteKey':
    case 'goldKey':
      state.items[KEY_FIELD[kind]]++;
      break;
  }
  p.speedMul = speedFactor(state.items);
  state.events.push('item', ITEM_KINDS.indexOf(kind), p.pos.x, p.pos.y + 1, p.pos.z);
}
