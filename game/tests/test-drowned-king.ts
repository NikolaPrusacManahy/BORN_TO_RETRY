// Update 0.2.10 — floor 5's boss, the Drowned King (spec MD_UPDATES/U0210_DROWNED_TEMPLE.md), as reworked (the
// designer: "frustrating and challenging … use the water … only one wave of smaller minions, once only … different in
// phase 1 & 2"). Beneath (phase 1): under the water out of reach, circling you; its ambush (step out of the ring), its
// undertow (the water drags you into its ring: get out), its jet (jump it); only after each is it up to be hit. Risen
// (phase 2) is test-drowned-risen.ts's.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT } from './fakes/flatWorld';
import { fight, picks, run, under, until, warnOf } from './fakes/kingFight';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { floodSlow } from '../src/sim/dungeon/tide';
import { CRUISE, LUNGE, RISE, SPOUT, submerged, UNDERTOW } from '../src/sim/enemies/drownedKingMoves';
import { dodges } from '../src/sim/enemies/evade';
import { bossOf, ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { CAUSE_NAMES } from '../src/screens/deathText';
import { DROWNED } from '../src/tuning/drowned';
import { TIDE as TIDE_KNOBS } from '../src/tuning/tide';

const v = DROWNED.v;

section('Drowned King — the boss of floor 5');
{
  const s = ENEMY_STATS.drownedKing();
  check(`a boss, ${s.height} m, never flinches, ${s.hp} health; stunned, hits do more`, s.boss && s.stagger === Infinity && s.height === v.kingHeight && s.hp === v.kingHp && s.stunned > 1);
  check('floor 5’s boss (and the floors past it); not a mini boss', bossOf(5) === 'drownedKing' && bossOf(7) === 'drownedKing' && !MINI_BOSSES.includes('drownedKing'));
  check(`its name, its death’s, ${v.kingCoins} coins in its chest`, BOSS_NAMES.drownedKing === 'THE DROWNED KING' && CAUSE_NAMES.drownedKing === 'The Drowned King' && bossCoins('drownedKing') === v.kingCoins);
  const f = fight(new Vector3(0, 0, -12), 0, 0);
  const r = run(f, v.diveWindup + 0.1);
  const early = f.c.flood;
  run(f, 3);
  check(`its room floods knee-deep as it comes (${v.shallow} m)`, early > 0.05 && early < v.shallow && near(f.c.flood, v.shallow, 1e-6));
  check('the show over, down it goes: out of sight, out of reach', r.seen.includes('drownedDive') && submerged(f.e) && dodges(f.c, f.slot, 0, -1));
  check('you wade its water as a tide’s', floodSlow(f.p, v.shallow) === TIDE_KNOBS.v.wading);
}

section('Drowned King — beneath: circling under you, out of reach');
{
  const f = fight(new Vector3(0, 0, -4));
  under(f);
  f.e.cooldown = 99;
  run(f, 4);
  const r = Math.hypot(f.e.pos.x, f.e.pos.z);
  check(`it circles you about ${v.cruiseRing} m off, still under`, Math.abs(r - v.cruiseRing) < 2 && submerged(f.e) && dodges(f.c, f.slot, 0, -1), r.toFixed(1));
  const p = fight(new Vector3(0, 0, -10));
  under(p);
  const moves = picks(p, 60, () => under(p));
  const beneath: number[] = [LUNGE, UNDERTOW, SPOUT];
  check('beneath it picks only its ambush, its undertow and its jet', moves.every((m) => beneath.includes(m)) && beneath.every((m) => moves.includes(m)), moves.join(''));
  let thrice = false;
  for (let i = 2; i < moves.length; i++) if (moves[i] === moves[i - 1] && moves[i] === moves[i - 2]) thrice = true;
  check('never the same one three times running', !thrice);
}

section('Drowned King — beneath: its ambush');
{
  const f = fight(new Vector3(0, 0, -12));
  under(f);
  f.e.move = LUNGE;
  const r1 = until(f, () => f.e.move === RISE, v.hunt + 0.1);
  check('it swims to you under the water; there, the water rings where it’ll come up', r1.includes('drownedRiseWarn') && f.e.phase === 'windup' && submerged(f.e) && Math.hypot(f.e.pos.x, f.e.pos.z) < 1.5);
  const r2 = run(f, v.lungeWarn + 0.02);
  check(`standing in the ring: it bursts up under you, ${v.lungeDamage} damage, thrown`, r2.seen.includes('drownedRise') && r2.lost === v.lungeDamage && f.p.vel.y > 0);
  check(`then it’s up ${v.lungeUp} s: hit it`, f.e.phase === 'recover' && !submerged(f.e) && !dodges(f.c, f.slot, 0, -1));
  const r3 = run(f, v.lungeUp + v.diveWindup + 0.05);
  check('then it sinks under again', r3.seen.includes('drownedDive') && submerged(f.e) && f.e.move === CRUISE);
  const out = fight(new Vector3(0, 0, -12));
  under(out);
  out.e.move = LUNGE;
  until(out, () => out.e.move === RISE, v.hunt + 0.1);
  out.p.pos.set(v.lungeReach + 0.5, 0, 0);
  const r4 = run(out, v.lungeWarn + 0.02);
  check('step out of the ring and its jaws miss', r4.seen.includes('drownedRise') && !r4.hurt);
}

section('Drowned King — beneath: its undertow');
{
  const f = fight(new Vector3(0, 0, -10));
  under(f);
  f.e.aim.set(3, 0, 0);
  warnOf(f, UNDERTOW);
  run(f, 0.3);
  const pull = Math.hypot(f.p.current.x, f.p.current.z);
  check(`the water drags you to its ring (${v.undertowPull} m/s)`, near(pull, v.undertowPull, 1e-6) && f.p.current.x > 0 && submerged(f.e));
  f.p.grounded = false;
  run(f, 0.2, () => f.p.pos.set(0, v.shallow + 0.5, 0));
  check('jump out of the water and it doesn’t', f.p.current.lengthSq() === 0);
  f.p.pos.set(3, 0, 0);
  f.p.grounded = true;
  const r = run(f, v.undertowTime);
  check(`left in its ring, it bursts up under you (${v.lungeDamage})`, r.seen.includes('drownedRise') && r.lost === v.lungeDamage && Math.hypot(f.e.pos.x - 3, f.e.pos.z) < 1.5 && f.e.phase === 'recover');
  const out = fight(new Vector3(0, 0, -10));
  under(out);
  out.e.aim.set(0, 0, 0);
  warnOf(out, UNDERTOW);
  run(out, v.undertowTime * 0.5);
  out.p.pos.set(v.lungeReach + 1, 0, 0);
  const r2 = run(out, v.undertowTime * 0.5 + 0.05);
  check('get out of the ring in time and it misses', r2.seen.includes('drownedRise') && !r2.hurt);
}

section('Drowned King — beneath: its jet');
{
  // (Seeded: find a seed whose first pick is its jet.)
  let seed = 1;
  for (; seed < 200; seed++) {
    const g = fight(new Vector3(0, 0, -10), 0, v.shallow, seed);
    under(g);
    g.e.cooldown = 0;
    run(g, DT);
    if (g.e.move === SPOUT) break;
  }
  const j = fight(new Vector3(0, 0, -10), 0, v.shallow, seed);
  under(j);
  j.e.cooldown = 0;
  const r1 = run(j, DT);
  check('it comes up for its jet: now you can hit it', r1.seen.includes('drownedSurface') && j.e.move === SPOUT && !submerged(j.e) && !dodges(j.c, j.slot, 0, -1));
  const r2 = run(j, v.spoutWindup + v.spoutTime + 0.05);
  check(`its jet sweeps across you: ${v.spoutDamage} damage, once`, r2.seen.includes('drownedSpout') && r2.lost === v.spoutDamage);
  const jump = fight(new Vector3(0, 0, -10), 0, v.shallow, seed);
  under(jump);
  jump.e.cooldown = 0;
  run(jump, v.spoutWindup + DT * 2);
  jump.p.grounded = false;
  const r3 = run(jump, v.spoutTime + 0.05, () => jump.p.pos.set(0, 1.5, 0));
  check('jump it and it sweeps under you', !r3.hurt && jump.e.phase === 'recover');
  const far = fight(new Vector3(0, 0, -10), 0, v.shallow, seed);
  under(far);
  far.e.cooldown = 0;
  run(far, v.spoutWindup);
  far.p.pos.set(0, 0, v.spoutRange);
  const r4 = run(far, v.spoutTime + 0.05);
  check(`past its reach (${v.spoutRange} m) it can’t catch you`, !r4.hurt);
  run(j, v.spoutUp + v.diveWindup + 0.05);
  check(`it stays up ${v.spoutUp} s after, then dives`, submerged(j.e));
}
