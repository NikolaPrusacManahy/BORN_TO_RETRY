// Update 0.2.1 — the designer's list: no coins with an epic or mythic chest's item ("too unbalanced for lucky
// players"); a boss's chest gives 15 coins; "every chest located in rooms" rises out of the floor with the view going
// to it; a chest in a normal room where no enemy drops a key (no mini boss) opens without one, and gives gold. And (the
// designer: "an aura around the chests that needs a key, like a gold aura, little bit") a keyed chest glows soft gold.
import * as THREE from 'three';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { AURA_GOLD, AURA_RED } from '../src/engine/chestAura';
import { ChestShot } from '../src/engine/chestShot';
import { TreasureView } from '../src/engine/treasureView';
import { createCombat } from '../src/sim/combat/state';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { chestToOpen, keyless, stepTreasure } from '../src/sim/dungeon/treasure';
import { MINI_BOSSES } from '../src/sim/enemies/kinds';
import { emptyFocus, focusOf } from '../src/sim/items/focus';
import { createPlayer } from '../src/sim/player/state';
import { CINEMA } from '../src/tuning/cinema';
import { ITEMS } from '../src/tuning/items';
import { buildDungeon, DungeonLevel } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const hasMini = (level: DungeonLevel, room: number) => level.rooms[room].waves.some((w) => w.some((k) => MINI_BOSSES.includes(k)));
const keysOf = (c: ReturnType<typeof createCombat>) => c.items.keys + c.items.whiteKeys + c.items.goldKeys;

/** The first floor (from `seed`) with a room chest that's gold (or not). */
function floorWith(gold: boolean, seed = 1) {
  for (;; seed++) {
    const level = buildDungeon(planFloor(seed, 1));
    const i = level.chests.findIndex((s) => !s.boss && s.gold === gold && !level.rooms[s.room].challenge);
    if (i >= 0) return { level, i };
  }
}

section('Chests — every room’s rises; gold where no key drops');
{
  let bad = '';
  let gold = 0;
  let keyed = 0;
  for (let seed = 1; seed <= 300; seed++) {
    for (const floor of [1, 2, 3, 4, 5]) {
      const level = buildDungeon(planFloor(seed, floor));
      for (const s of level.chests) {
        const room = level.rooms[s.room];
        const want = !s.boss && !room.challenge && !hasMini(level, s.room);
        if (!s.rises || s.gate < 0) bad ||= `seed ${seed} floor ${floor}: a chest that doesn't rise`;
        else if (s.gold !== want) bad ||= `seed ${seed} floor ${floor}: room ${s.room} gold ${s.gold}`;
        if (s.gold) gold++;
        else if (!s.boss && !room.challenge) keyed++;
      }
    }
  }
  check('1500 floors: every chest rises; gold exactly where its room has no mini boss (not the challenge’s or the boss’s)', !bad, bad);
  check('both kinds turn up', gold > 0 && keyed > 0, `${gold} gold, ${keyed} with a mini boss`);
}

section('Chests — a room’s rises as it’s won');
{
  const { level, i } = floorWith(true);
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const r = level.chests[i].room;
  const room = level.rooms[r];
  const chest = run.treasure.chests[i];
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  const rng = createRng(5);
  const seen: string[] = [];
  const step = (secs = DT, interact = false) => {
    for (let k = 0; k < ticks(secs); k++) {
      stepTreasure(run.treasure, p, c, interact && k === 0, false, (q) => run.rooms[q].state === 'fighting', DT);
      stepRooms(run, p, c, rng, DT);
      for (let e = 0; e < c.events.length; e++) seen.push(c.events.at(e).kind);
      c.events.clear();
    }
  };
  check('before: not there (buried, not solid), and no CHEST IN CURRENT ROOM !', chest.state === 'buried' && !run.shut[chest.spot.gate] && !chestToOpen(run.treasure, level, p.pos.x, p.pos.z));
  step();
  check('stepping in, it fights; the chest still isn’t there', run.rooms[r].state === 'fighting' && chest.state === 'buried');
  run.rooms[r].sent = run.rooms[r].total;
  for (const e of c.enemies) e.alive = false;
  step();
  check('won: the gates open and its chest starts rising', run.rooms[r].state === 'cleared' && room.gates.every((g) => !run.shut[g]) && seen.includes('gatesOpen') && chest.state === 'rising' && seen.includes('chestRise'));
  const shot = new ChestShot();
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(p.pos.x, 1.6, p.pos.z);
  check('the view goes to it', shot.update(DT, run.treasure, cam) && shot.locked);
  step(ITEMS.v.chestRise + DT);
  check(`up after ${ITEMS.v.chestRise} s`, chest.state === 'shut' && chestToOpen(run.treasure, level, p.pos.x, p.pos.z));
  // A gold chest: no key needed, and the keys you carry stay yours.
  p.pos.set(chest.spot.x + chest.spot.fx * 1.2, 0, chest.spot.z + chest.spot.fz * 1.2);
  c.items.keys = 0;
  check('a gold chest, no key: E opens it', focusOf(run.treasure, c, p, () => false, emptyFocus()).act === 'open');
  c.items.keys = 1;
  c.items.keyPick = 'key';
  const money = c.money;
  step(DT, true);
  check('E opens it without using your key', chest.state === 'opening' && chest.key === null && keysOf(c) === 1);
  step(ITEMS.v.chestTime + DT);
  const coins = c.money + c.coins.filter((q) => q.alive).length - money;
  // (Update 0.2.20 — the designer: "reduce the amount of gold in chest by x2": times Chest gold.)
  const amounts = [ITEMS.v.coins1, ITEMS.v.coins2, ITEMS.v.coins3, ITEMS.v.coins4].map((n) => Math.round(n * ITEMS.v.chestGold));
  check('it gives gold only: one of the four amounts, no item', chest.state === 'open' && chest.loot!.item === null && amounts.includes(coins) && !c.drops.some((d) => d.alive && d.manual), `${coins} coins`);
}
{
  // A room with a mini boss: its chest still needs a key (the mini boss drops it).
  const { level, i } = floorWith(false);
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const chest = run.treasure.chests[i];
  chest.state = 'shut';
  const p = createPlayer(chest.spot.x + chest.spot.fx * 1.2, 0, chest.spot.z + chest.spot.fz * 1.2, 0);
  p.grounded = true;
  c.items.keys = c.items.whiteKeys = c.items.goldKeys = 0;
  check('a room with a mini boss: its chest needs a key', hasMini(level, chest.spot.room) && focusOf(run.treasure, c, p, () => false, emptyFocus()).act === 'locked');
}

section('Chests — a boss’s gives 15 coins');
{
  check('the Dragon’s and the Bone King’s chests: 15 coins', bossCoins('dragon') === 15 && bossCoins('boneKing') === 15);
  const level = buildDungeon(planFloor(4242, 1));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
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
  const money = c.money;
  stepTreasure(run.treasure, p, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  const coins = c.money + c.coins.filter((q) => q.alive).length - money;
  // (Update 0.2.20 — halved: 7.5, a half coin one more half the time.)
  check(`opened, ${15 * ITEMS.v.chestGold} coins come out (Chest gold ×${ITEMS.v.chestGold})`, chest.state === 'open' && Math.abs(coins - 15 * ITEMS.v.chestGold) <= 0.5, `${coins}`);
}

section('Chests — a keyed chest’s gold aura');
{
  const { level } = floorWith(false);
  const run = createDungeonRun(level);
  const t = run.treasure;
  const view = new TreasureView(new THREE.Scene(), t, false);
  const model = new THREE.Group();
  for (const name of ['item_chestBase', 'item_chestLid']) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1));
    m.name = name;
    model.add(m);
  }
  view.attach(model);
  const c = createCombat(level.arena, false);
  for (const chest of t.chests) chest.state = 'shut';
  view.update(c, new THREE.Vector3(), DT);
  // Each chest's body: the group at its spot; its aura, the group in it with a sprite.
  const auraOf = (i: number) => {
    const s = t.chests[i].spot;
    const root = view.group.children.find((o) => o instanceof THREE.Group && Math.abs(o.position.x - s.x) < 0.1 && Math.abs(o.position.z - s.z) < 0.1)!;
    return root.children.find((o) => o.children.some((k) => k instanceof THREE.Sprite))!;
  };
  const keyed = t.chests.map((ch, i) => ({ ch, i })).filter(({ ch }) => !keyless(ch) && !ch.challenge);
  const free = t.chests.map((ch, i) => ({ ch, i })).filter(({ ch }) => keyless(ch));
  const hard = t.chests.map((ch, i) => ({ ch, i })).filter(({ ch }) => ch.challenge);
  check(`shut, every chest a key opens glows; a gold chest and the boss’s don’t (${keyed.length} and ${free.length})`, keyed.length > 0 && free.length > 0 && keyed.every(({ i }) => auraOf(i).visible) && free.every(({ i }) => !auraOf(i).visible));
  const haloOf = (i: number) => (auraOf(i).children.find((k) => k instanceof THREE.Sprite) as THREE.Sprite).material;
  const glow = haloOf(keyed[0].i);
  // (Update 0.3.27 — the designer: "Make Gold aura and red aura on chest better visually, more visible and impressive":
  // stronger, and a column of light, rings across the floor and motes.)
  const parts = auraOf(keyed[0].i).children;
  check('gold, and strong now: a halo, a column of light, rings running out, motes rising', glow.color.getHex() === AURA_GOLD && glow.opacity > 0.5 && parts.some((k) => k instanceof THREE.Points) && parts.filter((k) => k instanceof THREE.Mesh).length >= 4, `${glow.opacity}`);
  // (Update 0.3.27 — the designer: "challenge room chest have now a Red aura on them".)
  check(`a challenge room’s chest glows red (${hard.length})`, hard.length === 1 && auraOf(hard[0].i).visible && haloOf(hard[0].i).color.getHex() === AURA_RED);
  check('it casts no shadow', !auraOf(keyed[0].i).children.some((k) => k.castShadow));
  keyed[0].ch.state = 'opening';
  keyed[0].ch.t = ITEMS.v.chestTime * 0.7;
  view.update(c, new THREE.Vector3(), DT);
  check('as the lid lifts, it fades away', !auraOf(keyed[0].i).visible);
  keyed[0].ch.state = 'buried';
  view.update(c, new THREE.Vector3(), DT);
  const s0 = keyed[0].ch.spot;
  const root = view.group.children.find((o) => o instanceof THREE.Group && Math.abs(o.position.x - s0.x) < 0.1 && Math.abs(o.position.z - s0.z) < 0.1);
  check('buried, nothing shows', !!root && !root.visible);
}
