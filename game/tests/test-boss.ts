// Update 0.0.15 — the Demon and its room (the designer: build the boss as pitched, bigger; the room's show; its death;
// the wooden gate onto the dark). Every move warns first; the charge throws you and stops at a wall (stunned, and
// hits do more); the leap lands where you stood and its quake ring rolls under you unless you jump; the volley is a
// fan (two once it rages); at half health it roars once; dead, it rises, hangs, sinks and bursts. (Its room:
// test-boss-room.ts.)
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';
import { updateOrbs } from '../src/sim/combat/orbs';
import { createQuakes, startQuake, updateQuakes } from '../src/sim/combat/quakes';
import type { CombatEvent } from '../src/sim/combat/state';
import { FlatWorld } from './fakes/flatWorld';
import { CHARGE, LEAP, VOLLEY } from '../src/sim/enemies/demonMoves';
import { windupOf } from '../src/sim/enemies/demon';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { doomTime, ENEMY_STATS } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { BOSS } from '../src/tuning/boss';
import { Arena, boxAt } from '../src/world/arena';

const v = BOSS.v;
const events = new EventQueue<CombatEvent>(512, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  d: Enemy;
}

function fight(at: Vector3, arena?: Arena): Fight {
  const w = arenaWorld(events, arena);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  spawnEnemy(all, 'demon', at, Math.atan2(at.x, at.z));
  events.clear();
  return { w, p, all, d: all[0] };
}

/** It winds up `move` now. */
function warnNow(f: Fight, move: number) {
  f.d.move = move;
  setPhase(f.d, 'windup');
}

/** Ticks for `secs`: the events, when you were first hurt (−1: never), how much, and its highest point. */
function run(f: Fight, secs: number, each?: (i: number) => void) {
  const seen: string[] = [];
  let hurtAt = -1;
  let lost = 0;
  let top = -Infinity;
  for (let i = 0; i < ticks(secs); i++) {
    each?.(i);
    const hp = f.p.hp;
    updateEnemies(f.all, f.p, f.w, OPEN_WORLD, DT);
    updateQuakes(f.w.quakes, f.p, events, DT);
    updateOrbs(f.w.orbs, f.p, new FlatWorld(), events, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    seen.push(...kinds());
    events.clear();
    top = Math.max(top, f.d.pos.y);
    if (f.p.hp < hp) {
      lost += hp - f.p.hp;
      if (hurtAt < 0) hurtAt = (i + 1) * DT;
    }
  }
  return { seen, hurtAt, lost, top };
}

section('Demon — the boss');
{
  const s = ENEMY_STATS.demon();
  check(`big: ${s.height} m tall, ${s.radius} m wide, ${s.hp} health; a boss`, s.boss && s.height >= 6 && s.radius > 1.5 && s.hp === v.demonHp);
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 60, 1, 0, 1);
  check('a hard hit never flinches it', f.d.phase !== 'flinch' && f.d.hp === v.demonHp - 60);
  setPhase(f.d, 'stun');
  hitEnemy(f.d, 60, 1, 0, 1);
  check(`stunned, a hit does ${v.stunBonus}×`, near(f.d.hp, v.demonHp - 60 - 60 * v.stunBonus, 1e-6));
}

section('Demon — the charge');
{
  const f = fight(new Vector3(0, 0, -20));
  warnNow(f, CHARGE);
  const warn = run(f, windupOf(f.d, CHARGE) - 0.05);
  check('it warns before it charges (no hit during the warning)', f.d.phase === 'windup' && warn.hurtAt < 0 && !warn.seen.includes('demonCharge'));
  const r = run(f, 1.5);
  check('then charges through you: hurt once, thrown aside', r.seen.includes('demonCharge') && r.seen.filter((k) => k === 'demonGore').length === 1 && near(r.lost, v.chargeDamage, 1e-6) && Math.hypot(f.p.vel.x, f.p.vel.z) > 5);
}
{
  // A wall 12 m in front of it: it runs into it and is stunned.
  const wall: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(-10, 0, -34, 20, 6, 2, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const f = fight(new Vector3(0, 0, -20), wall);
  // You're beyond the wall: it charges straight at it.
  f.p.pos.set(0, 0, -60);
  f.d.facing = 0;
  warnNow(f, CHARGE);
  const r = run(f, windupOf(f.d, CHARGE) + 1);
  check('into a wall it crashes and is stunned', r.seen.includes('demonCrash') && f.d.phase === 'stun' && f.d.pos.z >= -32 + ENEMY_STATS.demon().radius - 1e-6);
  run(f, v.chargeStun - f.d.t - 0.1);
  check(`stunned for ${v.chargeStun} s`, f.d.phase === 'stun');
  run(f, 0.2);
  check('then back to it', f.d.phase !== 'stun');
}
{
  // Sliding along a wall it grazes isn't a crash.
  const graze: Arena = { name: 'g', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(1.2, 0, -39, 2, 6, 36, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const f = fight(new Vector3(0, 0, -5), graze);
  f.p.pos.set(-0.3, 0, -60);
  f.d.facing = 0;
  f.d.pos.x = -0.3;
  warnNow(f, CHARGE);
  const r = run(f, windupOf(f.d, CHARGE) + 0.5);
  check('grazing a wall along its run is no crash', !r.seen.includes('demonCrash'));
}

section('Demon — the leap and the quake');
{
  const f = fight(new Vector3(0, 0, -15));
  f.p.pos.set(0, 0, 0);
  warnNow(f, LEAP);
  const warn = run(f, windupOf(f.d, LEAP) - 0.05);
  check('it warns before it leaps', warn.hurtAt < 0 && !warn.seen.includes('demonLeap'));
  const r = run(f, 0.05 + v.leapAir + 0.05);
  check(`then leaps (${v.leapArc} m up) and lands where you stood, hurting you`, r.seen.includes('demonLeap') && r.seen.includes('demonSlam') && near(r.top, v.leapArc, 0.2) && Math.hypot(f.d.pos.x, f.d.pos.z) < 1 && r.hurtAt > 0);
  check('its landing sends a quake ring out', f.w.quakes.some((q) => q.alive));
}
{
  const f = fight(new Vector3(0, 0, -15));
  warnNow(f, LEAP);
  run(f, windupOf(f.d, LEAP) + 0.01);
  // You jump just before it lands.
  const r = run(f, v.leapAir + 0.05, (i) => {
    if (i * DT > v.leapAir - 0.2) f.p.pos.y = 2;
  });
  check('a jump clears its landing', r.seen.includes('demonSlam') && r.hurtAt < 0);
}
{
  const quakes = createQuakes();
  const p = createPlayer(10, 0, 0, 0);
  p.grounded = true;
  startQuake(quakes, 0, 0, 0, v.quakeSpeed, v.quakeReach, v.quakeDamage, v.quakeClear);
  let lost = 0;
  for (let i = 0; i < ticks(2.5); i++) {
    const hp = p.hp;
    updateQuakes(quakes, p, events, DT);
    p.hurtTime = Math.max(0, p.hurtTime - DT);
    lost += hp - p.hp;
  }
  events.clear();
  check(`on the ground, the quake rolling under you hurts once (${v.quakeDamage})`, near(lost, v.quakeDamage, 1e-6));
  const q2 = createQuakes();
  const jumper = createPlayer(10, 0, 0, 0);
  startQuake(q2, 0, 0, 0, v.quakeSpeed, v.quakeReach, v.quakeDamage, v.quakeClear);
  for (let i = 0; i < ticks(2.5); i++) {
    // In the air while the ring passes.
    const d = (i * DT * v.quakeSpeed);
    jumper.pos.y = Math.abs(d - 10) < 3 ? 1.2 : 0;
    updateQuakes(q2, jumper, events, DT);
  }
  events.clear();
  check('in the air as it passes, it misses you', jumper.hp === createPlayer(0, 0, 0, 0).hp);
  const far = createPlayer(v.quakeReach + 3, 0, 0, 0);
  const q3 = createQuakes();
  startQuake(q3, 0, 0, 0, v.quakeSpeed, v.quakeReach, v.quakeDamage, v.quakeClear);
  for (let i = 0; i < ticks(3); i++) updateQuakes(q3, far, events, DT);
  events.clear();
  check('beyond its reach it never gets to you', far.hp === createPlayer(0, 0, 0, 0).hp && !q3.some((q) => q.alive));
}

section('Demon — the volley and its rage');
{
  const f = fight(new Vector3(0, 0, -20));
  warnNow(f, VOLLEY);
  const warn = run(f, windupOf(f.d, VOLLEY) - 0.05);
  check('it warns before its volley', !warn.seen.includes('demonVolley') && !f.w.orbs.some((o) => o.alive));
  run(f, 0.1);
  check(`then a fan of ${v.volleyOrbs} fire orbs`, f.w.orbs.filter((o) => o.alive).length === v.volleyOrbs);
}
{
  const f = fight(new Vector3(0, 0, -20));
  f.d.hp = v.demonHp * v.rageAt - 1;
  const r = run(f, DT);
  check('at half health it roars, once', r.seen.filter((k) => k === 'demonRoar').length === 1 && f.d.phase === 'roar' && f.d.stage === 1);
  run(f, v.roarTime - 0.1);
  check(`for ${v.roarTime} s it does nothing else`, f.d.phase === 'roar');
  const more = run(f, 3);
  check('and never roars again', !more.seen.includes('demonRoar'));
  check('raging, its warnings are quicker', near(windupOf(f.d, CHARGE), v.chargeWindup * v.rageWindup, 1e-9));
  for (const o of f.w.orbs) o.alive = false;
  f.p.pos.set(0, 0, 0);
  f.d.pos.set(0, 0, -20);
  warnNow(f, VOLLEY);
  run(f, windupOf(f.d, VOLLEY) + 0.45);
  check('and its volley is two fans', f.w.orbs.filter((o) => o.alive).length === 2 * v.volleyOrbs);
}
{
  // The same seed, the same fight.
  const moves = (seed: number) => {
    const f = fight(new Vector3(0, 0, -14));
    f.w.rng = createRng(seed);
    f.p.dead = false;
    const r = run(f, 20, (i) => {
      // You keep away and don't get hurt (no throws to change the fight).
      f.p.hp = 100;
      f.p.pos.set(Math.sin(i * DT) * 12, 0, Math.cos(i * DT) * 12);
    });
    return r.seen.filter((k) => k === 'demonWindup').length + ':' + r.seen.join(',').length;
  };
  check('the same seed, the same moves', moves(7) === moves(7));
}

section('Demon — its death');
{
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 1e6, 0, 0, 1);
  check('killed, it stops fighting', !isLive(f.d) && f.d.alive);
  const up = run(f, v.doomRise + v.doomHang * 0.5);
  check(`it rises ${v.doomLift} m and hangs there`, near(f.d.pos.y, v.doomLift, 0.02) && !up.seen.includes('bossBurst'));
  run(f, v.doomHang * 0.5 + v.doomDrop * 0.5);
  check('then sinks slowly', f.d.pos.y > 0.2 && f.d.pos.y < v.doomLift - 0.2);
  const end = run(f, v.doomDrop * 0.5 + 0.02);
  check('and bursts on the ground (once)', end.seen.filter((k) => k === 'bossBurst').length === 1 && f.d.pos.y === 0);
  run(f, 0.2);
  check('its slot frees after', !f.d.alive);
  check('the show takes as long as its knobs say', near(doomTime(), v.doomRise + v.doomHang + v.doomDrop, 1e-9));
}
