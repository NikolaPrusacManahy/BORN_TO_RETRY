// Update 0.2.16 — what wave 1's new Fate Cards do (the first 14, the Scars, are test-card-moves.ts): Hard Head, Light
// Bones, Quick Hands, Blood Money, Haggler, Bloodrush, Killing Spree, Cold Snap, Mercy Kill, Updraft, Restless, Giant
// Killer, Fortune's Favour, Reaper's Rhythm, Born Again, All In. Each against the same without it.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import type { CardKind } from '../src/sim/cards/cards';
import { chill, parryTimes, fistFactor, handsRate, meterAfter, meterStep, tickCards } from '../src/sim/cards/cardMoves';
import { rollRarity } from '../src/sim/cards/deal';
import { createCombat } from '../src/sim/combat/state';
import { slamImpact } from '../src/sim/combat/slamHit';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { RARITIES, rollLoot } from '../src/sim/dungeon/loot';
import { offerPrice } from '../src/sim/dungeon/treasure';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { moveFactor } from '../src/sim/items/items';
import { dashMaxOf, refillDash, tryStartDash } from '../src/sim/player/dash';
import { damagePlayer, maxHpOf } from '../src/sim/player/health';
import { jumpSpeed, tryAirJump, tryGroundJump } from '../src/sim/player/jump';
import { createPlayer } from '../src/sim/player/state';
import { CARDS } from '../src/tuning/cards';
import { EXECUTION } from '../src/tuning/execution';
import { HEALTH } from '../src/tuning/health';
import { DASH, SLAM } from '../src/tuning/movement';

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
const events = (c: ReturnType<typeof createCombat>) => {
  const out: string[] = [];
  for (let e = 0; e < c.events.length; e++) out.push(c.events.at(e).kind);
  return out;
};
/** A kill of a fresh `kind` by you. */
function kill(c: ReturnType<typeof createCombat>, kind: 'grunt' | 'brute' = 'grunt') {
  const s = spawnEnemy(c.enemies, kind, new Vector3(0, 0, -2), 0);
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = s;
  landHit(c, hit, 99999, 0, 0, -1, 'hitJab', 1);
}

section('Fate Cards — common: Hard Head, Light Bones, Quick Hands, Blood Money, Haggler');
{
  const hit = (cards: CardKind[]) => {
    const p = body(...cards);
    let shrugged = 0;
    for (let i = 0; i < 20; i++) {
      p.hurtTime = 0;
      const hp = p.hp;
      if (!damagePlayer(p, 1) && p.hp === hp) shrugged++;
    }
    return shrugged;
  };
  check(`Hard Head: every ${CARDS.v.hardHead}th hit does nothing`, hit(['hardHead']) === Math.floor(20 / CARDS.v.hardHead) && hit([]) === 0);
  const jump = (cards: CardKind[]) => {
    const p = body(...cards);
    p.grounded = true;
    p.jumpBuffer = 0.1;
    tryGroundJump(p);
    return p.vel.y;
  };
  check(`Light Bones: jumps ${Math.round(CARDS.v.lightBones * 100)}% higher`, near(jump(['lightBones']) ** 2 / jump([]) ** 2, 1 + CARDS.v.lightBones, 1e-9) && near(jump([]), jumpSpeed(), 1e-9));
  check('Quick Hands: a weapon’s charge 40% quicker, fists as before', near(1 / handsRate(fight('quickHands')), 1 - CARDS.v.quickHands, 1e-9) && handsRate(fight()) === 1);
  const money = (cards: CardKind[]) => {
    const c = fight(...cards);
    const p = createPlayer(0, 0, 0, 0);
    tickCards(c, p, DT);
    damagePlayer(p, 5);
    tickCards(c, p, DT);
    return c.money + c.coins.filter((q) => q.alive).length;
  };
  check(`Blood Money: a hit taken drops ${CARDS.v.bloodMoney} coins for you`, money(['bloodMoney']) === CARDS.v.bloodMoney && money([]) === 0);
  const offer = { kind: 'heart' as const, price: 100, sold: false, x: 0, z: 0 };
  check(`Haggler: the shop is ${Math.round(CARDS.v.haggler * 100)}% cheaper`, offerPrice(offer, fight('haggler')) === Math.round(100 * (1 - CARDS.v.haggler)) && offerPrice(offer, fight()) === 100);
}

section('Fate Cards — uncommon: Bloodrush, Killing Spree, Cold Snap');
{
  const c = fight('bloodrush');
  const before = moveFactor(c);
  kill(c);
  check(`Bloodrush: a kill makes you ${Math.round(CARDS.v.bloodrush * 100)}% faster`, near(moveFactor(c) / before, 1 + CARDS.v.bloodrush, 1e-9));
  const p = createPlayer(0, 0, 0, 0);
  for (let t = 0; t <= CARDS.v.bloodrushFor + 0.05; t += DT) tickCards(c, p, DT);
  check(`for ${CARDS.v.bloodrushFor} s`, near(moveFactor(c), before, 1e-9));
  const spree = (gap: number) => {
    const s = fight('killingSpree');
    const q = createPlayer(0, 0, 0, 0);
    for (let k = 0; k < CARDS.v.spreeKills; k++) {
      kill(s);
      for (let t = 0; t < gap; t += DT) tickCards(s, q, DT);
    }
    return { on: s.frenzy > 0, seen: events(s).includes('cardSpree') };
  };
  check(`Killing Spree: ${CARDS.v.spreeKills} kills within ${CARDS.v.spreeWithin} s quicken your attacks`, spree(0.3).on && spree(0.3).seen);
  check('too far apart, nothing', !spree(CARDS.v.spreeWithin).on);
  const cold = fight('coldSnap');
  const g = spawnEnemy(cold.enemies, 'grunt', new Vector3(0, 0, -1), 0);
  cold.enemies[g].hp = 9999;
  slamImpact(cold, new Vector3(0, 0, 0), SLAM.v.minHeight);
  const boss = fight('coldSnap');
  const b = spawnEnemy(boss.enemies, 'dragon', new Vector3(0, 0, -2), 0);
  chill(boss, b);
  check(`Cold Snap: a slam freezes what it hits for ${CARDS.v.coldSnap} s (never a boss)`, cold.enemies[g].frozen === CARDS.v.coldSnap && boss.enemies[b].frozen === 0);
}

section('Fate Cards — rare: Mercy Kill, Updraft');
{
  const finish = (cards: CardKind[], kind: 'grunt' | 'dragon' = 'grunt') => {
    const c = fight(...cards);
    const s = spawnEnemy(c.enemies, kind, new Vector3(0, 0, -2), 0);
    const e = c.enemies[s];
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = s;
    // A hit leaving it just under the line.
    const max = e.hp;
    return landHit(c, hit, max * (1 - CARDS.v.mercyKill) + 1, 0, 0, -1, 'hitJab', 1);
  };
  check(`Mercy Kill: a hit leaving an enemy under ${Math.round(CARDS.v.mercyKill * 100)}% finishes it (never a boss)`, finish(['mercyKill']) && !finish([]) && !finish(['mercyKill'], 'dragon'));
  const p = body('updraft');
  p.grounded = false;
  p.airJumps = 1;
  p.jumpBuffer = 0.1;
  const first = tryAirJump(p);
  p.jumpBuffer = 0.1;
  const second = tryAirJump(p);
  const plain = body();
  plain.airJumps = 1;
  plain.jumpBuffer = 0.1;
  check('Updraft: one more jump in the air, once until you land', first && !second && p.vel.y > 0 && !tryAirJump(plain));
}

section('Fate Cards — epic: Restless, Giant Killer');
{
  const p = body('restless');
  check(`Restless: ${CARDS.v.restless} more dash charges`, dashMaxOf(p) === DASH.v.charges + CARDS.v.restless && dashMaxOf(body()) === DASH.v.charges);
  const fill = (q: ReturnType<typeof body>) => {
    q.dashCharges = 0;
    refillDash(q, 0.5);
    return q.dashCharges;
  };
  check('refilling quicker', near(fill(body('restless')) / fill(body()), 1 + CARDS.v.restlessRefill, 1e-9));
  const c = fight('giantKiller');
  const q = createPlayer(0, 0, 0, 0);
  kill(c, 'brute');
  tickCards(c, q, DT);
  q.dashCharges = 0;
  const free = tryStartDash(q, true, new Vector3(0, 0, -1));
  check(`Giant Killer: a mini boss killed: free dashes and a parry that never waits for ${CARDS.v.giantKiller} s`, c.giant > 0 && free && q.dashCharges === 0 && parryTimes(c).cooldown === 0 && parryTimes(fight()).cooldown > 0 && events(c).includes('cardGiant'));
  const g = fight('giantKiller');
  kill(g, 'grunt');
  check('not for any kill', g.giant === 0);
}

section('Fate Cards — mythic: Fortune’s Favour, Reaper’s Rhythm, Born Again, All In');
{
  const mean = (lucky: boolean) => {
    const c = fight(...(lucky ? (['fortune'] as CardKind[]) : []));
    let sum = 0;
    for (let i = 0; i < 4000; i++) sum += RARITIES.indexOf(rollRarity(c, RARITIES));
    return sum / 4000;
  };
  check('Fortune’s Favour: deals roll their rarity twice (better on the whole)', mean(true) > mean(false) + 0.2, `${mean(true).toFixed(2)} vs ${mean(false).toFixed(2)}`);
  let never = true;
  for (let i = 0; i < 200; i++) {
    const rolls = [i / 200, 0.5, ((i * 37) % 200) / 200] as const;
    never &&= RARITIES.indexOf(rollLoot('key', rolls, { better: true }).rarity) >= RARITIES.indexOf(rollLoot('key', rolls).rarity);
  }
  check('and a chest never comes out worse for it', never);
  const reaper = fight('reapersRhythm');
  check(`Reaper’s Rhythm: the meter fills in ${CARDS.v.reaperKills} kills, an execution leaves it half full`, meterStep(reaper).steps === CARDS.v.reaperKills && meterStep(fight()).steps === EXECUTION.v.killsToFill && meterAfter(reaper) === Math.floor(CARDS.v.reaperKills / 2) / CARDS.v.reaperKills && meterAfter(fight()) === 0);
  const saved = body('bornAgain');
  damagePlayer(saved, 9999);
  check(`Born Again: the first death burns the card: 1 health, ${CARDS.v.bornAgain} s untouchable`, !saved.dead && saved.hp === 1 && saved.invuln >= CARDS.v.bornAgain && !saved.cards.has('bornAgain') && saved.events.length > 0);
  saved.invuln = 0;
  saved.hurtTime = 0;
  damagePlayer(saved, 9999);
  check('the second is death', saved.dead);
  const all = fight('allIn');
  const p = body('allIn');
  check('All In: your fists hit twice as hard, your max health halved', fistFactor(all) === 2 && fistFactor(fight()) === 1 && maxHpOf(p) === HEALTH.v.maxHp / 2);
}
