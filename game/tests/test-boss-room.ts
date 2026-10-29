// Update 0.0.15 — the boss room (the designer: the show as you step in; the boss's death; the wooden gate onto the
// dark). The show starts as you step in, the walls slide back, the boss rises out of the portal and the fight starts
// at the show's end; it calls grunts once it rages; killed, its grunts die too, it leaves a key, a heart and coins,
// the wooden gate opens and the dark ends the floor.
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { hitEnemy, isLive } from '../src/sim/enemies/enemy';
import { doomTime } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { inShow, introBeats, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { createPlayer } from '../src/sim/player/state';
import { BOSS } from '../src/tuning/boss';
import { CINEMA } from '../src/tuning/cinema';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = BOSS.v;

section('Boss room');
{
  const level = buildDungeon(planFloor(4242, 1));
  const b = level.boss;
  const room = level.rooms[b.room];
  check('the way ends in the boss room', room.kind === 'boss' && room.depth === 6);
  const startArea = (b.start.max.x - b.start.min.x) * (b.start.max.z - b.start.min.z);
  const endArea = (b.end.max.x - b.end.min.x) * (b.end.max.z - b.end.min.z);
  check(`you walk into a smaller room (${Math.round(startArea)} m²) that grows (${Math.round(endArea)} m²)`, startArea < endArea * 0.5);
  check('the portal is in its middle', near(b.portal.x, (room.min.x + room.max.x) / 2, 1e-9) && near(b.portal.z, (room.min.z + room.max.z) / 2, 1e-9));
  const run0 = createDungeonRun(level);
  check('the wooden gate is shut from the start', run0.shut[b.gate] && run0.shut.filter(Boolean).length === 1);

  const combat = createCombat(level.arena, false);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const rng = createRng(3);
  const seen: string[] = [];
  const tick = (secs: number, each?: () => void) => {
    for (let i = 0; i < ticks(secs); i++) {
      each?.();
      stepRooms(run0, p, combat, rng, DT);
      updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
      for (let e = 0; e < combat.events.length; e++) seen.push(combat.events.at(e).kind);
      combat.events.clear();
    }
  };
  // In the dark before the boss is dead: nothing.
  p.pos.set(level.exit.x, 0, level.exit.z);
  tick(DT);
  check('the dark does nothing while the gate is shut', !run0.exited);
  // Through the doorway, a little way in.
  const mx = (room.min.x + room.max.x) / 2;
  const mz = (room.min.z + room.max.z) / 2;
  const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
  const half = (room.max.x - room.min.x) / 2;
  p.pos.set(mx + ex * (half - 3), 0, mz + ez * (half - 3));
  tick(DT);
  check('stepping in shuts its gates and starts the show', room.gates.every((g) => run0.shut[g]) && seen.includes('bossIntro') && inShow(run0.boss) && wallsOpen(run0.boss) === 0);
  const s = introBeats();
  tick((s.wallsFrom + s.wallsTo) / 2);
  check('the walls slide back', wallsOpen(run0.boss) > 0.2 && wallsOpen(run0.boss) < 0.8);
  tick(s.riseFrom - (s.wallsFrom + s.wallsTo) / 2 + 0.05);
  const boss = combat.enemies[run0.boss.slot];
  check('a portal opens in the middle and the boss rises out of it', run0.boss.slot >= 0 && boss.kind === 'demon' && boss.pos.y < 0 && portalOpen(run0.boss) > 0.5 && near(boss.pos.x, b.portal.x, 1e-6) && seen.includes('bossRise'));
  tick(s.riseTo - s.riseFrom);
  check('it stands on the floor, facing you, waiting', near(boss.pos.y, 0, 0.01) && boss.phase === 'intro');
  check('no fighting during the show', !seen.includes('demonWindup'));
  tick(s.end - s.riseTo);
  check(`after ${s.end.toFixed(1)} s the show is over and the fight starts`, !inShow(run0.boss) && run0.boss.beat === 'fight' && boss.phase === 'chase' && wallsOpen(run0.boss) === 1);
  // Half dead: it roars and calls grunts.
  boss.hp = v.demonHp * v.rageAt - 1;
  tick(0.5, () => {
    p.hp = 100;
  });
  const grunts = combat.enemies.filter((e) => isLive(e) && e.kind === 'grunt').length;
  check(`raging, it calls ${v.summonGrunts} grunts`, grunts === v.summonGrunts && seen.includes('demonRoar'));
  check('the gate stays shut meanwhile', run0.shut[b.gate]);
  const keys = combat.items.keys;
  const money = combat.money;
  p.hp = 50;
  hitEnemy(boss, 1e6, 0, 0, 1);
  tick(DT);
  check('killed: its grunts die with it', seen.includes('bossDown') && !combat.enemies.some((e) => isLive(e)));
  tick(doomTime() + 0.1);
  // (Update 0.2.0 — the designer: no rewards right away; they're in its chest, test-rewards.ts.)
  check('its body bursts, leaving nothing yet', seen.includes('bossBurst') && combat.items.keys === keys && p.hp === 50 && combat.money === money && !combat.coins.some((c) => c.alive));
  check('the gate waits a moment', run0.shut[b.gate]);
  tick(CINEMA.v.gateDelay + 0.05);
  check('then the wooden gate opens, and the room’s own gates', !run0.shut[b.gate] && room.gates.every((g) => !run0.shut[g]) && seen.includes('woodGateOpen') && run0.rooms[b.room].state === 'cleared');
  // Regression (the designer, 0.0.15: frozen after the boss died, no gate shot): the room's clock ran no further once
  // it was cleared, so the gate never swung and the gate shot never ended.
  const opened = run0.boss.t;
  tick(CINEMA.v.gateSwing);
  check('its clock runs on once the room is cleared (the gate swings all the way)', run0.boss.beat === 'open' && run0.boss.t >= opened + CINEMA.v.gateSwing - DT);
  p.pos.set(level.exit.x, 0, level.exit.z);
  tick(DT);
  check('stepping into the dark ends the floor', run0.exited && seen.includes('floorExit'));
}
