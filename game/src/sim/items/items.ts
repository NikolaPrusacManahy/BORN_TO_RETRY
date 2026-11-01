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
// Update 0.1.9 — the Dual Daggers; your run speed (`moveFactor`) counts the weapon in your hand too (theirs is +15%).
// Update 0.1.10 — the Gold Hammer and the Gold Daggers; the designer's sort: a price for each item (no more grades), and
// the Great Heart, a chest's better heart (it heals fully).
import { ITEMS } from '../../tuning/items';
import type { CombatState } from '../combat/state';
import { addShield, healPlayer, maxHpOf, maxShield } from '../player/health';
import type { PlayerState } from '../player/state';
import { HASTE } from '../weapons/catalog';
import { giveWeapon } from '../weapons/slots';
import { holding } from '../weapons/weapons';
import { hasteFactor } from './bonuses';
import { CardKind, newUses } from '../cards/cards';
import { CARDS } from '../../tuning/cards';

export type ItemKind = 'heart' | 'plate' | 'goldSword' | 'redRing' | 'blueRing' | 'key' | 'whiteKey' | 'goldKey' | 'goldPlate' | 'greenRing' | 'tealRing' | 'grimoire' | 'goldAxe' | 'hammer' | 'daggers' | 'goldHammer' | 'goldDaggers' | 'greatHeart' | 'pistol';
export const ITEM_KINDS: readonly ItemKind[] = ['heart', 'plate', 'goldSword', 'redRing', 'blueRing', 'key', 'whiteKey', 'goldKey', 'goldPlate', 'greenRing', 'tealRing', 'grimoire', 'goldAxe', 'hammer', 'daggers', 'goldHammer', 'goldDaggers', 'greatHeart', 'pistol'];
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
  /** Update 0.2.0 — teal rings (the purple ring is gone). */
  tealRings: number;
  /** Update 0.2.16 — the Fate Cards you carry (sim/cards/cards.ts; Update 0.2.15's Scars). */
  cards: Set<CardKind>;
  /** The key you'd use at a chest. */
  keyPick: KeyKind;
}

export function createInventory(): Inventory {
  return { keys: 0, whiteKeys: 0, goldKeys: 0, redRings: 0, blueRings: 0, greenRings: 0, tealRings: 0, cards: new Set(), keyPick: 'key' };
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

/** Update 0.1.20 — a challenge room's key: white or gold (by their odds), never a normal one. */
export function betterKeyFor(roll: number): KeyKind {
  const v = ITEMS.v;
  return roll * (v.whiteKeyOdds + v.goldKeyOdds) < v.whiteKeyOdds ? 'whiteKey' : 'goldKey';
}

/** Update 0.1.10 — what each costs in the shop on floor 1 (the designer's list; it was by grade: 50, 70, 100). */
export const PRICE: Record<ItemKind, () => number> = {
  heart: () => ITEMS.v.priceHeart,
  plate: () => ITEMS.v.pricePlate,
  hammer: () => ITEMS.v.priceHammer,
  key: () => ITEMS.v.priceKey,
  redRing: () => ITEMS.v.priceRedRing,
  blueRing: () => ITEMS.v.priceBlueRing,
  greenRing: () => ITEMS.v.priceGreenRing,
  tealRing: () => ITEMS.v.priceTealRing,
  daggers: () => ITEMS.v.priceDaggers,
  whiteKey: () => ITEMS.v.priceWhiteKey,
  goldSword: () => ITEMS.v.priceGoldSword,
  goldPlate: () => ITEMS.v.priceGoldPlate,
  goldKey: () => ITEMS.v.priceGoldKey,
  goldHammer: () => ITEMS.v.priceGoldHammer,
  goldAxe: () => ITEMS.v.priceGoldAxe,
  grimoire: () => ITEMS.v.priceGrimoire,
  goldDaggers: () => ITEMS.v.priceGoldDaggers,
  greatHeart: () => ITEMS.v.priceGreatHeart,
  pistol: () => ITEMS.v.pricePistol,
};

/** What `kind` costs in the shop on floor `floor` (1, 2, …), to the nearest coin (a half rounds up: 50 × 1.15 is 58,
 *  though floating point makes it 57.4999…). */
export function priceOf(kind: ItemKind, floor: number): number {
  return Math.round(PRICE[kind]() * (1 + ITEMS.v.priceRise) ** Math.max(0, floor - 1) + 1e-6);
}

export const isKey = (kind: ItemKind): kind is KeyKind => kind === 'key' || kind === 'whiteKey' || kind === 'goldKey';

/** Damage you deal, your run speed and your melee attacks' speed, times these; your extra max health. */
export const speedFactor = (inv: Inventory) => 1 + ITEMS.v.blueRing * inv.blueRings;
export const attackRate = (inv: Inventory) => 1 + ITEMS.v.greenRing * inv.greenRings;
export const hpBonusOf = (inv: Inventory) => ITEMS.v.redRingHp * inv.redRings + ITEMS.v.tealRingHp * inv.tealRings;
/** Update 0.1.9 — your run speed, times this: the blue rings, the blue potion and the weapon in your hand. Update
 *  0.2.16 — and Bloodrush (a Fate Card). */
export const moveFactor = (state: CombatState) => speedFactor(state.items) * hasteFactor(state.bonuses) * (1 + (state.weapon ? HASTE[state.weapon.kind]() : 0)) * (state.rush > 0 ? 1 + CARDS.v.bloodrush : 1);

/** Would taking it do anything? A heart at full health or armour with a full shield wouldn't. */
export function useful(kind: ItemKind, p: PlayerState): boolean {
  if (kind === 'heart' || kind === 'greatHeart') return p.hp < maxHpOf(p);
  if (kind === 'plate' || kind === 'goldPlate') return p.shield < maxShield();
  return true;
}

/** Takes an item (bought or found): reports 'item' (value = its index in ITEM_KINDS) where you stand. */
export function takeItem(kind: ItemKind, p: PlayerState, state: CombatState) {
  switch (kind) {
    case 'heart':
      healPlayer(p, maxHpOf(p) * ITEMS.v.heartHeal);
      break;
    // Update 0.1.10 — a chest's better heart.
    case 'greatHeart':
      healPlayer(p, maxHpOf(p) * ITEMS.v.greatHeartHeal);
      break;
    case 'plate':
      addShield(p, ITEMS.v.silverShield);
      break;
    case 'goldPlate':
      addShield(p, ITEMS.v.goldShield);
      break;
    case 'goldSword':
      // (Update 0.2.15 — Collector, a Scar: more uses.)
      giveWeapon(state, holding('goldSword', newUses(state, 'goldSword')), p.pos);
      break;
    // Update 0.1.4 — the Grimoire.
    case 'grimoire':
    // Update 0.1.5 — the Gold Axe and the Hammer. Update 0.1.9 — the Dual Daggers.
    case 'goldAxe':
    case 'hammer':
    case 'daggers':
    case 'goldHammer':
    case 'goldDaggers':
    // Update 0.2.12 — the Pistol (the designer: uncommon), loaded.
    case 'pistol':
      giveWeapon(state, holding(kind, newUses(state, kind)), p.pos);
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
    // Update 0.2.0 — the teal ring: like the red ring, more.
    case 'tealRing':
      state.items.tealRings++;
      p.hpBonus = hpBonusOf(state.items);
      healPlayer(p, ITEMS.v.tealRingHp);
      break;
    case 'key':
    case 'whiteKey':
    case 'goldKey':
      state.items[KEY_FIELD[kind]]++;
      break;
  }
  p.speedMul = moveFactor(state);
  state.events.push('item', ITEM_KINDS.indexOf(kind), p.pos.x, p.pos.y + 1, p.pos.z);
}
