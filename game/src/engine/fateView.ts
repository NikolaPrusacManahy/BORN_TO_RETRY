// Update 0.2.16 — what the page's Fate Card screens show (screens/FateDeal.tsx, screens/Inventory.tsx), read off the
// run: a deal's cards; and, on TAB (the designer: "Press TAB to display what does the player has currently equiped,
// like a invetory where they can inspect what they have on them"), everything you carry: your Fate Cards, weapons,
// rings, keys, the kill bonuses on, your health, armour, dashes and coins. Plain data, made when asked.
import { CARD, CardFamily, CardKind, cardsIn, familyOf } from '../sim/cards/cards';
import type { CombatState } from '../sim/combat/state';
import type { Rarity } from '../sim/dungeon/loot';
import { BONUS_KINDS } from '../sim/items/bonuses';
import { infoOf } from '../sim/items/itemInfo';
import type { ItemKind } from '../sim/items/items';
import { dashMaxOf } from '../sim/player/dash';
import { maxHpOf } from '../sim/player/health';
import type { PlayerState } from '../sim/player/state';
import { WEAPON_NAME } from '../sim/weapons/catalog';

/** A card's face. Update 0.2.19 — its family (a Fate, Traitor or Death Card), a Traitor Card's price (else null), and
 *  whether it's bound (a Death Card dealt that comes with you whatever you take). */
export interface CardView {
  kind: CardKind;
  name: string;
  rarity: Rarity;
  move: string;
  does: string;
  family: CardFamily;
  cost: string | null;
  bound: boolean;
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
}

export const cardView = (kind: CardKind, bound = false): CardView => ({ kind, name: CARD[kind].name, rarity: CARD[kind].rarity, move: CARD[kind].move, does: CARD[kind].does(), family: familyOf(kind), cost: CARD[kind].cost?.() ?? null, bound });

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
    cards: cardsIn(it.cards).map((k) => cardView(k)),
    weapons: state.bag.flatMap((w, i) => (i > 0 && w ? [{ name: WEAPON_NAME[w.kind], uses: w.uses, inHand: state.slot === i }] : [])),
    rings,
    keys,
    bonuses,
    hp: Math.ceil(p.hp),
    maxHp: Math.round(maxHpOf(p)),
    shield: Math.ceil(p.shield),
    dashes: dashMaxOf(p),
    money: state.money,
  };
}
