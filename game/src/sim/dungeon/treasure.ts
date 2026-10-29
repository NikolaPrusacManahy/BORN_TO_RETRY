// Update 0.0.13 — the shop and the chests (the designer). The shop is a side room with five display tiles, each showing
// something to buy for 70 coins. Stand by one and press E: it's yours, if you can pay and it would do something (no
// heart at full health). Chests stand in some fight rooms: with a key, E (once the room isn't fighting) kneels you in
// front of it and you lift the lid with both hands; what's inside comes out as the lid opens. Without a key the lid
// rattles. Pure and seeded.
// Update 0.0.16 (the designer) — the shop always has a heart and an armour plate; its other three tiles are drawn from
// the gold sword, the two rings and a key (normal, white or gold by its odds), and the five are shuffled. A chest's
// loot goes by rarity and by the key you open it with (loot.ts). In front of a chest with keys, you pick which key
// (the Switch key action goes to the next one you carry); E uses it.
// Update 0.0.17 — the shop's draw takes in the gold armour and the green and purple rings too.
// Update 0.0.18 — each offer has its own price (by how good it is, more on lower floors: items.ts).
import type { Rng } from '../../core/rng';
import { ITEMS } from '../../tuning/items';
import type { ChestSpot, DungeonLevel } from '../../world/dungeon/assemble';
import { burstCoins } from '../combat/coins';
import type { CombatState } from '../combat/state';
import { anyKey, checkPick, ITEM_KINDS, ItemKind, keyFor, KeyKind, nextKey, priceOf, takeItem, useful, useKey } from '../items/items';
import { startKneel } from '../player/kneel';
import type { PlayerState } from '../player/state';
import { Loot, LootRolls, RARITIES, rollLoot } from './loot';
import { Vector3 } from 'three';

export interface Offer {
  kind: ItemKind;
  /** Update 0.0.18 — what it costs here. */
  price: number;
  sold: boolean;
  /** Its tile's middle (world m). */
  x: number;
  z: number;
}

export type ChestState = 'shut' | 'opening' | 'open';

export interface Chest {
  spot: ChestSpot;
  state: ChestState;
  /** Seconds since it began opening. */
  t: number;
  /** Update 0.0.16 — its rolls (made with the floor), the key it was opened with and what that gave (null: shut). */
  rolls: LootRolls;
  key: KeyKind | null;
  loot: Loot | null;
  /** Its loot has come out. */
  given: boolean;
}

export interface Treasure {
  /** The shop's room (−1: none) and what's on its tiles. */
  shop: number;
  offers: Offer[];
  chests: Chest[];
  /** Update 0.0.16 — the chest you're picking a key for (in front of it, keys in hand; −1: none). */
  choosing: number;
}

/** You kneel this far in front of a chest (m). */
export const KNEEL_DIST = 1.15;
/** How far into the opening its loot comes out (a share of Chest opening): as the lid is up. */
export const LOOT_AT = 0.62;
/** Tiles in a shop. */
export const SHOP_TILES = 5;
/** Always in the shop; the rest of its tiles are drawn from the others ('key': a key by its odds). */
const SHOP_ALWAYS: readonly ItemKind[] = ['heart', 'plate'];
// Update 0.1.4 — and the Grimoire. Update 0.1.5 — and the Gold Axe and the Hammer. Update 0.1.9 — the Dual Daggers.
// Update 0.1.10 — and the Gold Hammer and the Gold Daggers (the designer's sort prices every item).
const SHOP_DRAWN: readonly ItemKind[] = ['goldSword', 'grimoire', 'goldAxe', 'hammer', 'daggers', 'goldHammer', 'goldDaggers', 'goldPlate', 'redRing', 'blueRing', 'greenRing', 'purpleRing', 'key'];

const at = new Vector3();

function shuffle<T>(list: T[], rng: Rng): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** The shop's offers and the chests' rolls for a floor (seeded). */
export function createTreasure(level: DungeonLevel, rng: Rng): Treasure {
  const shop = level.rooms.find((r) => r.kind === 'shop');
  const drawn = shuffle([...SHOP_DRAWN], rng).slice(0, SHOP_TILES - SHOP_ALWAYS.length);
  // A key on offer is a normal, white or gold one.
  const kinds = shuffle([...SHOP_ALWAYS, ...drawn.map((k) => (k === 'key' ? keyFor(rng()) : k))], rng);
  const floor = level.plan?.level ?? 1;
  const offers = shop ? shop.tiles.slice(0, SHOP_TILES).map((t, i) => ({ kind: kinds[i], price: priceOf(kinds[i], floor), sold: false, x: t.x, z: t.z })) : [];
  const chests = level.chests.map((spot): Chest => ({ spot, state: 'shut', t: 0, rolls: [rng(), rng(), rng()], key: null, loot: null, given: false }));
  return { shop: shop ? shop.index : -1, offers, chests, choosing: -1 };
}

/** Update 0.0.19 — no shop and no chests yet (the Lab's: its panel adds chests). */
export const emptyTreasure = (): Treasure => ({ shop: -1, offers: [], chests: [], choosing: -1 });

/** The chest you could open from where you stand: in reach and in front of it (−1: none). */
export function chestInReach(t: Treasure, player: PlayerState): number {
  for (let i = 0; i < t.chests.length; i++) {
    const c = t.chests[i];
    if (c.state !== 'shut') continue;
    const dx = player.pos.x - c.spot.x;
    const dz = player.pos.z - c.spot.z;
    if (Math.hypot(dx, dz) <= ITEMS.v.chestReach && dx * c.spot.fx + dz * c.spot.fz > 0 && Math.abs(player.pos.y) < 0.5) return i;
  }
  return -1;
}

/** The unsold offer nearest you in reach (−1: none). */
export function offerInReach(t: Treasure, player: PlayerState): number {
  let best = -1;
  let bestD = ITEMS.v.buyReach;
  for (let i = 0; i < t.offers.length; i++) {
    const o = t.offers[i];
    if (o.sold) continue;
    const d = Math.hypot(player.pos.x - o.x, player.pos.z - o.z);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** One tick: chests opening, picking a key in front of one, and E at a chest or a shop tile. `fighting(room)`: that room
 *  is mid-fight. Returns true if E was used here (so it doesn't also pick up a weapon). */
export function stepTreasure(t: Treasure, player: PlayerState, state: CombatState, interact: boolean, switchKey: boolean, fighting: (room: number) => boolean, dt: number): boolean {
  const T = ITEMS.v.chestTime;
  for (const c of t.chests) {
    if (c.state !== 'opening') continue;
    c.t += dt;
    if (!c.given && c.t >= T * LOOT_AT) giveLoot(c, player, state);
    if (c.t >= T) c.state = 'open';
  }
  t.choosing = -1;
  if (player.dead || player.kneel > 0) return false;
  const ci = player.grounded ? chestInReach(t, player) : -1;
  const inv = state.items;
  if (ci >= 0 && !fighting(t.chests[ci].spot.room)) {
    const c = t.chests[ci];
    if (anyKey(inv)) {
      t.choosing = ci;
      checkPick(inv);
      if (switchKey) {
        const was = inv.keyPick;
        nextKey(inv);
        if (inv.keyPick !== was) state.events.push('keySwitch', ITEM_KINDS.indexOf(inv.keyPick), c.spot.x, 0.6, c.spot.z);
      }
    }
    if (!interact) return false;
    if (!anyKey(inv)) {
      state.events.push('chestLocked', ci, c.spot.x, 0.6, c.spot.z);
      return true;
    }
    c.key = useKey(inv);
    c.loot = rollLoot(c.key, c.rolls);
    c.state = 'opening';
    c.t = 0;
    t.choosing = -1;
    startKneel(player, c.spot.x + c.spot.fx * KNEEL_DIST, c.spot.z + c.spot.fz * KNEEL_DIST, c.spot.rot, T);
    state.events.push('chestOpen', ci, c.spot.x, 0.6, c.spot.z);
    return true;
  }
  if (!interact) return false;
  const oi = offerInReach(t, player);
  if (oi < 0) return false;
  const o = t.offers[oi];
  if (state.money < o.price || !useful(o.kind, player)) {
    state.events.push('buyFail', oi, o.x, 1, o.z);
    return true;
  }
  state.money -= o.price;
  o.sold = true;
  state.events.push('buy', ITEM_KINDS.indexOf(o.kind), o.x, 1, o.z);
  takeItem(o.kind, player, state);
  return true;
}

/** The lid is up: its glow (by rarity), then coins burst out and fly to you, and the item is yours (Update 0.1.10 — an
 *  epic or mythic chest gives both). */
function giveLoot(c: Chest, player: PlayerState, state: CombatState) {
  c.given = true;
  const loot = c.loot!;
  state.events.push('chestRarity', RARITIES.indexOf(loot.rarity), c.spot.x, 0.8, c.spot.z);
  state.events.push('chestLoot', loot.item ? ITEM_KINDS.indexOf(loot.item) : -1, c.spot.x, 0.8, c.spot.z);
  if (loot.coins > 0) {
    at.set(c.spot.x, 0, c.spot.z);
    state.money += burstCoins(state.coins, at, loot.coins, state.rng);
  }
  if (loot.item) takeItem(loot.item, player, state);
}
