// Update 0.2.0 — the designer's list: "always 1 challenge room in each floor"; "if a room leads nowhere … it should be
// a challenge room"; "players aren't allowed to leave the challenge room without taking their hard earned rewards …
// the camera pans where the chest emerges from the ground and comes back to the player"; "bosses no longer drop the
// rewards right away, instead a chest spawns 3 m away from the exit gate"; "CHEST IN CURRENT ROOM !" under the map;
// "executions now heal 15 HP, mini bosses give 25"; the Spitter's voice 65% quieter.
import * as THREE from 'three';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { MIX } from '../src/audio/clipPicks';
import { ChestShot, GLIDE } from '../src/engine/chestShot';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { EXECUTABLE } from '../src/sim/combat/execMoves';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { chestToOpen, stepTreasure, Treasure } from '../src/sim/dungeon/treasure';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { MINI_BOSSES } from '../src/sim/enemies/kinds';
import { dropItem } from '../src/sim/items/drops';
import { emptyFocus, focusOf } from '../src/sim/items/focus';
import { createPlayer } from '../src/sim/player/state';
import { pickCard } from '../src/sim/cards/deal';
import { CINEMA } from '../src/tuning/cinema';
import { EXECUTION } from '../src/tuning/execution';
import { ITEMS } from '../src/tuning/items';
import { BOSS_CHEST_OUT, buildDungeon, ChestSpot } from '../src/world/dungeon/assemble';
import { CELL, planFloor } from '../src/world/dungeon/floorPlan';

const isKey = (k: string) => k === 'key' || k === 'whiteKey' || k === 'goldKey';
const keysOf = (c: ReturnType<typeof createCombat>) => c.items.keys + c.items.whiteKeys + c.items.goldKeys;

section('Challenge rooms — always one, and the only dead end');
{
  let bad = '';
  for (let seed = 1; seed <= 300; seed++) {
    for (const floor of [1, 2, 3, 4, 5]) {
      const plan = planFloor(seed, floor);
      const links = plan.rooms.map(() => 0);
      for (const [a, b] of plan.links) {
        links[a]++;
        links[b]++;
      }
      const ch = plan.rooms.filter((r) => r.challenge).length;
      const dead = plan.rooms.filter((r, i) => r.kind === 'fight' && links[i] === 1);
      if (ch !== 1) bad ||= `seed ${seed} floor ${floor}: ${ch} challenge rooms`;
      else if (dead.some((r) => !r.challenge)) bad ||= `seed ${seed} floor ${floor}: a fight room that leads nowhere isn't the challenge`;
    }
  }
  check('1500 floors: one challenge room on each, and every fight room that leads nowhere is it', !bad, bad);
}

section('Challenge rooms — won, they hold you till the reward is yours');
{
  const level = buildDungeon(planFloor(77, 1));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const i = level.rooms.findIndex((r) => r.challenge);
  const room = level.rooms[i];
  const chest = run.treasure.chests[room.chest];
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  const rng = createRng(5);
  const seen: string[] = [];
  const step = (secs = DT, interact = false) => {
    for (let k = 0; k < ticks(secs); k++) {
      stepTreasure(run.treasure, p, c, interact && k === 0, false, (r) => run.rooms[r].state === 'fighting', DT);
      stepRooms(run, p, c, rng, DT);
      for (let e = 0; e < c.events.length; e++) seen.push(c.events.at(e).kind);
      c.events.clear();
    }
  };
  check('its chest isn’t there before (buried, not solid)', chest.state === 'buried' && !run.shut[chest.spot.gate] && !chestToOpen(run.treasure, level, p.pos.x, p.pos.z));
  step();
  check('stepping in, it fights', run.rooms[i].state === 'fighting');
  // Every enemy sent and dead; a key of its lies on the floor; its other was never dropped.
  run.rooms[i].sent = run.rooms[i].total;
  for (const e of c.enemies) e.alive = false;
  dropItem(c.drops, 'whiteKey', new Vector3(p.pos.x + 3, 0, p.pos.z), c.events);
  c.keyDrops = 1;
  const keys = keysOf(c);
  step();
  check('won: its gates stay shut, its chest starts rising (the view goes to it)', run.rooms[i].state === 'reward' && room.gates.every((g) => run.shut[g]) && chest.state === 'rising' && seen.includes('chestRise') && !seen.includes('gatesOpen'));
  check('its keys are yours: the one lying there, and one it never dropped', keysOf(c) === keys + 2 && !c.drops.some((d) => d.alive && isKey(d.kind)) && c.keyDrops === 0);
  check('CHEST IN CURRENT ROOM ! while it rises', chestToOpen(run.treasure, level, p.pos.x, p.pos.z));
  step(ITEMS.v.chestRise + DT);
  check(`up after ${ITEMS.v.chestRise} s, and solid; the gates still shut`, chest.state === 'shut' && run.shut[chest.spot.gate] && room.gates.every((g) => run.shut[g]));
  // Open it (a white key). (Update 0.2.16 — a challenge room's chest deals Fate Cards in place of its item; Update
  // 0.2.25 — the designer: "in challenge room, you get loot and also cards guaranteed".)
  c.items.keyPick = 'whiteKey';
  p.pos.set(chest.spot.x + chest.spot.fx * 1.2, 0, chest.spot.z + chest.spot.fz * 1.2);
  step(DT, true);
  check('E opens it', chest.state === 'opening');
  step(ITEMS.v.chestTime + DT);
  p.kneel = 0;
  const waiting = () => c.drops.some((d) => d.alive && d.manual);
  check('open, it deals Fate Cards and gives its loot: the gates still shut', chest.state === 'open' && !!c.deal && (waiting() || (chest.loot?.coins ?? 0) > 0) && room.gates.every((g) => run.shut[g]) && !chestToOpen(run.treasure, level, p.pos.x, p.pos.z));
  pickCard(c, p, 0);
  step();
  check('a card taken, its item still waiting: still shut', !c.deal && c.items.cards.size === 1 && (!waiting() || (run.rooms[i].state === 'reward' && room.gates.every((g) => run.shut[g]))));
  // (Its item taken with E.)
  for (const d of c.drops) if (d.alive && d.manual) d.alive = false;
  step();
  check('and its item taken: the gates open', run.rooms[i].state === 'cleared' && room.gates.every((g) => !run.shut[g]) && seen.includes('gatesOpen'));
}
{
  // Never shut in for nothing: no key to open it with; or not in the room (the lava took you to the floor's start).
  for (const how of ['no key', 'outside'] as const) {
    const level = buildDungeon(planFloor(203, 2));
    const run = createDungeonRun(level);
    const c = createCombat(level.arena, false);
    const i = level.rooms.findIndex((r) => r.challenge);
    const room = level.rooms[i];
    const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
    stepRooms(run, p, c, createRng(1), DT);
    run.rooms[i].sent = run.rooms[i].total;
    for (const e of c.enemies) e.alive = false;
    c.keyDrops = 0;
    stepRooms(run, p, c, createRng(1), DT);
    if (how === 'no key') c.items.keys = c.items.whiteKeys = c.items.goldKeys = 0;
    else p.pos.set(level.arena.playerStart.x, 0, level.arena.playerStart.z);
    for (let k = 0; k < ticks(ITEMS.v.chestRise + 0.1); k++) {
      stepTreasure(run.treasure, p, c, false, false, () => false, DT);
      stepRooms(run, p, c, createRng(1), DT);
    }
    check(how === 'no key' ? 'no key at all to open it: the gates open' : 'not in the room any more: the gates open', run.rooms[i].state === 'cleared' && room.gates.every((g) => !run.shut[g]));
  }
}
{
  // A rising chest isn't made solid on top of you.
  const level = buildDungeon(planFloor(77, 1));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const i = level.rooms.findIndex((r) => r.challenge);
  const chest = run.treasure.chests[level.rooms[i].chest];
  const p = createPlayer(chest.spot.x, 0, chest.spot.z, 0);
  run.rooms[i].state = 'reward';
  chest.state = 'shut';
  stepRooms(run, p, c, createRng(1), DT);
  const onIt = run.shut[chest.spot.gate];
  p.pos.x += 3;
  p.pos.z += 3;
  stepRooms(run, p, c, createRng(1), DT);
  check('a risen chest stays soft while you stand in it, solid once you’re clear', !onIt && run.shut[chest.spot.gate]);
}

section('The boss’s chest');
{
  const level = buildDungeon(planFloor(4242, 1));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const b = level.boss;
  const room = level.rooms[b.room];
  const chest = run.treasure.chests[room.chest];
  const g = b.gateAt;
  check('it stands in front of the wooden gate, facing into the room', chest.boss === 'demon' && chest.spot.rises && near(Math.hypot(chest.spot.x - g.x, chest.spot.z - g.z), CELL / 2 + BOSS_CHEST_OUT, 1e-9) && chest.spot.fx === -g.ox && chest.spot.fz === -g.oz && chest.state === 'buried');
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  // The boss is dead and the gate's wait is over.
  run.rooms[b.room].state = 'fighting';
  run.boss.beat = 'loot';
  run.boss.t = CINEMA.v.gateDelay;
  stepRooms(run, p, c, createRng(1), DT);
  check(`it rises as the gate opens, ${BOSS_CHEST_OUT} m in front of it`, !run.shut[b.gate] && chest.state === 'rising');
  for (let k = 0; k < ticks(ITEMS.v.chestRise + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  p.pos.set(chest.spot.x + chest.spot.fx * 1.2, 0, chest.spot.z + chest.spot.fz * 1.2);
  c.items.keys = c.items.whiteKeys = c.items.goldKeys = 0;
  const f = focusOf(run.treasure, c, p, () => false, emptyFocus());
  check('no key needed: E opens it', f.act === 'open');
  const money = c.money;
  stepTreasure(run.treasure, p, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  // (Update 0.2.15 — no key any more, the designer: "the chest on a boss won does not give a key anymore, it gives
  // scars"; Update 0.2.16 — it deals Fate Cards: test-cards.ts.)
  const items = c.drops.filter((d) => d.alive && d.manual);
  const coins = c.money + c.coins.filter((q) => q.alive).length - money;
  check('opened: its coins burst out, and its heart waits over it (no key)', chest.state === 'open' && coins > 0 && items.length === 1 && items[0].kind === 'heart' && near(items[0].pos.x, chest.spot.x, 1e-6) && near(items[0].pos.z, chest.spot.z, 1e-6), `${coins} coins, ${items.map((d) => d.kind)}`);
}

section('Executions heal');
{
  const execute = (kind: 'snake' | 'spider', dist: number) => {
    const c = createCombat(OPEN_ARENA);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    p.hp = 40;
    c.execution = 1;
    const s = spawnEnemy(c.enemies, kind, new Vector3(0, 0, -dist), 0);
    c.enemies[s].frozen = 99;
    const intent = emptyCombatIntent();
    const world = new FlatWorld();
    stepCombat(c, p, intent, world, DT);
    const target = c.execTarget === s;
    intent.interactPressed = true;
    stepCombat(c, p, intent, world, DT);
    intent.interactPressed = false;
    for (let k = 0; k < ticks(6) && c.exec.active; k++) {
      stepCombat(c, p, intent, world, DT);
      c.events.clear();
      c.hitStop.remaining = 0;
      p.hurtTime = 0;
    }
    return { target, hp: p.hp, dead: c.enemies[s].phase === 'dead' || !c.enemies[s].alive };
  };
  const snake = execute('snake', 1.8);
  check(`an execution heals ${EXECUTION.v.heal}`, snake.target && snake.dead && snake.hp === 40 + EXECUTION.v.heal, `${snake.hp}`);
  check('the spider is a mini boss you can execute', MINI_BOSSES.includes('spider') && EXECUTABLE.includes('spider'));
  const spider = execute('spider', 2.2);
  check(`a mini boss’s heals ${EXECUTION.v.healBig}`, spider.target && spider.dead && spider.hp === 40 + EXECUTION.v.healBig, `${spider.target} ${spider.hp}`);
}

section('The view goes to a rising chest and back');
{
  const spot: ChestSpot = { room: 0, x: 10, z: 5, rot: 0, fx: 0, fz: 1, rises: true, boss: false, gate: -1, gold: false };
  const chest = { spot, state: 'rising', t: 0, rolls: [0, 0, 0], key: null, loot: null, given: false, boss: null, cards: false, challenge: false } as Treasure['chests'][number];
  const t: Treasure = { shop: -1, offers: [], chests: [chest], choosing: -1 };
  const shot = new ChestShot();
  const cam = new THREE.PerspectiveCamera();
  const at = () => cam.position.clone();
  cam.position.set(0, 1.6, 0);
  const took = shot.update(0.01, t, cam);
  check('a chest rising: the view leaves your eyes, and you’re held', took && shot.locked && at().distanceTo(new Vector3(0, 1.6, 0)) < 0.2);
  cam.position.set(0, 1.6, 0);
  shot.update(GLIDE + 0.2, t, cam);
  const there = at();
  const dir = new Vector3();
  cam.getWorldDirection(dir);
  const toChest = new Vector3(10, 0.45, 5).sub(there).normalize();
  check('then it’s in front of the chest, above it, looking at it', near(there.x, 10, 1e-6) && there.z > 5 + 3 && there.y > 2 && dir.dot(toChest) > 0.999);
  cam.position.set(0, 1.6, 0);
  let n = 0;
  while (shot.update(0.05, t, cam) && n < 400) {
    cam.position.set(0, 1.6, 0);
    n++;
  }
  check(`back in your eyes after ${ChestShot.duration().toFixed(1)} s, and you’re free`, !shot.locked && near(n * 0.05 + GLIDE + 0.21, ChestShot.duration(), 0.1));
  check('not twice for the same chest', !shot.update(0.05, t, cam));
  const boss = { ...chest, boss: 'demon' } as Treasure['chests'][number];
  check('not for the boss’s chest (the wooden gate’s shot shows it)', !new ChestShot().update(0.05, { ...t, chests: [boss] }, cam));
}

section('The Spitter’s voice');
{
  check('65% quieter (its gurgle)', near(MIX.spitterWindup!.gain, 0.5 * 0.35, 1e-9));
}
