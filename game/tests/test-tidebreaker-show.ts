// Update 0.3.31 — Tidebreaker's show (the designer: "Intro cinematic for the boss: All previous rooms explode and all of
// space; The boss room is x2 bigger than a normal boss room, you see it expanding; A shot of the earth shakes and
// explode; A meteor is coming from the earth exploding … lands on the arena with a massive explosion, revealing the boss
// doing the monster transformation animation as the whole place shakes and name displayed in slow motion"): its arena
// twice a boss room (the other floors where they were); its beats in order; the floor's other rooms blowing, the
// furthest first; its walls sliding out in two stages; the Earth, the meteor, its landing and its rise; slowed while its
// name shows; the fight; and its rooms' gates kept shut after (the rooms behind them gone).
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { blastOrder, tideBeats, tideSlow } from '../src/sim/dungeon/tideShow';
import { wallsOpen } from '../src/sim/dungeon/bossRoom';
import { ROAR } from '../src/sim/enemies/tideShared';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { TIDEBREAKER } from '../src/tuning/tidebreaker';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { BOSS_SIDE } from '../src/world/dungeon/bossWalls';
import { CELL, planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';

section('Tidebreaker’s show — its arena');
{
  const level = buildDungeon(planFloor(31, FLOOR.moon));
  const room = level.rooms[level.boss.room];
  const side = room.max.x - room.min.x;
  const mid = level.boss.mid!;
  check(`its arena twice a boss room (${side} m; a boss room ${BOSS_SIDE * CELL} m)`, side === 2 * BOSS_SIDE * CELL && room.max.z - room.min.z === side);
  check('its walls slide out to a boss room’s size first, against the wall you come in by', !!mid && mid.max.x - mid.min.x === BOSS_SIDE * CELL && mid.max.z - mid.min.z === BOSS_SIDE * CELL && (mid.min.x === room.min.x || mid.max.x === room.max.x || mid.min.z === room.min.z || mid.max.z === room.max.z));
  const other = buildDungeon(planFloor(31, FLOOR.desert)).boss.mid;
  check('other floors’ boss rooms as they were (no middle stage)', other === null);
}

section('Tidebreaker’s show — its beats');
{
  const s = tideBeats();
  const order = [s.pull, s.wreckTo, s.growMid, s.holdTo, s.growTo, s.earthBurst, s.meteorFrom, s.angleB, s.impact, s.slowFrom, s.slowTo, s.end];
  check('in order: the rooms blow, the walls slide out (held halfway), the Earth bursts, the meteor falls (two shots), lands; slowed; the fight', order.every((t, i) => i === 0 || t > order[i - 1]), order.map((t) => t.toFixed(1)).join(' '));
  const b = { kind: 'tidebreaker', beat: 'intro', t: 0 } as Parameters<typeof wallsOpen>[0];
  const walls = (t: number) => ((b.t = t), wallsOpen(b));
  check('its walls: shut, then to a boss room’s size (a half), held there, then out to twice it', walls(s.growFrom) === 0 && near(walls(s.growMid + 0.01), 0.5, 0.01) && near(walls((s.growMid + s.holdTo) / 2), 0.5, 1e-6) && near(walls(s.growTo), 1, 1e-6));
}

section('Tidebreaker’s show — stepping in');
{
  const level = buildDungeon(planFloor(31, FLOOR.moon));
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  const seen: { kind: string; value: number; t: number }[] = [];
  let slowest = 1;
  let roaring = false;
  for (let i = 0; i < ticks(30) && run.boss.beat !== 'fight'; i++) {
    stepRooms(run, p, combat, rng, DT);
    slowest = Math.min(slowest, tideSlow(run.boss));
    const boss = run.boss.slot >= 0 ? combat.enemies[run.boss.slot] : null;
    roaring ||= !!boss && boss.phase === 'intro' && boss.move === ROAR;
    for (let k = 0; k < combat.events.length; k++) {
      const e = combat.events.at(k);
      seen.push({ kind: e.kind, value: e.value, t: run.boss.t });
    }
    combat.events.clear();
  }
  const s = tideBeats();
  const blasts = seen.filter((e) => e.kind === 'tideBlast');
  const others = level.rooms.length - 1;
  const order = blastOrder(level);
  const dist = (i: number) => Math.hypot((level.rooms[i].min.x + level.rooms[i].max.x) / 2 - level.boss.portal.x, (level.rooms[i].min.z + level.rooms[i].max.z) / 2 - level.boss.portal.z);
  check(`every other room blows (${blasts.length} of ${others}), the furthest first, not its own`, blasts.length === others && !blasts.some((e) => e.value === level.boss.room) && order.every((o, k) => k === 0 || dist(o.room) <= dist(order[k - 1].room)));
  const first = (kind: string, value?: number) => seen.findIndex((e) => e.kind === kind && (value === undefined || e.value === value));
  check('then its walls slide, the Earth shakes and bursts, the meteor falls and lands', first('tideGrow', 0) > first('tideBlast') && first('tideGrow', 1) > first('tideGrow', 0) && first('tideEarth', 1) > first('tideEarth', 0) && first('tideMeteor') > first('tideEarth', 1) && first('tideArrive') > first('tideMeteor'));
  const arrive = seen[first('tideArrive')];
  check(`landing, it rises out of the crater roaring (its MonsterTransformation), its ring out over the arena`, !!arrive && near(arrive.t, s.impact, 0.05) && roaring && seen.some((e) => e.kind === 'tideRoar'));
  check(`slowed while its name shows (${TIDEBREAKER.v.showSlow}×), then the fight`, near(slowest, TIDEBREAKER.v.showSlow, 0.01) && run.boss.beat === 'fight' && combat.enemies[run.boss.slot].phase === 'chase');
  // Its fight won: the wooden gate opens; its other gates stay shut (the rooms behind them are gone).
  const boss = combat.enemies[run.boss.slot];
  hitEnemy(boss, boss.hp + 1, 0, 0, 0);
  // (Its body bursts in its death show: the enemies' tick, not run here.)
  stepRooms(run, p, combat, rng, DT);
  boss.struck = true;
  for (let i = 0; i < ticks(40) && run.shut[level.boss.gate]; i++) {
    stepRooms(run, p, combat, rng, DT);
    combat.events.clear();
  }
  const room = level.rooms[level.boss.room];
  check('won: the way down opens; the doors you came in by stay shut', !run.shut[level.boss.gate] && room.gates.filter((g) => g !== level.boss.gate).every((g) => run.shut[g]));
}
