// Update 0.2.18 — what wave 2's Fate Cards do (the designer: "just build wave 2"): Jagged Knuckles, Thunderclap, Death
// Throes, Pyre, Spirit Knives, Powder Keg, Fire and Ice, Storm Heart, Chain Reaction, Splinter. Bleeds and burns hurt
// without staggering; a boss burns but never freezes; a chain goes off a blast at a time.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import type { CardKind } from '../src/sim/cards/cards';
import { afflict } from '../src/sim/cards/cardHits';
import { bigHit, breakPowers, heavyPowers, tickPowers } from '../src/sim/cards/cardPowers';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { updateKnives } from '../src/sim/weapons/knives';
import { holding } from '../src/sim/weapons/weapons';
import { CARDS } from '../src/tuning/cards';
import { setKnob } from '../src/tuning/schema';

type Fight = ReturnType<typeof createCombat>;
const fight = (...cards: CardKind[]) => {
  const c = createCombat(OPEN_ARENA);
  for (const k of cards) c.items.cards.add(k);
  return c;
};
/** A frozen (still) `kind` at (x, z) with `hp`. */
const put = (c: Fight, x: number, z: number, hp = 9999, kind: 'grunt' | 'demon' = 'grunt') => {
  const s = spawnEnemy(c.enemies, kind, new Vector3(x, 0, z), 0);
  c.enemies[s].hp = hp;
  c.enemies[s].frozen = 999;
  return s;
};
const tick = (c: Fight, secs: number, p = createPlayer(0, 0, 50, 0)) => {
  for (let k = 0; k < ticks(secs); k++) {
    tickPowers(c, p, DT);
    updateKnives(c, new FlatWorld(), DT);
  }
};
const seen = (c: Fight, kind: string) => {
  for (let e = 0; e < c.events.length; e++) if (c.events.at(e).kind === kind) return true;
  return false;
};
const kill = (c: Fight, i: number) => {
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = i;
  hit.point.copy(c.enemies[i].pos);
  return landHit(c, hit, 99999, 0, 0, -1, 'hitJab', 1);
};
const hurt = (c: Fight, i: number) => 9999 - c.enemies[i].hp;

section('Fate Cards — wave 2: bleeds and burns');
{
  const c = fight();
  const g = put(c, 0, -3);
  c.enemies[g].frozen = 0;
  setPhase(c.enemies[g], 'windup');
  afflict(c, g, 'bleed', CARDS.v.bleedDps, CARDS.v.bleedFor);
  // (A hair over the second: its fourth quarter-second tick.)
  tick(c, 1.01);
  check(`a bleed hurts ${CARDS.v.bleedDps} a second, without staggering`, near(hurt(c, g), CARDS.v.bleedDps, 0.01) && c.enemies[g].phase === 'windup', `${hurt(c, g)} ${c.enemies[g].phase}`);
  tick(c, CARDS.v.bleedFor);
  const after = hurt(c, g);
  tick(c, 1);
  check(`and stops after ${CARDS.v.bleedFor} s`, hurt(c, g) === after && near(after, CARDS.v.bleedDps * CARDS.v.bleedFor, 0.01));
  const j = fight('jaggedKnuckles');
  const t = put(j, 0, -1.2);
  const intent = emptyCombatIntent();
  intent.attackPressed = true;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  stepCombat(j, p, intent, new FlatWorld(), DT);
  check('Jagged Knuckles: a jab makes it bleed', j.powers.dots.some((d) => d.alive && d.slot === t && d.kind === 'bleed'));
  const boss = fight();
  const b = put(boss, 0, -3, 9999, 'demon');
  afflict(boss, b, 'burn', CARDS.v.burnDps, CARDS.v.burnFor);
  tick(boss, 1.01);
  check('a boss burns too', near(hurt(boss, b), CARDS.v.burnDps, 0.01));
}

section('Fate Cards — wave 2: kills (Pyre, Death Throes, Chain Reaction, Spirit Knives)');
{
  const c = fight('pyre');
  const dead = put(c, 0, -3, 1);
  const by = put(c, 1.5, -3);
  const far = put(c, 12, -3);
  kill(c, dead);
  tick(c, 1);
  check('Pyre: a kill sets those near it burning (not those far off)', c.powers.dots.some((d) => d.alive && d.slot === by && d.kind === 'burn') && hurt(c, by) > 0 && hurt(c, far) === 0);
  const t = fight('deathThroes');
  setKnob(CARDS, 'throesChance', 1);
  const td = put(t, 0, -3, 1);
  const tb = put(t, 2, -3);
  kill(t, td);
  tick(t, DT * 2);
  check(`Death Throes: a kill bursts (${CARDS.v.throesDamage} near it)`, hurt(t, tb) > 0 && seen(t, 'cardBoom'));
  setKnob(CARDS, 'throesChance', 0);
  const n = fight('deathThroes');
  const nd = put(n, 0, -3, 1);
  const nb = put(n, 2, -3);
  kill(n, nd);
  tick(n, 0.5);
  check('not when the chance says no', hurt(n, nb) === 0);
  setKnob(CARDS, 'throesChance', CARDS.knobs.throesChance.def);
  // Chain Reaction: a line of weak enemies, 2.5 m apart: each blast sets off the next, a moment apart.
  const r = fight('chainReaction');
  const line = [0, 1, 2, 3, 4].map((k) => put(r, 0, -3 - 2.5 * k, 10));
  kill(r, line[0]);
  tick(r, 0.05);
  const early = line.filter((i) => r.enemies[i].phase === 'dead').length;
  tick(r, 1.5);
  const late = line.filter((i) => r.enemies[i].phase === 'dead').length;
  check('Chain Reaction: each kill blasts, and its blast sets off the next, one after another', early < line.length && late === line.length, `${early} then ${late}`);
  const s = fight('spiritKnives');
  const sd = put(s, 0, -3, 1);
  const a = put(s, 5, -6);
  const b = put(s, -5, -6);
  kill(s, sd);
  const knives = s.knives.filter((k) => k.alive && k.hand === 2);
  check(`Spirit Knives: a kill throws ${CARDS.v.spiritKnives}, each after an enemy near it`, knives.length === CARDS.v.spiritKnives && knives.every((k) => k.home === a || k.home === b));
  tick(s, 1.5);
  check('they find them', hurt(s, a) >= CARDS.v.spiritDamage && hurt(s, b) >= CARDS.v.spiritDamage, `${hurt(s, a)} ${hurt(s, b)}`);
}

section('Fate Cards — wave 2: lightning (Thunderclap, Storm Heart)');
{
  const c = fight('thunderclap');
  const hitOne = put(c, 0, -2);
  const near3 = [put(c, 2, -3), put(c, -2, -3), put(c, 0, -5)];
  const fourth = put(c, 0, -9);
  heavyPowers(c, hitOne, new Vector3(0, 1, -2));
  check(`Thunderclap: a parried shot arcs to the ${CARDS.v.zapTargets} nearest (${CARDS.v.zapDamage} each), not the one punched`, near3.every((i) => hurt(c, i) === CARDS.v.zapDamage) && hurt(c, fourth) === 0 && hurt(c, hitOne) === 0 && c.powers.bolts.filter((b) => b.alive).length === 3);
  const s = fight('stormHeart');
  const p = createPlayer(0, 0, 0, 0);
  const close = put(s, 0, -4);
  const out = put(s, 0, -40);
  tick(s, CARDS.v.stormEvery - 0.1, p);
  const before = hurt(s, close);
  tick(s, 0.2, p);
  check(`Storm Heart: every ${CARDS.v.stormEvery} s, lightning strikes those near you`, before === 0 && hurt(s, close) === CARDS.v.zapDamage && hurt(s, out) === 0);
  // A strike that kills (with a card that acts on kills) doesn't move where the rest go out from.
  const k = fight('stormHeart', 'pyre');
  const q = createPlayer(0, 0, 0, 0);
  const weak = put(k, 0, -3, 1);
  put(k, 3, -6);
  put(k, -3, -6);
  tick(k, CARDS.v.stormEvery + 0.05, q);
  check('every bolt goes out from you, even after one kills', k.enemies[weak].phase === 'dead' && k.powers.bolts.filter((b) => b.alive).every((b) => near(b.from.x, 0, 1e-6) && near(b.from.z, 0, 1e-6)));
}

section('Fate Cards — wave 2: blasts and rings (Powder Keg, Fire and Ice)');
{
  const c = fight('powderKeg');
  const a = put(c, 0, -3);
  const b = put(c, 1.5, -3);
  heavyPowers(c, a, new Vector3(0, 1, -3));
  tick(c, DT * 2);
  check(`Powder Keg: a parried shot blows up (${CARDS.v.kegDamage} at its middle)`, hurt(c, a) === CARDS.v.kegDamage && hurt(c, b) > 0 && hurt(c, b) < CARDS.v.kegDamage);
  const w = fight('powderKeg');
  const wa = put(w, 3, -3);
  breakPowers(w, new Vector3(3, 1, -2));
  tick(w, DT * 2);
  check('so does a thrown weapon where it breaks', hurt(w, wa) > 0);
  const f = fight('fireAndIce');
  const ring = put(f, 1, -3);
  const boss = put(f, -1, -3, 9999, 'demon');
  const at = new Vector3(0, 1, -3);
  bigHit(f, at, 39);
  const quiet = !f.powers.dots.some((d) => d.alive);
  bigHit(f, at, 50);
  check(`Fire and Ice: a hit of ${CARDS.v.bandHit} or more throws a ring of fire (not a weaker one)`, quiet && f.powers.dots.some((d) => d.alive && d.slot === ring && d.kind === 'burn') && seen(f, 'cardRing'));
  f.enemies[ring].frozen = 0;
  f.enemies[boss].frozen = 0;
  bigHit(f, at, 50);
  check('the next waits its time', f.enemies[ring].frozen === 0);
  tick(f, CARDS.v.bandEvery);
  bigHit(f, at, 50);
  check('then a ring of ice freezes them (never a boss)', f.enemies[ring].frozen === CARDS.v.bandFreeze && f.enemies[boss].frozen === 0);
}

section('Fate Cards — wave 2: Splinter');
{
  const throwIt = (cards: CardKind[]) => {
    const c = fight(...cards);
    c.bag[2] = holding('sword', 5);
    c.slot = 2;
    c.weapon = c.bag[2];
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    const intent = emptyCombatIntent();
    intent.throwPressed = true;
    const world = new FlatWorld();
    stepCombat(c, p, intent, world, DT);
    intent.throwPressed = false;
    for (let k = 0; k < ticks(0.3) && !c.thrown.some((t) => t.alive); k++) stepCombat(c, p, intent, world, DT);
    return c.thrown.filter((t) => t.alive);
  };
  const three = throwIt(['splinter']);
  const angles = three.map((t) => (Math.atan2(t.vel.x, -t.vel.z) * 180) / Math.PI).sort((x, y) => x - y);
  check(`Splinter: a throw splits in three, ${CARDS.v.splinter}° apart`, three.length === 3 && near(angles[1] - angles[0], CARDS.v.splinter, 0.5) && near(angles[2] - angles[1], CARDS.v.splinter, 0.5), angles.map((x) => x.toFixed(1)).join(' '));
  check('without it, one', throwIt([]).length === 1);
}
