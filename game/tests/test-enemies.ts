// Update 0.0.12 — the Spitter and the Brute (design §9). The spitter keeps its distance (comes closer when far or out
// of sight, backs off when you're close, circles in between), warns before every shot, then spits a slow orb at you
// that hurts; a hit cancels its shot; it waits between shots. The brute walks at you slowly, warns for its full
// wind-up, then slams: on the ground in its ring you're hurt and thrown; in the air, or outside the ring, you're
// safe; light hits don't stop it, a hard one does; it fits through a 2 m gap.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { arenaWorld } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { updateOrbs } from '../src/sim/combat/orbs';
import type { CombatEvent } from '../src/sim/combat/state';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, spawnEnemy } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { ENEMIES } from '../src/tuning/enemies';
import { HEALTH } from '../src/tuning/health';
import { Arena, boxAt } from '../src/world/arena';

const v = ENEMIES.v;
const events = new EventQueue<CombatEvent>(256, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  e: Enemy;
}

/** One enemy of `kind` at `at`, the player at the origin (on the ground), in `arena` (open ground by default). */
function fight(kind: Enemy['kind'], at: Vector3, arena?: Arena): Fight {
  const w = arenaWorld(events, arena);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  spawnEnemy(all, kind, at, Math.atan2(-(0 - at.x), -(0 - at.z)));
  events.clear();
  return { w, p, all, e: all[0] };
}

/** Ticks for `secs` (orbs fly too); returns every event kind, and the time the player was first hurt (−1: never). */
function run(f: Fight, secs: number, each?: () => void) {
  const seen: string[] = [];
  let hurtAt = -1;
  const world = new FlatWorld();
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    const hp = f.p.hp;
    updateEnemies(f.all, f.p, f.w, DT);
    updateOrbs(f.w.orbs, f.p, world, events, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    seen.push(...kinds());
    events.clear();
    if (f.p.hp < hp && hurtAt < 0) hurtAt = (i + 1) * DT;
  }
  return { seen, hurtAt };
}

const flat = (e: Enemy) => Math.hypot(e.pos.x, e.pos.z);

section('Spitter — keeping its distance');
{
  const f = fight('spitter', new Vector3(0, 0, -30));
  f.e.cooldown = 99;
  run(f, 1);
  check('far away, it comes closer', flat(f.e) < 30 - v.spitterSpeed * 0.8, `${flat(f.e).toFixed(1)} m`);
  const g = fight('spitter', new Vector3(0, 0, -3));
  g.e.cooldown = 99;
  run(g, 0.5);
  check('too close, it backs away', flat(g.e) > 3.5, `${flat(g.e).toFixed(1)} m`);
  const h = fight('spitter', new Vector3(0, 0, -11));
  h.e.cooldown = 99;
  const x0 = h.e.pos.x;
  run(h, 0.8);
  check('in its range, it circles you', Math.abs(h.e.pos.x - x0) > 1 && near(flat(h.e), 11, 1.5), `moved ${Math.abs(h.e.pos.x - x0).toFixed(1)} m sideways, ${flat(h.e).toFixed(1)} m away`);
}

section('Spitter — its shot');
{
  const f = fight('spitter', new Vector3(0, 0, -11));
  f.e.cooldown = 0;
  const warn = run(f, 2 * DT);
  check('in sight and ready, it warns first', warn.seen.includes('spitterWindup') && f.e.phase === 'windup');
  const early = run(f, v.spitterWindup - 3 * DT);
  check('no orb before the full warning', !early.seen.includes('spit') && f.w.orbs.every((o) => !o.alive));
  const shot = run(f, 3 * DT);
  const orb = f.w.orbs.find((o) => o.alive);
  check('then it spits an orb at you', shot.seen.includes('spit') && !!orb && orb.vel.z > 0, orb ? `vel (${orb.vel.x.toFixed(1)}, ${orb.vel.y.toFixed(1)}, ${orb.vel.z.toFixed(1)})` : 'no orb');
  check(`slow enough to dodge (${v.spitterOrbSpeed} m/s)`, !!orb && near(orb.vel.length(), v.spitterOrbSpeed, 0.01));
  f.e.cooldown = 99;
  const hit = run(f, 1.5);
  check(`standing still, it hits you for ${v.spitterOrbDamage}`, hit.hurtAt > 0 && f.p.hp === HEALTH.v.maxHp - v.spitterOrbDamage, `hp ${f.p.hp}`);
  const g = fight('spitter', new Vector3(0, 0, -11));
  g.e.cooldown = 0;
  const shots = run(g, v.spitterCooldown * 2 + v.spitterWindup * 2 + 0.6).seen.filter((k) => k === 'spit').length;
  check('it waits between shots', shots >= 2 && shots <= 3, `${shots} shots`);
}
{
  const f = fight('spitter', new Vector3(0, 0, -11));
  f.e.cooldown = 0;
  run(f, v.spitterWindup * 0.5);
  hitEnemy(f.e, 5, 0, 0, -1);
  const after = run(f, v.spitterWindup);
  check('a hit flinches it and cancels the shot', !after.seen.includes('spit'));
}
{
  // A wall between: no shot through it; it moves to find a line.
  const arena: Arena = { name: 't', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(-3, 0, -6, 6, 3, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const f = fight('spitter', new Vector3(0, 0, -11), arena);
  f.e.cooldown = 0;
  const r = run(f, 0.5);
  check('with a wall between, no shot: it moves to see you', !r.seen.includes('spitterWindup') && flat(f.e) < 11 - 0.5);
}

section('Brute — its slam');
{
  const f = fight('brute', new Vector3(0, 0, -12));
  run(f, 1);
  check(`it walks at you at ${v.bruteSpeed} m/s`, near(12 - flat(f.e), v.bruteSpeed, 0.3), `${(12 - flat(f.e)).toFixed(2)} m in 1 s`);
  let warnedAt = -1;
  let t = 1;
  for (; t < 6 && f.e.phase === 'chase'; t += DT) run(f, DT);
  warnedAt = f.e.phase === 'windup' ? t : -1;
  check('in reach it rears up to slam (the warning)', warnedAt > 0 && flat(f.e) <= v.bruteReach + 0.05);
  const slam = run(f, v.bruteWindup + 0.05);
  check('the slam never lands before the full wind-up', slam.hurtAt >= v.bruteWindup - 2 * DT, `hurt at ${slam.hurtAt.toFixed(2)} s`);
  check(`on the ground in its ring: ${v.bruteSlamDamage} damage and thrown away`, f.p.hp === HEALTH.v.maxHp - v.bruteSlamDamage && f.p.vel.z > 5 && f.p.vel.y > 0);
  check('then it stands winded: your opening', f.e.phase === 'recover');
}
{
  const f = fight('brute', new Vector3(0, 0, -2.5));
  run(f, 2 * DT);
  const r = run(f, v.bruteWindup + 0.05, () => {
    // Jumped: in the air as it lands.
    f.p.pos.y = 1.2;
    f.p.grounded = false;
  });
  check('in the air as it lands: safe', r.seen.includes('bruteSlam') && r.hurtAt < 0);
  const g = fight('brute', new Vector3(0, 0, -2.5));
  run(g, 2 * DT);
  const out = run(g, v.bruteWindup + 0.05, () => g.p.pos.set(0, 0, v.bruteSlamRadius + 1.5));
  check('out of its ring as it lands: safe', out.seen.includes('bruteSlam') && out.hurtAt < 0);
}
{
  const f = fight('brute', new Vector3(0, 0, -2.5));
  run(f, 2 * DT);
  hitEnemy(f.e, 10, 5, 0, -1);
  check('a light hit hurts it but doesn’t stop it', f.e.phase === 'windup' && f.e.hp === v.bruteHp - 10);
  check('and hardly moves it', Math.abs(f.e.vel.z) < 1);
  hitEnemy(f.e, v.bruteStagger, 20, 0, -1);
  const r = run(f, v.bruteWindup);
  check('a hard hit staggers it and cancels the slam', !r.seen.includes('bruteSlam') && r.hurtAt < 0);
}
{
  // Two blocks 2 m apart, the brute on the far side: it squeezes through the gap.
  const arena: Arena = { name: 't', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(-10, 0, -6, 9, 3, 1, 'wall'), boxAt(1, 0, -6, 9, 3, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const f = fight('brute', new Vector3(0, 0, -12), arena);
  let reached = false;
  for (let t = 0; t < 8 && !reached; t += DT) {
    run(f, DT);
    reached = f.e.phase === 'windup';
  }
  check('it fits through a 2 m gap to reach you', reached, `at (${f.e.pos.x.toFixed(1)}, ${f.e.pos.z.toFixed(1)})`);
}
