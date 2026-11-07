// Update 0.2.20 — the shop's Fate Card (the designer: "the shop has only one fate card. floating near, cost 100"): one
// Fate Card floats past the end of the shop's row of tiles, for 100 coins (Haggler and Taxman count; Fasting: the shop
// won't sell it). Its rarity is rolled like a deal's; never one you carry. E in reach buys it: it's yours for the run.
// None when Fate Cards are off (the lobby's stand), on ARE YOU EVEN HUMAN? (no shop), or when there's no Fate Card left
// to offer. Which card is seeded by the floor (its roll) and what you carry as you come down. Pure.
import { createRng } from '../../core/rng';
import { CARDS } from '../../tuning/cards';
import { ITEMS } from '../../tuning/items';
import type { DungeonRoom } from '../../world/dungeon/assemble';
import type { CombatState } from '../combat/state';
import { RARITIES } from '../dungeon/loot';
import type { Treasure } from '../dungeon/treasure';
import type { PlayerState } from '../player/state';
import { CardKind, holds, shopFactor, takeCard } from './cards';
import { fateOf, rollRarity } from './deal';

export interface ShopCard {
  /** The card on offer (null: none: not stocked, or nothing to offer). */
  kind: CardKind | null;
  /** The floor's roll for it. */
  roll: number;
  sold: boolean;
  /** Where it floats (world m). */
  x: number;
  z: number;
}

/** How high its middle floats (m), and its price over it. */
export const CARD_FLOAT = 1.25;
export const CARD_PRICE_Y = 1.95;
/** How far past the last tile it floats (m: two cells, one past the candelabrum). */
const PAST = 4;

/** The shop's card, not yet stocked: past the end of its row of tiles with the more room (the room's middle if its tiles
 *  aren't in a row). */
export function placeCard(room: DungeonRoom, roll: number): ShopCard {
  const xs = room.tiles.map((t) => t.x);
  const zs = room.tiles.map((t) => t.z);
  const card: ShopCard = { kind: null, roll, sold: false, x: (room.min.x + room.max.x) / 2, z: (room.min.z + room.max.z) / 2 };
  if (xs.length === 0) return card;
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  if (zs.every((z) => Math.abs(z - zs[0]) < 1e-6)) {
    card.x = room.max.x - hi >= lo - room.min.x ? hi + PAST : lo - PAST;
    card.z = zs[0];
  } else if (xs.every((x) => Math.abs(x - xs[0]) < 1e-6)) {
    const zlo = Math.min(...zs);
    const zhi = Math.max(...zs);
    card.x = xs[0];
    card.z = room.max.z - zhi >= zlo - room.min.z ? zhi + PAST : zlo - PAST;
  }
  return card;
}

/** Puts the card on offer for this floor (as you come down, carrying what you carry). */
export function stockShop(t: Treasure, state: CombatState) {
  const c = t.card;
  if (!c || c.sold) return;
  c.kind = null;
  // (Update 0.5.0 — Gravity Sean's cards come out of a challenge room's chest only.)
  if (!state.fate || state.bare || state.sean) return;
  const rng = createRng(Math.floor(c.roll * 0x7fffffff));
  // (Update 0.2.22 — never a II.)
  c.kind = fateOf(state, rollRarity(state, RARITIES, rng), [], rng, false);
}

/** What the card costs you (Haggler: less; Taxman: more). */
export const cardPrice = (state: CombatState) => Math.round(CARDS.v.shopCard * shopFactor(state));

/** The card's on offer and you're in reach of it. */
export function cardInReach(t: Treasure, player: PlayerState): boolean {
  const c = t.card;
  return !!c && c.kind !== null && !c.sold && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) <= ITEMS.v.buyReach;
}

/** E by the card: it's yours, if you can pay and the shop sells to you (Fasting). Returns true if E was used here. */
export function buyCard(t: Treasure, player: PlayerState, state: CombatState): boolean {
  const c = t.card;
  if (!c || c.kind === null || !cardInReach(t, player)) return false;
  const price = cardPrice(state);
  if (state.money < price || holds(state, c.kind) || holds(state, 'fasting')) {
    state.events.push('buyFail', -1, c.x, 1, c.z);
    return true;
  }
  state.money -= price;
  c.sold = true;
  state.events.push('buy', -1, c.x, 1, c.z);
  takeCard(state, player, c.kind);
  return true;
}
