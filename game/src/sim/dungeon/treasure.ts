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
// Update 0.2.0 (the designer) — some chests rise out of the floor: the challenge room's once it's won, the boss's once
// it's dead (`raiseChest`); until then they're buried (not there). The boss's opens without a key and holds what the
// boss used to leave as it burst: its coins, a key and a heart (the items wait over it for E, side by side).
// Update 0.2.1 (the designer) — every room's chest rises once its room is won. A gold chest (a room with no mini boss:
// no key drops there) opens without a key, and gives coins only.
// Update 0.2.15 — a boss's chest and a challenge room's offered Scars. Update 0.2.16 — Fate Cards (sim/cards/deal.ts):
// a boss's chest (not the run's last) and a challenge room's always deal them; a chest opened with a key deals them
// instead of its item one time in four (the designer: "if you are lucky … 25% is fine"). Fortune's Favour (a card)
// rolls a chest's rarity twice; Haggler (a card) makes the shop cheaper (`offerPrice`).
// Update 0.2.20 — the shop's Fate Card (sim/cards/shopCard.ts; the designer: "the shop has only one fate card. floating
// near, cost 100"); the gold in a chest halved (the designer: "reduce the amount of gold in chest by x2": Chest gold).
// Update 0.2.25 (the designer: "players get the normal loot in there and the card is like a bonus that can proc"; "in
// challenge room, you get loot and also cards guaranteed") — a chest always gives its loot; its Fate Cards come as well,
// never instead (a keyed chest's by luck, a challenge room's always).
import type { Rng } from '../../core/rng';
import { ITEMS } from '../../tuning/items';
import type { ChestSpot, DungeonLevel } from '../../world/dungeon/assemble';
import { burstCoins } from '../combat/coins';
import type { CombatState } from '../combat/state';
import { anyKey, checkPick, ITEM_KINDS, ItemKind, keyFor, KeyKind, nextKey, priceOf, takeItem, useful, useKey } from '../items/items';
import { startKneel } from '../player/kneel';
import type { PlayerState } from '../player/state';
import { dropItem, takeWaiting } from '../items/drops';
import { goldLoot, Loot, LootRolls, RARITIES, rollLoot } from './loot';
import { BOSS_LOOT, bossCoins } from './bossRoom';
import { coinsFor } from '../items/bonuses';
import type { EnemyKind } from '../enemies/kinds';
import { Vector3 } from 'three';
import { CARDS } from '../../tuning/cards';
import { holds, shopFactor } from '../cards/cards';
import { startDeal } from '../cards/deal';
import { buyCard, placeCard, ShopCard } from '../cards/shopCard';

export interface Offer {
  kind: ItemKind;
  /** Update 0.0.18 — what it costs here. */
  price: number;
  sold: boolean;
  /** Its tile's middle (world m). */
  x: number;
  z: number;
}

/** Update 0.2.0 — 'buried': not there yet; 'rising': coming up out of the floor. */
export type ChestState = 'buried' | 'rising' | 'shut' | 'opening' | 'open';

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
  /** Update 0.2.0 — a boss's chest: which boss (no key opens it; its loot is the boss's); null: a key opens it. */
  boss: EnemyKind | null;
  /** Update 0.2.16 — it always deals Fate Cards (a boss's, a challenge room's); else a keyed one may, by luck. */
  cards: boolean;
}

export interface Treasure {
  /** The shop's room (−1: none) and what's on its tiles. */
  shop: number;
  offers: Offer[];
  chests: Chest[];
  /** Update 0.0.16 — the chest you're picking a key for (in front of it, keys in hand; −1: none). */
  choosing: number;
  /** Update 0.2.20 — the shop's Fate Card (none: no shop). */
  card?: ShopCard | null;
}

/** You kneel this far in front of a chest (m). */
export const KNEEL_DIST = 1.15;
/** How far into the opening its loot comes out (a share of Chest opening): as the lid is up. */
export const LOOT_AT = 0.62;
/** Update 0.1.11 — how high over the floor a chest's item waits (m): drawn half a metre over the open chest (0.57 m). */
export const LOOT_HEIGHT = 0.5;
/** Update 0.2.0 — the boss's items wait this far apart over its chest (m). */
const LOOT_GAP = 0.5;
/** Tiles in a shop. */
export const SHOP_TILES = 5;
/** Always in the shop; the rest of its tiles are drawn from the others ('key': a key by its odds). */
const SHOP_ALWAYS: readonly ItemKind[] = ['heart', 'plate'];
// Update 0.1.4 — and the Grimoire. Update 0.1.5 — and the Gold Axe and the Hammer. Update 0.1.9 — the Dual Daggers.
// Update 0.1.10 — and the Gold Hammer and the Gold Daggers (the designer's sort prices every item).
const SHOP_DRAWN: readonly ItemKind[] = ['goldSword', 'grimoire', 'goldAxe', 'hammer', 'daggers', 'goldHammer', 'goldDaggers', 'goldPlate', 'redRing', 'blueRing', 'greenRing', 'tealRing', 'key'];

const at = new Vector3();

function shuffle<T>(list: T[], rng: Rng): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** The shop's offers and the chests' rolls for a floor (seeded); `boss`: the floor's (its chest's loot). Update 0.2.15
 *  — `bossCards`: its chest deals Fate Cards (not on the run's last floor). */
export function createTreasure(level: DungeonLevel, rng: Rng, boss: EnemyKind = 'demon', bossCards = true): Treasure {
  const shop = level.rooms.find((r) => r.kind === 'shop');
  const drawn = shuffle([...SHOP_DRAWN], rng).slice(0, SHOP_TILES - SHOP_ALWAYS.length);
  // A key on offer is a normal, white or gold one.
  const kinds = shuffle([...SHOP_ALWAYS, ...drawn.map((k) => (k === 'key' ? keyFor(rng()) : k))], rng);
  const floor = level.plan?.level ?? 1;
  const offers = shop ? shop.tiles.slice(0, SHOP_TILES).map((t, i) => ({ kind: kinds[i], price: priceOf(kinds[i], floor), sold: false, x: t.x, z: t.z })) : [];
  const chests = level.chests.map((spot): Chest => ({ spot, state: spot.rises ? 'buried' : 'shut', t: 0, rolls: [rng(), rng(), rng()], key: null, loot: null, given: false, boss: spot.boss ? boss : null, cards: spot.boss ? bossCards : !!level.rooms[spot.room]?.challenge }));
  // (Update 0.2.20 — the card's roll last: the rest roll as they did.)
  const card = shop ? placeCard(shop, rng()) : null;
  return { shop: shop ? shop.index : -1, offers, chests, choosing: -1, card };
}

/** Update 0.0.19 — no shop and no chests yet (the Lab's: its panel adds chests). */
export const emptyTreasure = (): Treasure => ({ shop: -1, offers: [], chests: [], choosing: -1 });

/** Update 0.2.1 — no key opens it (a boss's chest, a gold chest): E alone does. */
export const keyless = (c: Chest) => c.boss !== null || c.spot.gold;

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

/** Update 0.2.0 — the room you're in (by its whole inside, `level`'s) has a chest still to open (up, or rising). */
export function chestToOpen(t: Treasure, level: DungeonLevel, x: number, z: number): boolean {
  const r = level.rooms.find((q) => x >= q.min.x && x <= q.max.x && z >= q.min.z && z <= q.max.z);
  return !!r && t.chests.some((c) => c.spot.room === r.index && (c.state === 'shut' || c.state === 'rising'));
}

/** Update 0.2.0 — chest `i` starts rising out of the floor (if it's buried). */
export function raiseChest(t: Treasure, i: number, state: CombatState) {
  const c = t.chests[i];
  // (Update 0.2.12 — ARE YOU EVEN HUMAN?: no chests.)
  if (!c || c.state !== 'buried' || state.bare) return;
  c.state = 'rising';
  c.t = 0;
  state.events.push('chestRise', i, c.spot.x, 0, c.spot.z);
}

/** Update 0.2.21 — the chests coming up out of the floor, `dt` on (also while the chest's shot holds the world still:
 *  engine/run.ts). */
export function riseChests(t: Treasure, dt: number) {
  for (const c of t.chests) {
    if (c.state !== 'rising') continue;
    c.t += dt;
    if (c.t >= ITEMS.v.chestRise) c.state = 'shut';
  }
}

/** One tick: chests opening, picking a key in front of one, and E at a chest or a shop tile. `fighting(room)`: that room
 *  is mid-fight. Returns true if E was used here (so it doesn't also pick up a weapon). */
export function stepTreasure(t: Treasure, player: PlayerState, state: CombatState, interact: boolean, switchKey: boolean, fighting: (room: number) => boolean, dt: number): boolean {
  const T = ITEMS.v.chestTime;
  riseChests(t, dt);
  for (let i = 0; i < t.chests.length; i++) {
    const c = t.chests[i];
    if (c.state !== 'opening') continue;
    c.t += dt;
    if (!c.given && c.t >= T * LOOT_AT) giveLoot(c, i, state);
    if (c.t >= T) c.state = 'open';
  }
  t.choosing = -1;
  if (player.dead || player.kneel > 0) return false;
  // Update 0.1.11 — E takes a chest's item waiting nearby first.
  if (interact && takeWaiting(state, player)) return true;
  const ci = player.grounded ? chestInReach(t, player) : -1;
  const inv = state.items;
  if (ci >= 0 && !fighting(t.chests[ci].spot.room)) {
    const c = t.chests[ci];
    const free = keyless(c);
    if (!free && anyKey(inv)) {
      t.choosing = ci;
      checkPick(inv);
      if (switchKey) {
        const was = inv.keyPick;
        nextKey(inv);
        if (inv.keyPick !== was) state.events.push('keySwitch', ITEM_KINDS.indexOf(inv.keyPick), c.spot.x, 0.6, c.spot.z);
      }
    }
    if (!interact) return false;
    if (!free && !anyKey(inv)) {
      state.events.push('chestLocked', ci, c.spot.x, 0.6, c.spot.z);
      return true;
    }
    c.key = free ? null : useKey(inv);
    c.loot = c.boss ? { rarity: 'mythic', item: null, coins: coinsFor(bossCoins(c.boss) * ITEMS.v.chestGold, state, state.rng) } : c.spot.gold ? goldLoot(c.rolls) : rollLoot(c.key!, c.rolls, { better: holds(state, 'fortune'), worse: holds(state, 'blackCat'), up: holds(state, 'fragileFortune') });
    c.state = 'opening';
    c.t = 0;
    t.choosing = -1;
    startKneel(player, c.spot.x + c.spot.fx * KNEEL_DIST, c.spot.z + c.spot.fz * KNEEL_DIST, c.spot.rot, T);
    state.events.push('chestOpen', ci, c.spot.x, 0.6, c.spot.z);
    return true;
  }
  if (!interact) return false;
  const oi = offerInReach(t, player);
  if (oi < 0) return buyCard(t, player, state);
  const o = t.offers[oi];
  const price = offerPrice(o, state);
  // (Update 0.2.19 — Fasting, a Traitor Card: the shop won't sell to you.)
  if (state.money < price || !useful(o.kind, player) || holds(state, 'fasting')) {
    state.events.push('buyFail', oi, o.x, 1, o.z);
    return true;
  }
  state.money -= price;
  o.sold = true;
  state.events.push('buy', ITEM_KINDS.indexOf(o.kind), o.x, 1, o.z);
  takeItem(o.kind, player, state);
  return true;
}

/** The lid is up: its glow (by rarity), then coins burst out and fly to you (Update 0.1.10 — an epic or mythic chest
 *  gives both), and the item rises out and hovers over the chest till you take it with E (Update 0.1.11 — the designer:
 *  not taken by itself). Update 0.2.16 — and Fate Cards may be dealt (`i`: the chest). Update 0.2.25 — always with its
 *  loot, never instead of it (a boss's chest did so already). */
function giveLoot(c: Chest, i: number, state: CombatState) {
  c.given = true;
  // (Update 0.2.17 — not when Fate Cards are off: the lobby's stand.)
  const lucky = state.fate && !c.cards && !c.boss && !c.spot.gold && state.rng() < CARDS.v.dealChance;
  if (state.fate && (c.cards || lucky)) startDeal(state, i);
  const loot = c.loot!;
  state.events.push('chestRarity', RARITIES.indexOf(loot.rarity), c.spot.x, 0.8, c.spot.z);
  // (No item flies to you: it waits.)
  state.events.push('chestLoot', -1, c.spot.x, 0.8, c.spot.z);
  if (loot.coins > 0) {
    at.set(c.spot.x, 0, c.spot.z);
    state.money += burstCoins(state.coins, at, loot.coins, state.rng);
  }
  // Update 0.2.0 — a boss's chest: its items side by side.
  const items = c.boss ? BOSS_LOOT : loot.item ? [loot.item] : [];
  items.forEach((kind, k) => {
    const s = (k - (items.length - 1) / 2) * LOOT_GAP;
    dropItem(state.drops, kind, at.set(c.spot.x + c.spot.fz * s, LOOT_HEIGHT, c.spot.z - c.spot.fx * s), state.events, true);
  });
}

/** Update 0.2.16 — what offer `o` costs you (Haggler, a Fate Card: less; Update 0.2.19 — Taxman, a Death Card: more). */
export const offerPrice = (o: Offer, state: CombatState) => Math.round(o.price * shopFactor(state));
