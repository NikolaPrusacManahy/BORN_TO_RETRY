// Update 0.3.24 — floors load faster (the designer: "Yes, do it"): each level loads only the enemy models it can
// bring in (sim/dungeon/floorKinds.ts): every kind its rooms send, its boss and whom it calls, its hives' Wasps, what any
// of them becomes or lets out; the Lab every one, the lobby none. Nothing a floor can put in front of you is left out.
import { readFileSync, readdirSync } from 'node:fs';
import { check, section } from './harness';
import { BRINGS, floorKinds, levelKinds } from '../src/sim/dungeon/floorKinds';
import { calledBy } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { ENEMY_KINDS, bossOf } from '../src/sim/enemies/kinds';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

section('Floor kinds — each floor loads what it can bring in');
{
  let missing = '';
  let most = 0;
  // (Floors 9 and 10 have no rooms yet.)
  for (let floor = 1; floor <= 8; floor++) {
    for (let seed = 1; seed <= 4; seed++) {
      const run = createDungeonRun(buildDungeon(planFloor(seed, floor)));
      const kinds = new Set(floorKinds(run));
      most = Math.max(most, kinds.size);
      const sent = run.level.rooms.flatMap((r) => r.waves.flat());
      const need = [...sent, run.boss.kind, ...(calledBy(run.boss.kind) ? [calledBy(run.boss.kind)!] : []), ...(run.level.hives.length ? ['wasp' as const] : [])];
      for (const k of need) {
        if (!kinds.has(k)) missing ||= `floor ${floor}: ${k}`;
        for (const b of BRINGS[k] ?? []) if (!kinds.has(b)) missing ||= `floor ${floor}: ${b} (from ${k})`;
      }
      if (!kinds.has(bossOf(floor))) missing ||= `floor ${floor}: its boss`;
    }
  }
  check('every kind its rooms send, its boss and whom it calls, its hives’ Wasps, and what they become or let out', missing === '', missing);
  check(`a floor loads ${most} kinds at most (of ${ENEMY_KINDS.length})`, most <= 16, `${most}`);
  const six = new Set(floorKinds(createDungeonRun(buildDungeon(planFloor(2, 6)))));
  const eight = new Set(floorKinds(createDungeonRun(buildDungeon(planFloor(2, 8)))));
  check('the Cursed Crewman brings his headless self, the Bee mech Barbara', (!six.has('crewman') || six.has('headless')) && (!eight.has('beeMech') || eight.has('beeNaut')));
  check('floor 7 loads its warband, no one else’s', [...new Set(floorKinds(createDungeonRun(buildDungeon(planFloor(3, 7)))))].every((k) => rosterOf(7).includes(k) || k === bossOf(7)));
}

section('Floor kinds — the Lab and the lobby');
{
  check('the Lab loads every enemy (any can be called up there)', levelKinds(true, createDungeonRun(buildDungeon(planFloor(1, 3))), false).length === ENEMY_KINDS.length && levelKinds(true, null, false).length === ENEMY_KINDS.length);
  check('the lobby none', levelKinds(false, null, true).length === 0);
  // (What an enemy lets out at runtime: every kind spawned by another's moves is in BRINGS.)
  const dir = new URL('../src/sim/enemies/', import.meta.url);
  const spawned = readdirSync(dir).flatMap((f) => [...readFileSync(new URL(f, dir), 'utf8').matchAll(/spawnEnemy\(w\.enemies, '(\w+)'/g)].map((m) => m[1]));
  const brought = new Set(Object.values(BRINGS).flat());
  check('every kind an enemy lets out is brought with it', spawned.length >= 3 && spawned.every((k) => brought.has(k as never)), spawned.join(', '));
}
