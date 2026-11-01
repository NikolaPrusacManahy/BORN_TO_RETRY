// Update 0.2.25 — how well enemies get across each fight room (the designer: on floor 3 "many enemies can't navigate
// through this room or any room with a lot of these blocks or pillars"): for each room of the floors asked for, a few of
// each kind start at the room's spawn spots and chase you standing still at the far side for a while; it prints, per
// room, how many reached you (within 3 m), and the kinds that didn't.
//   npx tsx tools/nav-probe.ts [floors, e.g. 1,2,3] [seconds]
import { initPhysics, RapierWorld } from '../src/physics/rapierWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { createPlayer } from '../src/sim/player/state';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FIGHT_ROOMS, onFloor } from '../src/world/dungeon/rooms';
import { Vector3 } from 'three';

await initPhysics();
const floors = (process.argv[2] ?? '3').split(',').map(Number);
const secs = Number(process.argv[3] ?? 12);
const DT = 1 / 60;
const RANGED = new Set(['dragonling', 'skullWraith', 'frog', 'rabbit', 'spitter', 'wraith', 'stinger', 'wasp', 'tribal', 'hywirl', 'snapper', 'glub', 'bigGlub', 'squidle', 'deepOne']);
const BOSSY = new Set(['dragon', 'demon', 'boneKing', 'dino', 'drownedKing', 'whale']);

for (const floor of floors) {
  const kinds = rosterOf(floor).filter((k) => !BOSSY.has(k));
  for (const t of FIGHT_ROOMS.filter((r) => onFloor(r, floor))) {
    let seed = 1;
    while (seed < 400 && !planFloor(seed, floor).rooms.some((r) => r.layout.template.id === t.id)) seed++;
    const level = buildDungeon(planFloor(seed, floor));
    const i = level.plan.rooms.findIndex((r) => r.layout.template.id === t.id);
    const room = level.rooms[i];
    const run = createDungeonRun(level);
    const combat = createCombat(level.arena, false);
    const world = new RapierWorld(level.arena);
    // You at the room's middle (in it: its fight starts, its grid is made); then no waves of its own.
    const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
    p.grounded = true;
    stepRooms(run, p, combat, createRng(1), DT);
    world.setGates(run.shut);
    for (const e of combat.enemies) e.alive = false;
    // You stand in a corner; they start at the spots furthest from you.
    p.pos.set(room.inMin.x + 1, 0, room.inMin.z + 1);
    const spots = [...room.spawns].sort((a, b) => Math.hypot(b.x - p.pos.x, b.z - p.pos.z) - Math.hypot(a.x - p.pos.x, a.z - p.pos.z));
    const slots: number[] = [];
    kinds.forEach((k, n) => {
      for (let j = 0; j < 2; j++) {
        const s = spots[(n * 2 + j) % spots.length];
        const slot = spawnEnemy(combat.enemies, k, new Vector3(s.x, s.y, s.z), 0);
        if (slot >= 0) slots.push(slot);
      }
    });
    const best = new Map<number, number>();
    for (let k = 0; k < secs / DT; k++) {
      p.hp = 100;
      p.hurtTime = 1;
      p.invuln = 1;
      updateEnemies(combat.enemies, p, combat, world, DT);
      combat.events.clear();
      combat.orbs.forEach((o) => (o.alive = false));
      for (const s of slots) {
        const e = combat.enemies[s];
        if (!isLive(e)) continue;
        const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
        best.set(s, Math.min(best.get(s) ?? Infinity, d));
      }
    }
    // (Each kind by how near it keeps: within 3 m, or within its own reach for the ones that shoot.)
    const stuck = slots.filter((s) => (best.get(s) ?? Infinity) > (RANGED.has(combat.enemies[s].kind) ? 16 : 3));
    const names = [...new Set(stuck.map((s) => combat.enemies[s].kind))];
    console.log(`floor ${floor} ${t.id.padEnd(20)} reached ${slots.length - stuck.length}/${slots.length}${names.length ? `  stuck: ${names.join(', ')}` : ''}`);
  }
}
