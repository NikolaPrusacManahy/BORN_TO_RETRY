// Update 0.3.62 — the Big Shark by the Boss Design Bible, "The arena is a weapon" (spec MD_UPDATES/U0362_BIG_SHARK_BIBLE.md), still under
// water, its jaw moves still its own: its Breach (off the bubbles; then it's in the air, open), its Hull Ram (a shock along the seabed,
// wreckage, its teeth stuck), its Undertow (its eye bites). Phase 2: Blood Scent (hurt, keep moving), Deck Breaker (planks bulge; stuck in
// the hole). Its ultimate, Abyss Jaws: hit its chain as it waits under the anchor.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { dodges } from '../src/sim/enemies/evade';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { ABYSS_COME, ABYSS_CUE, ABYSS_TELL, ABYSS_WAIT, anchorY, startAbyss } from '../src/sim/enemies/sharkAbyss';
import { ABYSS, BREACH, BREAKER, hiddenShark, RAM, SCENT, startBreach, startBreaker, startRam, startWhirl, stuckFor } from '../src/sim/enemies/sharkArena';
import { nearestAnchor, nearestHull, setSharkArena } from '../src/sim/enemies/sharkBody';
import { createPlayer } from '../src/sim/player/state';
import { BIG_SHARK } from '../src/tuning/bigShark';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = BIG_SHARK.v;
const walls = [boxAt(-30, -1, -30, 60, 1, 60, 'floor'), boxAt(-30, 0, -31, 60, 9, 1, 'wall'), boxAt(-30, 0, 30, 60, 9, 1, 'wall'), boxAt(-31, 0, -30, 1, 9, 60, 'wall'), boxAt(30, 0, -30, 1, 9, 60, 'wall')];
const ROOM: Arena = { name: 'graveyard', boxes: walls, pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const world = new FlatWorld();

function fight(at = new Vector3(0, 4, -12), stage = 0, seed = 5) {
  const c = createCombat(ROOM);
  c.rng = createRng(seed);
  const p = createPlayer(0, 4, 0, 0);
  const slot = spawnEnemy(c.enemies, 'bigShark', at, Math.atan2(at.x, at.z));
  const e = c.enemies[slot];
  e.stage = stage;
  if (stage > 0) {
    e.hp = ENEMY_STATS.bigShark().hp * (v.frenzyAt - 0.05);
    e.ult.count = 1;
  }
  e.cooldown = 99;
  setSharkArena(e.shark!, { boxes: [] }, 0, 0, 30);
  c.events.clear();
  return { c, p, e, slot };
}
type Fight = ReturnType<typeof fight>;
function run(f: Fight, secs: number, each?: () => void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    stepCombat(f.c, f.p, emptyCombatIntent(), world, DT);
    f.p.hurtTime = 0;
    f.p.invuln = 0;
    for (let k = 0; k < f.c.events.length; k++) seen.push(f.c.events.at(k).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}
const has = (r: { seen: string[] }, k: string) => r.seen.includes(k);

section('Big Shark — the bible’s numbers');
{
  const s = ENEMY_STATS.bigShark();
  check(`${s.hp} health, never tankier (it was 1260)`, s.hp <= 1260);
  check(`its tell ${v.breachTell} s (the bible’s dial for its 7th place)`, v.breachTell > 0.5 && v.breachTell < 0.9);
  check(`Abyss Jaws: ${v.abyssWindow} s, every ${v.abyssEvery} s, heavy not a one-shot`, v.abyssWindow === 5 && v.abyssEvery === 60 && v.abyssDamage < 100);
}

section('Big Shark — its arena: ships and anchors');
{
  const level = buildDungeon(planFloor(3, FLOOR.cove));
  const f = fight();
  const b = f.e.shark!;
  const r = level.boss.end;
  setSharkArena(b, level.arena, level.boss.portal.x, level.boss.portal.z, (r.max.x - r.min.x) / 2);
  check(`it knows its ships (${b.hulls.length})`, b.hulls.length >= 2);
  check('four anchors, off the ships', b.anchors.length === 4 && b.anchors.every((a) => b.hulls.every((h) => Math.abs(a.x - h.x) > h.w / 2 || Math.abs(a.z - h.z) > h.d / 2)));
  const out = { x: 0, y: 0, z: 0 };
  check('it finds the nearest', nearestHull(b, level.boss.portal.x, level.boss.portal.z, 60, out));
  check('nearest anchor', nearestAnchor(b, b.anchors[2].x + 1, b.anchors[2].z) === 2);
  for (const a of b.anchors) a.gone = true;
  check('all gone, they’re hung again', nearestAnchor(b, 0, 0) >= 0 && b.anchors.every((a) => !a.gone));
}

section('Big Shark — Breach: off the bubbles');
{
  const f = fight();
  startBreach(f.e, f.slot, f.p, f.c);
  const r = run(f, v.breachTell - 0.05);
  check('bubbles rising, a shape under you', !r.hurt && f.e.move === BREACH && f.e.phase === 'windup');
  check('down on the seabed', f.e.pos.y < 2);
  const up = run(f, v.breachRise + 0.1);
  check(`you stayed: up through you, ${v.breachDamage}`, has(up, 'sharkBreachUp') && up.lost >= v.breachDamage);
  check('and out of the water, in the air, open', f.e.phase === 'leap' && f.e.pos.y > v.floodTop && !dodges(f.c, f.slot, 0, -1));
  const down = run(f, v.breachAir + 0.1);
  check(`in the air ${v.breachAir} s, then back with a splash`, has(down, 'bigSharkSplash') && f.e.pos.y < v.floodTop);
  const g = fight();
  startBreach(g.e, g.slot, g.p, g.c);
  run(g, v.breachTell * 0.7);
  g.p.pos.x += 10;
  const miss = run(g, v.breachTell * 0.3 + v.breachRise + 0.05);
  check('you dashed off the bubbles: it misses', has(miss, 'sharkBreachUp') && !miss.hurt);
}

section('Big Shark — Hull Ram: a shock along the seabed');
{
  const f = fight();
  f.e.shark!.hulls = [{ x: 0, z: -24, w: 20, d: 6, top: 2.5 }];
  f.p.pos.set(0, 0.5, -8);
  startRam(f.e, f.slot, f.p, f.c);
  const r = run(f, v.ramTell + 0.02);
  check('it backs off, then off it goes', has(r, 'sharkRamWarn') && has(r, 'sharkRamGo') && f.e.phase === 'dive' && f.e.move === RAM);
  let hit = false;
  for (let i = 0; i < ticks(3) && !hit; i++) hit = has(run(f, DT), 'sharkRam');
  check('into the ship', hit);
  check(`its teeth stuck ${stuckFor(RAM)} s`, f.e.phase === 'stun' && f.e.move === RAM);
  check('wreckage coming down, a shock rolling', f.c.bombs.some((b) => b.alive) && f.c.quakes.some((q) => q.alive));
}

section('Big Shark — Undertow: its eye bites');
{
  const f = fight();
  startWhirl(f.e, f.slot, f.p, f.c);
  const b = f.e.shark!;
  run(f, v.whirlTell * 0.5);
  check('the water churns white first: no pull', f.p.current.length() === 0 && b.whirlFor > 0);
  run(f, v.whirlTell * 0.6);
  check('then it drags you', f.p.current.length() > 0);
  f.p.pos.set(b.whirlX, 4, b.whirlZ);
  const r = run(f, DT * 2);
  check(`in its eye: bitten, ${v.whirlDamage}, and it’s spent`, r.lost >= v.whirlDamage && b.whirlFor === 0);
}

section('Big Shark — Blood Scent: keep moving');
{
  const f = fight(new Vector3(0, 4, -16), 1);
  const b = f.e.shark!;
  run(f, DT);
  f.p.hits++;
  f.p.hurtBy = 'bigShark';
  run(f, DT);
  check(`hurt by it: you bleed ${v.bleedFor} s`, b.bleed > v.bleedFor - 0.1);
  run(f, v.scentFor * 0.8);
  check('still at your spot, not yet', f.e.move !== SCENT);
  setPhase(f.e, 'chase');
  let struck = false;
  for (let i = 0; i < ticks(v.scentFor) && !struck; i++) struck = f.e.move === SCENT;
  const r = run(f, v.scentFor * 0.5);
  check('it strikes your spot', f.e.move === SCENT || has(r, 'sharkMark'));
  const m = fight(new Vector3(0, 4, -16), 1);
  run(m, DT);
  m.p.hits++;
  m.p.hurtBy = 'bigShark';
  let x = 0;
  const moved = run(m, v.scentFor * 1.5, () => {
    x += 0.06;
    m.p.pos.x = x;
    if (m.e.phase !== 'chase') setPhase(m.e, 'chase');
    m.e.cooldown = 99;
  });
  check('keep moving: it can’t', !has(moved, 'sharkMark'));
}

section('Big Shark — Deck Breaker: stuck in the hole');
{
  const f = fight(new Vector3(0, 4, -16), 1);
  f.e.shark!.hulls = [{ x: 8, z: 0, w: 4, d: 12, top: 2.5 }];
  f.p.pos.set(3, 2, 0);
  startBreaker(f.e, f.slot, f.p, f.c);
  check('it’s gone, under', hiddenShark(f.e) && dodges(f.c, f.slot, 0, -1));
  const r = run(f, v.breakTell * v.frenzyQuick - 0.05);
  check('planks bulge', !r.hurt && f.e.move === BREAKER);
  const out = run(f, 0.1);
  check(`it smashes out, ${v.breakDamage}`, has(out, 'sharkBreak') && out.lost >= v.breakDamage);
  check(`stuck in the hole ${stuckFor(BREAKER)} s, open`, f.e.phase === 'stun' && f.e.move === BREAKER && !hiddenShark(f.e) && f.e.shark!.holes.length === 1);
  run(f, v.breakStuck + 0.1);
  check('then it’s out', f.e.phase !== 'stun');
}

section('Big Shark — Abyss Jaws: drop the anchor');
{
  const open = (at = new Vector3(5, 4, -10)) => {
    const f = fight(at, 1);
    f.e.ult.count = 0;
    setPhase(f.e, 'chase');
    return f;
  };
  const f = open();
  const start = run(f, DT);
  check('phase 2’s first thing: the water goes still', has(start, 'sharkStill') && f.e.move === ABYSS && f.e.shots === ABYSS_TELL && f.e.phase === 'blast');
  run(f, v.abyssTell + 0.02);
  const b = f.e.shark!;
  check(`the cue says how: ${ABYSS_CUE}`, f.e.shots === ABYSS_WAIT && f.e.ult.on && f.e.ult.cue === ABYSS_CUE && f.e.ult.window === v.abyssWindow);
  const a = b.anchors[b.marked];
  run(f, 3);
  check('it’s come to rest under the anchor', Math.hypot(f.e.pos.x - a.x, f.e.pos.z - a.z) < 6 && b.chainOpen);
  const hit = emptyTargetHit();
  const from = new Vector3(a.x + 3, anchorY() + 1, a.z);
  const to = new Vector3(a.x - 3, anchorY() + 1, a.z);
  check('its chain’s a target', nearestTarget(f.c, from, to, 0.1, hit) && hit.kind === 'chain');
  const hp = f.e.hp;
  landHit(f.c, hit, 5, 0, 1, 0, 'hitJab', 5);
  const drop = run(f, 0.5);
  check(`hit: the anchor crushes it, ${v.abyssSelf} off it, stunned ${v.abyssStun} s`, has(drop, 'sharkAnchorDrop') && has(drop, 'sharkCrushed') && f.e.phase === 'stun' && f.e.move === ABYSS && hp - f.e.hp >= v.abyssSelf && !f.e.ult.on && a.gone);
  run(f, v.abyssStun + 0.1);
  check('then it’s up', f.e.phase !== 'stun');

  const m = open();
  run(m, DT);
  run(m, v.abyssTell + 0.02);
  m.e.pos.set(m.p.pos.x + 2, m.p.pos.y, m.p.pos.z);
  run(m, v.abyssWindow + 0.03, () => {
    m.p.pos.set(0, 4, 0);
  });
  check('not in time: it comes down', m.e.shots === ABYSS_COME || m.e.phase === 'recover' || !m.e.ult.on);
  const come = run(m, 0.6, () => {
    m.p.pos.set(0, 4, 0);
  });
  check(`on you: ${v.abyssDamage}, heavy, not a one-shot; that anchor’s gone`, has(come, 'sharkAbyssHit') && near(come.lost, v.abyssDamage, 1) && !m.p.dead);
  void startAbyss;
}
