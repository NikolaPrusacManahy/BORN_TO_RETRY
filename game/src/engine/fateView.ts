// Update 0.2.16 — what the page's Fate Card screens show (screens/FateDeal.tsx, screens/Inventory.tsx), read off the
// run: a deal's cards; and, on TAB (the designer: "Press TAB to display what does the player has currently equiped,
// like a invetory where they can inspect what they have on them"), everything you carry: your Fate Cards, weapons,
// rings, keys, the kill bonuses on, your health, armour, dashes and coins. Plain data, made when asked.
// Update 0.2.22 — a card as II; a deal's reroll price; your builds on TAB.
import { BONUS_TEXT, BUILD_LIST, BUILD_NAME, countOf, lit } from '../sim/cards/builds';
import { CARD, CardFamily, CardKind, cardsIn, familyOf } from '../sim/cards/cards';
import { rerollCost } from '../sim/cards/deal';
import { BUILDS } from '../tuning/builds';
import type { CombatState } from '../sim/combat/state';
import type { Rarity } from '../sim/dungeon/loot';
import { BONUS_KINDS } from '../sim/items/bonuses';
import { infoOf } from '../sim/items/itemInfo';
import type { ItemKind } from '../sim/items/items';
import { dashMaxOf } from '../sim/player/dash';
import { maxHpOf } from '../sim/player/health';
import type { PlayerState } from '../sim/player/state';
import { WEAPON_NAME } from '../sim/weapons/catalog';

/** A card's face. Update 0.2.19 — its family (a Fate, Traitor or Death Card) and a Traitor Card's price (else null). */
export interface CardView {
  kind: CardKind;
  name: string;
  rarity: Rarity;
  move: string;
  does: string;
  family: CardFamily;
  cost: string | null;
  /** Update 0.2.22 — II: dealt again, stronger (its name and what it does say so). */
  ii: boolean;
}

/** Update 0.2.22 — a deal: its cards, what a reroll costs, your coins. */
export interface DealView {
  cards: CardView[];
  reroll: number;
  money: number;
}

/** Update 0.2.22 — a build you carry a card of: how many of how many light its bonus, and the bonus. */
export interface BuildView {
  name: string;
  n: number;
  of: number;
  lit: boolean;
  does: string;
}

/** Something carried, with how many (keys, rings) or the seconds it has left (a kill bonus). */
export interface CarriedView {
  name: string;
  does: string;
  n: number;
  rarity: Rarity | null;
}

export interface InventoryView {
  cards: CardView[];
  /** The weapons in your slots (2 on), the one in your hand first among them marked. */
  weapons: { name: string; uses: number; inHand: boolean }[];
  rings: CarriedView[];
  keys: CarriedView[];
  bonuses: CarriedView[];
  hp: number;
  maxHp: number;
  shield: number;
  dashes: number;
  money: number;
  builds: BuildView[];
}

export function cardView(kind: CardKind, ii = false): CardView {
  const f = CARD[kind];
  return { kind, name: ii ? `${f.name} II` : f.name, rarity: f.rarity, move: f.move, does: f.does(ii ? f.up : 1), family: familyOf(kind), cost: f.cost?.() ?? null, ii };
}

/** Update 0.2.22 — the deal up (a card in it you carry already: dealt as II). */
export const dealView = (state: CombatState): DealView => ({ cards: (state.deal?.cards ?? []).map((k) => cardView(k, state.items.cards.has(k))), reroll: rerollCost(state), money: state.money });

/** Carried `kind` × `n` (none: not listed). */
function carried(kind: ItemKind, n: number, out: CarriedView[]) {
  if (n <= 0) return;
  const info = infoOf(kind);
  out.push({ name: info.name, does: info.does, n, rarity: info.rarity });
}

export function inventoryView(state: CombatState, p: PlayerState): InventoryView {
  const it = state.items;
  const rings: CarriedView[] = [];
  carried('redRing', it.redRings, rings);
  carried('tealRing', it.tealRings, rings);
  carried('greenRing', it.greenRings, rings);
  carried('blueRing', it.blueRings, rings);
  const keys: CarriedView[] = [];
  carried('key', it.keys, keys);
  carried('whiteKey', it.whiteKeys, keys);
  carried('goldKey', it.goldKeys, keys);
  const bonuses: CarriedView[] = [];
  for (const k of BONUS_KINDS) {
    if (state.bonuses[k] <= 0) continue;
    const info = infoOf(k);
    bonuses.push({ name: info.name, does: info.does, n: Math.ceil(state.bonuses[k]), rarity: null });
  }
  return {
    cards: cardsIn(it.cards).map((k) => cardView(k, it.twice.has(k))),
    weapons: state.bag.flatMap((w, i) => (i > 0 && w ? [{ name: WEAPON_NAME[w.kind], uses: w.uses, inHand: state.slot === i }] : [])),
    rings,
    keys,
    bonuses,
    hp: Math.ceil(p.hp),
    maxHp: Math.round(maxHpOf(p)),
    shield: Math.ceil(p.shield),
    dashes: dashMaxOf(p),
    money: state.money,
    builds: BUILD_LIST.filter((b) => countOf(it.cards, b) > 0).map((b) => ({ name: BUILD_NAME[b], n: countOf(it.cards, b), of: Math.round(BUILDS.v.set), lit: lit(it.cards, b), does: BONUS_TEXT[b]() })),
  };
}
