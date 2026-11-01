// Update 0.2.15 — the Scars. Update 0.2.16 — Fate Cards (the designer: "scars are turned into "Fate cards"", "if you
// are lucky, you might not get a normal drop but you get sets of card you pick", "25% is fine", "We need rarity too,
// grey, green, blue, purple, Red … same as drops"): the 30 of wave 1 and their rarities; a boss's chest (not the run's
// last) and a challenge room's always deal, a keyed chest one time in four instead of its item, a gold chest never;
// each card's rarity its own roll by the chests' odds (Update 0.2.17, the designer: "a chance for each card"); only
// cards you don't carry; taking one; carried down; what TAB shows; the Lab. What each does: test-card-moves.ts, test-card-moves2.ts.
// Update 0.2.19 — the Death and Traitor Cards dealt among them (test-card-moves4.ts): here they're switched off (their
// odds 0) so the Fate Cards' own odds read clean.
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { inventoryView } from '../src/engine/fateView';
import { Inventory } from '../src/screens/Inventory';
import { CARD, CARD_KINDS, CardKind, familyOf } from '../src/sim/cards/cards';
import { drawDeal, pickCard } from '../src/sim/cards/deal';
import { carryOver, createCombat } from '../src/sim/combat/state';
import { RARITIES } from '../src/sim/dungeon/loot';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { Chest, emptyTreasure, stepTreasure } from '../src/sim/dungeon/treasure';
import { runLab } from '../src/sim/lab/labCommands';
import { createPlayer } from '../src/sim/player/state';
import { holding } from '../src/sim/weapons/weapons';
import { CARDS } from '../src/tuning/cards';
import { CINEMA } from '../src/tuning/cinema';
import { ITEMS } from '../src/tuning/items';
import { setKnob } from '../src/tuning/schema';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const rank = (k: CardKind) => RARITIES.indexOf(CARD[k].rarity);
const all = (): Set<CardKind> => new Set(CARD_KINDS);

/** Floor `floor`'s boss chest opened (`last`: the run's last floor), carrying `carry`. */
function openBossChest(floor: number, last = false, carry: CardKind[] = []) {
  const level = buildDungeon(planFloor(4242, floor));
  const run = createDungeonRun(level, last);
  const c = createCombat(level.arena, false);
  // (Update 0.2.22 — each as II, where it can be: none of them dealt again.)
  for (const k of carry) {
    c.items.cards.add(k);
    c.items.twice.add(k);
  }
  const b = level.boss;
  const room = level.rooms[b.room];
  const chest = run.treasure.chests[room.chest];
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  run.rooms[b.room].state = 'fighting';
  run.boss.beat = 'loot';
  run.boss.t = CINEMA.v.gateDelay;
  stepRooms(run, p, c, createRng(1), DT);
  for (let k = 0; k < ticks(ITEMS.v.chestRise + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  p.pos.set(chest.spot.x + chest.spot.fx * 1.2, 0, chest.spot.z + chest.spot.fz * 1.2);
  stepTreasure(run.treasure, p, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  p.kneel = 0;
  return { c, p, chest };
}

/** A chest of the Lab's kind opened with `key` (`gold`: a gold chest), its fight seeded `seed`. */
function openChest(seed: number, key: 'key' | 'whiteKey' | 'goldKey' | null, gold = false) {
  const c = createCombat(OPEN_ARENA);
  c.rng = createRng(seed);
  const p = createPlayer(0, 0, 1.2, 0);
  p.grounded = true;
  if (key) {
    c.items[key === 'key' ? 'keys' : key === 'whiteKey' ? 'whiteKeys' : 'goldKeys'] = 1;
    c.items.keyPick = key;
  }
  const t = emptyTreasure();
  const chest: Chest = { spot: { room: -1, x: 0, z: 0, rot: 0, fx: 0, fz: 1, rises: false, boss: false, gate: -1, gold }, state: 'shut', t: 0, rolls: [c.rng(), c.rng(), c.rng()], key: null, loot: null, given: false, boss: null, cards: false };
  t.chests.push(chest);
  stepTreasure(t, p, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(t, p, c, false, false, () => false, DT);
  return { c, p, chest };
}

setKnob(CARDS, 'deathChance', 0);
setKnob(CARDS, 'traitorChance', 0);

section('Fate Cards — the cards');
{
  const fate = CARD_KINDS.filter((k) => familyOf(k) === 'fate');
  const by = RARITIES.map((r) => fate.filter((k) => CARD[k].rarity === r).length);
  check('waves 1 and 2 and the builds’ (0.2.22): 46 Fate Cards, every rarity among them', fate.length === 46 && by.every((n) => n >= 3), by.join(' '));
  check('16 Death Cards, 10 Traitor Cards (72 in all)', CARD_KINDS.filter((k) => familyOf(k) === 'death').length === 16 && CARD_KINDS.filter((k) => familyOf(k) === 'traitor').length === 10 && CARD_KINDS.length === 72);
  check('each with its own name, the move it changes and what it does', new Set(CARD_KINDS.map((k) => CARD[k].name)).size === 72 && CARD_KINDS.every((k) => CARD[k].move.length > 0 && CARD[k].does().length > 10));
  check('a Traitor Card says its price; no other does', CARD_KINDS.every((k) => (familyOf(k) === 'traitor') === (CARD[k].cost?.().length ?? 0) > 5));
}

section('Fate Cards — a boss’s chest deals');
{
  const { c, chest } = openBossChest(1);
  const cards = c.deal?.cards ?? [];
  check(`opened: it deals ${CARDS.v.dealt}, all different`, cards.length === CARDS.v.dealt && new Set(cards).size === cards.length, cards.join(' '));
  check('its coins and heart still come (no key)', chest.state === 'open' && c.drops.some((d) => d.alive && d.manual && d.kind === 'heart') && !c.drops.some((d) => d.alive && d.kind === 'key'));
  const p = createPlayer(0, 0, 0, 0);
  const kind = cards[1];
  const taken = pickCard(c, p, 1);
  check('taking one: it’s yours for the run, the deal’s over', taken === kind && c.items.cards.has(kind) && p.cards === c.items.cards && c.deal === null);
  check('the run’s last boss deals none (the run ends there)', openBossChest(5, true).c.deal === null);
  const most = [...all()].filter((k) => k !== 'pogo' && k !== 'slingshot' && familyOf(k) === 'fate');
  const two = openBossChest(2, false, most).c.deal?.cards ?? [];
  check('only cards you don’t carry (or as II)', two.length === 2 && two.includes('pogo') && two.includes('slingshot'));
  check('carrying every one (as II where it can be), no deal', openBossChest(3, false, [...all()]).c.deal === null);
}

section('Fate Cards — a challenge room’s chest deals instead of its item');
{
  const level = buildDungeon(planFloor(77, 1));
  const run = createDungeonRun(level);
  const chests = run.treasure.chests;
  const i = level.rooms.findIndex((r) => r.challenge);
  check('a challenge room’s chest and the boss’s always deal; a fight room’s doesn’t always', chests[level.rooms[i].chest].cards && chests.filter((ch) => ch.boss).every((ch) => ch.cards) && chests.some((ch) => !ch.cards));
  // Update 0.2.17 — each card its own roll by the chests' odds: no key, no big fight changes them.
  const counts = RARITIES.map(() => 0);
  let high = 0;
  let allHigh = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const c = createCombat(OPEN_ARENA);
    c.rng = createRng(seed);
    const deal = drawDeal(c);
    for (const k of deal) counts[rank(k)]++;
    if (deal.some((k) => rank(k) >= 3)) high++;
    if (deal.every((k) => rank(k) >= 3)) allHigh++;
  }
  const n = counts.reduce((a, b) => a + b, 0);
  const share = (i: number) => counts[i] / n;
  check('each card’s rarity is its own roll at the chests’ odds (45 / 30 / 15 / 8 / 2)', Math.abs(share(0) - 0.45) < 0.06 && Math.abs(share(1) - 0.3) < 0.06 && Math.abs(share(2) - 0.15) < 0.05 && share(4) > 0 && share(4) < 0.05, counts.join(' '));
  check('an epic in a deal doesn’t make the rest epic', high > 30 && allHigh / high < 0.1, `${allHigh} of ${high}`);
}

section('Fate Cards — a keyed chest, by luck');
{
  let dealt = 0;
  let clean = true;
  let items = 0;
  const N = 400;
  for (let seed = 1; seed <= N; seed++) {
    const { c, chest } = openChest(seed, 'key');
    if (c.deal) {
      dealt++;
      // Dealt: no item, no coins.
      clean &&= !c.drops.some((d) => d.alive && d.manual) && chest.loot?.item === null && chest.loot.coins === 0 && c.money === 0;
    } else if (chest.loot?.item || (chest.loot?.coins ?? 0) > 0) items++;
  }
  check(`about ${Math.round(CARDS.v.dealChance * 100)}% deal Fate Cards instead of their loot`, Math.abs(dealt / N - CARDS.v.dealChance) < 0.06 && clean, `${dealt} of ${N}`);
  check('the rest give their loot as before', items === N - dealt);
  let goldNever = true;
  for (let seed = 1; seed <= 100; seed++) goldNever &&= openChest(seed, null, true).c.deal === null;
  check('a gold chest never deals', goldNever);
  // Every card carried: the luck finds nothing to deal, and the chest gives its loot.
  let fallback = true;
  for (let seed = 1; seed <= 60; seed++) {
    const c0 = openChest(seed, 'key');
    if (!c0.c.deal) continue;
    const { c, chest } = (() => {
      const r = createCombat(OPEN_ARENA);
      r.rng = createRng(seed);
      r.items.cards = all();
      r.items.twice = all();
      r.items.keys = 1;
      const p = createPlayer(0, 0, 1.2, 0);
      p.grounded = true;
      const t = emptyTreasure();
      const ch: Chest = { spot: { room: -1, x: 0, z: 0, rot: 0, fx: 0, fz: 1, rises: false, boss: false, gate: -1, gold: false }, state: 'shut', t: 0, rolls: [r.rng(), r.rng(), r.rng()], key: null, loot: null, given: false, boss: null, cards: false };
      t.chests.push(ch);
      stepTreasure(t, p, r, true, false, () => false, DT);
      for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(t, p, r, false, false, () => false, DT);
      return { c: r, chest: ch };
    })();
    fallback &&= c.deal === null && !!chest.loot && (chest.loot.item !== null || chest.loot.coins > 0);
  }
  check('nothing left to deal: its loot instead', fallback);
}

section('Fate Cards — off (the lobby’s stand)');
{
  // Update 0.2.17 — the designer: "asking if the player wants the Cards in their run".
  const level = buildDungeon(planFloor(4242, 1));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  c.fate = false;
  const b = level.boss;
  const chest = run.treasure.chests[level.rooms[b.room].chest];
  const p = createPlayer(chest.spot.x + chest.spot.fx * 1.2, 0, chest.spot.z + chest.spot.fz * 1.2, 0);
  p.grounded = true;
  chest.state = 'shut';
  stepTreasure(run.treasure, p, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  check('off: a boss’s chest gives its coins and heart, no deal', c.deal === null && (chest.state as string) === 'open' && c.drops.some((d) => d.alive && d.manual && d.kind === 'heart'));
  let never = true;
  for (let seed = 1; seed <= 60; seed++) {
    const r = createCombat(OPEN_ARENA);
    r.fate = false;
    r.rng = createRng(seed);
    r.items.keys = 1;
    const q = createPlayer(0, 0, 1.2, 0);
    q.grounded = true;
    const t = emptyTreasure();
    const ch: Chest = { spot: { room: -1, x: 0, z: 0, rot: 0, fx: 0, fz: 1, rises: false, boss: false, gate: -1, gold: false }, state: 'shut', t: 0, rolls: [r.rng(), r.rng(), r.rng()], key: null, loot: null, given: false, boss: null, cards: true };
    t.chests.push(ch);
    stepTreasure(t, q, r, true, false, () => false, DT);
    for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(t, q, r, false, false, () => false, DT);
    never &&= r.deal === null && !!ch.loot && (ch.loot.item !== null || ch.loot.coins > 0);
  }
  check('off: no chest ever deals (a challenge room’s gives its item)', never);
}

section('Fate Cards — carried, shown, the Lab');
{
  const a = createCombat(OPEN_ARENA);
  a.items.cards.add('pogo');
  const b = createCombat(OPEN_ARENA);
  carryOver(a, b);
  check('they come down to the next floor with you; a new run has none', b.items.cards.has('pogo') && createCombat(OPEN_ARENA).items.cards.size === 0);
  const c = createCombat(OPEN_ARENA);
  c.items.cards.add('allIn').add('slingshot');
  c.items.redRings = 2;
  c.items.whiteKeys = 1;
  c.bag[2] = holding('goldSword', 12);
  c.slot = 2;
  const p = createPlayer(0, 0, 0, 0);
  p.cards = c.items.cards;
  const v = inventoryView(c, p);
  const page = renderToStaticMarkup(createElement(Inventory, { view: v, closeKey: 'Tab', onClose() {} }));
  const look = page.slice(page.indexOf('rb-inv-look'));
  check('on its page each card is small, the first shown whole beside them (no card grown over the others)', (page.match(/class="rb-inv-card[ "]/g) ?? []).length === 2 && page.includes('rb-inv-card is-shown') && look.includes('>Slingshot<') && !look.includes('>All In<'));
  check('TAB shows your cards (commonest first), weapons, rings, keys and your health', v.cards.map((x) => x.kind).join() === 'slingshot,allIn' && v.cards[1].rarity === 'mythic' && v.weapons.length === 1 && v.weapons[0].uses === 12 && v.weapons[0].inHand && v.rings[0].n === 2 && v.keys.length === 1 && v.maxHp === 50, JSON.stringify({ cards: v.cards.map((x) => x.name), maxHp: v.maxHp }));
  const lab = createCombat(OPEN_ARENA);
  const q = createPlayer(0, 0, 0, 0);
  runLab({ kind: 'deal' }, lab, q, 0, emptyTreasure());
  const dealt = lab.deal?.cards.length ?? 0;
  runLab({ kind: 'card', card: 'updraft' }, lab, q, 0, emptyTreasure());
  check('the Lab: Deal 3 deals; a card given is yours', dealt === CARDS.v.dealt && lab.items.cards.has('updraft'));
}

setKnob(CARDS, 'deathChance', CARDS.knobs.deathChance.def);
setKnob(CARDS, 'traitorChance', CARDS.knobs.traitorChance.def);
