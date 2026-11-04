// Update 0.3.36 — any boss's show skipped (the designer: "Add a skip button while the Intro is played for any boss ->
// "SPACE" to skip"): every floor's own boss, its show begun, then skipped: the fight at once, the boss where its show
// leaves it (Okami where it lands, you where it puts you, its islands in; Tidebreaker out of its crater, its crater
// still made), none of the skipped show's sounds and shakes all at once; and the key's shown only while a show plays.
import { check, section } from './harness';
import { DT } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { okamiGates } from '../src/sim/dungeon/okamiShow';
import { isLive } from '../src/sim/enemies/enemy';
import { ownBossOf } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { BossShow } from '../src/engine/boss/bossShow';

section('Boss shows — skipped');
{
  const done: string[] = [];
  const bad: string[] = [];
  for (let floor = 1; floor <= 10; floor++) {
    const kind = ownBossOf(floor);
    if (!kind) continue;
    const level = buildDungeon(planFloor(31, floor));
    const run = createDungeonRun(level);
    const combat = createCombat(level.arena, false);
    const st = bossRoomStart(level);
    const p = createPlayer(st.x, 0, st.z, st.yaw);
    p.grounded = true;
    const rng = createRng(3);
    for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) {
      stepRooms(run, p, combat, rng, DT);
      combat.events.clear();
    }
    // A moment into its show, then skipped.
    for (let i = 0; i < 30; i++) {
      stepRooms(run, p, combat, rng, DT);
      combat.events.clear();
    }
    run.boss.skip = true;
    stepRooms(run, p, combat, rng, DT);
    const heard = combat.events.length;
    const kept: string[] = [];
    for (let k = 0; k < combat.events.length; k++) kept.push(combat.events.at(k).kind);
    combat.events.clear();
    stepRooms(run, p, combat, rng, DT);
    const boss = run.boss.slot >= 0 ? combat.enemies[run.boss.slot] : null;
    let ok = run.boss.beat === 'fight' && !!boss && isLive(boss) && boss.kind === kind && boss.phase !== 'intro' && heard <= 3;
    if (kind === 'okami' && level.okami) {
      const o = level.okami;
      ok &&= Math.hypot(boss!.pos.x - o.landing.x, boss!.pos.z - o.landing.z) < 0.5 && Math.hypot(p.pos.x - o.safe.x, p.pos.z - o.safe.z) < 0.5 && okamiGates(o).every((g) => run.shut[g]);
    }
    if (kind === 'tidebreaker') ok &&= kept.includes('tideArrive');
    (ok ? done : bad).push(`${kind}${ok ? '' : ` (${run.boss.beat}, ${heard} events)`}`);
  }
  check(`every boss’s show skipped straight into its fight, as its show leaves it (${done.join(', ')})`, bad.length === 0 && done.length >= 8, bad.join('; '));
}

section('Boss shows — the key to skip');
{
  const level = buildDungeon(planFloor(31, 1));
  const run = createDungeonRun(level);
  const show = new BossShow(run);
  const off = show.hud.skip;
  run.boss.beat = 'intro';
  run.boss.t = 1;
  const cam = new (await import('three')).PerspectiveCamera();
  show.update(1 / 60, cam, { yaw: 0, pitch: 0 } as never, createCombat(level.arena, false));
  const on = show.hud.skip;
  run.boss.beat = 'fight';
  show.update(1 / 60, cam, { yaw: 0, pitch: 0 } as never, createCombat(level.arena, false));
  check('shown while its show plays, not before or after', !off && on && !show.hud.skip);
}
