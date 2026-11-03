// Update 0.3.16 — floor 6's boss, the Big Shark (spec MD_UPDATES/U0316_BIG_SHARK.md): its arena (walls half again as
// high, its water nearly to their top), its show (the flood, its swim, its leap slowed, its name), and its moves: the
// lunge and the snap you escape with move left / move right (the designer's), the swallow you break with your hands on
// its jaws and a punch to its throat (the designer's), its tail, its teeth in a wall, its frenzy. Then (after the
// designer played it) its arena of open water, its circle kept off the walls, no lunge into a wall behind you, its feint.
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { check, section } from './harness';
import { at, crew, Crew, DT, run, until } from './fakes/crewMeet';
import { ticks } from './fakes/flatWorld';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { grabRules } from '../src/sim/combat/grab';
import { createCombat } from '../src/sim/combat/state';
import { createBossRun, startShow, stepBoss, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { sharkBeats, sharkSea, sharkSlow, SWIM_FROM } from '../src/sim/dungeon/sharkShow';
import { FEINT, jawCue, LUNGE, openAt, openMiddle, roomPast, SNAP, SWALLOW, TAIL, startFeint, startLunge, startSnap, startSwallow } from '../src/sim/enemies/bigSharkMoves';
import { hitEnemy, isLive } from '../src/sim/enemies/enemy';
import { bossOf, ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { maxHpOf } from '../src/sim/player/health';
import { createRng } from '../src/core/rng';
import { LOOKS } from '../src/engine/enemyLooks';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { causeName } from '../src/screens/deathText';
import { BIG_SHARK } from '../src/tuning/bigShark';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const v = BIG_SHARK.v;
const free = () => undefined;

section('Floor 6 — the Big Shark');
{
  check('it’s floor 6’s boss: THE BIG SHARK', bossOf(FLOOR.cove) === 'bigShark' && BOSS_NAMES.bigShark === 'THE BIG SHARK' && ENEMY_STATS.bigShark().boss && causeName('bigShark') === 'The Big Shark');
  check(`never tankier: ${v.bigHp} health, no more than the floor before’s boss (the Drowned King’s ${ENEMY_STATS.drownedKing().hp})`, ENEMY_STATS.bigShark().hp <= ENEMY_STATS.drownedKing().hp);
  const look = LOOKS.bigShark!;
  const b = readFileSync(`public${look.url}`);
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as { animations: { name: string }[]; nodes: { name: string }[] };
  check('its model (the Pirate Kit’s Shark): its clips, and its jaw and head for your hands', Object.values(look.clips).every((c) => json.animations.some((a) => a.name === c)) && ['Head', 'LowerJaw', 'Neck'].every((n) => json.nodes.some((x) => x.name === n)));
}

section('Floor 6 — the Big Shark’s arena');
{
  const plan = planFloor(3, FLOOR.cove);
  const level = buildDungeon(plan);
  const r = plan.rooms.find((x) => x.kind === 'boss')!;
  const room = level.rooms.find((x) => x.kind === 'boss')!;
  const high = level.arena.boxes.filter((x) => x.kind === 'wall' && Math.abs(x.y - x.h / 2 - 6) < 0.01 && Math.abs(x.y + x.h / 2 - 9) < 0.01);
  check('its walls half again as high: solid to 9 m all round it (over its doorways too)', high.length === 4 && high.every((x) => x.w >= 2 || x.d >= 2));
  const d = dress(plan);
  const caps = d.pieces.filter((p) => p.piece === d.style.cap);
  const tallCaps = caps.filter((p) => Math.abs(p.y - 9) < 0.01);
  const near = (p: { x: number; z: number }) => p.x > room.min.x - 3 && p.x < room.max.x + 3 && p.z > room.min.z - 3 && p.z < room.max.z + 3;
  check('drawn so: four and a half rows of wall, capped at 9 m, round it; three, capped at 6 m, elsewhere', tallCaps.length > 10 && tallCaps.every(near) && caps.some((p) => Math.abs(p.y - 6) < 0.01 && !near(p)), `${tallCaps.length} tall caps`);
  check(`its water fills it to ${v.floodTop} m, under its walls`, v.floodTop < 9 && r.layout.w > 0);
  const b = createBossRun('bigShark');
  check('no walls sliding back, no portal: it’s whole when you walk in', wallsOpen(b) === 1);
}

section('Floor 6 — the Big Shark’s show');
{
  const c = createCombat(OPEN_ARENA);
  c.rng = createRng(4);
  const p = createPlayer(0, 0, 14, 0);
  const b = createBossRun('bigShark');
  const portal = { x: 0, z: 0 };
  startShow(b, c, portal);
  const s = sharkBeats();
  const seen: string[] = [];
  let flooded = -1;
  let slowest = 1;
  let spawnedAt = -1;
  for (let i = 0; i < ticks(s.end + 0.5) && b.beat === 'intro'; i++) {
    stepBoss(b, portal, [], p, c, c.rng, DT);
    for (let k = 0; k < c.events.length; k++) seen.push(c.events.at(k).kind);
    c.events.clear();
    if (flooded < 0 && c.flood >= v.floodTop - 0.01) flooded = b.t;
    if (spawnedAt < 0 && b.slot >= 0) spawnedAt = b.t;
    slowest = Math.min(slowest, sharkSlow(b));
  }
  check(`stepping in, the arena floods to the top (${v.showFlood} s)`, seen.includes('bigSharkFlood') && Math.abs(flooded - v.showFlood) < 0.15, flooded.toFixed(2));
  check('the shark comes in as it fills, under the water, placed by the show', spawnedAt > 0 && spawnedAt < s.swimTo && b.slot >= 0);
  check('it leaps out of the water and crashes back in', seen.includes('bigSharkBreach') && seen.includes('bigSharkSplash') && seen.indexOf('bigSharkBreach') < seen.indexOf('bigSharkSplash'));
  check(`slowed mid-leap (×${v.showSlow})`, Math.abs(slowest - v.showSlow) < 0.01);
  check('then the fight', b.beat === 'fight' && c.enemies[b.slot].phase === 'chase');
  check(`you swim in its water (from ${SWIM_FROM} m deep)`, sharkSea(b, c.flood) === v.floodTop && sharkSea(createBossRun('dino'), 5) === 0);
  hitEnemy(c.enemies[b.slot], 1e6, 0, 0, 0);
  for (let i = 0; i < ticks(v.drainTime + 1); i++) {
    stepBoss(b, portal, [], p, c, c.rng, DT);
    c.events.clear();
  }
  check(`dead, its arena drains (${v.drainTime} s)`, b.beat !== 'fight' && c.flood === 0);
}

/** The shark at `where`, about to move; you at the middle (in its water). */
function meet(where: Vector3, seed = 5): Crew {
  const m = crew('bigShark', [where], [], seed);
  m.c.tide = v.floodTop;
  m.p.pos.set(0, 2, 0);
  m.p.grounded = false;
  m.e.cooldown = 99;
  return m;
}
/** Steps until `done` (at most `secs`), pressing sideways once with `press` when the arrow shows. */
function answer(m: Crew, press: number, done: () => boolean, secs: number) {
  const seen: string[] = [];
  let pressed = false;
  for (let i = 0; i < ticks(secs) && !done(); i++) {
    m.p.strafePressed = !pressed && jawCue(m.e) !== 0 ? press : 0;
    if (m.p.strafePressed !== 0) pressed = true;
    seen.push(...run(m, DT, free).seen);
    m.p.strafePressed = 0;
  }
  return seen;
}

section('Floor 6 — the Big Shark’s jaws: move left, move right');
{
  const m = meet(at(-10, 1, 0));
  startLunge(m.e, 0, m.c);
  const side = m.e.blink;
  const r = answer(m, side, () => m.e.phase === 'recover' || m.e.phase === 'stun', 3);
  check(`its lunge: the arrow shows as its jaws come (${v.dodgeWindow} s before); press that way and you’re thrown clear, unhurt`, m.e.move !== LUNGE && r.includes('bigSharkEscape') && !r.includes('bigSharkBite') && m.p.hp === maxHpOf(m.p));
  const w = meet(at(-10, 1, 0));
  startLunge(w.e, 0, w.c);
  const rw = answer(w, -w.e.blink, () => w.e.phase === 'recover' || w.e.phase === 'stun', 3);
  check(`press the wrong way and you can’t escape it: bitten (${v.lungeDamage})`, rw.includes('bigSharkFumble') && rw.includes('bigSharkBite') && maxHpOf(w.p) - w.p.hp === v.lungeDamage);
  const n = meet(at(-10, 1, 0));
  startLunge(n.e, 0, n.c);
  const rn = answer(n, 0, () => n.e.phase === 'recover' || n.e.phase === 'stun', 3);
  check('don’t answer and you’re bitten', rn.includes('bigSharkBite') && !rn.includes('bigSharkEscape'));
  const s = meet(at(-9, 1, 3));
  startSnap(s.e, 0, s.p, s.c);
  until(s, () => s.e.phase === 'charge', 3, free);
  const away = Math.sign(Math.cos(s.p.yaw) * (s.p.pos.x - s.e.pos.x) - Math.sin(s.p.yaw) * (s.p.pos.z - s.e.pos.z));
  check('its snap: it swims past close and swings its head back; the arrow points away from it', s.e.move === SNAP && jawCue(s.e) === away);
  const rs = answer(s, s.e.blink, () => s.e.phase === 'recover', 2);
  check('press that way and its snap misses you', rs.includes('bigSharkEscape') && rs.includes('bigSharkSnap') && s.p.hp === maxHpOf(s.p));
  const t = meet(at(-10, 1, 0));
  startSnap(t.e, 0, t.p, t.c);
  const rt = answer(t, 0, () => t.e.phase === 'recover', 4);
  check(`don’t, and it bites (${v.snapDamage})`, rt.includes('bigSharkSnap') && maxHpOf(t.p) - t.p.hp === v.snapDamage);
}

/** Steps `secs` with your attack pressed every `every` s: what was seen. */
function click(m: Crew, secs: number, every: number): string[] {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs); i++) {
    const intent = emptyCombatIntent();
    intent.attackPressed = i % ticks(every) === 0;
    stepCombat(m.c, m.p, intent, m.world, DT);
    m.p.hurtTime = 0;
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return seen;
}

section('Floor 6 — the Big Shark’s swallow: your hands on its jaws');
{
  const m = meet(at(-10, 1, 0));
  startSwallow(m.e, 0, m.p, m.c);
  const r = until(m, () => m.c.grab.on, v.swallowWarn + 3, free);
  check(`it backs off, jaws wide (${v.swallowWarn} s), and charges to swallow you: caught, its jaws hold you, the world still`, r.includes('bigSharkJaws') && r.includes('bigSharkCatch') && m.c.grab.on && m.e.phase === 'grab' && grabRules(m.c).hits === v.holdHits && grabRules(m.c).time === v.holdTime);
  const hp = m.e.hp;
  const rc = click(m, v.holdTime, 0.12);
  check(`click ${v.holdHits} times (your hands forcing its jaws) and you punch its throat (${v.throatDamage}): stunned, it spits you out`, rc.includes('bigSharkThroat') && m.e.hp === hp - v.throatDamage && m.e.phase === 'stun' && !m.c.grab.on && m.c.grab.end === 'free' && m.p.hp === maxHpOf(m.p));
  const e = meet(at(-10, 1, 0));
  startSwallow(e.e, 0, e.p, e.c);
  until(e, () => e.c.grab.on, v.swallowWarn + 3, free);
  const re = click(e, v.holdTime + 0.5, 99);
  check('too slow: its jaws close. One shot (the designer)', re.includes('bigSharkGulp') && e.p.dead && e.p.hp === 0);
  const a = meet(at(-10, 1, 0));
  a.world.walls.push({ x: 5, normalX: -1 });
  startSwallow(a.e, 0, a.p, a.c);
  until(a, () => a.e.phase === 'dive', v.swallowWarn + 3, free);
  const ra = until(a, () => a.e.phase !== 'dive', 3, () => a.p.pos.set(0, 2, 6));
  check('swim out of its way and it misses; into a wall, its teeth stick: stunned', !a.c.grab.on && ra.includes('bigSharkStuck') && a.e.phase === 'stun' && a.e.move !== SWALLOW);
}

section('Floor 6 — the Big Shark: its tail, its frenzy');
{
  const m = meet(at(0, 1, -3));
  // (Its back to you, a while into its lap: Update 0.3.16 — no tail sooner.)
  m.e.facing = 0;
  m.e.cooldown = 0;
  m.e.near = 3;
  const r = until(m, () => m.e.phase === 'recover', 2, free);
  check(`close behind it, its tail whips you (${v.tailDamage})`, r.includes('bigSharkTailWindup') && r.includes('bigSharkTail') && maxHpOf(m.p) - m.p.hp === v.tailDamage && m.e.move !== TAIL);
  const f = meet(at(-10, 1, 0));
  hitEnemy(f.e, ENEMY_STATS.bigShark().hp * (1 - v.frenzyAt) + 1, 0, 0, 0);
  check('it never flinches', f.e.phase !== 'flinch');
  const rf = run(f, 0.1, free);
  check(`below ${v.frenzyAt * 100}% it frenzies, a roar, once; everything after comes sooner`, rf.seen.includes('bigSharkFrenzy') && f.e.stage === 1);
  const rf2 = run(f, 2, free);
  check('it roars only once', !rf2.seen.includes('bigSharkFrenzy') && isLive(f.e));
}

section('Floor 6 — the Big Shark: open water, off the walls, its feint');
{
  const plan = planFloor(3, FLOOR.cove);
  const level = buildDungeon(plan);
  const room = level.rooms.find((x) => x.kind === 'boss')!;
  const [mx, mz, half] = [(room.min.x + room.max.x) / 2, (room.min.z + room.max.z) / 2, (room.max.x - room.min.x) * 0.3];
  const standing = level.arena.boxes.filter((x) => x.kind !== 'floor' && x.y + x.h / 2 > 0.3 && Math.abs(x.x - mx) < half + x.w / 2 && Math.abs(x.z - mz) < half + x.d / 2);
  check('its arena, the Shark’s Graveyard: nothing standing in the middle of its water', standing.length === 0, `${standing.length}`);
  const torches = dress(plan).torches.filter((t) => t.x > room.min.x - 2 && t.x < room.max.x + 2 && t.z > room.min.z - 2 && t.z < room.max.z + 2);
  check('no torches burning under its water', torches.length === 0, `${torches.length}`);
  const o = meet(at(0, 1, -8));
  const mid = openMiddle(o.p, v.bigRing, o.c, new Vector3());
  check('in open water it circles round you', Math.hypot(mid.x - o.p.pos.x, mid.z - o.p.pos.z) < 1e-6);
  o.p.pos.set(0, 2, -21);
  const by = openMiddle(o.p, v.bigRing, o.c, new Vector3());
  const ring = Array.from({ length: 16 }, (_, k) => [by.x + Math.cos((k * Math.PI) / 8) * v.bigRing, by.z + Math.sin((k * Math.PI) / 8) * v.bigRing]);
  check('by a wall, its circle moves out into open water: none of it near the wall (no more bumping)', by.z > o.p.pos.z + 3 && ring.every(([x, z]) => openAt(o.c, x, z)), by.z.toFixed(1));
  const walled = !roomPast(o.e, o.p, o.c);
  o.p.pos.set(0, 2, 0);
  check('a wall right behind you: it won’t lunge through you into it (it snaps from the side); in open water it will', walled && roomPast(o.e, o.p, o.c));
  const f = meet(at(-10, 1, 0));
  startFeint(f.e, 0, f.c);
  const from = f.e.pos.clone();
  let cue = 0;
  const seen: string[] = [];
  for (let i = 0; i < ticks(3) && f.e.phase !== 'recover' && f.e.phase !== 'stun'; i++) {
    cue = Math.max(cue, Math.abs(jawCue(f.e)));
    seen.push(...run(f, DT, free).seen);
  }
  check('its feint: it lines up an instant and rushes past you, close: no arrow, no bite', f.e.move !== FEINT && f.e.pos.distanceTo(from) > 10 && cue === 0 && !seen.includes('bigSharkBite') && f.p.hp === maxHpOf(f.p));
}
