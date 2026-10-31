// Update 0.2.10 — the Drowned King risen (phase 2; out of test-drowned-king.ts, which had reached its size): below half
// and up between its moves it rises for good, the water rises, its brood comes once (the designer: "only one wave of
// smaller minions, once only, not infinite"); its tidal wall (find the gap), its surf (into a wall it's stunned), its two
// bites, its geysers. Dead, its water drains.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, run as runPlayer, ticks } from './fakes/flatWorld';
import { count, fight, Fight, picks, run, under, warnOf, world } from './fakes/kingFight';
import { createBossRun, stepBoss } from '../src/sim/dungeon/bossRoom';
import { floodSlow } from '../src/sim/dungeon/tide';
import { BITE, CRUISE, DIVE, GEYSER, LUNGE, RISE, RISEN, SPOUT, submerged, SURF, TIDE, UNDERTOW } from '../src/sim/enemies/drownedKingMoves';
import { raiseTide } from '../src/sim/enemies/drownedRisen';
import { hitEnemy, isLive, setPhase } from '../src/sim/enemies/enemy';
import { ENEMY_STATS, RADIUS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { DROWNED } from '../src/tuning/drowned';

const v = DROWNED.v;

section('Drowned King — risen: the water rises, its brood comes once');
{
  const f = fight(new Vector3(0, 0, -10));
  f.e.hp = ENEMY_STATS.drownedKing().hp * (v.risenAt - 0.01);
  under(f);
  run(f, 0.1);
  check('below half but under the water, it waits till it’s up', f.e.stage === 0);
  setPhase(f.e, 'recover');
  f.e.pos.y = 0;
  const r1 = run(f, 0.05);
  check('up below half: it roars and rises for good', r1.seen.includes('drownedRisen') && f.e.stage === 1 && f.e.move === RISEN && !submerged(f.e));
  run(f, 4);
  check(`it raises the water to ${v.risenDeep} m: you wade at ${v.risenWading} of your speed`, near(f.c.flood, v.risenDeep, 1e-6) && floodSlow(f.p, f.c.flood) === v.risenWading);
  check('it never goes under again', !submerged(f.e) && f.e.phase !== 'burrow');
  const room = fight(new Vector3(0, 0, -10), 1);
  const b = createBossRun('drownedKing');
  b.beat = 'fight';
  b.slot = room.slot;
  const spawns = [{ x: 15, y: 0, z: 15 }, { x: -15, y: 0, z: 15 }, { x: 15, y: 0, z: -15 }, { x: -15, y: 0, z: -15 }];
  const brood = () => room.c.enemies.filter((e) => isLive(e) && e.kind === 'spawnling').length;
  stepBoss(b, { x: 0, z: 0 }, spawns, room.p, room.c, room.c.rng, DT);
  const first = brood();
  room.c.enemies.forEach((e) => e.kind === 'spawnling' && hitEnemy(e, e.hp + 1, 0, 0, 0));
  for (let i = 0; i < ticks(120); i++) stepBoss(b, { x: 0, z: 0 }, spawns, room.p, room.c, room.c.rng, 1 / 2);
  check(`risen, it calls its brood: ${v.brood} Spawnlings, once, never again`, first === v.brood && brood() === 0, `${first}`);
  const calm = fight(new Vector3(0, 0, -10));
  const b0 = createBossRun('drownedKing');
  b0.beat = 'fight';
  b0.slot = calm.slot;
  stepBoss(b0, { x: 0, z: 0 }, spawns, calm.p, calm.c, calm.c.rng, DT);
  check('not before', calm.c.enemies.filter((e) => isLive(e) && e.kind === 'spawnling').length === 0);
}

section('Drowned King — risen: its tidal wall');
{
  /** It raises its wall at you, you `at` (along its way, across from your line), and it rolls. */
  const wall = (along: number, across: (k: Fight) => number, y = 0) => {
    const f = fight(new Vector3(0, 0, -10), 1);
    raiseTide(f.e, f.p, f.c);
    warnOf(f, TIDE);
    const ax = f.e.aim.x;
    const az = f.e.aim.z;
    const l = across(f);
    f.p.pos.set(f.e.from.x + ax * along - az * l, y, f.e.from.z + az * along + ax * l);
    f.p.grounded = y === 0;
    return { f, r: run(f, v.tideWindup + (along + 2) / v.tideSpeed, () => f.p.pos.y === y || f.p.pos.setY(y)) };
  };
  const hit = wall(10, (f) => f.e.near + v.tideGap / 2 + 1.5);
  check(`outside its gap, it takes you: ${v.tideDamage} damage, thrown along it`, hit.r.seen.includes('drownedTide') && hit.r.lost === v.tideDamage && hit.f.p.vel.y > 0);
  const gap = wall(10, (f) => f.e.near);
  check('in its gap, it rolls by you', gap.r.seen.includes('drownedTide') && !gap.r.hurt);
  const jump = wall(10, (f) => f.e.near + v.tideGap / 2 + 1.5, 2);
  check('no jump clears it', jump.r.lost === v.tideDamage);
  const g = fight(new Vector3(0, 0, -10), 1);
  let most = 0;
  for (let i = 0; i < 100; i++) {
    raiseTide(g.e, g.p, g.c);
    most = Math.max(most, Math.abs(g.e.near));
  }
  check(`its gap is somewhere up to ${v.tideSpread} m either side of you (seeded)`, most <= v.tideSpread && most > v.tideSpread * 0.7);
  run(hit.f, v.tideReach / v.tideSpeed + 0.1);
  check('rolled its reach, it’s over', hit.f.e.phase === 'recover' || hit.f.e.phase === 'chase');
}

section('Drowned King — risen: its surf, its bites, its geysers');
{
  const s = fight(new Vector3(0, 0, -10), 1);
  warnOf(s, SURF);
  const r1 = run(s, v.surfWindup + 1);
  check(`it surfs at you: ${v.surfDamage} damage`, r1.seen.includes('drownedSurf') && r1.lost === v.surfDamage);
  const wallRun = fight(new Vector3(0, 0, -16), 1);
  wallRun.p.pos.set(0, 0, -23);
  wallRun.e.facing = 0;
  warnOf(wallRun, SURF);
  const r2 = run(wallRun, v.surfWindup + 1);
  check('surfing into a wall, it’s stunned: hits do more', r2.seen.includes('demonCrash') && wallRun.e.phase === 'stun');
  run(wallRun, v.kingStun + 0.05);
  check(`for ${v.kingStun} s`, wallRun.e.phase === 'chase');
  const b = fight(new Vector3(0, 0, -(RADIUS.drownedKing + 2.5)), 1);
  warnOf(b, BITE);
  const r3 = run(b, v.biteWindup * 1.5 + 0.05);
  check(`close in front, it bites twice (${v.biteDamage} each)`, count(r3.seen, 'drownedBite') === 2 && r3.lost === v.biteDamage * 2);
  const g = fight(new Vector3(0, 0, -10), 1);
  warnOf(g, GEYSER);
  const spots: number[] = [];
  const r4 = run(g, v.geyserGap * (v.geysers - 1) + v.geyserWarn + 0.1, (i) => {
    for (const x of g.c.bombs) if (x.alive && x.look === 'geyser' && x.t <= DT * 1.01) spots.push(x.to.x);
    g.p.pos.set(i * DT * 7, 0, 0);
  });
  check(`${v.geysers} geysers, one after another, each where you were; running, they miss`, count(r4.seen, 'geyserBurst') === v.geysers && spots.length === v.geysers && spots.every((x, i) => i === 0 || x > spots[i - 1]) && !r4.hurt);
  const still = fight(new Vector3(0, 0, -10), 1);
  warnOf(still, GEYSER);
  const r5 = run(still, v.geyserGap * (v.geysers - 1) + v.geyserWarn + 0.1);
  check(`standing still, they catch you and throw you high (${v.geyserDamage} each)`, r5.lost === v.geyserDamage * v.geysers && still.p.vel.y >= 10);
  const far = fight(new Vector3(0, 0, -20), 1);
  setPhase(far.e, 'chase');
  const farMoves = picks(far, 60, () => setPhase(far.e, 'chase'));
  const risen: number[] = [TIDE, SURF, GEYSER];
  check('far off, risen: its wall, its surf, its geysers (never a move from beneath)', farMoves.every((m) => risen.includes(m)) && risen.every((m) => farMoves.includes(m)), farMoves.join(','));
  const close = fight(new Vector3(0, 0, -5), 1);
  const nearMoves = picks(close, 60, () => setPhase(close.e, 'chase'));
  check('close up, its bites too', nearMoves.includes(BITE) && nearMoves.every((m) => m === TIDE || m === SURF || m === GEYSER || m === BITE));
}

section('Drowned King — dead, its water drains; the water drags you as you walk');
{
  const f = fight(new Vector3(0, 0, -10), 1);
  hitEnemy(f.e, f.e.hp + 1, 0, 0, 0);
  run(f, 0.3);
  const mid = f.c.flood;
  run(f, 2);
  check('its body’s show starts; its water drains', f.e.phase === 'dead' && mid < v.risenDeep && f.c.flood === 0);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  p.current.set(3, 0, 0);
  runPlayer(p, world, ticks(1));
  check('dragged by the water (3 m/s), you go with it', near(p.pos.x, 3, 0.05), p.pos.x.toFixed(2));
  check('(its moves are numbered apart)', new Set([LUNGE, UNDERTOW, SPOUT, TIDE, SURF, GEYSER, BITE, RISE, DIVE, CRUISE, RISEN]).size === 11);
}
