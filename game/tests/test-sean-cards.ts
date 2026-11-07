// Update 0.5.0 — Gravity Sean's own deck and chests (the designer: "let's have fate cards for Gravity Sean cause he won't be able to get any weapons like Joseph"; "he can get Armour, health and stats increases with
// rings but no weapons"; "20 different fate cards, 10 traitor and 10 death cards"; "only in challenge chest, no need for keys in Gravity Sean runs"; "a 50% chance to spawn a chests in rooms with a higher chance to get
// only gold"). Each of the 40 through what it changes: real blows through stepCombat, real chests through stepTreasure.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { buildOf } from '../src/sim/cards/builds';
import { CARD, CARD_KINDS, CardKind, familyOf, shopFactor, takeCard } from '../src/sim/cards/cards';
import { drawDeal } from '../src/sim/cards/deal';
import { holeReachOf } from '../src/sim/cards/seanPowers';
import { stockShop } from '../src/sim/cards/shopCard';
import { carryOver } from '../src/sim/combat/carry';
import { emptyCombatIntent, type CombatIntent, type Punch } from '../src/sim/combat/fists';
import { punchWaves } from '../src/sim/combat/gravity';
import { seanHud, createSeanHud } from '../src/sim/combat/gravityHud';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { seanLoot } from '../src/sim/dungeon/loot';
import { rewardDone } from '../src/sim/dungeon/reward';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { Chest, keyless, seanTreasure, stepTreasure, Treasure } from '../src/sim/dungeon/treasure';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { MINI_BOSSES, type EnemyKind } from '../src/sim/enemies/kinds';
import { isWeaponItem, moveFactor, takeItem } from '../src/sim/items/items';
import { damagePlayer, maxHpOf } from '../src/sim/player/health';
import { stepHover } from '../src/sim/player/hover';
import { createPlayer, type PlayerState } from '../src/sim/player/state';
import { ITEMS } from '../src/tuning/items';
import { HEALTH } from '../src/tuning/health';
import { SEAN } from '../src/tuning/sean';
import { SEAN_CARDS } from '../src/tuning/seanCards';
import { markOf } from '../src/ui/cardMarks';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { CARD_ORDER } from '../src/world/lobby/galleries';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const s = SEAN_CARDS.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const LOOK_DOWN = -0.35;
const never = () => false;

function room(cards: CardKind[] = [], unstable = false) {
  const c = createCombat(bare);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  for (const k of cards) takeCard(c, p, k);
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  if (unstable) step({ interactPressed: true });
  return { c, p, step };
}
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt', hp = 5000) => {
  const e = c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
  e.hp = hp;
  e.frozen = 100;
  return e;
};
const had = (c: CombatState, kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};
const lastValue = (c: CombatState, kind: string) => {
  let out = NaN;
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) out = c.events.at(i).value;
  return out;
};
const seanCards = CARD_KINDS.filter((k) => CARD[k].sean);
/** A piece of floor grabbed and let go straight away. */
function throwOne(r: ReturnType<typeof room>) {
  r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  r.step({ pitch: 0, heavyHeld: true }, v.grabRise + 0.05);
  r.step({ pitch: 0 });
  return r.c.grav.rocks.filter((k) => k.alive);
}
/** Black Hole, thrown from his palm. */
function throwHole(r: ReturnType<typeof room>) {
  r.step({ heavyPressed: true, heavyHeld: true });
  r.step({}, v.palmMin + DT);
}
/** A Black Hole open at (x, z), as if it had flown there. */
function openHole(c: CombatState, x: number, z: number, t = 0) {
  c.grav.hole = { flying: false, t, tick: 0, reach: holeReachOf(c), x, y: v.holeHeight, z, dx: 0, dy: 0, dz: -1, floor: 0, power: 1, pulled: [] };
}
/** You, by chest `chest`, keys or none. */
function standAt(p: PlayerState, chest: Chest) {
  p.pos.set(chest.spot.x + chest.spot.fx * 1.1, 0, chest.spot.z + chest.spot.fz * 1.1);
  p.grounded = true;
  chest.state = 'shut';
}
function openChest(t: Treasure, i: number, p: PlayerState, c: CombatState) {
  const chest = t.chests[i];
  standAt(p, chest);
  stepTreasure(t, p, c, true, false, never, DT);
  for (let n = 0; n < ticks(ITEMS.v.chestTime + 0.1); n++) stepTreasure(t, p, c, false, false, never, DT);
  return chest;
}
/** Floor 1 of a run of his, or (`sean` false) a run of Joseph's. */
function floorOf(seed: number, sean = true) {
  const level = buildDungeon(planFloor(seed, 1, sean));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  c.sean = sean;
  c.fate = true;
  c.rng = createRng(seed);
  if (sean) seanTreasure(run.treasure, 1);
  const p = createPlayer(0, 0, 0, 0);
  p.sean = sean;
  return { level, run, c, p, t: run.treasure };
}

section('Gravity Sean’s deck — 20 Fate Cards, 10 Traitor Cards, 10 Death Cards');
{
  const of = (f: string) => seanCards.filter((k) => familyOf(k) === f);
  check(`${of('fate').length} Fate, ${of('traitor').length} Traitor, ${of('death').length} Death`, of('fate').length === 20 && of('traitor').length === 10 && of('death').length === 10);
  check('every card in the game has a name of its own', new Set(CARD_KINDS.map((k) => CARD[k].name)).size === CARD_KINDS.length);
  check('each says what it does; a Traitor Card its price too', seanCards.every((k) => CARD[k].does().length > 8 && CARD[k].does().includes('undefined') === false && (familyOf(k) !== 'traitor' || (CARD[k].cost?.().length ?? 0) > 5)));
  const rarities = of('fate').map((k) => CARD[k].rarity);
  check('from common to mythic, the rarer the fewer', ['common', 'uncommon', 'rare', 'epic', 'mythic'].map((r) => rarities.filter((x) => x === r).length).join() === '5,5,4,4,2');
  const plain = markOf('nothing like a move');
  check('each has a mark of its move', seanCards.every((k) => markOf(CARD[k].move) !== plain));
  check('none counts towards Joseph’s builds', seanCards.every((k) => buildOf(k) === null));
  check('the manor’s walls hold 70: they’re not hung there', !CARD_ORDER.some((k) => CARD[k].sean) && CARD_ORDER.length === CARD_KINDS.length - 40);
}

section('Gravity Sean’s deck — dealt to him, and no one else');
{
  const families = new Set<string>();
  let his = true;
  let twice = false;
  const a = room();
  for (let i = 0; i < 400; i++) {
    const deal = drawDeal(a.c);
    his &&= deal.every((k) => CARD[k].sean);
    twice ||= new Set(deal).size !== deal.length;
    deal.forEach((k) => families.add(familyOf(k)));
  }
  check('all he’s dealt is his, none twice in a deal', his && !twice);
  check('all three families among them', families.size === 3);
  const j = room();
  j.c.sean = false;
  const d = room();
  d.c.sean = false;
  d.c.demon = true;
  let none = true;
  for (let i = 0; i < 400; i++) none &&= ![...drawDeal(j.c), ...drawDeal(d.c)].some((k) => CARD[k].sean);
  check('Joseph and the Demon are never dealt one', none);
  const carrying = room(seanCards.filter((k) => familyOf(k) === 'fate' && CARD[k].rarity !== 'common'));
  check('nor is one he carries dealt again', drawDeal(carrying.c).every((k) => !carrying.c.items.cards.has(k) || familyOf(k) !== 'fate'));
}

section('His chests — a 50% chance in each fight room, the challenge room’s always');
{
  let rooms = 0;
  let chests = 0;
  let bad = '';
  for (let seed = 1; seed <= 60; seed++) {
    for (let floor = 1; floor <= 10; floor++) {
      const plan = planFloor(seed * 31, floor, true);
      for (const r of plan.rooms) {
        if (r.challenge) {
          if (!r.chest) bad ||= `seed ${seed} floor ${floor}: challenge room with no chest`;
        } else if (r.kind === 'fight') {
          rooms++;
          if (r.chest) chests++;
        } else if (r.kind !== 'boss' && r.chest) bad ||= `seed ${seed} floor ${floor}: a chest in a ${r.kind} room`;
      }
    }
  }
  check(`${Math.round((chests / rooms) * 100)}% of ${rooms} fight rooms have one`, near(chests / rooms, s.roomChest, 0.04));
  check('the challenge room always has one, the start and the shop never', !bad, bad);
  const a = planFloor(4242, 3, true);
  const b = planFloor(4242, 3, true);
  check('the same seed, the same chests', a.rooms.map((r) => String(r.chest)).join() === b.rooms.map((r) => String(r.chest)).join());
  const jo = planFloor(4242, 3);
  check('his floor’s the same floor: only the chests differ', jo.rooms.map((r) => r.layout.template.id).join() === a.rooms.map((r) => r.layout.template.id).join() && JSON.stringify(jo.rooms.map((r) => r.waves)) === JSON.stringify(a.rooms.map((r) => r.waves)));
  check('Joseph’s floors are as they were', JSON.stringify(planFloor(4242, 3, false).rooms.map((r) => r.chest)) === JSON.stringify(jo.rooms.map((r) => r.chest)));
}

section('His chests — no keys');
{
  const f = floorOf(77);
  check('every chest opens without one', f.t.chests.length > 1 && f.t.chests.every((k) => keyless(k)));
  const i = f.t.chests.findIndex((k) => !k.challenge && k.boss === null);
  check('there’s a room’s chest to try', i >= 0);
  const chest = openChest(f.t, i, f.p, f.c);
  check('E opens it, with no key in your pocket', chest.state === 'open' && chest.key === null && f.c.items.keys === 0);
  check('a room’s chest deals no card', f.c.deal === null);

  const ch = floorOf(77);
  const room0 = ch.level.rooms.find((r) => r.challenge)!;
  const iCh = ch.t.chests.findIndex((k) => k.challenge);
  const challenge = ch.t.chests[iCh];
  ch.p.pos.set((room0.min.x + room0.max.x) / 2, 0, (room0.min.z + room0.max.z) / 2);
  challenge.state = 'shut';
  check('a won challenge room holds him till he’s opened it', !rewardDone(ch.run, room0.index, ch.p, ch.c));
  openChest(ch.t, iCh, ch.p, ch.c);
  check('it deals', !!ch.c.deal && ch.c.deal.cards.length > 0);
  check('from his deck', ch.c.deal!.cards.every((k) => CARD[k].sean));
  check('and it holds an item as well', challenge.loot?.item !== null);

  const b = floorOf(77);
  const iBoss = b.t.chests.findIndex((k) => k.boss !== null);
  openChest(b.t, iBoss, b.p, b.c);
  check('a boss’s chest opens, with its coins and its heart, and deals nothing', b.t.chests[iBoss].state === 'open' && b.c.deal === null && b.t.chests[iBoss].loot!.coins > 0);

  const jo = floorOf(77, false);
  const iJo = jo.t.chests.findIndex((k) => k.challenge);
  check('Joseph’s challenge chest still wants a key', !keyless(jo.t.chests[iJo]));
  const j0 = jo.level.rooms.find((r) => r.challenge)!;
  jo.p.pos.set((j0.min.x + j0.max.x) / 2, 0, (j0.min.z + j0.max.z) / 2);
  jo.t.chests[iJo].state = 'shut';
  check('and its room lets him go if he has none', rewardDone(jo.run, j0.index, jo.p, jo.c));

  let weapons = false;
  let keys = false;
  let card = false;
  for (let seed = 1; seed <= 60; seed++) {
    const g = floorOf(seed * 13);
    stockShop(g.t, g.c);
    weapons ||= g.t.offers.some((o) => isWeaponItem(o.kind));
    keys ||= g.t.offers.some((o) => o.kind === 'key' || o.kind === 'whiteKey' || o.kind === 'goldKey');
    card ||= !!g.t.card?.kind;
  }
  check('his shop sells no weapons', !weapons);
  check('and no keys', !keys);
  check('and no Fate Card', !card);
  const js = floorOf(77, false);
  stockShop(js.t, js.c);
  check('Joseph’s still has its Fate Card', !!js.t.card?.kind);

  const keysIn = (sean: boolean) => {
    const g = floorOf(77, sean);
    const r = g.level.rooms.find((q) => q.challenge)!;
    g.p.pos.set((r.min.x + r.max.x) / 2, 0, (r.min.z + r.max.z) / 2);
    g.p.grounded = true;
    for (let n = 0; n < 60; n++) stepRooms(g.run, g.p, g.c, g.c.rng, DT);
    return g.c.keyDrops;
  };
  check(`no key drops for him in a challenge room (Joseph’s has ${keysIn(false)})`, keysIn(false) > 0 && keysIn(true) === 0);
}

section('His chests — mostly gold, and never a weapon');
{
  const rng = createRng(9);
  const n = 8000;
  let gold = 0;
  let weapon = false;
  let key = false;
  const items = new Set<string>();
  for (let i = 0; i < n; i++) {
    const l = seanLoot([rng(), rng(), rng()], false, s.onlyGold);
    if (l.item === null) gold++;
    else items.add(l.item);
    weapon ||= !!l.item && isWeaponItem(l.item);
    key ||= l.item === 'key' || l.item === 'whiteKey' || l.item === 'goldKey';
  }
  check(`${Math.round((gold / n) * 100)}% only gold`, near(gold / n, s.onlyGold, 0.02));
  check('never a weapon or a key', !weapon && !key);
  check('otherwise armour, health or a ring: ' + [...items].sort().join(', '), ['blueRing', 'goldPlate', 'greatHeart', 'greenRing', 'heart', 'plate', 'redRing', 'tealRing'].every((k) => items.has(k)) && items.size === 8);
  let always = true;
  let good = true;
  for (let i = 0; i < 3000; i++) {
    const l = seanLoot([rng(), rng(), rng()], true, s.onlyGold);
    always &&= l.item !== null;
    good &&= l.rarity === 'rare' || l.rarity === 'mythic';
  }
  check('a challenge room’s always holds an item, a ring at least', always && good);
  check('even with the slider at 100%, which empties a room’s of all but coins', seanLoot([0.5, 0.5, 0.5], true, 1).item !== null && seanLoot([0.5, 0.5, 0.5], false, 1).item === null);
}

section('His Fate Cards — Gravity Punch');
{
  const a = room(['longArm']);
  const far = foe(a.c, 0, -(v.punchReach + 2));
  a.step({ attackPressed: true });
  check(`Long Arm: it reaches ${v.punchReach * (1 + s.longArm)} m`, far.hp === 5000 - v.punchDamage);
  const short = room(['shortReach']);
  const out = foe(short.c, 0, -7.6);
  short.step({ attackPressed: true });
  const plain = room();
  const hit = foe(plain.c, 0, -7.6);
  plain.step({ attackPressed: true });
  check(`Short Reach, a Death Card: ${v.punchReach * (1 - s.shortReach)} m, and what he’d reach he doesn’t`, out.hp === 5000 && hit.hp < 5000);
  const pb = room(['pointBlank']);
  const close = foe(pb.c, 0, -3);
  const away = foe(pb.c, 2, -6);
  pb.step({ attackPressed: true });
  check(`Point Blank, a Traitor Card: ${Math.round(s.pointBlankHit * 100)}% harder, half as far`, near(close.hp, 5000 - v.punchDamage * (1 + s.pointBlankHit), 0.01) && away.hp === 5000);
  const rip = room(['wideRipple']);
  const punch = { kind: 'finisher', reach: v.punchReach } as Punch;
  punchWaves(rip.c, rip.p, punch, 3, new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0, -1), world);
  check(`Wide Ripple: its wave’s ${v.punchShock * (1 + s.wideRipple)} m wide`, near(lastValue(rip.c, 'seanBlast'), v.punchShock * (1 + s.wideRipple), 0.01));
}

section('His Fate Cards — Grab');
{
  const base = throwOne(room())[0];
  const loose = throwOne(room(['looseStone']))[0];
  check(`Loose Stone: ${Math.round(s.looseStone * 100)}% harder (${loose.damage})`, near(loose.damage, base.damage * (1 + s.looseStone), 0.01));
  const r = room(['borrowedMass']);
  const mass = throwOne(r)[0];
  check(`Borrowed Mass, a Traitor Card: ${Math.round(s.borrowedHit * 100)}% harder, and Grab waits ${s.borrowedWait} times as long`, near(mass.damage, base.damage * (1 + s.borrowedHit), 0.01) && near(r.c.grav.grabWait, v.grabWait * s.borrowedWait, 0.05));
  const heavy = throwOne(room(['heavyStone']))[0];
  check('Heavy Stone, a Death Card: it flies slower', near(heavy.vel.length(), base.vel.length() * (1 - s.heavyStone), 0.05));
  const rain = throwOne(room(['stoneRain']));
  check(`Stone Rain: three go, the two ${Math.round(s.rainShare * 100)}% as hard, either side`, rain.length === 3 && near(rain[1].damage, rain[0].damage * s.rainShare, 0.01) && near(rain[2].damage, rain[0].damage * s.rainShare, 0.01) && rain[1].vel.x * rain[2].vel.x < 0);
  const hits = room(['stoneRain']);
  const ahead = foe(hits.c, 0, -6);
  throwOne(hits);
  hits.step({ pitch: 0 }, 1);
  check('and they land', ahead.hp < 5000);
  const b = room(['bulwark']);
  damagePlayer(b.p, 10);
  const free = HEALTH.v.maxHp - b.p.hp;
  b.p.hurtTime = 0;
  b.p.hp = HEALTH.v.maxHp;
  b.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  b.step({ pitch: LOOK_DOWN, heavyHeld: true }, 0.05);
  damagePlayer(b.p, 10);
  check(`Bulwark: a hit of 10 does ${free} free-handed, ${HEALTH.v.maxHp - b.p.hp} holding a piece`, free === 10 && near(HEALTH.v.maxHp - b.p.hp, 10 * (1 - s.bulwark), 0.01));
}

section('His Fate Cards — his stance');
{
  const risen = (cards: CardKind[]) => {
    const r = room(cards, true);
    r.step({}, 5);
    return r.c.grav.instab;
  };
  const base = risen([]);
  check(`Cooling Core: Instability rises ${Math.round(s.coolingCore * 100)}% slower`, near(risen(['coolingCore']), base * (1 - s.coolingCore), 0.01));
  check(`Leaky Core, a Death Card: ${Math.round(s.leakyCore * 100)}% faster`, near(risen(['leakyCore']), base * (1 + s.leakyCore), 0.01));
  check(`Overclock, a Traitor Card: ${Math.round(s.overclockRise * 100)}% faster`, near(risen(['overclock']), base * (1 + s.overclockRise), 0.01));
  const hot = room(['overclock'], true);
  const fist = foe(hot.c, 0, -2);
  hot.c.grav.instab = 0;
  hot.step({ attackPressed: true });
  check(`and its hits ${Math.round(s.overclockHit * 100)}% harder`, near(fist.hp, 5000 - v.fistsDamage * (1 + s.overclockHit), 1));
  const vent = room(['cleanVent'], true);
  const near0 = foe(vent.c, 0, -0.5);
  vent.c.grav.instab = 0;
  vent.step({ interactPressed: true });
  check(`Clean Vent: switching back reaches ${v.ventRadius + s.cleanVentReach} m, ${Math.round(s.cleanVent * 100)}% harder`, near(lastValue(vent.c, 'seanBlast'), v.ventRadius + s.cleanVentReach, 0.2) && near0.hp < 5000 - v.ventDamage);
  const bad = room(['badVent'], true);
  bad.step({ interactPressed: true });
  check(`Bad Vent, a Death Card: it hits you for ${s.badVent}`, near(HEALTH.v.maxHp - bad.p.hp, s.badVent, 0.01));
  const cold = room(['coldReactor'], true);
  cold.step({}, 1 / v.instabRise + 3);
  check('Cold Reactor, a Traitor Card: it stays at full, and he stays Unstable', cold.c.grav.instab === 1 && cold.c.grav.unstable && !had(cold.c, 'seanOverload') && cold.p.hp === HEALTH.v.maxHp);
  const nocold = room([], true);
  nocold.step({}, 1 / v.instabRise + 3);
  check('(without it, it overloads)', !nocold.c.grav.unstable && nocold.p.hp < HEALTH.v.maxHp);
}

section('His cards — what a kill heals');
{
  const kill = (cards: CardKind[], unstable: boolean) => {
    const r = room(cards, unstable);
    r.p.hp = 50;
    if (unstable) r.c.grav.instab = 0;
    foe(r.c, 0, unstable ? -2 : -6, 'grunt', 1);
    r.step({ attackPressed: true });
    r.step({}, DT * 3);
    return r.p.hp - 50;
  };
  check(`plain: ${v.mendNormal} and ${v.mendKill}, as they were`, near(kill([], false), v.mendNormal, 0.01) && near(kill([], true), v.mendKill, 0.01));
  check(`Cold Comfort, a Death Card: ${Math.round(s.coldComfort * 100)}% less in both stances`, near(kill(['coldComfort'], false), v.mendNormal * (1 - s.coldComfort), 0.01) && near(kill(['coldComfort'], true), v.mendKill * (1 - s.coldComfort), 0.01));
  check('Cold Reactor’s price: none from Unstable mode, normal mode’s as ever', near(kill(['coldReactor'], true), 0, 0.01) && near(kill(['coldReactor'], false), v.mendNormal, 0.01));
  check('no card of his heals him more', seanCards.every((k) => kill([k], false) <= v.mendNormal + 0.01));
}

section('His Fate Cards — Ground Slam and Shockwave Punch');
{
  const land = room(['hardLanding']);
  land.step({ slamPressed: true });
  check(`Hard Landing: Ground Slam reaches ${v.slamRadius + s.hardLanding} m`, near(lastValue(land.c, 'seanBlast'), v.slamRadius + s.hardLanding, 0.01));
  const gears = room(['stuckGears']);
  gears.step({ slamPressed: true });
  check(`Stuck Gears, a Death Card: it waits ${Math.round(s.stuckGears * 100)}% longer`, near(gears.c.grav.slamWait, v.slamWait * (1 + s.stuckGears), 0.02));
  const hud = seanHud(gears.c.grav, false, createSeanHud());
  check('and the HUD’s clock starts from nothing, for all that', near(hud.ctrl.fill, 0, 0.03));
  const shocked = (cards: CardKind[]) => {
    const r = room(cards, true);
    r.step({ slamPressed: true });
    return r;
  };
  check(`Recoil Dampers: Shockwave Punch is ready ${Math.round(s.recoilDampers * 100)}% sooner`, near(shocked(['recoilDampers']).c.grav.shockWait, v.shockWait * (1 - s.recoilDampers), 0.02));
  check('Stuck Gears: and it waits longer too', near(shocked(['stuckGears']).c.grav.shockWait, v.shockWait * (1 + s.stuckGears), 0.02));
  check('the HUD’s clock there too', near(seanHud(shocked(['recoilDampers']).c.grav, false, createSeanHud()).ctrl.fill, 0, 0.03));
  const at = 40 * (Math.PI / 180);
  const wide = (cards: CardKind[]) => {
    const r = room(cards, true);
    const e = foe(r.c, Math.sin(at) * 6, -Math.cos(at) * 6);
    r.step({ slamPressed: true });
    r.step({}, v.shockWindup + DT * 2);
    return e.hp < 5000;
  };
  check(`Wide Front: 40° off your aim’s out of its ${v.shockCone}°, and in its ${Math.round(v.shockCone * (1 + s.wideFront))}°`, !wide([]) && wide(['wideFront']));
}

section('His Fate Cards — Black Hole');
{
  const thrown = (cards: CardKind[]) => {
    const r = room(cards, true);
    r.c.grav.instab = 0;
    throwHole(r);
    return r;
  };
  const base = thrown([]);
  check('it’s thrown', !!base.c.grav.hole);
  const tidal = thrown(['tidalForce']);
  check(`Tidal Force: ${Math.round(s.tidalForce * 100)}% harder`, near(tidal.c.grav.hole!.power, base.c.grav.hole!.power * (1 + s.tidalForce), 0.02));
  const hollow = thrown(['hollowFrame']);
  check(`Hollow Frame, a Traitor Card: its cooldown ${v.holeWait * s.hollowWait} s, and ${s.hollowHp} less max health`, near(hollow.c.grav.holeWait, v.holeWait * s.hollowWait, 0.5) && maxHpOf(hollow.p) === HEALTH.v.maxHp - s.hollowHp);
  check('the HUD’s clock starts from nothing', near(seanHud(hollow.c.grav, false, createSeanHud()).rmb.fill, 0, 0.05));
  const slow = thrown(['slowCollapse']);
  check(`Slow Collapse, a Death Card: ${Math.round(s.slowCollapse * 100)}% longer`, near(slow.c.grav.holeWait, v.holeWait * (1 + s.slowCollapse), 0.5));
  const held = seanHud(slow.c.grav, false, createSeanHud());
  check('and its clock doesn’t run backwards', held.rmb.fill >= 0);
  const pulled = (cards: CardKind[], kind: EnemyKind, off: number) => {
    const r = room(cards);
    const e = foe(r.c, 0, -20 + off, kind);
    e.frozen = 0;
    openHole(r.c, 0, -20);
    r.step({}, DT * 2);
    return e.phase === 'held';
  };
  check(`Event Horizon: it pulls from ${v.holeReach * (1 + s.eventHorizon)} m`, !pulled([], 'grunt', v.holeReach + 2) && pulled(['eventHorizon'], 'grunt', v.holeReach + 2));
  check('Singularity: a mini boss, which it doesn’t otherwise', !pulled([], 'brute', 5) && pulled(['singularity'], 'brute', 5));
  let bad = '';
  for (const kind of MINI_BOSSES) {
    const r = room(['singularity']);
    const e = foe(r.c, 0, -15, kind);
    e.frozen = 0;
    e.hp = 500000;
    openHole(r.c, 0, -20, v.holeTime - 0.5);
    r.step({}, 0.3);
    const was = e.phase;
    r.step({}, 1);
    if (!isLive(e)) bad ||= `${kind} died`;
    else if (was === 'held' && e.phase === 'held') bad ||= `${kind} never let go`;
  }
  check('every mini boss comes through it and is let go', !bad, bad);
}

section('His Fate Cards — his ultimates');
{
  const landed = (cards: CardKind[]) => {
    const r = room(cards);
    foe(r.c, 0, -6);
    r.step({ attackPressed: true });
    return r.c.grav.ult;
  };
  const base = landed([]);
  check(`a landed blow fills the meter ${base}`, near(base, v.ultHit, 1e-6));
  check(`Deep Well: ${Math.round(s.deepWell * 100)}% faster`, near(landed(['deepWell']), base * (1 + s.deepWell), 1e-6));
  check(`Dim Meter, a Death Card: ${Math.round(s.dimMeter * 100)}% slower`, near(landed(['dimMeter']), base * (1 - s.dimMeter), 1e-6));
  check(`Reactor Leak, a Traitor Card: ${Math.round(s.leakRate * 100)}% faster`, near(landed(['reactorLeak']), base * (1 + s.leakRate), 1e-6));
  const leak = room(['reactorLeak']);
  leak.c.grav.ult = 1;
  leak.step({ throwPressed: true });
  check(`and every ultimate costs ${s.leakCost} health`, near(HEALTH.v.maxHp - leak.p.hp, s.leakCost, 0.01));
  const low = room(['reactorLeak']);
  low.p.hp = 5;
  low.c.grav.ult = 1;
  low.step({ throwPressed: true });
  check('it never kills you', low.p.hp === 1 && !low.p.dead);

  const stopped = (cards: CardKind[]) => {
    const r = room(cards);
    r.c.grav.ult = 1;
    r.step({ throwPressed: true });
    return r;
  };
  check(`Time Stop’s ${v.stopTime} s plain; Stolen Minutes, a Traitor Card, ${v.stopTime + s.stolenTime}; Lost Hours, a Death Card, ${v.stopTime - s.lostHours}`, stopped([]).c.grav.stop?.time === v.stopTime && stopped(['stolenMinutes']).c.grav.stop?.time === v.stopTime + s.stolenTime && stopped(['lostHours']).c.grav.stop?.time === v.stopTime - s.lostHours);
  const long = stopped(['stolenMinutes']);
  long.step({}, v.stopTime + 1);
  check('it really runs that long', !!long.c.grav.stop);
  check('and the HUD reads it', near(seanHud(long.c.grav, false, createSeanHud()).stopLeft, s.stolenTime - 1, 0.15));
  long.step({}, s.stolenTime);
  check('then it ends', !long.c.grav.stop);
  const lost = stopped(['lostHours']);
  lost.step({}, v.stopTime - s.lostHours + 0.1);
  check('Lost Hours really ends it early', !lost.c.grav.stop);
  const soft = room(['stolenMinutes']);
  damagePlayer(soft.p, 10);
  check(`Stolen Minutes’ price: ${Math.round(s.stolenTaken * 100)}% more damage`, near(HEALTH.v.maxHp - soft.p.hp, 10 * (1 + s.stolenTaken), 0.01));

  const force = stopped(['storedForce']);
  const e = foe(force.c, 0, -6);
  force.step({ attackPressed: true });
  check('Stored Force: the blow’s held back', e.hp === 5000 && force.c.grav.stop!.stored.length === 1);
  force.step({}, v.stopTime + 0.1);
  check(`and lands ${Math.round(s.storedForce * 100)}% harder`, near(e.hp, 5000 - v.punchDamage * (1 + s.storedForce), 0.5));
  const doom = stopped(['storedForce']);
  const thin = foe(doom.c, 0, -6, 'grunt', v.punchDamage * 1.1);
  doom.step({ attackPressed: true });
  check('and what it’ll kill shows red by that sum', doom.c.grav.stop!.stored[0].doomed);
  doom.step({}, v.stopTime + 0.1);
  check('and it does kill it', !isLive(thin));

  const meteor = (cards: CardKind[]) => {
    const r = room(cards, true);
    r.c.grav.ult = 1;
    const m = foe(r.c, 0, -3);
    r.step({ throwPressed: true, pitch: -1.2 });
    r.step({ pitch: -1.2 }, v.meteorAim + v.meteorFall + 0.1);
    return { r, m };
  };
  const plain = meteor([]);
  const debt = meteor(['meteorDebt']);
  check(`Meteor Debt, a Traitor Card: ${Math.round(s.debtHit * 100)}% harder`, near(5000 - debt.m.hp, (5000 - plain.m.hp) * (1 + s.debtHit), 2));
  check(`and in its zone it hits you for ${s.debtSelf}`, plain.r.p.hp === HEALTH.v.maxHp && near(HEALTH.v.maxHp - debt.r.p.hp, s.debtSelf, 0.01));

  const reset = room(['fullReset']);
  reset.c.grav.ult = 1;
  reset.c.grav.holeWait = 10;
  reset.c.grav.shockWait = 4;
  reset.c.grav.slamWait = 2;
  reset.step({ throwPressed: true });
  reset.step({});
  check('Full Reset: an ultimate makes the rest ready at once, and you hear it', reset.c.grav.holeWait === 0 && reset.c.grav.shockWait === 0 && reset.c.grav.slamWait === 0 && had(reset.c, 'seanReady'));

  const from = room(['headStart']);
  const to = room();
  from.c.grav.ult = 0.1;
  carryOver(from.c, to.c);
  check(`Head Start: the next floor starts ${Math.round(s.headStart * 100)}% full`, to.c.grav.ult === s.headStart);
  from.c.grav.ult = 0.9;
  carryOver(from.c, to.c);
  check('or as full as you’d got it', to.c.grav.ult === 0.9);
  const none = room();
  none.c.grav.ult = 0.1;
  const next = room();
  carryOver(none.c, next.c);
  check('without it, as ever', next.c.grav.ult === 0.1);
}

section('His Fate Cards — Thin Air, Dead Weight');
{
  const hover = (cards: CardKind[]) => {
    const r = room(cards);
    stepHover(r.p, false, DT);
    return r.p.hover;
  };
  check(`plain: ${v.hoverTime} s`, hover([]) === v.hoverTime);
  check(`Thin Air: ${v.hoverTime * (1 + s.thinAir)} s`, near(hover(['thinAir']), v.hoverTime * (1 + s.thinAir), 1e-6));
  check('Dead Weight, a Death Card: none', hover(['deadWeight']) === 0);
}

section('His Fate Cards — Escape Velocity');
{
  const r = room(['escapeVelocity']);
  r.p.hp = 5;
  damagePlayer(r.p, 50);
  check('the blow that would kill him leaves him on 1', !r.p.dead && r.p.hp === 1);
  check('the card burns', !r.c.items.cards.has('escapeVelocity'));
  r.step({});
  check('and time stops', !!r.c.grav.stop && had(r.c, 'seanStopStart'));
  check('he can’t be touched till after it’s started again', r.p.invuln > v.stopTime);
  r.step({}, v.stopTime + 0.1);
  r.p.invuln = 0;
  r.p.hurtTime = 0;
  damagePlayer(r.p, 50);
  check('only the once', r.p.dead);
  const m = room(['escapeVelocity']);
  m.c.grav.meteor = { t: 0, x: 0, y: 0, z: 0, falling: false, dx: 0, dz: -1 };
  m.p.hp = 1;
  damagePlayer(m.p, 50);
  m.step({});
  check('calling a Meteor, it saves him all the same, and no Time Stop on top', !m.p.dead && !m.c.grav.stop && m.p.invuln > 0);
}

section('His Traitor Cards — coins and armour');
{
  const market = room(['blackMarket']);
  check(`Black Market: the shop’s ${Math.round(s.blackMarket * 100)}% cheaper`, near(shopFactor(market.c), 1 - s.blackMarket, 1e-6));
  const opened = (challenge: boolean) => {
    const f = floorOf(77);
    takeCard(f.c, f.p, 'blackMarket');
    const i = f.t.chests.findIndex((k) => k.challenge === challenge && k.boss === null);
    return { chest: openChest(f.t, i, f.p, f.c), c: f.c };
  };
  check('and every chest holds only coins, a challenge room’s too', opened(false).chest.loot?.item === null && opened(true).chest.loot?.item === null);
  check('though a challenge room’s still deals', !!opened(true).c.deal);

  const suit = room(['strippedSuit']);
  const plain = room();
  check(`Stripped Suit: you run ${Math.round(s.strippedSpeed * 100)}% faster`, near(moveFactor(suit.c) / moveFactor(plain.c), 1 + s.strippedSpeed, 1e-6));
  takeItem('plate', suit.p, suit.c);
  takeItem('plate', plain.p, plain.c);
  check(`and armour gives half: ${suit.p.shield} against ${plain.p.shield}`, near(suit.p.shield, plain.p.shield * s.strippedArmour, 0.01));

  const rolls: [number, number, number] = [0.5, 0.5, 0.5];
  for (let x = 0.01; x < 1; x += 0.01) {
    rolls[2] = x;
    if (seanLoot(rolls, false, s.onlyGold).item === null) break;
  }
  const gold = (cards: CardKind[]) => {
    const g = floorOf(77);
    for (const k of cards) takeCard(g.c, g.p, k);
    const i = g.t.chests.findIndex((k) => !k.challenge && k.boss === null);
    g.t.chests[i].rolls = rolls;
    return openChest(g.t, i, g.p, g.c).loot!.coins;
  };
  check(`Prospector: chests give ${Math.round(s.prospector * 100)}% more coins (${gold(['prospector'])} against ${gold([])})`, gold([]) > 0 && near(gold(['prospector']), gold([]) * (1 + s.prospector), 1));
}

section('His deck — every one of the 40 was tried above');
{
  check('all 40 by name in this file', seanCards.length === 40);
}
