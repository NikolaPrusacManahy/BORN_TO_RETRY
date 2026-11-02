// Update 0.2.22 — builds of Fate Cards (testers: "build variety around Fate cards"; "Ground smash can be spammed... this
// can be a Build around ground smash instead of having it at the start"). The slam's blast is a card (Tremor); a deal
// leans to your builds; three of a build light its bonus; a card dealt again is II; pair cards; a paid reroll.
import { Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { BONUS_TEXT, BUILD_CARDS, BUILD_LIST, buildOf, countOf, dealable, lit, weightOf } from '../src/sim/cards/builds';
import { boost, CARD, CARD_KINDS, CardKind, familyOf, shopFactor, takeCard } from '../src/sim/cards/cards';
import { fateOf, rerollCost, rerollDeal, startDeal } from '../src/sim/cards/deal';
import { fistFactor, meterStep } from '../src/sim/cards/cardMoves';
import { cardFactor } from '../src/sim/cards/cardHits';
import { lastRites } from '../src/sim/cards/buildPowers';
import { updateThrown } from '../src/sim/weapons/thrown';
import { holding, throwWeapon } from '../src/sim/weapons/weapons';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { dashMaxOf } from '../src/sim/player/dash';
import { slamFloor } from '../src/sim/player/slam';
import { createPlayer } from '../src/sim/player/state';
import { cardView, dealView, inventoryView } from '../src/engine/fateView';
import { LAB_CARDS } from '../src/screens/labLists';
import { createRng } from '../src/core/rng';
import { BUILDS } from '../src/tuning/builds';
import { CARDS } from '../src/tuning/cards';
import { EXECUTION } from '../src/tuning/execution';
import { DASH, SLAM } from '../src/tuning/movement';
import { setKnob } from '../src/tuning/schema';

type Fight = ReturnType<typeof createCombat>;
const fight = (...cards: CardKind[]) => {
  const c = createCombat(OPEN_ARENA);
  for (const k of cards) c.items.cards.add(k);
  return c;
};
const seen = (c: Fight, kind: string) => {
  for (let e = 0; e < c.events.length; e++) if (c.events.at(e).kind === kind) return true;
  return false;
};
/** A slam lands 1 m from a grunt in fight `c`: the grunt's damage, and whether the blast was seen. */
const slam = (c: Fight) => {
  const s = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -1), 0);
  c.enemies[s].hp = 9999;
  c.enemies[s].frozen = 99;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  p.slamImpact = SLAM.v.minHeight + 1;
  stepCombat(c, p, emptyCombatIntent(), new FlatWorld(), DT);
  return { hurt: 9999 - c.enemies[s].hp, blast: seen(c, 'slamImpact'), c, s, p };
};

setKnob(CARDS, 'deathChance', 0);
setKnob(CARDS, 'traitorChance', 0);

section('Builds — the slam’s blast is Tremor’s');
{
  const bare = slam(fight());
  check('without Tremor a slam lands, but blasts nothing', bare.hurt === 0 && !bare.blast);
  const with_ = slam(fight('tremor'));
  check('with Tremor its landing blasts the enemies near it', with_.hurt > 0 && with_.blast, `${with_.hurt}`);
  const off = fight();
  off.fate = false;
  const human = fight();
  human.bare = true;
  check('Fate Cards off, or ARE YOU EVEN HUMAN?: the blast as before (no card to find)', slam(off).hurt > 0 && slam(human).hurt > 0);
  const c = fight();
  check('Crater, Pogo, Aftershock and Scorched Earth come only with Tremor', (['crater', 'pogo', 'aftershock', 'scorchedEarth'] as CardKind[]).every((k) => dealable(c, k) === null && CARD[k].needs === 'tremor'));
  check('Tremor itself: dealt to anyone', dealable(c, 'tremor') === 'new');
}

section('Builds — Aftershock and Scorched Earth');
{
  const after = slam(fight('tremor', 'aftershock'));
  const queued = after.c.powers.blasts.filter((b) => b.alive);
  check(`Aftershock: a second blast ${BUILDS.v.aftershockWait} s later, ${Math.round(BUILDS.v.aftershock * 100)}% as hard and wide`, queued.length === 1 && near(queued[0].wait, BUILDS.v.aftershockWait, 1e-9));
  const burn = slam(fight('tremor', 'scorchedEarth'));
  check('Scorched Earth: what the slam hits burns', burn.c.powers.dots.some((d) => d.alive && d.kind === 'burn' && d.slot === burn.s));
  check('without it, nothing burns', !slam(fight('tremor')).c.powers.dots.some((d) => d.alive));
}

section('Builds — a card is of a build by its move');
{
  check('six builds', BUILD_LIST.length === 6);
  check('Jagged Knuckles: Fists; Pyre: Kills; Splinter: Throws; Restless: Movement; Crater: Slam; Bloodbath: Executions', buildOf('jaggedKnuckles') === 'fists' && buildOf('pyre') === 'kills' && buildOf('splinter') === 'throws' && buildOf('restless') === 'movement' && buildOf('crater') === 'slam' && buildOf('bloodbath') === 'executions');
  check('Body, Coins and Luck cards, Traitor and Death Cards: of none', buildOf('hardHead') === null && buildOf('haggler') === null && buildOf('fortune') === null && CARD_KINDS.filter((k) => familyOf(k) !== 'fate').every((k) => buildOf(k) === null));
  const fate = CARD_KINDS.filter((k) => familyOf(k) === 'fate');
  check('each build has enough cards to light its bonus (and more)', BUILD_LIST.every((b) => fate.filter((k) => buildOf(k) === b).length >= Math.round(BUILDS.v.set) + 1), BUILD_LIST.map((b) => `${b} ${fate.filter((k) => buildOf(k) === b).length}`).join(', '));
  const c = fight('jaggedKnuckles', 'thunderclap');
  check(`a deal leans to your builds: two Fists cards, a Fists card ×${1 + 2 * BUILDS.v.lean}`, near(weightOf(c, 'ironKnuckles', 'new'), 1 + 2 * BUILDS.v.lean, 1e-9) && weightOf(c, 'pyre', 'new') === 1 && weightOf(c, 'hardHead', 'new') === 1);
  // Seeded: over many deals, a Fists card turns up more often with two Fists cards carried.
  const share = (cards: CardKind[]) => {
    const f = fight(...cards);
    f.rng = createRng(7);
    let fists = 0;
    for (let k = 0; k < 4000; k++) if (buildOf(fateOf(f, 'rare', [])!) === 'fists') fists++;
    return fists / 4000;
  };
  const none = share([]);
  const two = share(['jaggedKnuckles', 'hairTrigger']);
  check('dealt, Fists cards come up more often for one carrying Fists', two > none * 1.3, `${(none * 100).toFixed(0)}% → ${(two * 100).toFixed(0)}%`);
}

section('Builds — three of a build light its bonus');
{
  const three = (b: CardKind[]) => fight(...b);
  const fists = three(['jaggedKnuckles', 'thunderclap', 'hairTrigger']);
  check(`three lit; two not`, lit(fists.items.cards, 'fists') && !lit(fight('jaggedKnuckles', 'thunderclap').items.cards, 'fists') && countOf(fists.items.cards, 'fists') === 3);
  check(`Fists: barehanded, ${Math.round(BUILDS.v.fists * 100)}% harder; with a weapon, no`, near(fistFactor(fists), 1 + BUILDS.v.fists, 1e-9) && fistFactor(fight()) === 1);
  const kills = three(['pyre', 'deathThroes', 'mercyKill']);
  check(`Kills: the cards’ hits ${Math.round(BUILDS.v.kills * 100)}% harder`, near(cardFactor(kills), 1 + BUILDS.v.kills, 1e-9) && cardFactor(fight('pyre')) === 1);
  const p = createPlayer(0, 0, 0, 0);
  p.cards = three(['shoulderCharge', 'secondWind', 'lightBones']).items.cards;
  check(`Movement: ${BUILDS.v.movement} more dash charge`, dashMaxOf(p) === DASH.v.charges + BUILDS.v.movement && dashMaxOf(createPlayer(0, 0, 0, 0)) === DASH.v.charges);
  const q = createPlayer(0, 0, 0, 0);
  q.cards = three(['tremor', 'crater', 'pogo']).items.cards;
  check(`Slam: you can slam from ${BUILDS.v.slamHeight} m (a jump)`, slamFloor(q) === Math.min(SLAM.v.minHeight, BUILDS.v.slamHeight) && slamFloor(createPlayer(0, 0, 0, 0)) === SLAM.v.minHeight && BUILDS.v.slamHeight < SLAM.v.minHeight);
  const ex = three(['airButcher', 'adrenaline', 'bloodbath']);
  check(`Executions: the meter needs ${BUILDS.v.executions} fewer kills`, meterStep(ex).steps === EXECUTION.v.killsToFill - BUILDS.v.executions);
  check('each bonus says what it does', BUILD_LIST.every((b) => BONUS_TEXT[b]().length > 10));
  const src = readFileSync('src/sim/weapons/thrown.ts', 'utf8');
  check('Throws: thrown weapons hit harder (thrown.ts)', src.includes("lit(state.items.cards, 'throws')"));
}

section('Builds — a card dealt again is II');
{
  const c = fight('haggler', 'tremor');
  check('one you carry that can grow: dealt again as II; one that can’t: never', dealable(c, 'haggler') === 'twice' && dealable(c, 'tremor') === null);
  check(`a II comes up less often than a new card (×${BUILDS.v.twice})`, near(weightOf(c, 'haggler', 'twice'), BUILDS.v.twice, 1e-9));
  const p = createPlayer(0, 0, 0, 0);
  const before = shopFactor(c);
  takeCard(c, p, 'haggler');
  check('taking it again: II', c.items.twice.has('haggler') && boost(c, 'haggler') === CARD.haggler.up);
  check('Haggler II: the shop twice as much cheaper', near(1 - shopFactor(c), (1 - before) * 2, 1e-9));
  check('II is the last: never dealt a third time', dealable(c, 'haggler') === null);
  const ups = CARD_KINDS.filter((k) => CARD[k].up);
  check(`${ups.length} cards can grow, each saying so`, ups.length >= 12 && ups.every((k) => CARD[k].does(CARD[k].up) !== CARD[k].does()), ups.filter((k) => CARD[k].does(CARD[k].up) === CARD[k].does()).join(' '));
  check('its face: “II”, a gold edge', cardView('haggler', true).name === 'Haggler II' && cardView('haggler', true).ii && !cardView('haggler').ii);
  check('on TAB, as II', inventoryView(c, p).cards.some((v) => v.name === 'Haggler II'));
}

section('Builds — pair cards');
{
  check('Scorched Earth: Slam and Kills; Static Step: Movement and Fists; Shrapnel: Throws and Kills; Last Rites: Executions and Fists', CARD.scorchedEarth.pair?.join() === 'slam,kills' && CARD.staticStep.pair?.join() === 'movement,fists' && CARD.shrapnel.pair?.join() === 'throws,kills' && CARD.lastRites.pair?.join() === 'executions,fists');
  check('dealt only to one carrying both builds', dealable(fight('restless'), 'staticStep') === null && dealable(fight('jaggedKnuckles'), 'staticStep') === null && dealable(fight('restless', 'jaggedKnuckles'), 'staticStep') === 'new');
  const c = fight('staticStep');
  const g = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -3), 0);
  c.enemies[g].hp = 9999;
  c.enemies[g].frozen = 99;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const w = new FlatWorld();
  stepCombat(c, p, emptyCombatIntent(), w, DT);
  p.dashTime = DASH.v.duration;
  stepCombat(c, p, emptyCombatIntent(), w, DT);
  const zapped = c.powers.bolts.some((b) => b.alive);
  const hp = c.enemies[g].hp;
  stepCombat(c, p, emptyCombatIntent(), w, DT);
  check('Static Step: a dash begun strikes the nearest with lightning — once a dash', zapped && hp < 9999 && c.enemies[g].hp === hp);
  const toss = (...cards: CardKind[]) => {
    const t = fight(...cards);
    const a = spawnEnemy(t.enemies, 'grunt', new Vector3(0, 0, -3), 0);
    t.enemies[a].hp = 1;
    throwWeapon(holding('sword', 3), t.thrown, new Vector3(0, 1.5, 0), new Vector3(0, 0, -1), t.events);
    for (let k = 0; k < ticks(1); k++) updateThrown(t, new FlatWorld(), createPlayer(0, 0, 0, 0), DT);
    return t.powers.blasts.some((b) => b.alive && b.damage === BUILDS.v.shrapnelDamage);
  };
  check('Shrapnel: a thrown weapon that kills bursts', toss('shrapnel') && !toss());
  const r = fight('lastRites');
  const victim = spawnEnemy(r.enemies, 'grunt', new Vector3(0, 0, -1), 0);
  const close = spawnEnemy(r.enemies, 'grunt', new Vector3(3, 0, 0), 0);
  const far = spawnEnemy(r.enemies, 'grunt', new Vector3(BUILDS.v.ritesRadius + 3, 0, 0), 0);
  lastRites(r, new Vector3(0, 0, -1), victim);
  const bleeds = (i: number) => r.powers.dots.some((d) => d.alive && d.kind === 'bleed' && d.slot === i);
  check(`Last Rites: an execution makes those within ${BUILDS.v.ritesRadius} m bleed (not its victim)`, bleeds(close) && !bleeds(far) && !bleeds(victim) && readFileSync('src/sim/combat/execution.ts', 'utf8').includes('lastRites(state'));
}

section('Builds — a paid reroll');
{
  const c = fight();
  c.rng = createRng(3);
  c.money = 100;
  startDeal(c, -1);
  const first = c.deal!.cards.join();
  check(`the first costs ${BUILDS.v.reroll}`, rerollCost(c) === BUILDS.v.reroll);
  check('paid: dealt again', rerollDeal(c) && c.money === 100 - BUILDS.v.reroll && c.deal!.cards.join() !== first && c.deal!.cards.length === CARDS.v.dealt);
  check(`the next costs ${2 * BUILDS.v.reroll}`, rerollCost(c) === 2 * BUILDS.v.reroll && dealView(c).reroll === 2 * BUILDS.v.reroll && dealView(c).money === c.money);
  c.money = 10;
  const held = c.deal!.cards.join();
  check('can’t pay: the same deal, your coins kept', !rerollDeal(c) && c.money === 10 && c.deal!.cards.join() === held);
}

section('Builds — the shop, the Lab');
{
  const c = fight(...CARD_KINDS.filter((k) => familyOf(k) === 'fate' && CARD[k].rarity === 'common'));
  const rng = createRng(1);
  let again = 0;
  for (let k = 0; k < 200; k++) if (c.items.cards.has(fateOf(c, 'common', [], rng, false)!)) again++;
  check('the shop’s card is never a II', again === 0);
  const builds = LAB_CARDS.find(([h]) => h === 'Builds');
  check('the Lab: the builds’ own cards a column of their own, no column over 10', !!builds && builds[1].length === BUILD_CARDS.length && LAB_CARDS.every(([, picks]) => picks.length <= 10), LAB_CARDS.map(([h, p]) => `${h} ${p.length}`).join(', '));
  const placed = new Set(LAB_CARDS.flatMap(([, picks]) => picks.map(([, cmd]) => (cmd.kind === 'card' ? cmd.card : null))));
  check('every Fate Card in the Lab', CARD_KINDS.filter((k) => familyOf(k) === 'fate').every((k) => placed.has(k)));
}
