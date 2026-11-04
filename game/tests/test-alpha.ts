// Update 0.2.12 — the alpha (the designer: "allow room 1 to 5 only"; the Pistol 60 rounds and uncommon; the Grimoire 50
// charges; the difficulties; checkpoints): going into a fight room saves a checkpoint outside the door you came in by,
// facing in; lava sends you there; a boss fight you died in starts over; on ARE YOU EVEN HUMAN? (`bare`) a kill gives
// nothing but the meter, no chest rises, a room gives no keys or bonuses and the challenge room no reward.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { endsRun, LAST_FLOOR } from '../src/engine/runLinks';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { abandonAll, doorSpot, resetBossFight } from '../src/sim/dungeon/checkpoint';
import { lavaStep } from '../src/sim/dungeon/lava';
import { createDungeonRun, roomAt, stepRooms } from '../src/sim/dungeon/roomLoop';
import { raiseChest } from '../src/sim/dungeon/treasure';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { rarityOf } from '../src/sim/items/itemInfo';
import { takeItem } from '../src/sim/items/items';
import { createPlayer } from '../src/sim/player/state';
import { WEAPON_STATS } from '../src/sim/weapons/catalog';
import { GUN } from '../src/tuning/gun';
import { WEAPONS } from '../src/tuning/weapons';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';

section('Alpha — floors 1 to 5, the Pistol, the Grimoire');
{
  // (Update 0.3.11 — floor 6 is in.)
  // (Update 0.3.25 — the floors reordered: Skull Cove floor 7, Frozen Depths in at 4.)
  check('Skull Cove’s way down ends the run (floor 7): no floor 8 yet', LAST_FLOOR === 7 && LAST_FLOOR === FLOOR.cove && endsRun(7) && !endsRun(6));
  check(`the Pistol: ${GUN.v.pistolRounds} rounds, uncommon (in uncommon chests)`, GUN.v.pistolRounds === 60 && WEAPON_STATS.pistol().uses === 60 && rarityOf('pistol') === 'uncommon');
  const c = createCombat(buildDungeon(planFloor(3, 1)).arena);
  const p = createPlayer(0, 0, 0, 0);
  takeItem('pistol', p, c);
  check('one out of a chest is in your hand, loaded', c.weapon?.kind === 'pistol' && c.weapon.uses === 60 && c.weapon.mag === Math.round(GUN.v.pistolMag));
  check(`the Grimoire: ${WEAPONS.v.grimoireUses} charges`, WEAPONS.v.grimoireUses === 50 && WEAPON_STATS.grimoire().uses === 50);
}

/** Floor 1 of run `seed`: its run, its combat, you just inside its first fight room by the door nearest its start. */
function inFirstRoom(seed: number) {
  const level = buildDungeon(planFloor(seed, 1));
  const run = createDungeonRun(level);
  const c = createCombat(level.arena);
  c.rng = createRng(seed);
  const i = level.rooms.findIndex((r) => r.kind === 'fight');
  const room = level.rooms[i];
  const start = level.arena.playerStart;
  let best = room.gates[0];
  for (const g of room.gates) if (Math.hypot(level.gates[g].x - start.x, level.gates[g].z - start.z) < Math.hypot(level.gates[best].x - start.x, level.gates[best].z - start.z)) best = g;
  const gate = level.gates[best];
  const mx = (room.min.x + room.max.x) / 2;
  const mz = (room.min.z + room.max.z) / 2;
  const len = Math.hypot(mx - gate.x, mz - gate.z);
  const p = createPlayer(gate.x + ((mx - gate.x) / len) * 3, 0, gate.z + ((mz - gate.z) / len) * 3, 0);
  return { level, run, c, p, i, gate, mid: { x: mx, z: mz } };
}

section('Alpha — checkpoints');
{
  let bad = '';
  for (let seed = 1; seed <= 20; seed++) {
    const f = inFirstRoom(seed);
    stepRooms(f.run, f.p, f.c, f.c.rng, 1 / 60);
    const cp = f.run.checkpoint;
    if (f.run.rooms[f.i].state !== 'fighting' || !cp) {
      bad ||= `seed ${seed}: no fight, no checkpoint`;
      continue;
    }
    const facing = (-Math.sin(cp.yaw) * (f.mid.x - cp.x) - Math.cos(cp.yaw) * (f.mid.z - cp.z)) / Math.hypot(f.mid.x - cp.x, f.mid.z - cp.z);
    if (roomAt(f.run, cp.x, cp.z) >= 0) bad ||= `seed ${seed}: the checkpoint is inside a room`;
    else if (Math.hypot(cp.x - f.gate.x, cp.z - f.gate.z) > 4) bad ||= `seed ${seed}: not by the door you came in by`;
    else if (facing < 0.7) bad ||= `seed ${seed}: not facing the room (${facing.toFixed(2)})`;
  }
  check('going into a fight room saves a checkpoint: outside the door you came in by, facing in', !bad, bad);
  const f = inFirstRoom(7);
  stepRooms(f.run, f.p, f.c, f.c.rng, 1 / 60);
  const cp = f.run.checkpoint!;
  const lava = [{ x: f.p.pos.x, y: -2, z: f.p.pos.z, w: 4, h: 1, d: 4, kind: 'lava' as const }];
  f.p.pos.y = -1.4;
  const back = lavaStep(f.p, lava, cp, f.run, f.c);
  check('in the lava, you’re burnt and sent back to it; the fight there starts over', back && f.p.pos.x === cp.x && f.p.pos.z === cp.z && f.run.rooms[f.i].state === 'idle' && f.level.rooms[f.i].gates.every((g) => !f.run.shut[g]));
  const a = inFirstRoom(9);
  stepRooms(a.run, a.p, a.c, a.c.rng, 1 / 60);
  spawnEnemy(a.c.enemies, 'grunt', new Vector3(a.mid.x, 0, a.mid.z), 0);
  abandonAll(a.run, a.c);
  check('respawning (WEAKLING), the fight you died in stops: its enemies gone, its gates open', a.run.rooms[a.i].state === 'idle' && a.c.enemies.every((e) => !e.alive) && a.level.rooms[a.i].gates.every((g) => !a.run.shut[g]));
  const bossRoom = a.level.rooms.findIndex((r) => r.kind === 'boss');
  a.run.boss.beat = 'fight';
  a.run.boss.slot = spawnEnemy(a.c.enemies, 'dragon', new Vector3(0, 0, 0), 0);
  a.run.rooms[bossRoom].state = 'fighting';
  for (const g of a.level.rooms[bossRoom].gates) a.run.shut[g] = true;
  resetBossFight(a.run, a.c);
  const boss = a.run.boss;
  const room = a.run.rooms[bossRoom];
  check('a boss fight you died in starts over: the boss gone, its room open, its show to come again; the way down still shut', boss.beat === 'waiting' && boss.slot === -1 && a.c.enemies.every((e) => !e.alive) && room.state === 'idle' && a.level.rooms[bossRoom].gates.every((g) => !a.run.shut[g]) && a.run.shut[a.level.boss.gate]);
  check('(a checkpoint is where its door is)', doorSpot(a.run, bossRoom, a.p).y === 0);
}

section('Alpha — ARE YOU EVEN HUMAN?: just fists, nothing else');
{
  const kill = (bare: boolean) => {
    const c = createCombat(buildDungeon(planFloor(5, 1)).arena);
    c.rng = createRng(1);
    c.bare = bare;
    c.keyDrops = 1;
    const i = spawnEnemy(c.enemies, 'brute', new Vector3(0, 0, -2), 0);
    const t = emptyTargetHit();
    t.kind = 'enemy';
    t.index = i;
    t.point.set(0, 1, -2);
    landHit(c, t, 1e6, 0, 0, -1, 'hitHeavy', 1);
    return c;
  };
  const plain = kill(false);
  const bare = kill(true);
  check('a kill gives no coins, no key, no drop (the meter still fills)', plain.money + plain.coins.filter((k) => k.alive).length > 0 && bare.money === 0 && bare.coins.every((k) => !k.alive) && bare.drops.every((d) => !d.alive) && bare.execution > 0);
  const f = inFirstRoom(4);
  f.c.bare = true;
  stepRooms(f.run, f.p, f.c, f.c.rng, 1 / 60);
  check('a room gives no keys and no bonuses', f.c.keyDrops === 0 && f.c.bonusDrops === 0);
  const chest = f.run.treasure.chests.findIndex((ch) => ch.state === 'buried');
  raiseChest(f.run.treasure, chest, f.c);
  check('no chest ever rises', chest < 0 || f.run.treasure.chests[chest].state === 'buried');
}
