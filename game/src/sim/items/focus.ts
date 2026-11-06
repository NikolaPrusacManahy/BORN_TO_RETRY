// Update 0.1.20 — what's in front of you to know about or to use with E (the designer: an overlay near an item "stating
// what it is and what it does", "[E] to interact or pick up", "[E] TO EXECUTE"). First what E would do now, in the order
// the game takes E: an item waiting over an open chest, a chest, a shop tile, an execution, a weapon on the floor. Else
// the nearest item within Look range, only to read about (an item you take by walking over it, or one not yet in
// reach). Pure: the HUD draws it (engine/promptView.ts). Update 0.2.20 — and the shop's Fate Card (its face's name,
// rarity and what it does: E to buy).
import { Vector3 } from 'three';
import { WEAPONS } from '../../tuning/weapons';
import type { CombatState } from '../combat/state';
import { chestInReach, keyless, offerInReach, Treasure } from '../dungeon/treasure';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import type { CardKind } from '../cards/cards';
import { CARD_PRICE_Y, cardInReach } from '../cards/shopCard';
import { TAKE_HEIGHT } from './drops';
import type { InfoKind } from './itemInfo';
import { anyKey } from './items';

/** What E does here: take it, buy it, open the chest, execute; 'locked': a chest and no key; null: nothing. Update
 *  0.2.9 — the lobby's (sim/lobby/lobby.ts): choose it, it's already chosen, go through the gate, a locked character.
 *  Update 0.2.17 — and turn Fate Cards on or off. Update 0.3.70 — 'sealed': the Demon, not yet earned.
 *  Update 0.3.80 — 'unwon': Gravity Sean, no run won yet. */
export type FocusAct = 'pick' | 'buy' | 'open' | 'locked' | 'execute' | 'choose' | 'chosen' | 'enter' | 'unavailable' | 'sealed' | 'unwon' | 'turnOn' | 'turnOff' | null;

export interface Focus {
  /** The item it's about (its card), or null (a chest, an execution, nothing). */
  item: InfoKind | null;
  /** A weapon's uses (−1: a new one's). */
  uses: number;
  act: FocusAct;
  /** Where it is (world m): its card hangs over it. */
  at: Vector3;
  /** Update 0.2.9 — a lobby station's name, shown in place of an item's ('': no name; null: not a station). */
  label: string | null;
  /** Update 0.2.20 — the Fate Card it's about (the shop's), or null. */
  card: CardKind | null;
}

/** Items further than this aren't shown (m). */
export const LOOK_RANGE = 4;
/** A weapon on the floor is taken within this height of you (weapons.ts). */
const PICK_HEIGHT = 1.5;
/** A card hangs this high over a shop tile (m: over its price, 1.75), over a chest, and over an item on the floor. */
const OVER_TILE = 2.1;
const OVER_CHEST = 1.2;
const OVER_ITEM = 0.55;

export const emptyFocus = (): Focus => ({ item: null, uses: -1, act: null, at: new Vector3(), label: null, card: null });
/** The prompt hangs this high over the shop card's price (m). */
const OVER_CARD = CARD_PRICE_Y + 0.35;

function set(f: Focus, item: InfoKind | null, uses: number, act: FocusAct, x: number, y: number, z: number): Focus {
  f.item = item;
  f.uses = uses;
  f.act = act;
  f.at.set(x, y, z);
  f.label = null;
  f.card = null;
  return f;
}

/** How far `p` is from (x, z), across. */
const flat = (p: PlayerState, x: number, z: number) => Math.hypot(p.pos.x - x, p.pos.z - z);

/** Fills `out` with what's in front of you; `fighting(room)`: that room is mid-fight (no chest opens). */
export function focusOf(t: Treasure, state: CombatState, p: PlayerState, fighting: (room: number) => boolean, out: Focus): Focus {
  set(out, null, -1, null, 0, 0, 0);
  if (p.dead || p.kneel > 0) return out;
  const reach = WEAPONS.v.pickupRange;
  // An item waiting over an open chest.
  let best = -1;
  let bestD = reach;
  for (let i = 0; i < state.drops.length; i++) {
    const d = state.drops[i];
    if (!d.alive || !d.manual || Math.abs(p.pos.y - d.pos.y) > TAKE_HEIGHT || flat(p, d.pos.x, d.pos.z) > bestD) continue;
    bestD = flat(p, d.pos.x, d.pos.z);
    best = i;
  }
  if (best >= 0) {
    const d = state.drops[best];
    return set(out, d.kind, -1, 'pick', d.pos.x, d.pos.y + OVER_ITEM, d.pos.z);
  }
  const ci = p.grounded ? chestInReach(t, p) : -1;
  if (ci >= 0 && !fighting(t.chests[ci].spot.room)) {
    const c = t.chests[ci].spot;
    // (Update 0.2.0 — a boss's chest needs no key; Update 0.2.1, nor a gold chest.)
    return set(out, null, -1, keyless(t.chests[ci]) || anyKey(state.items) ? 'open' : 'locked', c.x, OVER_CHEST, c.z);
  }
  const oi = offerInReach(t, p);
  if (oi >= 0) {
    const o = t.offers[oi];
    return set(out, o.kind, -1, 'buy', o.x, OVER_TILE, o.z);
  }
  if (cardInReach(t, p) && t.card) {
    set(out, null, -1, 'buy', t.card.x, OVER_CARD, t.card.z);
    out.card = t.card.kind;
    return out;
  }
  if (state.execTarget >= 0) {
    const e = state.enemies[state.execTarget];
    return set(out, null, -1, 'execute', e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height, e.pos.z);
  }
  best = -1;
  bestD = reach;
  // (Update 0.3.70 — the Demon takes no other weapon: no card for one.)
  for (let i = 0; i < state.pickups.length && !state.demon; i++) {
    const w = state.pickups[i];
    if (!w.alive || Math.abs(w.pos.y - p.pos.y) > PICK_HEIGHT || flat(p, w.pos.x, w.pos.z) > bestD) continue;
    bestD = flat(p, w.pos.x, w.pos.z);
    best = i;
  }
  if (best >= 0) {
    const w = state.pickups[best];
    return set(out, w.kind, w.uses, 'pick', w.pos.x, w.pos.y + OVER_ITEM, w.pos.z);
  }
  // Nothing to use: the nearest item to read about.
  bestD = LOOK_RANGE;
  for (const d of state.drops) {
    if (!d.alive || Math.abs(p.pos.y - d.pos.y) > TAKE_HEIGHT || flat(p, d.pos.x, d.pos.z) > bestD) continue;
    bestD = flat(p, d.pos.x, d.pos.z);
    set(out, d.kind, -1, null, d.pos.x, d.pos.y + OVER_ITEM, d.pos.z);
  }
  for (const o of t.offers) {
    if (o.sold || flat(p, o.x, o.z) > bestD) continue;
    bestD = flat(p, o.x, o.z);
    set(out, o.kind, -1, null, o.x, OVER_TILE, o.z);
  }
  for (const w of state.pickups) {
    if (!w.alive || Math.abs(w.pos.y - p.pos.y) > PICK_HEIGHT || flat(p, w.pos.x, w.pos.z) > bestD) continue;
    bestD = flat(p, w.pos.x, w.pos.z);
    set(out, w.kind, w.uses, null, w.pos.x, w.pos.y + OVER_ITEM, w.pos.z);
  }
  const c = t.card;
  if (c && c.kind !== null && !c.sold && flat(p, c.x, c.z) <= bestD) {
    set(out, null, -1, null, c.x, OVER_CARD, c.z);
    out.card = c.kind;
  }
  return out;
}
