// Update 0.3.29 — the Moon's boss, Tidebreaker (the designer: "Alien as Moon boss"; "It's the last boss before the last
// boss, make sure it is intense and full destructions, maybe they can grab a pillar … can shake the whole place"): it's
// the Moon's own, in the bosses' range, named, its model and every clip; each move (its smash and its shockwave, its
// combo and finisher, its uppercut throwing you high, its leap landing where you stood, ringing out, snapping pillars and
// shaking rock down, its boulder ripped up and hurled, a pillar torn out, swung and hurled (Update 0.3.30 — no shell roll), its quake's rings snapping every pillar near and bringing rock down);
// its rage and frenzy; its rock falling as meteors do, sparing it.
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { at, crew, run, until } from './fakes/crewMeet';
import { bossOf, ENEMY_STATS, ownBossOf } from '../src/sim/enemies/kinds';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { COMBO, HURL, LEAP, QUAKE, SMASH, THROW, UPPERCUT } from '../src/sim/enemies/tidebreaker';
import { goForPillar } from '../src/sim/enemies/tideWreck';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { stepMeteors } from '../src/sim/dungeon/meteors';
import { PILLAR_CUT, type Pillar } from '../src/sim/combat/pillars';
import { maxHpOf } from '../src/sim/player/health';
import { TIDEBREAKER } from '../src/tuning/tidebreaker';
import { MOON } from '../src/tuning/moon';
import { LOOKS } from '../src/engine/enemyLooks';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { causeName } from '../src/screens/deathText';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { ArenaBox, boxAt } from '../src/world/arena';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { Vector3 } from 'three';
import { createRng } from '../src/core/rng';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createPlayer } from '../src/sim/player/state';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = TIDEBREAKER.v;
/** Pillars standing at `spots` (5 m, 2 m across), as a floor's columns are. */
function pillared(dist: number, move: number, spots: [number, number][] = []) {
  const boxes: ArenaBox[] = spots.map(([x, z]) => boxAt(x - 1, 0, z - 1, 2, 5, 2, 'wall'));
  const m = crew('tidebreaker', [at(0, 0, -dist)], boxes);
  m.c.pillars = spots.map(([x, z], i): Pillar => ({ x, z, half: 1, h: 5, box: boxes[i], broken: false, yaw: 0, room: 0, lie: { x: 0, z: 0, yaw: 0 }, stump: null, top: null }));
  m.e.move = move;
  setPhase(m.e, 'windup');
  return m;
}
const meet = (dist: number, move: number) => pillared(dist, move);
const lost = (m: ReturnType<typeof crew>) => maxHpOf(m.p) - m.p.hp;
const count = (seen: string[], k: string) => seen.filter((x) => x === k).length;

section('Tidebreaker — the Moon’s boss');
{
  check('the Moon’s boss is its own: Tidebreaker', bossOf(FLOOR.moon) === 'tidebreaker' && ownBossOf(FLOOR.moon) === 'tidebreaker' && BOSS_NAMES.tidebreaker === 'TIDEBREAKER' && causeName('tidebreaker') === 'Tidebreaker');
  const s = ENEMY_STATS.tidebreaker();
  check(`a boss in the bosses’ range (${s.hp}: the Drowned King 1400), huge, its coins in its chest`, s.boss && s.hp >= 700 && s.hp <= 1400 && s.height >= 5 && s.size === 'large' && bossCoins('tidebreaker') === v.tideCoins);
  const look = LOOKS.tidebreaker!;
  const glb = readFileSync(`public${look.url}`);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string }[]; images?: { mimeType: string }[] };
  const clips = [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map(([c]) => c)];
  const missing = clips.filter((c) => !json.animations?.some((a) => a.name === c));
  check(`its model (the Bestiary’s alien, UAL clips baked on) has every clip it plays (${json.animations?.length}), textured`, look.url.endsWith('tidebreaker.glb') && missing.length === 0 && (json.images?.length ?? 0) >= 2, missing.join(', '));
  check('each warning plays its clip up to its blow (a share of it, the rest after)', [SMASH, UPPERCUT, HURL].every((k) => (look.moveClips?.[`windup:${k}`]?.[2] ?? 1) < 1) && !!look.moveClips?.[`recover:${SMASH}`]);
}

section('Tidebreaker — close: its anchor');
{
  const sm = meet(5, SMASH);
  const r = until(sm, () => sm.e.phase === 'recover', 2);
  check(`its smash (${v.smashDamage}), and a shockwave runs out along the floor`, r.includes('tideSmash') && lost(sm) === v.smashDamage && sm.c.quakes.some((q) => q.alive && q.by === 'tidebreaker'), `${lost(sm)}`);
  const c0 = meet(5, COMBO);
  const r0 = until(c0, () => c0.e.phase === 'recover', 3);
  const c1 = meet(5, COMBO);
  c1.e.stage = 1;
  const r1 = until(c1, () => c1.e.phase === 'recover', 4);
  check('its combo: two swings; raging, a finisher that smashes too', count(r0, 'tideSwing') === 2 && !r0.includes('tideSmash') && count(r1, 'tideSwing') === 2 && r1.includes('tideSmash'), `${count(r0, 'tideSwing')}, ${count(r1, 'tideSwing')}`);
  const u = meet(3, UPPERCUT);
  until(u, () => u.e.phase === 'recover', 2, () => {});
  const up = u.p.vel.y;
  check(`right in front, its uppercut (${v.uppercutDamage}) throws you high`, lost(u) === v.uppercutDamage && up >= v.uppercutLaunch * 0.9, `${lost(u)}, ${up.toFixed(1)} m/s`);
}

section('Tidebreaker — across the room');
{
  const l = pillared(18, LEAP, [[3, 2]]);
  let top = 0;
  const rl = until(l, () => l.e.phase === 'recover', 4, () => (top = Math.max(top, l.e.pos.y)));
  check(`its leap: up (${v.leapHeight} m), down where you stood; ${v.landDamage} to you on the ground`, rl.includes('tideLeap') && rl.includes('tideLand') && top > v.leapHeight * 0.8 && Math.hypot(l.e.pos.x, l.e.pos.z) < 2.5 && lost(l) === v.landDamage, `${top.toFixed(1)} m, ${lost(l)}`);
  check(`landing, it rings out, snaps the pillar beside it and shakes rock down near you (${v.landRocks})`, l.c.quakes.some((q) => q.alive) && l.c.pillars[0].broken && rl.includes('pillarBreak') && l.c.ground.rocks.length >= v.landRocks);
  const t = meet(12, THROW);
  const rt = until(t, () => t.e.phase === 'recover', 4);
  const b = t.c.bombs.find((x) => x.alive && x.look === 'boulder');
  check('its boulder: ripped out of the ground, then hurled high at where you’ll be', rt.includes('tideRip') && rt.includes('tideHurl') && !!b && Math.hypot(b.to.x, b.to.z) < 2.5);
  const rb = run(t, v.boulderFall + 0.2).seen;
  check(`smashing where it lands (${v.boulderDamage})`, rb.includes('boulderSmash') && lost(t) === v.boulderDamage, `${lost(t)}`);
}

section('Tidebreaker — a pillar torn out');
{
  const m = pillared(10, SMASH, [[0, -7]]);
  setPhase(m.e, 'chase');
  const went = goForPillar(m.e, m.c);
  const ripped = until(m, () => m.e.deeds > 0, 6);
  const p = m.c.pillars[0];
  check('it goes to a pillar near it, kneels and tears it out of the floor (its stump left)', went && ripped.includes('pillarGrab') && p.broken && !!p.stump && near(p.stump.h, p.h * PILLAR_CUT, 1e-6) && p.top === null && m.e.deeds === 1);
  // (You beside it, in its reach.)
  m.p.pos.set(m.e.pos.x - Math.sin(m.e.facing) * 6, 0, m.e.pos.z - Math.cos(m.e.facing) * 6);
  const hp = m.p.hp;
  const sw = until(m, () => m.c.bombs.some((x) => x.alive && x.look === 'pillar'), 4, () => m.p.pos.set(m.e.pos.x - Math.sin(m.e.facing) * 6, 0, m.e.pos.z - Math.cos(m.e.facing) * 6));
  check(`swung down at you (${v.swingDamage}), then hurled`, sw.includes('pillarSwing') && hp - m.p.hp >= v.swingDamage && sw.includes('tideHurl') && m.e.deeds === 0, `${hp - m.p.hp}`);
  const cr = run(m, v.pillarFall + 0.2).seen;
  check('smashing where it lands', cr.includes('pillarCrash'));
  const none = pillared(10, SMASH);
  setPhase(none.e, 'chase');
  check('no pillar near: it doesn’t go for one', !goForPillar(none.e, none.c));
}

section('Tidebreaker — its quake, its rage');
{
  const q = pillared(6, QUAKE, [[4, -6], [-6, -2], [20, 20]]);
  q.e.stage = 1;
  const rq = until(q, () => q.e.phase === 'recover', 4);
  check(`raging, its quake: ${v.quakeRings} rings one after another`, count(rq, 'tideQuake') === Math.round(v.quakeRings), `${count(rq, 'tideQuake')}`);
  check(`every pillar within ${v.quakeBreaks} m snaps (not one further), rock shaken down round you (${v.quakeRocks})`, q.c.pillars[0].broken && q.c.pillars[1].broken && !q.c.pillars[2].broken && q.c.ground.rocks.length >= v.quakeRocks);
  const r = crew('tidebreaker', [at(0, 0, -9)]);
  r.e.hp = ENEMY_STATS.tidebreaker().hp * v.rageAt * 0.95;
  const roar = until(r, () => r.e.phase === 'recover', 3);
  check('below its rage: a roar, raging, rock shaken down', roar.includes('tideRoar') && r.e.stage === 1 && r.c.ground.rocks.length >= 4);
  r.c.ground.rocks.length = 0;
  run(r, v.rockEvery * 2 + 0.2, () => r.p.pos.set(0, 0, 0));
  check('raging, rock comes down near you now and then', r.c.ground.rocks.length >= 2 || r.e.phase !== 'chase');
  r.e.hp = ENEMY_STATS.tidebreaker().hp * v.frenzyAt * 0.9;
  const f = until(r, () => r.e.stage === 2 && r.e.phase === 'recover', 12, () => r.p.pos.set(0, 0, 0));
  check('below its frenzy: another roar, frenzied', f.includes('tideRoar') && r.e.stage === 2);
  const pk = crew('tidebreaker', [at(0, 0, -9)], [], 7);
  let rolled = false;
  const seen = run(pk, 60, (i) => {
    rolled ||= pk.e.move === 8;
    pk.p.pos.set(0, 0, i % 900 < 450 ? -4 : 20);
    pk.p.vel.set(0, 0, 0);
    pk.p.hp = maxHpOf(pk.p);
  }).seen;
  const kinds = new Set(seen.filter((k) => ['tideSmash', 'tideSwing', 'tideUppercut', 'tideLeap', 'tideRip', 'pillarGrab'].includes(k)));
  check('it keeps warning and moving, picking among its moves by where you are', count(seen, 'tideWindup') >= 10 && kinds.size >= 4, `${count(seen, 'tideWindup')} warnings; ${[...kinds].join(', ')}`);
  // (Update 0.3.30 — the designer: "remove the spinning attack": its shell roll.)
  check('it never curls up to roll (its shell roll gone, its clips too)', !rolled && !Object.values(LOOKS.tidebreaker!.moveClips ?? {}).some(([c]) => c === 'Shell' || c === 'Roll'));
}

section('Tidebreaker — its rock falls as meteors do');
{
  const m = crew('tidebreaker', [at(1, 0, 1)]);
  m.c.ground.rocks.push({ x: 0, z: 0, delay: 0.3 });
  const meteors = { rooms: [false], clock: 9, falling: [], marks: [], hell: false };
  let warned = false;
  let struck = false;
  const hp = m.p.hp;
  const boss = m.e.hp;
  for (let i = 0; i < ticks(0.3 + MOON.v.meteorWarn + 0.2); i++) {
    stepMeteors(meteors, -1, false, m.p, m.c, DT);
    for (let k = 0; k < m.c.events.length; k++) {
      warned ||= m.c.events.at(k).kind === 'meteorWarn';
      struck ||= m.c.events.at(k).kind === 'meteorStrike';
    }
    m.c.events.clear();
  }
  check('called down, warned as a meteor is, then it strikes: you hurt, it spared', warned && struck && hp - m.p.hp === MOON.v.meteorDamage && m.e.hp === boss, `${hp - m.p.hp}, ${boss - m.e.hp}`);
}

section('Tidebreaker — in its arena, the place comes down');
{
  // Two minutes in the Moon's boss room with you circling it (unhurt): it tears the place apart. (Update 0.3.31 — the room
  // twice a boss room, 28 pillars: those near the fight come down.)
  const level = buildDungeon(planFloor(31, FLOOR.moon));
  const room = level.rooms[level.boss.room];
  const mx = (room.min.x + room.max.x) / 2;
  const mz = (room.min.z + room.max.z) / 2;
  const c = createCombat(level.arena);
  c.rng = createRng(4);
  const inRoom = c.pillars.filter((q) => q.x > room.min.x && q.x < room.max.x && q.z > room.min.z && q.z < room.max.z);
  const slot = spawnEnemy(c.enemies, 'tidebreaker', new Vector3(mx, 0, mz), 0);
  const e = c.enemies[slot];
  const p = createPlayer(mx + 12, 0, mz, 0);
  p.grounded = true;
  const flat = new FlatWorld();
  const seen = new Set<string>();
  let rocks = 0;
  let ok = true;
  for (let i = 0; i < ticks(120); i++) {
    const a = i * DT * 0.35;
    p.pos.set(mx + Math.cos(a) * 14, 0, mz + Math.sin(a) * 14);
    p.vel.set(0, 0, 0);
    p.hp = maxHpOf(p);
    p.dead = false;
    if (i === ticks(40)) e.hp = ENEMY_STATS.tidebreaker().hp * v.rageAt * 0.9;
    stepCombat(c, p, emptyCombatIntent(), flat, DT);
    rocks += c.ground.rocks.length;
    c.ground.rocks.length = 0;
    for (let k = 0; k < c.events.length; k++) seen.add(c.events.at(k).kind);
    c.events.clear();
    ok &&= Number.isFinite(e.pos.x + e.pos.y + e.pos.z) && e.alive;
  }
  const broken = inRoom.filter((q) => q.broken).length;
  check(`its arena’s ${inRoom.length} pillars: it tears them down (${broken}), one torn out and hurled`, inRoom.length === 28 && broken >= 4 && seen.has('pillarGrab') && seen.has('pillarCrash'), `${broken} broken; ${[...seen].filter((k) => k.startsWith('pillar')).join(', ')}`);
  check('raging, its quakes and rock (it keeps fighting the whole while, in its room)', seen.has('tideQuake') && seen.has('tideRoar') && rocks >= 10 && ok && e.pos.x > room.min.x && e.pos.x < room.max.x && e.pos.z > room.min.z && e.pos.z < room.max.z, `${rocks} rock; quake ${seen.has('tideQuake')}, roar ${seen.has('tideRoar')}, ok ${ok}`);
}
