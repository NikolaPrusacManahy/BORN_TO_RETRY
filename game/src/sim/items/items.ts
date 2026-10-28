// Update 0.0.13 — the items (the designer): what the shop sells and chests hold, and what you carry for the rest of the
// run. The heart heals half your health; the silver armour plate gives a shield of half your health (it takes hits
// before your health does); the gold sword goes into your hand (40 hits); each red ring adds 25% damage, each blue
// ring 20% run speed; a key opens a chest. Pure.
// Update 0.0.16 — three keys (the designer): the normal key, the white key (no common or uncommon loot) and the gold key
// (only epic or legendary); the key you'll use at a chest (`keyPick`), switched between the ones you carry.
// Update 0.0.17 — the designer's rework: the silver plate gives 20 shield, the gold armour 40; the red ring +15 max
// health, the purple ring +25% damage, the green ring +15% melee attack speed, the blue ring +15% run speed (rings
// last the run); the gold sword goes into a weapon slot (slots.ts).
// Update 0.0.18 — what each costs (the designer): a normal one 50, a better version 70, the best 100, then 15% more on
// every floor down (rounded to whole coins).
import { ITEMS } from '../../tuning/items';
import type { CombatState } from '../combat/state';
import { addShield, healPlayer, maxHpOf, maxShield } from '../player/health';
import type { PlayerState } from '../player/state';
import { WEAPON_STATS } from '../weapons/catalog';
import { giveWeapon } from '../weapons/slots';
import { holding } from '../weapons/weapons';
import { hasteFactor } from './bonuses';

export type ItemKind = 'heart' | 'plate' | 'goldSword' | 'redRing' | 'blueRing' | 'key' | 'whiteKey' | 'goldKey' | 'goldPlate' | 'greenRing' | 'purpleRing' | 'grimoire';
export const ITEM_KINDS: readonly ItemKind[] = ['heart', 'plate', 'goldSword', 'redRing', 'blueRing', 'key', 'whiteKey', 'goldKey', 'goldPlate', 'greenRing', 'purpleRing', 'grimoire'];
export type KeyKind = 'key' | 'whiteKey' | 'goldKey';
export const KEY_KINDS: readonly KeyKind[] = ['key', 'whiteKey', 'goldKey'];

/** What you carry through the run (lost when you die). */
export interface Inventory {
  keys: number;
  whiteKeys: number;
  goldKeys: number;
  redRings: number;
  blueRings: number;
  /** Update 0.0.17 — the green and purple rings. */
  greenRings: number;
  purpleRings: number;
  /** The key you'd use at a chest. */
  keyPick: KeyKind;
}

export function createInventory(): Inventory {
  return { keys: 0, whiteKeys: 0, goldKeys: 0, redRings: 0, blueRings: 0, greenRings: 0, purpleRings: 0, keyPick: 'key' };
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

/** How good a version each item is: a normal one, a better version of a normal one, the best. */
export type Grade = 'normal' | 'better' | 'best';
export const GRADE: Record<ItemKind, Grade> = {
  heart: 'normal',
  plate: 'normal',
  goldPlate: 'better',
  goldSword: 'better',
  grimoire: 'better',
  redRing: 'normal',
  blueRing: 'normal',
  greenRing: 'normal',
  purpleRing: 'normal',
  key: 'normal',
  whiteKey: 'better',
  goldKey: 'best',
};

/** What `kind` costs in the shop on floor `floor` (1, 2, …), to the nearest coin (a half rounds up: 50 × 1.15 is 58,
 *  though floating point makes it 57.4999…). */
export function priceOf(kind: ItemKind, floor: number): number {
  const v = ITEMS.v;
  const base = GRADE[kind] === 'best' ? v.priceBest : GRADE[kind] === 'better' ? v.priceBetter : v.priceNormal;
  return Math.round(base * (1 + v.priceRise) ** Math.max(0, floor - 1) + 1e-6);
}

export const isKey = (kind: ItemKind): kind is KeyKind => kind === 'key' || kind === 'whiteKey' || kind === 'goldKey';

/** Damage you deal, your run speed and your melee attacks' speed, times these; your extra max health. */
export const damageFactor = (inv: Inventory) => 1 + ITEMS.v.purpleRing * inv.purpleRings;
export const speedFactor = (inv: Inventory) => 1 + ITEMS.v.blueRing * inv.blueRings;
export const attackRate = (inv: Inventory) => 1 + ITEMS.v.greenRing * inv.greenRings;
export const hpBonusOf = (inv: Inventory) => ITEMS.v.redRingHp * inv.redRings;

/** Would taking it do anything? A heart at full health or armour with a full shield wouldn't. */
export function useful(kind: ItemKind, p: PlayerState): boolean {
  if (kind === 'heart') return p.hp < maxHpOf(p);
  if (kind === 'plate' || kind === 'goldPlate') return p.shield < maxShield();
  return true;
}

/** Takes an item (bought or found): reports 'item' (value = its index in ITEM_KINDS) where you stand. */
export function takeItem(kind: ItemKind, p: PlayerState, state: CombatState) {
  switch (kind) {
    case 'heart':
      healPlayer(p, maxHpOf(p) * ITEMS.v.heartHeal);
      break;
    case 'plate':
      addShield(p, ITEMS.v.silverShield);
      break;
    case 'goldPlate':
      addShield(p, ITEMS.v.goldShield);
      break;
    case 'goldSword':
      giveWeapon(state, holding('goldSword', WEAPON_STATS.goldSword().uses), p.pos);
      break;
    // Update 0.1.4 — the Grimoire.
    case 'grimoire':
      giveWeapon(state, holding('grimoire', WEAPON_STATS.grimoire().uses), p.pos);
      break;
    case 'redRing':
      // More max health, and the health to fill it.
      state.items.redRings++;
      p.hpBonus = hpBonusOf(state.items);
      healPlayer(p, ITEMS.v.redRingHp);
      break;
    case 'blueRing':
      state.items.blueRings++;
      break;
    case 'greenRing':
      state.items.greenRings++;
      break;
    case 'purpleRing':
      state.items.purpleRings++;
      break;
    case 'key':
    case 'whiteKey':
    case 'goldKey':
      state.items[KEY_FIELD[kind]]++;
      break;
  }
  p.speedMul = speedFactor(state.items) * hasteFactor(state.bonuses);
  state.events.push('item', ITEM_KINDS.indexOf(kind), p.pos.x, p.pos.y + 1, p.pos.z);
}
