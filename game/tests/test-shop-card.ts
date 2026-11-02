// Update 0.2.20 — the shop's Fate Card (the designer: "the shop has only one fate card. floating near, cost 100"): where
// it floats (past the end of the row of tiles, in the room, clear of everything and of the doorways), which card (a Fate
// Card you don't carry, the floor's; none with Fate Cards off, on ARE YOU EVEN HUMAN?, or with none left), buying it,
// its prompt and its look. The gold in chests halved: test-keys.ts, test-gold-chests.ts, test-loadout.ts.
import * as THREE from 'three';
import { check, section } from './harness';
import { DT } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { TreasureView } from '../src/engine/treasureView';
import { CARD_KINDS, CardKind, familyOf } from '../src/sim/cards/cards';
import { CARD_PRICE_Y, cardPrice, ShopCard, stockShop } from '../src/sim/cards/shopCard';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { stepTreasure, Treasure } from '../src/sim/dungeon/treasure';
import { emptyFocus, focusOf } from '../src/sim/items/focus';
import { createPlayer } from '../src/sim/player/state';
import { CARDS } from '../src/tuning/cards';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const never = () => false;
const events = (c: ReturnType<typeof createCombat>) => Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
/** A shop with only its card (`kind`) 1 m in front of you, `money` in your purse, carrying `cards`. */
function stall(kind: CardKind, money: number, ...cards: CardKind[]) {
  const card: ShopCard = { kind, roll: 0.5, sold: false, x: 0, z: -1 };
  const t: Treasure = { shop: 0, offers: [], chests: [], choosing: -1, card };
  const c = createCombat(OPEN_ARENA);
  for (const k of cards) c.items.cards.add(k);
  c.money = money;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  p.cards = c.items.cards;
  return { t, c, p, card };
}

section('Shop card — where it floats');
{
  let shops = 0;
  let placed = 0;
  let inside = true;
  let clear = true;
  let apart = true;
  let doors = true;
  for (let floor = 1; floor <= 7; floor++) {
    for (let seed = 1; seed <= 12; seed++) {
      const level = buildDungeon(planFloor(seed * 31 + floor, floor));
      const shop = level.rooms.find((r) => r.kind === 'shop');
      const c = createDungeonRun(level).treasure.card;
      if (!shop) continue;
      shops++;
      if (!c) continue;
      placed++;
      inside &&= c.x > shop.min.x + 1 && c.x < shop.max.x - 1 && c.z > shop.min.z + 1 && c.z < shop.max.z - 1;
      // (Nothing stands where it floats: no column, wall or ledge through it.)
      clear &&= !level.arena.boxes.some((b) => b.y + b.h / 2 > 0.05 && Math.abs(c.x - b.x) < b.w / 2 + 0.3 && Math.abs(c.z - b.z) < b.d / 2 + 0.3);
      apart &&= shop.tiles.every((t) => Math.hypot(t.x - c.x, t.z - c.z) >= 3.5);
      doors &&= level.gates.every((g) => Math.hypot(g.x - c.x, g.z - c.z) > 3);
    }
  }
  check('every shop has its card', shops > 20 && placed === shops, `${placed} of ${shops}`);
  check('in the room, nothing standing through it', inside && clear);
  check('apart from the tiles (past the end of their row), clear of the doorways', apart && doors);
}

section('Shop card — which card');
{
  const level = buildDungeon(planFloor(4242, 1));
  const t = createDungeonRun(level).treasure;
  const c = createCombat(level.arena, false);
  check('not stocked till you come down', t.card?.kind === null);
  stockShop(t, c);
  const kind = t.card?.kind ?? null;
  check('then a Fate Card (never a Traitor or Death Card)', kind !== null && familyOf(kind) === 'fate');
  stockShop(t, c);
  check('the floor’s: the same card again for the same run', t.card?.kind === kind);
  const carry = createCombat(level.arena, false);
  if (kind) carry.items.cards.add(kind);
  stockShop(t, carry);
  check('never one you carry', t.card?.kind !== null && t.card?.kind !== kind);
  const off = createCombat(level.arena, false);
  off.fate = false;
  stockShop(t, off);
  check('none with Fate Cards off (the lobby’s stand)', t.card?.kind === null);
  const bare = createCombat(level.arena, false);
  bare.bare = true;
  stockShop(t, bare);
  check('none on ARE YOU EVEN HUMAN? (no shop)', t.card?.kind === null);
  const full = createCombat(level.arena, false);
  for (const k of CARD_KINDS) if (familyOf(k) === 'fate') full.items.cards.add(k);
  stockShop(t, full);
  check('none when you carry every Fate Card', t.card?.kind === null);
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const r = createDungeonRun(buildDungeon(planFloor(seed, 1))).treasure;
    stockShop(r, createCombat(OPEN_ARENA));
    if (r.card?.kind) seen.add(r.card.kind);
  }
  check('a different card from floor to floor', seen.size > 15, `${seen.size} cards`);
}

section('Shop card — buying');
{
  check(`it costs ${CARDS.v.shopCard}`, CARDS.v.shopCard === 100 && cardPrice(createCombat(OPEN_ARENA)) === 100);
  const poor = stall('pogo', 99);
  check('E without the coins: nothing (a dull buzz)', stepTreasure(poor.t, poor.p, poor.c, true, false, never, DT) && !poor.card.sold && poor.c.money === 99 && events(poor.c).includes('buyFail'));
  const { t, c, p, card } = stall('pogo', 130);
  check('with them, it’s yours: 100 coins', stepTreasure(t, p, c, true, false, never, DT) && card.sold && c.items.cards.has('pogo') && p.cards.has('pogo') && c.money === 30 && events(c).includes('buy') && events(c).includes('cardTaken'));
  c.money = 500;
  check('and it can’t be bought twice', !stepTreasure(t, p, c, true, false, never, DT) && c.money === 500);
  const far = stall('pogo', 500);
  far.p.pos.set(0, 0, 3);
  check('too far: E does nothing here', !stepTreasure(far.t, far.p, far.c, true, false, never, DT) && !far.card.sold);
  const cheap = stall('pogo', 500, 'haggler');
  stepTreasure(cheap.t, cheap.p, cheap.c, true, false, never, DT);
  const dear = stall('pogo', 500, 'taxman');
  stepTreasure(dear.t, dear.p, dear.c, true, false, never, DT);
  check('Haggler makes it cheaper, Taxman dearer', cheap.c.money === 500 - Math.round(100 * (1 - CARDS.v.haggler)) && dear.c.money === 500 - Math.round(100 * (1 + CARDS.v.taxman)));
  const fasting = stall('pogo', 500, 'fasting');
  check('Fasting: the shop won’t sell it', stepTreasure(fasting.t, fasting.p, fasting.c, true, false, never, DT) && !fasting.card.sold && fasting.c.money === 500);
  const twice = stall('pogo', 500, 'pogo');
  check('nor a card you already carry', stepTreasure(twice.t, twice.p, twice.c, true, false, never, DT) && !twice.card.sold && twice.c.money === 500);
}

section('Shop card — its prompt and its look');
{
  const { t, c, p, card } = stall('hoarder', 0);
  const f = focusOf(t, c, p, never, emptyFocus());
  check('in reach: its card over its price, E to buy', f.card === 'hoarder' && f.act === 'buy' && f.item === null && Math.abs(f.at.y - (CARD_PRICE_Y + 0.35)) < 1e-9);
  p.pos.set(0, 0, 2.5);
  check('nearby: its card to read', focusOf(t, c, p, never, emptyFocus()).card === 'hoarder' && focusOf(t, c, p, never, emptyFocus()).act === null);
  const view = new TreasureView(new THREE.Scene(), t, false);
  view.update(c, new THREE.Vector3(), DT);
  let shown = false;
  view.group.traverse((o) => (shown ||= o instanceof THREE.Sprite && o.visible && o.position.y === CARD_PRICE_Y));
  card.sold = true;
  view.update(c, new THREE.Vector3(), DT);
  let gone = true;
  view.group.traverse((o) => (gone &&= !(o instanceof THREE.Sprite && o.visible && o.position.y === CARD_PRICE_Y)));
  check('it floats with its price over it; once bought it’s gone', shown && gone);
  check('sold: nothing to read about', focusOf(t, c, p, never, emptyFocus()).card === null);
  view.dispose();
}
