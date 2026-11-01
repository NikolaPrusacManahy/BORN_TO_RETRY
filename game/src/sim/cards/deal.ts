// Update 0.2.16 — a deal of Fate Cards (cards.ts) out of a chest (the designer: "open a chest, blurry background,
// smoothly present the cards, they are appearing one by one, like a deck card would be"; "if you are lucky, you might
// not get a normal drop but you get sets of card you pick"; "25% is fine"). A boss's chest (not the run's last) and a
// challenge room's always deal; a chest opened with a key deals instead of its item one time in four; a gold chest
// never. Each card's rarity is rolled as a chest's loot is, its key counting (a white key: rare or better; a gold key:
// epic or mythic; the designer: "same as drops"), and a boss's or a challenge room's deal has one rare or better at
// least. Only cards you don't carry, none twice. While a deal is up the world holds still and you must take one (the
// engine shows it). Seeded (the run's RNG). Pure.
import { CARDS } from '../../tuning/cards';
import { ITEMS } from '../../tuning/items';
import type { CombatState } from '../combat/state';
import { KEY_TIERS, RARITIES, Rarity } from '../dungeon/loot';
import type { KeyKind } from '../items/items';
import type { PlayerState } from '../player/state';
import { CARD, CARD_KINDS, CardKind, holds, takeCard } from './cards';

/** The cards on offer, and the chest they came out of (−1: the Lab's). */
export interface Deal {
  cards: CardKind[];
  chest: number;
}

const RARE_UP: readonly Rarity[] = ['rare', 'epic', 'mythic'];

/** A rarity among `tiers` by the chest odds (a mythic's 2%…). Fortune's Favour rolls twice and keeps the better. */
export function rollRarity(state: CombatState, tiers: readonly Rarity[]): Rarity {
  const once = () => {
    let total = 0;
    for (const r of tiers) total += ITEMS.v[r];
    let x = state.rng() * total;
    for (const r of tiers) if ((x -= ITEMS.v[r]) < 0) return r;
    return tiers[tiers.length - 1];
  };
  const a = once();
  if (!holds(state, 'fortune')) return a;
  const b = once();
  return RARITIES.indexOf(b) > RARITIES.indexOf(a) ? b : a;
}

/** A card of `rarity` you don't carry and not in `taken` (if there's none of it left, of the nearest rarity among
 *  `among` that has one); null: none at all. */
function cardOf(state: CombatState, rarity: Rarity, taken: readonly CardKind[], among: readonly Rarity[] = RARITIES): CardKind | null {
  const at = RARITIES.indexOf(rarity);
  for (let d = 0; d < RARITIES.length; d++) {
    for (const i of d === 0 ? [at] : [at - d, at + d]) {
      const r = RARITIES[i];
      if (!r || !among.includes(r)) continue;
      const pool = CARD_KINDS.filter((k) => CARD[k].rarity === r && !holds(state, k) && !taken.includes(k));
      if (pool.length > 0) return pool[Math.floor(state.rng() * pool.length)];
    }
  }
  return null;
}

/** The cards a deal shows: `key` the chest was opened with (null: none), `big`: a boss's or a challenge room's. */
export function drawDeal(state: CombatState, key: KeyKind | null, big: boolean): CardKind[] {
  const tiers = KEY_TIERS[key ?? 'key'];
  const out: CardKind[] = [];
  for (let i = 0; i < Math.round(CARDS.v.dealt); i++) {
    const k = cardOf(state, rollRarity(state, tiers), out);
    if (k) out.push(k);
  }
  // A big fight's: one rare or better at least (the last card, if none came).
  if (big && out.length > 0 && !out.some((k) => RARE_UP.includes(CARD[k].rarity))) {
    const up = cardOf(state, rollRarity(state, RARE_UP), out, RARE_UP);
    if (up) out[out.length - 1] = up;
  }
  return out;
}

/** Deals out of chest `chest` (opened with `key`; `big`: a boss's or a challenge room's). Returns false if there was
 *  nothing left to deal. */
export function startDeal(state: CombatState, chest: number, key: KeyKind | null, big: boolean): boolean {
  const cards = drawDeal(state, key, big);
  if (cards.length === 0) return false;
  state.deal = { cards, chest };
  state.events.push('dealStart', cards.length);
  return true;
}

/** The best rarity among a deal's cards (a chest's glow as it opens). */
export const dealRarity = (cards: readonly CardKind[]): Rarity => RARITIES[Math.max(0, ...cards.map((k) => RARITIES.indexOf(CARD[k].rarity)))];

/** You take card `i` of the deal: it's yours, the deal's over. Returns the card (null: no such card). */
export function pickCard(state: CombatState, player: PlayerState, i: number): CardKind | null {
  const kind = state.deal?.cards[i];
  if (!kind) return null;
  takeCard(state, player, kind);
  state.deal = null;
  return kind;
}
