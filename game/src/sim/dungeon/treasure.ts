// Update 0.0.13 — the shop and the chests (the designer). The shop is a side room with five display tiles, each showing
// something to buy for 70 coins: always a key (every floor has a chest), and four of the heart, the armour plate, the
// gold sword and the two rings. Stand by one and press E: it's yours, if you can pay and it would do something (no
// heart at full health). Chests stand in some fight rooms: with a key, E (once the room isn't fighting) kneels you in
// front of it and you lift the lid with both hands; what's inside (50–80 coins, a plate, a heart or a ring) comes out
// as the lid opens. Without a key the lid rattles. Pure and seeded.
import type { Rng } from '../../core/rng';
import { ITEMS } from '../../tuning/items';
import type { ChestSpot, DungeonLevel } from '../../world/dungeon/assemble';
import { burstCoins } from '../combat/coins';
import type { CombatState } from '../combat/state';
import { ITEM_KINDS, ItemKind, takeItem, useful } from '../items/items';
import { startKneel } from '../player/kneel';
import type { PlayerState } from '../player/state';
import { Vector3 } from 'three';

export interface Offer {
  kind: ItemKind;
  sold: boolean;
  /** Its tile's middle (world m). */
  x: number;
  z: number;
}

export type Loot = 'coins' | 'plate' | 'heart' | 'redRing' | 'blueRing';
export type ChestState = 'shut' | 'opening' | 'open';

export interface Chest {
  spot: ChestSpot;
  state: ChestState;
  /** Seconds since it began opening. */
  t: number;
  loot: Loot;
  /** Its coins, if it holds coins. */
  coins: number;
  /** Its loot has come out. */
  given: boolean;
}

export interface Treasure {
  /** The shop's room (−1: none) and what's on its tiles. */
  shop: number;
  offers: Offer[];
  chests: Chest[];
}

/** You kneel this far in front of a chest (m). */
export const KNEEL_DIST = 1.15;
/** How far into the opening its loot comes out (a share of Chest opening): as the lid is up. */
export const LOOT_AT = 0.62;
/** Tiles in a shop. */
export const SHOP_TILES = 5;

const at = new Vector3();

/** The shop's offers and the chests' loot for a floor (seeded). */
export function createTreasure(level: DungeonLevel, rng: Rng): Treasure {
  const shop = level.rooms.find((r) => r.kind === 'shop');
  const others: ItemKind[] = ['heart', 'plate', 'goldSword', 'redRing', 'blueRing'];
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const kinds: ItemKind[] = ['key', ...others.slice(0, SHOP_TILES - 1)];
  // The key's tile varies too.
  const k = Math.floor(rng() * kinds.length);
  [kinds[0], kinds[k]] = [kinds[k], kinds[0]];
  const offers = shop ? shop.tiles.slice(0, SHOP_TILES).map((t, i) => ({ kind: kinds[i], sold: false, x: t.x, z: t.z })) : [];
  const chests = level.chests.map((spot) => {
    const loot = rollLoot(rng);
    const v = ITEMS.v;
    const coins = loot === 'coins' ? Math.round(v.chestCoinsMin + rng() * (v.chestCoinsMax - v.chestCoinsMin)) : 0;
    return { spot, state: 'shut' as ChestState, t: 0, loot, coins, given: false };
  });
  return { shop: shop ? shop.index : -1, offers, chests };
}

/** Coins (Chest: coins), else a plate, a heart or a ring (red or blue), alike. */
function rollLoot(rng: Rng): Loot {
  if (rng() < ITEMS.v.chestCoinOdds) return 'coins';
  const r = rng() * 4;
  return r < 1 ? 'plate' : r < 2 ? 'heart' : r < 3 ? 'redRing' : 'blueRing';
}

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

/** One tick: chests opening, and E at a chest or a shop tile. `fighting(room)`: that room is mid-fight. Returns true if
 *  E was used here (so it doesn't also pick up a weapon). */
export function stepTreasure(t: Treasure, player: PlayerState, state: CombatState, interact: boolean, fighting: (room: number) => boolean, dt: number): boolean {
  const T = ITEMS.v.chestTime;
  for (const c of t.chests) {
    if (c.state !== 'opening') continue;
    c.t += dt;
    if (!c.given && c.t >= T * LOOT_AT) giveLoot(c, player, state);
    if (c.t >= T) c.state = 'open';
  }
  if (!interact || player.dead || player.kneel > 0) return false;
  const ci = chestInReach(t, player);
  if (ci >= 0 && player.grounded) {
    const c = t.chests[ci];
    if (fighting(c.spot.room)) return false;
    if (state.items.keys <= 0) {
      state.events.push('chestLocked', ci, c.spot.x, 0.6, c.spot.z);
      return true;
    }
    state.items.keys--;
    c.state = 'opening';
    c.t = 0;
    startKneel(player, c.spot.x + c.spot.fx * KNEEL_DIST, c.spot.z + c.spot.fz * KNEEL_DIST, c.spot.rot, T);
    state.events.push('chestOpen', ci, c.spot.x, 0.6, c.spot.z);
    return true;
  }
  const oi = offerInReach(t, player);
  if (oi < 0) return false;
  const o = t.offers[oi];
  if (state.money < ITEMS.v.price || !useful(o.kind, player)) {
    state.events.push('buyFail', oi, o.x, 1, o.z);
    return true;
  }
  state.money -= ITEMS.v.price;
  o.sold = true;
  state.events.push('buy', ITEM_KINDS.indexOf(o.kind), o.x, 1, o.z);
  takeItem(o.kind, player, state);
  return true;
}

/** The lid is up: coins burst out and fly to you, or the item is yours. */
function giveLoot(c: Chest, player: PlayerState, state: CombatState) {
  c.given = true;
  state.events.push('chestLoot', c.loot === 'coins' ? -1 : ITEM_KINDS.indexOf(c.loot), c.spot.x, 0.8, c.spot.z);
  if (c.loot === 'coins') {
    at.set(c.spot.x, 0, c.spot.z);
    state.money += burstCoins(state.coins, at, c.coins, state.rng);
  } else takeItem(c.loot, player, state);
}
