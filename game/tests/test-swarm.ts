// Update 0.3.42 — The Swarm, the Venom Garden's boss (the designer: "try floor 2 Boss 'The Swarm'"; spec
// MD/the-knot-3d-boss.md): its worms settle into a heap round its eye and stay sound (nothing through the floor, the eye
// or each other, each worm holding its length); the grid tests far fewer pairs than all of them and misses none; a tick
// of its worms is cheap; its lashes are told before they land and hurt you once; a punch lands on the worm in the way
// (a jab kills one, its share off the bar; a lighter blow only hurts it), through a gap on the eye (all of it); a big
// blow tears out several; dead, its worms drop and its body bursts. Drawn: its tubes and eye, gone once it's burst.
// (The designer, same update: "make the worm models 2 times smaller and increase the amount".)
import * as THREE from 'three';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';
import type { CombatEvent } from '../src/sim/combat/state';
import { createCombat } from '../src/sim/combat/state';
import { collide, createSwarmBody, DEAD, livingWorm, MASS, seedSwarm, stepSwarm } from '../src/sim/enemies/swarmBody';
import { swarmEyeHeight } from '../src/sim/enemies/swarmHits';
import { createEnemies, hitEnemy, isLive, radiusOf, spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf, doomTime, ENEMY_STATS, ownBossOf } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { SWARM } from '../src/tuning/swarm';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { SwarmView } from '../src/engine/swarm/swarmView';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = SWARM.v;

section('The Swarm — its worms (the reel’s maths)');
{
  const s = createSwarmBody();
  const EY = 1.4;
  seedSwarm(s, 0, EY, 0, createRng(11));
  check(`${s.worms} worms of ${s.beads} beads round its eye`, s.worms === v.worms && s.beads === v.beads && s.alive === s.worms);
  const t0 = performance.now();
  const steps = ticks(2) / 2;
  for (let k = 0; k < steps; k++) stepSwarm(s, 0, EY, 0, 0, -6, null, DT * 2);
  const ms = (performance.now() - t0) / steps;
  const n = s.worms * s.beads;
  let bad = 0;
  let below = 0;
  let inEye = 0;
  let far = 0;
  let stretch = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(s.x[i] + s.y[i] + s.z[i])) bad++;
    if (s.y[i] < s.r[i] - 1e-3) below++;
    const d = Math.hypot(s.x[i], s.y[i] - EY, s.z[i]);
    if (d < v.eye + s.r[i] - 0.02) inEye++;
    far = Math.max(far, d);
  }
  for (let w = 0; w < s.worms; w++)
    for (let b = 0; b < s.beads - 1; b++) {
      const i = w * s.beads + b;
      stretch = Math.max(stretch, Math.abs(Math.hypot(s.x[i + 1] - s.x[i], s.y[i + 1] - s.y[i], s.z[i + 1] - s.z[i]) - v.segment));
    }
  check('after 2 s settling: sound (no bead lost)', bad === 0);
  check('nothing through the floor, nothing in the eye', below === 0 && inEye === 0, `${below} under, ${inEye} in`);
  check(`a heap round it (out to ${far.toFixed(2)} m)`, far < v.eye + v.shell + 1.2 && far > v.eye + 0.3);
  check(`each worm holds its length (within ${(stretch * 100).toFixed(1)} cm of ${v.segment * 100} cm)`, stretch < v.segment * 0.5);
  // The grid against every pair: it tests far fewer, and no worm passes through another (its colliding beads, every
  // other one, a ball half a spacing bigger: none of those deep in another; no bead's middle inside another's).
  const checks = collide(s);
  const grow = v.segment / 2;
  const balls = (b: number) => b % 2 === 0 || b === s.beads - 1;
  let over = 0;
  let through = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const wi = Math.floor(i / s.beads);
      const wj = Math.floor(j / s.beads);
      if (wi === wj && j - i <= 2) continue;
      const d = Math.hypot(s.x[i] - s.x[j], s.y[i] - s.y[j], s.z[i] - s.z[j]);
      if (balls(i - wi * s.beads) && balls(j - wj * s.beads) && d < (s.r[i] + s.r[j] + 2 * grow) * 0.7) over++;
      if (d < (s.r[i] + s.r[j]) * 0.4) through++;
    }
  // (Its worms step 60 times a second, colliding once a step: a stray pair may sit deep a moment, never more.)
  check(`the grid tests ${checks} pairs, not all ${((n * (n - 1)) / 2).toLocaleString('en')}, and no worm passes through another`, checks < (n * n) / 20 && over <= n / 200 && through <= n / 200, `${over} deep, ${through} through`);
  check(`a step of its worms is cheap (${ms.toFixed(2)} ms; 60 a second)`, ms < 4);
}

const events = new EventQueue<CombatEvent>(1024, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

function fight(playerZ: number) {
  const w = arenaWorld(events);
  const p = createPlayer(0, 0, playerZ, 0);
  p.grounded = true;
  const all = createEnemies();
  spawnEnemy(all, 'swarm', new THREE.Vector3(0, 0, 0), 0);
  events.clear();
  const e = all[0];
  return { w, p, all, e };
}
function run(f: ReturnType<typeof fight>, secs: number) {
  const seen: { kind: string; t: number }[] = [];
  let hurtAt = -1;
  let lost = 0;
  for (let i = 0; i < ticks(secs); i++) {
    const hp = f.p.hp;
    updateEnemies(f.all, f.p, f.w, OPEN_WORLD, DT);
    for (const k of kinds()) seen.push({ kind: k, t: (i + 1) * DT });
    events.clear();
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    if (f.p.hp < hp) {
      lost += hp - f.p.hp;
      if (hurtAt < 0) hurtAt = (i + 1) * DT;
    }
  }
  return { seen, hurtAt, lost };
}

section('The Swarm — the Venom Garden’s boss');
{
  const s = ENEMY_STATS.swarm();
  check(`floor 2’s own boss: a boss of ${s.hp} health, never staggered`, bossOf(FLOOR.garden) === 'swarm' && ownBossOf(FLOOR.garden) === 'swarm' && s.boss && s.stagger === Infinity);
  const f = fight(-4);
  f.e.cooldown = 0.2;
  const r = run(f, 3);
  const wind = r.seen.find((x) => x.kind === 'swarmWindup');
  const lash = r.seen.find((x) => x.kind === 'swarmLash');
  check('it seeds its heap round its eye', !!f.e.swarm?.seeded && f.e.swarm.alive === v.worms);
  check(`its worms wind up (glowing), then whip ${v.lashWindup} s later`, !!wind && !!lash && lash.t - wind.t >= v.lashWindup - 0.02);
  check(`a lash hurts you (${v.lashDamage}), never before its wind-up is done`, r.hurtAt > 0 && !!wind && r.hurtAt >= wind.t + v.lashWindup - 0.02 && r.lost >= v.lashDamage && r.seen.some((x) => x.kind === 'swarmBite'));
}

section('The Swarm — punching it');
{
  const f = fight(-6);
  // (Update 0.3.51 — settled at its distance: a drifting heap trails behind its eye. No moves of its eye, no lash.)
  f.e.cooldown = 99;
  f.e.swarm!.seeded || run(f, DT);
  f.e.swarm!.lashIn = 99;
  run(f, 2.5);
  f.e.cooldown = 99;
  const s = f.e.swarm!;
  const hp0 = f.e.hp;
  const eyeY = swarmEyeHeight();
  // A jab on your side of the heap, at its edge, pushing in.
  const at = new THREE.Vector3(f.e.pos.x, eyeY, f.e.pos.z - radiusOf(f.e));
  const share = (v.wormShare * v.swarmHp) / v.worms;
  // A lighter blow than a worm's health only hurts the worm in the way: the bar holds.
  const light = Math.max(1, v.wormHp - 2);
  hitEnemy(f.e, light, 1, 0, 1, false, at);
  const struck = Array.from({ length: s.worms }, (_, k) => k).find((k) => s.flash[k] > 0);
  check('a light blow lands on the worm in the way, not the eye: the bar holds', struck !== undefined && f.e.hp === hp0 && s.hp[struck!] === v.wormHp - light);
  // A jab (7) kills one: its share off the bar, its gore told.
  run(f, 0.2);
  const alive0 = s.alive;
  const hp1 = f.e.hp;
  // (At its edge where it is now: it has drifted.)
  at.set(f.e.pos.x, eyeY, f.e.pos.z - radiusOf(f.e));
  hitEnemy(f.e, 7, 1, 0, 1, false, at);
  run(f, 0.05);
  const killed = alive0 - s.alive;
  check(`a jab kills a worm: its share (${share.toFixed(1)}) off the bar`, killed === 1 && Math.abs(hp1 - f.e.hp - share) < 1e-6, `${killed} killed, ${(hp1 - f.e.hp).toFixed(2)} off`);
  // A charged punch (60) tears out several.
  const before = s.alive;
  const hpB = f.e.hp;
  hitEnemy(f.e, 60, 1, 0, 1, false, new THREE.Vector3(0.3, eyeY + 0.3, -radiusOf(f.e)));
  run(f, 0.05);
  check(`a charged punch tears out several worms (${before - s.alive})`, before - s.alive >= 5 && f.e.hp < hpB);
  // Every worm on your side gone: through the gap, the eye takes it all.
  for (let k = 0; k < s.worms; k++) {
    if (!livingWorm(s, k)) continue;
    let near = false;
    for (let b = 0; b < s.beads; b++) if (s.z[k * s.beads + b] < 0.3) near = true;
    if (near) {
      s.state[k] = DEAD;
      s.t[k] = 0;
    }
  }
  run(f, 0.1);
  const hpE = f.e.hp;
  events.clear();
  hitEnemy(f.e, 10, 1, 0, 1, false, new THREE.Vector3(0, eyeY, -(v.eye + 0.4)));
  run(f, 0.02);
  check('through a gap, the eye takes the whole blow (and bleeds)', Math.abs(hpE - f.e.hp - 10) < 1e-6);
  check(`thinned, its reach comes in towards the eye (${radiusOf(f.e).toFixed(2)} m)`, radiusOf(f.e) < v.eye + v.shell);
  // Killed: its worms drop off in a wave, then its body bursts.
  hitEnemy(f.e, 1e6, 0, 0, 1, false, new THREE.Vector3(0, eyeY, -(v.eye + 0.2)));
  check('killed through the eye', !isLive(f.e) && f.e.phase === 'dead');
  const r = run(f, 1.6);
  const left = Array.from({ length: s.worms }, (_, k) => k).filter((k) => s.state[k] === MASS).length;
  check('its worms drop off the heap', left === 0);
  const end = run(f, doomTime());
  check('and its body bursts (once)', end.seen.filter((x) => x.kind === 'bossBurst').length + r.seen.filter((x) => x.kind === 'bossBurst').length === 1);
}

section('The Swarm — floor 2’s boss room');
{
  const level = buildDungeon(planFloor(4242, FLOOR.garden));
  const b = level.boss;
  const room = level.rooms[b.room];
  const run0 = createDungeonRun(level);
  check('floor 2’s boss run is The Swarm’s', run0.boss.kind === 'swarm');
  const combat = createCombat(level.arena, false);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const rng = createRng(3);
  const tick = (secs: number) => {
    for (let i = 0; i < ticks(secs); i++) {
      stepRooms(run0, p, combat, rng, DT);
      updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
      combat.events.clear();
    }
  };
  const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
  const half = (room.max.x - room.min.x) / 2;
  p.pos.set((room.min.x + room.max.x) / 2 + ex * (half - 3), 0, (room.min.z + room.max.z) / 2 + ez * (half - 3));
  tick(DT);
  const s = introBeats();
  tick(s.riseTo);
  const boss = combat.enemies[run0.boss.slot];
  check('it rises out of the portal, its heap round it', run0.boss.slot >= 0 && boss.kind === 'swarm' && !!boss.swarm?.seeded && boss.phase === 'intro');
  tick(s.end - s.riseTo + 0.1);
  const sw = boss.swarm!;
  let under = 0;
  for (let i = 0; i < sw.worms * sw.beads; i++) if (sw.y[i] < sw.r[i] - 1e-3 || !Number.isFinite(sw.y[i])) under++;
  check('then the fight starts, every worm above the grove’s floor', run0.boss.beat === 'fight' && boss.phase === 'chase' && under === 0, `${under} under`);
}

section('The Swarm — drawn');
{
  const scene = new THREE.Scene();
  const view = new SwarmView(scene);
  const combat = createCombat({ name: 'x', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] }, false);
  const i = spawnEnemy(combat.enemies, 'swarm', new THREE.Vector3(0, 0, -8), 0);
  const p = createPlayer(0, 0, 0, 0);
  const w = { ...combat };
  for (let k = 0; k < ticks(0.5); k++) updateEnemies(combat.enemies, p, w, OPEN_WORLD, DT);
  view.update(combat, new THREE.Vector3(0, 1.6, 0), 0.5, DT);
  const pos = (view.group.children[0] as THREE.Mesh).geometry.getAttribute('position');
  let finite = true;
  for (let k = 0; k < Math.min(pos.count, 20000); k++) finite &&= Number.isFinite(pos.getX(k) + pos.getY(k) + pos.getZ(k));
  const box = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
  check('its worms drawn as tubes round its eye', view.group.visible && finite && box.max.z > -8 && box.min.z < -8 && box.max.y > 1);
  hitEnemy(combat.enemies[i], 1e6, 0, 0, 1);
  for (let k = 0; k < ticks(doomTime() + 0.1); k++) updateEnemies(combat.enemies, p, w, OPEN_WORLD, DT);
  view.update(combat, new THREE.Vector3(0, 1.6, 0), 0.5, DT);
  check('gone once its body has burst', !view.group.visible);
  view.dispose();
}
