// Update 0.2.15 — the Scars (the designer: "Yes, build Scars", from Claude's proposal): a boss's chest (no key any more)
// and a challenge room's offer three; they bounce out and land on the floor in an arc before the chest ("it does not
// get picked up automatically … if you pick one, the other 2 dissapears"); the run's last boss offers none; you carry
// each once, through the floors; their cards, the Lab's offer. What each does: test-scar-moves.ts.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { carryOver, createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { stepTreasure } from '../src/sim/dungeon/treasure';
import { DROP_KINDS, dropItem, takeWaiting, updateDrops } from '../src/sim/items/drops';
import { emptyFocus, focusOf } from '../src/sim/items/focus';
import { infoOf } from '../src/sim/items/itemInfo';
import { runLab } from '../src/sim/lab/labCommands';
import { createPlayer } from '../src/sim/player/state';
import { offerScars, SCAR_FLIGHT, SCAR_FROM } from '../src/sim/scars/scarOffer';
import { hasScar, isScar, SCAR_DOES, SCAR_KINDS, SCAR_MOVE, scarsIn } from '../src/sim/scars/scars';
import { emptyTreasure } from '../src/sim/dungeon/treasure';
import { CINEMA } from '../src/tuning/cinema';
import { ITEMS } from '../src/tuning/items';
import { SCARS } from '../src/tuning/scars';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const offered = (c: ReturnType<typeof createCombat>) => c.drops.filter((d) => d.alive && isScar(d.kind));

/** Floor `floor`'s boss chest opened (`last`: the run's last floor). Returns the run, the fight and you before it. */
function openBossChest(floor: number, last = false, scars = 0) {
  const level = buildDungeon(planFloor(4242, floor));
  const run = createDungeonRun(level, last);
  const c = createCombat(level.arena, false);
  c.items.scars = scars;
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
  return { run, c, p, chest };
}

section('Scars — the boss’s chest offers three');
{
  const { c, p, chest } = openBossChest(1);
  const scars = offered(c);
  const kinds = new Set(scars.map((d) => d.kind));
  check(`opened: ${SCARS.v.offered} Scars come out with its loot, all different`, chest.state === 'open' && scars.length === SCARS.v.offered && kinds.size === scars.length, scars.map((d) => d.kind).join(' '));
  check('they’re thrown out of the chest’s top', scars.every((d) => d.land > 0 && d.from.x === chest.spot.x && d.from.z === chest.spot.z && d.from.y === SCAR_FROM));
  // In the air nothing takes one: stand where one will land and press E.
  const before = c.items.scars;
  const at = createPlayer(scars[0].pos.x, 0, scars[0].pos.z, 0);
  const flying = focusOf(emptyTreasure(), c, at, () => false, emptyFocus());
  check('in the air, none can be taken (nor read)', !takeWaiting(c, at) && c.items.scars === before && !isScar(flying.item ?? ''));
  const landed: string[] = [];
  for (let k = 0; k < ticks(SCAR_FLIGHT) + 1; k++) {
    updateDrops(c, p, DT);
    for (let e = 0; e < c.events.length; e++) landed.push(c.events.at(e).kind);
    c.events.clear();
  }
  const out = scars.map((d) => (d.pos.x - chest.spot.x) * chest.spot.fx + (d.pos.z - chest.spot.z) * chest.spot.fz);
  const apart = Math.min(...scars.map((d, i) => Math.min(...scars.filter((_, j) => j !== i).map((e) => Math.hypot(d.pos.x - e.pos.x, d.pos.z - e.pos.z)))));
  check(`${SCAR_FLIGHT} s later they’ve landed on the floor in an arc before it, well apart, each waiting for E`, scars.every((d) => d.alive && d.land === 0 && d.manual && d.pos.y === 0 && near(Math.hypot(d.pos.x - chest.spot.x, d.pos.z - chest.spot.z), 3, 1e-6)) && out.every((o) => o > 1) && apart > 2 && landed.filter((k) => k === 'scarLand').length === scars.length, `out ${out.map((o) => o.toFixed(2))}, ${apart.toFixed(2)} m apart`);
  check('nor are they picked up by walking over them', scars.every((d) => d.alive) && c.items.scars === before);
  check('standing up from the chest, its heart is nearer than any Scar', focusOf(emptyTreasure(), c, p, () => false, emptyFocus()).item === 'heart');
  // Walk to the middle one: its card, then E.
  const mid = scars.reduce((a, d) => (Math.abs((d.pos.x - chest.spot.x) * chest.spot.fz - (d.pos.z - chest.spot.z) * chest.spot.fx) < Math.abs((a.pos.x - chest.spot.x) * chest.spot.fz - (a.pos.z - chest.spot.z) * chest.spot.fx) ? d : a));
  p.pos.set(mid.pos.x - chest.spot.fx * 0.8, 0, mid.pos.z - chest.spot.fz * 0.8);
  const f = focusOf(emptyTreasure(), c, p, () => false, emptyFocus());
  const kind = mid.kind as (typeof SCAR_KINDS)[number];
  const info = infoOf(kind);
  check('near one, its card: its name, “Scar · the move”, what it does, [E] to pick up', f.item === kind && f.act === 'pick' && info.tag === `Scar · ${SCAR_MOVE[kind]}` && info.rarity === null && info.does === SCAR_DOES[kind]() && info.name.length > 0, `${info.name} — ${info.tag} — ${info.does}`);
  c.events.clear();
  stepTreasure(emptyTreasure(), p, c, true, false, () => false, DT);
  const seen: string[] = [];
  for (let e = 0; e < c.events.length; e++) seen.push(c.events.at(e).kind);
  check('E takes it: yours for the run (and your body knows it next tick)', hasScar(c.items.scars, kind) && hasScar(p.scars, kind) && seen.includes('scar'));
  check('the others fade', offered(c).length === 0 && seen.filter((k) => k === 'scarGone').length === SCARS.v.offered - 1);
  check('the chest’s heart still waits; no key (the designer: Scars instead)', c.drops.some((d) => d.alive && d.manual && d.kind === 'heart') && !c.drops.some((d) => d.alive && d.kind === 'key'));
}
{
  const last = openBossChest(5, true);
  check('the run’s last boss (floor 5 in the alpha) offers none: the run ends there', offered(last.c).length === 0 && last.chest.state === 'open');
  // Carrying all but one: only that one; carrying all: none.
  const all = SCAR_KINDS.reduce((m, _, i) => m | (1 << i), 0);
  const one = openBossChest(2, false, all & ~1);
  check('only Scars you don’t carry are offered', offered(one.c).length === 1 && offered(one.c)[0].kind === SCAR_KINDS[0]);
  check('carrying every one, none', offered(openBossChest(3, false, all).c).length === 0);
}

section('Scars — the challenge room’s chest, and no other');
{
  const level = buildDungeon(planFloor(77, 1));
  const run = createDungeonRun(level);
  const i = level.rooms.findIndex((r) => r.challenge);
  const chests = run.treasure.chests;
  check('a challenge room’s chest and the boss’s offer Scars; a fight room’s gold chest doesn’t', chests[level.rooms[i].chest].scars && chests.filter((ch) => ch.scars).length === 2 && chests.filter((ch) => ch.boss).every((ch) => ch.scars) && chests.some((ch) => !ch.scars));
  const c = createCombat(level.arena, false);
  const ch = chests[level.rooms[i].chest];
  ch.state = 'shut';
  c.items.whiteKeys = 1;
  c.items.keyPick = 'whiteKey';
  const p = createPlayer(ch.spot.x + ch.spot.fx * 1.2, 0, ch.spot.z + ch.spot.fz * 1.2, 0);
  p.grounded = true;
  stepTreasure(run.treasure, p, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + DT); k++) stepTreasure(run.treasure, p, c, false, false, () => false, DT);
  check('opened, three come out with its item', offered(c).length === SCARS.v.offered && c.drops.some((d) => d.alive && d.manual && !isScar(d.kind)));
}

section('Scars — carried down, lost with the run');
{
  const a = createCombat(OPEN_ARENA);
  a.items.scars = 0b101;
  const b = createCombat(OPEN_ARENA);
  carryOver(a, b);
  check('they come down to the next floor with you (with your keys and rings)', b.items.scars === 0b101);
  check('a new run has none', createCombat(OPEN_ARENA).items.scars === 0);
  check('the HUD and pause menu list them in their order', scarsIn(0b101).join(' ') === `${SCAR_KINDS[0]} ${SCAR_KINDS[2]}`);
  check('every Scar can lie on the floor (an index of its own)', SCAR_KINDS.every((k) => DROP_KINDS.indexOf(k) >= 0 && DROP_KINDS.lastIndexOf(k) === DROP_KINDS.indexOf(k)));
  check('each has a card', SCAR_KINDS.every((k) => infoOf(k).does.length > 10 && infoOf(k).tag !== null));
}

section('Scars — the Lab');
{
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  const n = runLab({ kind: 'scars' }, c, p, 0, emptyTreasure());
  const scars = offered(c);
  check(`Offer: ${SCARS.v.offered} bounce out in front of you, as out of a chest`, n === SCARS.v.offered && scars.length === n && scars.every((d) => d.manual && d.land > 0 && d.pos.z < -1));
  runLab({ kind: 'scars' }, c, p, 0, emptyTreasure());
  check('a second Offer takes the first’s place', offered(c).length === SCARS.v.offered);
  const q = createCombat(OPEN_ARENA);
  dropItem(q.drops, 'pogo', new Vector3(0, 0, 0), q.events);
  updateDrops(q, p, DT);
  check('a Scar dropped at your feet is yours as you walk over it', hasScar(q.items.scars, 'pogo') && !q.drops.some((d) => d.alive));
  const r = createCombat(OPEN_ARENA);
  const k = offerScars(r, 0, 0, 0, -1, 7);
  check('an offer draws from the run’s seeded dice', k === SCARS.v.offered && offered(r).map((d) => d.kind).join() === offered((() => {
    const s = createCombat(OPEN_ARENA);
    offerScars(s, 0, 0, 0, -1, 7);
    return s;
  })()).map((d) => d.kind).join());
}
