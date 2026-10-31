// Update 0.0.17 — the designer's list. Less gold (chests 10/20/30/40, kills half: a half coin is one more half the time);
// the silver plate gives 20 shield, the gold armour 40; the red ring +15 max health, the purple ring +25% damage, the
// green ring +15% melee attack speed, the blue ring +15% run speed; melee reach +30%; more in chests and the shop; kill
// bonuses (snowflake: melee hits freeze, never a boss; gold ingots: +50% coins; blue potion: +30% speed), a few a room,
// fading if left; weapon slots (fists 1, weapons 2+, the number keys; a throw empties its slot).
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat, CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { RARITIES, rollLoot, TIER } from '../src/sim/dungeon/loot';
import { RARITY_COLOUR } from '../src/engine/treasureFx';
import { createTreasure } from '../src/sim/dungeon/treasure';
import { coinsFor, hasteFactor, rollBonus, takeBonus } from '../src/sim/items/bonuses';
import { dropItem, updateDrops } from '../src/sim/items/drops';
import { attackRate, ItemKind, priceOf, takeItem } from '../src/sim/items/items';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { maxHpOf } from '../src/sim/player/health';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { SLOTS } from '../src/sim/weapons/slots';
import { holding } from '../src/sim/weapons/weapons';
import { BONUS } from '../src/tuning/bonus';
import { BOSS } from '../src/tuning/boss';
import { FISTS, TARGETS } from '../src/tuning/combat';
import { ENEMIES } from '../src/tuning/enemies';
import { FOES } from '../src/tuning/foes';
import { HEALTH } from '../src/tuning/health';
import { ITEMS } from '../src/tuning/items';
import { WEAPONS } from '../src/tuning/weapons';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { Arena } from '../src/world/arena';

const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const events = (c: CombatState) => Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);

/** You at the origin facing −z, with a dummy `at` m ahead (−1: none). */
function scene(at = -1) {
  const c = createCombat({ ...bare, dummies: at > 0 ? [{ x: 0, y: 0, z: -at }] : [], stands: [] });
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  return { c, p, w: new FlatWorld() };
}
const step = (c: CombatState, p: PlayerState, w: FlatWorld, intent: Partial<CombatIntent> = {}) => {
  c.events.clear();
  stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, w, DT);
  return events(c);
};

section('Loadout — less gold');
{
  check('kills give half the coins they did', ENEMIES.v.gruntCoins === 1 && ENEMIES.v.spitterCoins === 2 && ENEMIES.v.bruteCoins === 5 && FOES.v.leaperCoins === 2 && FOES.v.stingerCoins === 1.5 && FOES.v.wraithCoins === 2.5 && BOSS.v.demonCoins === 15);
  const c = createCombat(bare);
  const rng = createRng(4);
  let sum = 0;
  for (let i = 0; i < 4000; i++) sum += coinsFor(1.5, c, rng);
  check('a half coin is one more half the time (1.5 a kill on average)', near(sum / 4000, 1.5, 0.05), (sum / 4000).toFixed(3));
  c.bonuses.goldIngots = 5;
  sum = 0;
  for (let i = 0; i < 4000; i++) sum += coinsFor(2, c, rng);
  check(`with gold ingots on, ${BONUS.v.goldBoost * 100}% more`, near(sum / 4000, 3, 0.06), (sum / 4000).toFixed(3));
  const coins = new Set<number>();
  for (let i = 0; i < 400; i++) {
    // (Update 0.1.10 — a common chest holds coins, a heart or a plate: the coins' own roll picks the amount.)
    const l = rollLoot('key', [0, 0, i / 400]);
    if (!l.item) coins.add(l.coins);
  }
  check('a chest of coins holds 10, 20, 30 or 40', [...coins].sort((a, b) => a - b).join() === '10,20,30,40');
}

section('Loadout — armour and rings');
{
  const { c, p } = scene();
  takeItem('plate', p, c);
  check(`the silver plate: ${ITEMS.v.silverShield} shield`, p.shield === ITEMS.v.silverShield);
  takeItem('goldPlate', p, c);
  check(`the gold armour: ${ITEMS.v.goldShield} more`, p.shield === ITEMS.v.silverShield + ITEMS.v.goldShield);
  p.hp = 50;
  takeItem('redRing', p, c);
  check(`a red ring: +${ITEMS.v.redRingHp} max health, and that much health`, maxHpOf(p) === HEALTH.v.maxHp + ITEMS.v.redRingHp && p.hp === 50 + ITEMS.v.redRingHp);
  p.hp = maxHpOf(p);
  check('your health can fill the bigger bar', p.hp === HEALTH.v.maxHp + ITEMS.v.redRingHp);
  takeItem('greenRing', p, c);
  // (Update 0.2.0 — the teal ring in place of the purple: +25 max health, and that much health.)
  const before = p.hp;
  takeItem('tealRing', p, c);
  check('green and teal rings are carried', c.items.greenRings === 1 && c.items.tealRings === 1 && near(attackRate(c.items), 1 + ITEMS.v.greenRing, 1e-9));
  check(`a teal ring: +${ITEMS.v.tealRingHp} max health, and that much health`, maxHpOf(p) === HEALTH.v.maxHp + ITEMS.v.redRingHp + ITEMS.v.tealRingHp && p.hp === before + ITEMS.v.tealRingHp);
  // Jabs held down: how many in a second, without and with a green ring.
  const jabs = (rings: number) => {
    const s = scene(1.5);
    s.c.items.greenRings = rings;
    let n = 0;
    for (let i = 0; i < ticks(1); i++) n += step(s.c, s.p, s.w, { attackHeld: true }).filter((k) => k === 'jabL' || k === 'jabR').length;
    return n;
  };
  check('a green ring makes your melee attacks quicker', jabs(1) > jabs(0), `${jabs(0)} → ${jabs(1)} jabs a second`);
}

section('Loadout — reach');
{
  check('melee reach is 30% longer', near(FISTS.v.reach, 2.9, 1e-9) && near(WEAPONS.v.swordReach, 3.4, 1e-9) && near(WEAPONS.v.swordPierceReach, 4.15, 1e-9));
  const far = scene(2.7);
  step(far.c, far.p, far.w, { attackPressed: true });
  check('a punch reaches a dummy 2.7 m away (it fell short at 2.2)', far.c.dummies[0].hp < TARGETS.v.dummyHp);
  // (Its sweep's width and the dummy's add to the reach: 2.9 + 0.6 + 0.4.)
  const out = scene(4.2);
  step(out.c, out.p, out.w, { attackPressed: true });
  check('not one 4.2 m away', out.c.dummies[0].hp === TARGETS.v.dummyHp);
}

section('Loadout — chests and the shop');
{
  const items = new Set<string>();
  const rng = createRng(9);
  for (let i = 0; i < 20000; i++) items.add(rollLoot('key', [rng(), rng(), rng()]).item ?? 'coins');
  check('chests can hold the gold armour and every ring', ['goldPlate', 'redRing', 'blueRing', 'greenRing', 'tealRing', 'goldSword', 'heart', 'plate', 'coins'].every((k) => items.has(k)), [...items].join(', '));
  // (Update 0.1.10 — the designer's sort: the gold armour uncommon, every ring rare. Update 0.2.0 — the teal ring mythic.)
  check('the gold armour is uncommon, the rings rare, the teal ring mythic', TIER.uncommon.includes('goldPlate') && ['redRing', 'blueRing', 'greenRing'].every((r) => TIER.rare.includes(r as never)) && TIER.mythic.includes('tealRing') && RARITIES.length === 5);
  const shop = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) for (const o of createTreasure(buildDungeon(planFloor(seed, 1)), createRng(seed)).offers) shop.add(o.kind);
  check('the shop shows them too', ['goldPlate', 'greenRing', 'tealRing', 'redRing', 'blueRing', 'goldSword'].every((k) => shop.has(k)), [...shop].join(', '));
}

section('Loadout — kill bonuses');
{
  const c = createCombat(bare);
  const rng = createRng(2);
  const got: Record<string, number> = {};
  for (let i = 0; i < 10000; i++) {
    c.bonusDrops = Infinity;
    const b = rollBonus(c, rng);
    if (b) got[b] = (got[b] ?? 0) + 1;
  }
  // (Update 0.2.0 — the designer: the snowflake and the potion 4% less, gold the same.)
  check(`snowflakes drop from ${BONUS.v.snowflakeOdds * 100}% of kills, gold ingots ${BONUS.v.goldOdds * 100}%, blue potions ${BONUS.v.potionOdds * 100}%`, BONUS.v.snowflakeOdds === 0.06 && BONUS.v.goldOdds === 0.1 && BONUS.v.potionOdds === 0.06 && near((got.snowflake ?? 0) / 10000, 0.06, 0.01) && near((got.goldIngots ?? 0) / 10000, 0.1, 0.01) && near((got.bluePotion ?? 0) / 10000, 0.06, 0.01), JSON.stringify(got));
  c.bonusDrops = BONUS.v.perRoom;
  let n = 0;
  for (let i = 0; i < 200; i++) if (rollBonus(c, rng)) n++;
  check(`a room drops ${BONUS.v.perRoom} at most`, n === BONUS.v.perRoom);
  // One lying there: walk over it and it's on; leave it and it fades.
  const p = createPlayer(0, 0, 0, 0);
  dropItem(c.drops, 'bluePotion', new Vector3(5, 0, 0), c.events);
  updateDrops(c, p, DT);
  check('a bonus lies where it fell', c.drops.some((d) => d.alive && d.kind === 'bluePotion'));
  p.pos.set(5, 0, 0);
  updateDrops(c, p, DT);
  check(`walk over the blue potion: ${BONUS.v.potionFor} s of +${BONUS.v.potionBoost * 100}% speed`, c.bonuses.bluePotion === BONUS.v.potionFor && near(hasteFactor(c.bonuses), 1 + BONUS.v.potionBoost, 1e-9));
  p.pos.set(50, 0, 0);
  dropItem(c.drops, 'goldIngots', new Vector3(5, 0, 0), c.events);
  for (let i = 0; i < ticks(BONUS.v.life + 0.1); i++) updateDrops(c, p, DT);
  check(`left lying, it fades after ${BONUS.v.life} s`, !c.drops.some((d) => d.alive));
}
{
  // The snowflake: a punch freezes a grunt; it stands still, then thaws.
  const { c, p, w } = scene();
  const g = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -1.6), 0);
  c.enemies[g].hp = 1000;
  takeBonus(c, 'snowflake', p.pos);
  const ev = step(c, p, w, { attackPressed: true });
  const e = c.enemies[g];
  check('with the snowflake on, a melee hit freezes what it hits', ev.includes('freeze') && e.frozen > BONUS.v.frozen - 2 * DT);
  p.pos.set(0, 0, 8);
  const at = e.pos.clone();
  for (let i = 0; i < ticks(BONUS.v.frozen * 0.8); i++) step(c, p, w);
  check('frozen, it stands still', e.pos.distanceTo(at) < 1e-6 && isLive(e));
  for (let i = 0; i < ticks(BONUS.v.frozen); i++) step(c, p, w);
  check('then it thaws and comes on', e.frozen === 0 && e.pos.distanceTo(at) > 0.2);
  const d = spawnEnemy(c.enemies, 'demon', new Vector3(0, 0, 6), 0);
  p.pos.set(0, 0, 8);
  p.yaw = Math.PI;
  step(c, p, w, { attackPressed: true, yaw: Math.PI });
  check('a boss never freezes', c.enemies[d].frozen === 0);
  c.bonuses.snowflake = 0;
  const h = scene();
  const g2 = spawnEnemy(h.c.enemies, 'grunt', new Vector3(0, 0, -1.6), 0);
  h.c.enemies[g2].hp = 1000;
  step(h.c, h.p, h.w, { attackPressed: true });
  check('without it, no freeze', h.c.enemies[g2].frozen === 0);
}
{
  // A kill in a room with bonuses left can drop one; never from a boss.
  let dropped = 0;
  for (let s = 0; s < 200; s++) {
    const c = createCombat(bare);
    c.rng = createRng(s);
    const i = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -2), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
    if (c.drops.some((d) => d.alive)) dropped++;
  }
  const odds = BONUS.v.snowflakeOdds + BONUS.v.goldOdds + BONUS.v.potionOdds;
  check(`about ${Math.round(odds * 100)} kills in a hundred drop a bonus`, near(dropped / 200, odds, 0.08), `${dropped} of 200`);
}

section('Loadout — weapon slots');
{
  const { c, p, w } = scene();
  check(`${SLOTS} slots; your fists in slot 1`, c.bag.length === SLOTS && c.slot === 0 && c.weapon === null);
  // Two swords on the floor at your feet.
  c.pickups[0].alive = true;
  c.pickups[0].kind = 'sword';
  c.pickups[0].uses = 4;
  c.pickups[0].pos.set(0, 0, 0);
  step(c, p, w, { interactPressed: true });
  check('a weapon you pick up goes in slot 2, into your hand', c.slot === 1 && c.weapon?.kind === 'sword' && c.bag[1] === c.weapon);
  takeItem('goldSword', p, c);
  check('the next one in slot 3', c.slot === 2 && c.weapon?.kind === 'goldSword' && c.bag[1]?.kind === 'sword');
  const ev = step(c, p, w, { slotPressed: 1 });
  check('key 2: the sword', c.slot === 1 && c.weapon?.kind === 'sword' && ev.includes('weaponSwap'));
  step(c, p, w, { slotPressed: 0 });
  check('key 1: your fists', c.slot === 0 && c.weapon === null);
  step(c, p, w, { slotPressed: 4 });
  check('an empty slot does nothing', c.slot === 0);
  step(c, p, w, { slotPressed: 2 });
  for (let i = 0; i < ticks(WEAPONS.v.throwWindup + 0.05); i++) step(c, p, w, { throwPressed: i === 0 });
  check('a throw empties its slot; your fists come out', c.bag[2] === null && c.slot === 0 && c.weapon === null && c.bag[1]?.kind === 'sword');
  // Full: the new one takes the place of the one in your hand, which falls at your feet.
  c.bag[2] = holding('sword', 3);
  c.bag[3] = holding('sword', 3);
  c.bag[4] = holding('sword', 3);
  step(c, p, w, { slotPressed: 3 });
  takeItem('goldSword', p, c);
  check('all full: the new one takes the place of the one in your hand, which falls at your feet', c.slot === 3 && c.weapon?.kind === 'goldSword' && c.pickups.some((q) => q.alive && q.uses === 3));
}

section('The designer sort (Update 0.1.10)');
{
  // The shop's prices on floor 1, as the designer listed them.
  const want: [number, ItemKind[]][] = [
    [45, ['heart', 'plate', 'hammer', 'key']],
    [65, ['redRing', 'blueRing', 'greenRing', 'daggers', 'whiteKey']],
    [80, ['goldSword', 'goldPlate', 'goldKey']],
    [100, ['goldHammer', 'goldAxe']],
    // (Update 0.2.0 — the teal ring: the Gold Daggers' price.)
    [110, ['grimoire', 'goldDaggers', 'tealRing']],
  ];
  const wrong = want.flatMap(([price, kinds]) => kinds.filter((k) => priceOf(k, 1) !== price).map((k) => `${k} ${priceOf(k, 1)}`));
  check('shop prices: 45, 65, 80, 100 and 110 as listed', wrong.length === 0, wrong.join(', '));
  const shop = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) for (const o of createTreasure(buildDungeon(planFloor(seed, 1)), createRng(seed)).offers) shop.add(o.kind);
  check('the shop sells the Gold Hammer and the Gold Daggers too', shop.has('goldHammer') && shop.has('goldDaggers'));
  const tiers = RARITIES.map((r) => `${r}: ${TIER[r].join(' ')}`).join('; ');
  check('chests: common coins, heart, plate; uncommon gold armour, Great Heart, the Pistol (Update 0.2.12); rare gold sword, rings; epic Gold Axe, Gold Hammer; mythic Gold Daggers, Grimoire',
    tiers === 'common: coins heart plate; uncommon: goldPlate greatHeart pistol; rare: goldSword redRing blueRing greenRing; epic: goldAxe goldHammer; mythic: goldDaggers grimoire tealRing', tiers);
  check('mythic replaces legendary, and its glow is red', RARITIES[4] === 'mythic' && RARITY_COLOUR.mythic === 0xff2a2a);
  const c = createCombat(bare);
  const p = createPlayer(0, 0, 0, 0);
  p.hp = 10;
  takeItem('greatHeart', p, c);
  const full = p.hp === maxHpOf(p);
  p.hp = 10;
  takeItem('heart', p, c);
  check(`the Great Heart heals ${ITEMS.v.greatHeartHeal * 100}% (the heart ${ITEMS.v.heartHeal * 100}%)`, full && p.hp < maxHpOf(p));
}
