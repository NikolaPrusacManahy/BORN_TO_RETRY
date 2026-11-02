// Update 0.2.19 — Death Cards and Traitor Cards (the designer: "same drops, it also end up in the same 3 cards pull, it
// is all rng", "annoying cards … can make the run a bit painful", "it has a good part and a counter part costs"): dealt
// among the Fate Cards by their own odds, yours to take or leave; Gambler's extra card;
// then what each of the 16 Death Cards and 10 Traitor Cards does, against the same without it.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { CARD_KINDS, CardKind, familyOf, newUses } from '../src/sim/cards/cards';
import { chargeRate, meterStep, tickCards } from '../src/sim/cards/cardMoves';
import { drawDeal, pickCard, rollRarity } from '../src/sim/cards/deal';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { RARITIES, rollLoot } from '../src/sim/dungeon/loot';
import { offerPrice, stepTreasure, Treasure } from '../src/sim/dungeon/treasure';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { coinsFor, rollBonus } from '../src/sim/items/bonuses';
import { moveFactor, priceOf } from '../src/sim/items/items';
import { refillDash } from '../src/sim/player/dash';
import { damagePlayer, maxHpOf } from '../src/sim/player/health';
import { tryGroundJump } from '../src/sim/player/jump';
import { createPlayer } from '../src/sim/player/state';
import { holding } from '../src/sim/weapons/weapons';
import { CARDS } from '../src/tuning/cards';
import { EXECUTION } from '../src/tuning/execution';
import { HEALTH } from '../src/tuning/health';
import { WEAPON_STATS } from '../src/sim/weapons/catalog';

const v = CARDS.v;
const fight = (...cards: CardKind[]) => {
  const c = createCombat(OPEN_ARENA);
  for (const k of cards) c.items.cards.add(k);
  return c;
};
const body = (...cards: CardKind[]) => {
  const p = createPlayer(0, 0, 0, 0);
  for (const k of cards) p.cards.add(k);
  return p;
};
/** You and a fight sharing the cards (as the run keeps them). */
const both = (...cards: CardKind[]) => {
  const c = fight(...cards);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  p.cards = c.items.cards;
  return { c, p };
};
const events = (c: CombatState) => Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
/** What a hit of 10 takes off you. */
const taken = (...cards: CardKind[]) => {
  const p = body(...cards);
  const hp = p.hp;
  damagePlayer(p, 10);
  return hp - p.hp;
};
/** The dash charge a tenth of a second's refill gives. */
const refilled = (...cards: CardKind[]) => {
  const p = body(...cards);
  p.dashCharges = 0;
  refillDash(p, 0.1);
  return p.dashCharges;
};
const jump = (...cards: CardKind[]) => {
  const p = body(...cards);
  p.grounded = true;
  p.jumpBuffer = 0.1;
  tryGroundJump(p);
  return p.vel.y;
};
/** A frozen grunt in front of you, hit for `damage` by you: what it lost. */
const struck = (damage: number, ...cards: CardKind[]) => {
  const c = fight(...cards);
  const s = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -2), 0);
  c.enemies[s].hp = 9999;
  c.enemies[s].frozen = 99;
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = s;
  hit.point.copy(c.enemies[s].pos);
  landHit(c, hit, damage, 0, 0, -1, 'hitJab', 1, true);
  return 9999 - c.enemies[s].hp;
};
/** Swings held down a second: how many jabs. */
const jabs = (...cards: CardKind[]) => {
  const { c, p } = both(...cards);
  const w = new FlatWorld();
  let n = 0;
  for (let i = 0; i < ticks(1); i++) {
    c.events.clear();
    stepCombat(c, p, { ...emptyCombatIntent(), attackHeld: true }, w, DT);
    n += events(c).filter((k) => k === 'jabL' || k === 'jabR').length;
  }
  return n;
};
/** A sword's uses after a second of swings at a grunt in reach. */
const worn = (...cards: CardKind[]) => {
  const { c, p } = both(...cards);
  c.bag[0] = holding('sword', 50);
  c.slot = 0;
  c.weapon = c.bag[0];
  const s = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -1.8), 0);
  c.enemies[s].hp = 1e6;
  c.enemies[s].frozen = 999;
  const w = new FlatWorld();
  for (let i = 0; i < ticks(1); i++) {
    stepCombat(c, p, { ...emptyCombatIntent(), attackHeld: true }, w, DT);
    c.hitStop.remaining = 0;
  }
  return 50 - (c.weapon?.uses ?? 0);
};
/** An execution from 40 health: your health after. */
const executed = (...cards: CardKind[]) => {
  const { c, p } = both(...cards);
  p.hp = 40;
  c.execution = 1;
  const s = spawnEnemy(c.enemies, 'snake', new Vector3(0, 0, -1.8), 0);
  c.enemies[s].frozen = 99;
  const intent = emptyCombatIntent();
  const world = new FlatWorld();
  stepCombat(c, p, intent, world, DT);
  intent.interactPressed = true;
  stepCombat(c, p, intent, world, DT);
  intent.interactPressed = false;
  for (let k = 0; k < ticks(6) && c.exec.active; k++) {
    stepCombat(c, p, intent, world, DT);
    c.events.clear();
    c.hitStop.remaining = 0;
    p.hurtTime = 0;
  }
  return p.hp;
};

section('Death and Traitor Cards — dealt among the Fate Cards');
{
  const counts = { fate: 0, traitor: 0, death: 0 };
  for (let seed = 1; seed <= 800; seed++) {
    const c = createCombat(OPEN_ARENA);
    c.rng = createRng(seed);
    for (const k of drawDeal(c)) counts[familyOf(k)]++;
  }
  const n = counts.fate + counts.traitor + counts.death;
  check(`each card dealt is a Death Card ${Math.round(v.deathChance * 100)}% of the time, a Traitor Card ${Math.round(v.traitorChance * 100)}%, else a Fate Card`, near(counts.death / n, v.deathChance, 0.03) && near(counts.traitor / n, v.traitorChance, 0.03), JSON.stringify(counts));
  check('16 Death Cards and 9 Traitor Cards in all (Update 0.3.20 — Runaway gone with the slide)', CARD_KINDS.filter((k) => familyOf(k) === 'death').length === 16 && CARD_KINDS.filter((k) => familyOf(k) === 'traitor').length === 9);

  // (The designer, of making a Death Card come with your pick: "nope, just random and allow them to pick whatever they want".)
  const { c, p } = both();
  c.deal = { cards: ['pogo', 'brittleBones', 'hoarder'], chest: -1, rerolls: 0 };
  check('you take whichever you like: a Fate Card leaves the Death Card behind', pickCard(c, p, 0) === 'pogo' && !c.items.cards.has('brittleBones') && c.deal === null);
  const doom = both();
  doom.c.deal = { cards: ['pogo', 'brittleBones', 'hoarder'], chest: -1, rerolls: 0 };
  check('or the Death Card alone, if you want it', pickCard(doom.c, doom.p, 1) === 'brittleBones' && doom.c.items.cards.size === 1);

  let four = true;
  for (let seed = 1; seed <= 200; seed++) {
    const g = fight('gambler');
    g.rng = createRng(seed);
    const deal = drawDeal(g);
    four &&= deal.length === Math.round(v.dealt) + 1 && deal.some((k) => familyOf(k) === 'death') && new Set(deal).size === deal.length;
  }
  check('Gambler (Traitor): deals show one card more, one always a Death Card', four);
}

section('Death and Traitor Cards — luck: Black Cat, Fragile Fortune');
{
  const mean = (...cards: CardKind[]) => {
    const c = fight(...cards);
    let sum = 0;
    for (let i = 0; i < 4000; i++) sum += RARITIES.indexOf(rollRarity(c, RARITIES));
    return sum / 4000;
  };
  const plain = mean();
  check('Black Cat (Death): deals roll their rarity twice, the worse kept', mean('blackCat') < plain - 0.2, `${mean('blackCat').toFixed(2)} vs ${plain.toFixed(2)}`);
  check('Fragile Fortune (Traitor): deals roll one rarity higher', mean('fragileFortune') > plain + 0.6, `${mean('fragileFortune').toFixed(2)} vs ${plain.toFixed(2)}`);
  let worse = true;
  let higher = true;
  for (let i = 0; i < 200; i++) {
    const rolls = [i / 200, 0.5, ((i * 37) % 200) / 200] as const;
    const r = RARITIES.indexOf(rollLoot('key', rolls).rarity);
    worse &&= RARITIES.indexOf(rollLoot('key', rolls, { worse: true }).rarity) <= r;
    higher &&= RARITIES.indexOf(rollLoot('key', rolls, { up: true }).rarity) >= r;
  }
  check('chests too: never better with Black Cat, never worse with Fragile Fortune', worse && higher);
  check(`Fragile Fortune’s price: ${v.fragileHp} less max health`, maxHpOf(body('fragileFortune')) === HEALTH.v.maxHp - v.fragileHp);
}

section('Death Cards — your body');
{
  check(`Brittle Bones: ${Math.round(v.brittle * 100)}% more damage taken`, near(taken('brittleBones'), 10 * (1 + v.brittle), 1e-9) && taken() === 10);
  const plain = moveFactor(fight());
  check(`Leaden Feet: you run ${Math.round(v.leaden * 100)}% slower`, near(moveFactor(fight('leadenFeet')) / plain, 1 - v.leaden, 1e-9));
  check(`Short Breath: dashes refill ${Math.round(v.shortBreath * 100)}% slower`, near(refilled('shortBreath') / refilled(), 1 - v.shortBreath, 1e-9));
  check(`Anchor: you jump ${Math.round(v.anchor * 100)}% lower`, near(jump('anchor') ** 2 / jump() ** 2, 1 - v.anchor, 1e-9));
  check(`Glass Heart: ${v.glassHeart} less max health`, maxHpOf(body('glassHeart')) === HEALTH.v.maxHp - v.glassHeart);
  const sick = body('festering');
  damagePlayer(sick, 1);
  check(`Festering: a hit on you festers (${v.festerDps} a second, ${v.festerFor} s)`, sick.poison === v.festerFor && sick.poisonDps === v.festerDps && body().poison === 0);
  const low = body('glassHeart', 'fragileFortune', 'bottledLightning', 'allIn');
  check('max health never under 10, whatever you carry', maxHpOf(low) >= 10);
}

section('Death Cards — your fight');
{
  const base = WEAPON_STATS.goldSword().uses;
  check(`Rust: new weapons have ${Math.round(v.rust * 100)}% fewer uses`, newUses(fight('rust'), 'goldSword') === Math.max(1, Math.round(base * (1 - v.rust))) && newUses(fight(), 'goldSword') === base);
  const rotten = worn('rottenGrip');
  const sound = worn();
  check('Rotten Grip: weapons wear out twice as fast', sound > 0 && rotten === sound * 2, `${rotten} vs ${sound}`);
  check(`Heavy Hands: charges take ${Math.round(v.heavyHands * 100)}% longer`, near(chargeRate(fight('heavyHands')), 1 / (1 + v.heavyHands), 1e-9) && chargeRate(fight()) === 1);
  const cramped = jabs('cramp');
  const free = jabs();
  check('Cramp: your attacks are slower', cramped < free, `${cramped} vs ${free} jabs a second`);
  check(`Blunted Rage: the meter needs ${v.blunted} more kills`, meterStep(fight('bluntedRage')).steps === EXECUTION.v.killsToFill + v.blunted);
  const shaken = both('shaken');
  shaken.c.execution = 0.6;
  tickCards(shaken.c, shaken.p, DT);
  damagePlayer(shaken.p, 1);
  tickCards(shaken.c, shaken.p, DT);
  const steady = both();
  steady.c.execution = 0.6;
  damagePlayer(steady.p, 1);
  tickCards(steady.c, steady.p, DT);
  check('Shaken: a hit on you empties the execution meter', shaken.c.execution === 0 && steady.c.execution === 0.6);
}

section('Death Cards — your coins and luck');
{
  const offer = { kind: 'heart' as const, price: 100, sold: false, x: 0, z: 0 };
  check(`Taxman: the shop costs ${Math.round(v.taxman * 100)}% more`, offerPrice(offer, fight('taxman')) === Math.round(100 * (1 + v.taxman)));
  check(`Empty Purse: kills give ${Math.round(v.emptyPurse * 100)}% fewer coins`, coinsFor(10, fight('emptyPurse'), createRng(1)) === Math.round(10 * (1 - v.emptyPurse)) && coinsFor(10, fight(), createRng(1)) === 10);
  const bonuses = (...cards: CardKind[]) => {
    const c = fight(...cards);
    const rng = createRng(3);
    let n = 0;
    for (let i = 0; i < 10000; i++) {
      c.bonusDrops = Infinity;
      if (rollBonus(c, rng)) n++;
    }
    return n;
  };
  const omen = bonuses('illOmen');
  const fair = bonuses();
  check('Ill Omen: kill bonuses drop half as often', near(omen / fair, 0.5, 0.08), `${omen} vs ${fair}`);
}

section('Traitor Cards — a gift, a price');
{
  check(`Blood Pact: your hits ${Math.round(v.bloodPact * 100)}% harder, the hits on you too`, near(struck(10, 'bloodPact'), 10 * (1 + v.bloodPact), 1e-6) && near(struck(10), 10, 1e-6) && near(taken('bloodPact'), 10 * (1 + v.bloodPact), 1e-9));
  const plain = moveFactor(fight());
  const iron = taken('ironSkin');
  check(`Iron Skin: hits on you ${Math.round(v.ironSkin * 100)}% weaker, you ${Math.round(v.ironSlow * 100)}% slower`, near(iron, 10 * (1 - v.ironSkin), 1e-9) && near(moveFactor(fight('ironSkin')) / plain, 1 - v.ironSlow, 1e-9));
  check(`Bottled Lightning: dashes refill twice as fast, ${v.bottledHp} less max health`, near(refilled('bottledLightning') / refilled(), 2, 1e-9) && maxHpOf(body('bottledLightning')) === HEALTH.v.maxHp - v.bottledHp);
  const miser = both('misersOath');
  miser.c.money = 20;
  tickCards(miser.c, miser.p, DT);
  damagePlayer(miser.p, 1);
  tickCards(miser.c, miser.p, DT);
  check(`Miser’s Oath: kills give twice the coins, a hit costs ${v.misersCost}`, coinsFor(10, fight('misersOath'), createRng(1)) === 20 && miser.c.money === 20 - v.misersCost);
  const berserk = jabs('berserker');
  const calm = jabs();
  check('Berserker: your attacks quicker, your dashes refill slower', berserk > calm && near(refilled('berserker') / refilled(), 1 - v.shortBreath, 1e-9), `${berserk} vs ${calm} jabs a second`);
}

section('Traitor Cards — the execution meter and the shop');
{
  check(`Fasting: the meter fills in ${v.fastingKills} kills`, meterStep(fight('fasting')).steps === Math.min(EXECUTION.v.killsToFill, v.fastingKills));
  const shop = (...cards: CardKind[]) => {
    const t: Treasure = { shop: 0, offers: [{ kind: 'redRing', price: priceOf('redRing', 1), sold: false, x: 0, z: -1 }], chests: [], choosing: -1 };
    const { c, p } = both(...cards);
    c.money = 999;
    stepTreasure(t, p, c, true, false, () => false, DT);
    return t.offers[0].sold;
  };
  check('and the shop won’t sell to you', !shop('fasting') && shop());
  check(`Executioner’s Deal: the meter fills in ${v.executionerKills} kills`, meterStep(fight('executionersDeal')).steps === Math.min(EXECUTION.v.killsToFill, v.executionerKills));
  const healed = executed();
  const dealt = executed('executionersDeal');
  check('and executions don’t heal you', healed === 40 + EXECUTION.v.heal && dealt === 40, `${dealt} vs ${healed}`);
  check('two meter cards: the fewest kills counts; Blunted Rage adds to it', meterStep(fight('fasting', 'executionersDeal')).steps === Math.min(v.fastingKills, v.executionerKills) && meterStep(fight('executionersDeal', 'bluntedRage')).steps === v.executionerKills + v.blunted);
}
