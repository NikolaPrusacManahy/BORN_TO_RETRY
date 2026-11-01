// Update 0.2.16 — a deal of Fate Cards (cards.ts) out of a chest (the designer: "open a chest, blurry background,
// smoothly present the cards, they are appearing one by one, like a deck card would be"; "if you are lucky, you might
// not get a normal drop but you get sets of card you pick"; "25% is fine"). A boss's chest (not the run's last) and a
// challenge room's always deal; a chest opened with a key deals instead of its item one time in four; a gold chest
// never. Update 0.2.17 (the designer: "I would like to have a chance for each card... not having all 3 card in epic when
// we get epic once... the challenge room just gives a card guaranteed, not an Epic card guaranteed"): each card's
// rarity is rolled on its own by the chests' odds (45 / 30 / 15 / 8 / 2); the key a chest was opened with doesn't count,
// nor does a big fight (it guarantees a deal, not a rarity). Only cards you don't carry, none twice. While a deal is up
// the world holds still and you must take one (the engine shows it). Seeded (the run's RNG). Pure.
// Update 0.2.19 — Death Cards and Traitor Cards in the same deals (the designer: "it also end up in the same 3 cards
// pull, it is all rng"): each card dealt is first rolled a Death Card (15%), a Traitor Card (12%) or a Fate Card; you
// take whichever you like (the designer, of making a Death Card come with your pick: "nope, just random and allow them
// to pick whatever they want"). Gambler (a Traitor Card) deals one more, one of them always a Death Card. Fortune's
// Favour keeps the better of two rarities, Black Cat (a Death Card) the worse; Fragile Fortune (a Traitor Card) rolls one
// higher.
import { CARDS } from '../../tuning/cards';
import { ITEMS } from '../../tuning/items';
import type { CombatState } from '../combat/state';
import { RARITIES, Rarity } from '../dungeon/loot';
import type { PlayerState } from '../player/state';
import { CARD, CARD_KINDS, CardFamily, CardKind, familyOf, holds, takeCard } from './cards';

/** The cards on offer, and the chest they came out of (−1: the Lab's). */
export interface Deal {
  cards: CardKind[];
  chest: number;
}

/** A rarity among `tiers` by the chest odds (a mythic's 2%…), the luck cards counting (`rng`: the fight's, or Update
 *  0.2.20 the shop card's own). */
export function rollRarity(state: CombatState, tiers: readonly Rarity[], rng = state.rng): Rarity {
  const once = () => {
    let total = 0;
    for (const r of tiers) total += ITEMS.v[r];
    let x = rng() * total;
    for (const r of tiers) if ((x -= ITEMS.v[r]) < 0) return r;
    return tiers[tiers.length - 1];
  };
  let r = RARITIES.indexOf(once());
  if (holds(state, 'fortune')) r = Math.max(r, RARITIES.indexOf(once()));
  if (holds(state, 'blackCat')) r = Math.min(r, RARITIES.indexOf(once()));
  if (holds(state, 'fragileFortune')) r = Math.min(RARITIES.indexOf(tiers[tiers.length - 1]), r + 1);
  return RARITIES[r];
}

/** A Fate Card of `rarity` you don't carry and not in `taken` (if there's none of it left, of the nearest rarity that has
 *  one); null: none at all. */
export function fateOf(state: CombatState, rarity: Rarity, taken: readonly CardKind[], rng = state.rng): CardKind | null {
  const at = RARITIES.indexOf(rarity);
  for (let d = 0; d < RARITIES.length; d++) {
    for (const i of d === 0 ? [at] : [at - d, at + d]) {
      const r = RARITIES[i];
      if (!r) continue;
      const pool = CARD_KINDS.filter((k) => familyOf(k) === 'fate' && CARD[k].rarity === r && !holds(state, k) && !taken.includes(k));
      if (pool.length > 0) return pool[Math.floor(rng() * pool.length)];
    }
  }
  return null;
}

/** A Death or Traitor Card you don't carry and not in `taken` (null: none left of it: a Fate Card instead). */
function ofFamily(state: CombatState, family: CardFamily, taken: readonly CardKind[]): CardKind | null {
  const pool = CARD_KINDS.filter((k) => familyOf(k) === family && !holds(state, k) && !taken.includes(k));
  return pool.length > 0 ? pool[Math.floor(state.rng() * pool.length)] : null;
}

/** One card dealt: its family rolled, then the card. */
function dealOne(state: CombatState, taken: readonly CardKind[], forceDeath = false): CardKind | null {
  const v = CARDS.v;
  const r = state.rng();
  const family: CardFamily = forceDeath || r < v.deathChance ? 'death' : r < v.deathChance + v.traitorChance ? 'traitor' : 'fate';
  return (family !== 'fate' ? ofFamily(state, family, taken) : null) ?? fateOf(state, rollRarity(state, RARITIES), taken);
}

/** The cards a deal shows, each its own roll (Gambler: one more, one of them a Death Card). */
export function drawDeal(state: CombatState): CardKind[] {
  const out: CardKind[] = [];
  const gambler = holds(state, 'gambler');
  const n = Math.round(CARDS.v.dealt) + (gambler ? 1 : 0);
  // (Gambler's Death Card goes somewhere among them, by the dice.)
  const doom = gambler ? Math.floor(state.rng() * n) : -1;
  for (let i = 0; i < n; i++) {
    const k = dealOne(state, out, i === doom);
    if (k) out.push(k);
  }
  return out;
}

/** Deals out of chest `chest` (−1: the Lab). Returns false if there was nothing left to deal. */
export function startDeal(state: CombatState, chest: number): boolean {
  const cards = drawDeal(state);
  if (cards.length === 0) return false;
  state.deal = { cards, chest };
  state.events.push('dealStart', cards.length);
  return true;
}

/** The best rarity among a deal's Fate Cards (a chest's glow as it opens; none: common). */
export const dealRarity = (cards: readonly CardKind[]): Rarity => RARITIES[Math.max(0, ...cards.filter((k) => familyOf(k) === 'fate').map((k) => RARITIES.indexOf(CARD[k].rarity)))];

/** You take card `i` of the deal: it's yours, the deal's over. Returns it (null: no such card). */
export function pickCard(state: CombatState, player: PlayerState, i: number): CardKind | null {
  const kind = state.deal?.cards[i];
  if (!kind) return null;
  takeCard(state, player, kind);
  state.deal = null;
  return kind;
}
