// Update 0.0.16 — what a chest holds, by rarity (the designer): common (coins: one of four amounts), uncommon (a heart
// or an armour plate), rare (the gold sword), epic (a ring, red or blue), legendary (nothing yet). The key decides what
// may come out: a normal key anything, a white key no common or uncommon, a gold key only epic or legendary. A rarity
// with nothing in it gives the next one down that has something. Pure: the rolls are made when the floor is laid out,
// so the same chest opened with the same key always holds the same thing.
// Update 0.0.17 — more in them (the designer): the gold armour is rare too, and every ring (red, blue, green, purple)
// is epic.
import { ITEMS } from '../../tuning/items';
import type { ItemKind, KeyKind } from '../items/items';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** What each rarity holds ('coins': one of the four amounts). */
export const TIER: Record<Rarity, readonly (ItemKind | 'coins')[]> = {
  common: ['coins'],
  uncommon: ['heart', 'plate'],
  // Update 0.1.4 — and the Grimoire. Update 0.1.5 — and the Gold Axe and the Hammer.
  rare: ['goldSword', 'goldPlate', 'grimoire', 'goldAxe', 'hammer'],
  epic: ['redRing', 'blueRing', 'greenRing', 'purpleRing'],
  legendary: [],
};

/** The rarities each key opens. */
export const KEY_TIERS: Record<KeyKind, readonly Rarity[]> = {
  key: RARITIES,
  whiteKey: ['rare', 'epic', 'legendary'],
  goldKey: ['epic', 'legendary'],
};

export interface Loot {
  rarity: Rarity;
  /** The item (null: coins). */
  item: ItemKind | null;
  coins: number;
}

/** A chest's three rolls, each in [0, 1): its rarity, its item, its coins. */
export type LootRolls = readonly [number, number, number];

/** The loot a chest with `rolls` gives when opened with `key`. */
export function rollLoot(key: KeyKind, rolls: LootRolls): Loot {
  const v = ITEMS.v;
  const tiers = KEY_TIERS[key];
  let total = 0;
  for (const r of tiers) total += v[r];
  let x = rolls[0] * total;
  let rarity = tiers[tiers.length - 1];
  for (const r of tiers) {
    x -= v[r];
    if (x < 0) {
      rarity = r;
      break;
    }
  }
  let i = RARITIES.indexOf(rarity);
  while (i > 0 && TIER[RARITIES[i]].length === 0) i--;
  rarity = RARITIES[i];
  const pool = TIER[rarity];
  const pick = pool[Math.min(pool.length - 1, Math.floor(rolls[1] * pool.length))];
  if (pick !== 'coins') return { rarity, item: pick, coins: 0 };
  const amounts = [v.coins1, v.coins2, v.coins3, v.coins4];
  return { rarity, item: null, coins: amounts[Math.min(3, Math.floor(rolls[2] * 4))] };
}
