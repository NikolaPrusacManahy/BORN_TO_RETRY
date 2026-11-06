// Update 0.3.51 — The Swarm's eye's moves, the Boss Design Bible's Boss 2 ("Pick your target"): Gaze Beam, Burrow Ambush, Acid
// Tears; below half, Tethered Shield and Split Pupil, its old ones quicker; Abyssal Stare, its ultimate. Its worms still lash.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';
import { updateOrbs } from '../src/sim/combat/orbs';
import { parry, stepParried } from '../src/sim/combat/parry';
import { createPuddles, updatePuddles } from '../src/sim/combat/puddles';
import { createCombat, CombatEvent, CombatState } from '../src/sim/combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { swarmTell, swarmWindup } from '../src/sim/enemies/swarm';
import { BURROW, eyeOf, fanYaw, GAZE, GLARE, pupilNow, SHIELD, SPLIT, STARE, STARE_CUE, TEARS } from '../src/sim/enemies/swarmMoves';
import { swarmEyeHeight } from '../src/sim/enemies/swarmHits';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { bulge, createWormlings, hitWormling, tethersUp, wormlingUp } from '../src/sim/enemies/wormlings';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { SWARM } from '../src/tuning/swarm';
import { Arena, boxAt } from '../src/world/arena';

const v = SWARM.v;
const events = new EventQueue<CombatEvent>(4096, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  e: Enemy;
  pools: ReturnType<typeof createPuddles>;
}

function fight(z = -8, arena?: Arena): Fight {
  const w = arenaWorld(events, arena);
  w.wormlings = createWormlings();
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  w.enemies = all;
  spawnEnemy(all, 'swarm', new Vector3(0, 0, z), 0);
  const e = all[0];
  e.facing = Math.atan2(0, -z);
  e.cooldown = 99;
  events.clear();
  return { w, p, all, e, pools: createPuddles() };
}

function tellNow(f: Fight, move: number) {
  f.e.move = move;
  f.e.shots = 0;
  setPhase(f.e, 'windup');
}

function run(f: Fight, secs: number, each?: () => void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    updateEnemies(f.all, f.p, f.w, OPEN_WORLD, DT);
    updateOrbs(f.w.orbs, f.p, new FlatWorld(), events, DT, f.pools);
    updatePuddles(f.pools, f.p, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    seen.push(...kinds());
    events.clear();
  }
  return { seen, hurt: f.p.hp < hp };
}

/** Its worms kept from lashing: its eye's own doing only. */
const noLash = (f: Fight) => {
  if (f.e.swarm) f.e.swarm.lashIn = 99;
};

section('The Swarm — the bible’s dials');
{
  const f = fight();
  check('Boss 2’s tells: about 1.1 s (the floor’s, for its burrowers)', [GAZE, BURROW, TEARS, SHIELD, SPLIT].every((m) => near(swarmWindup(f.e, m), 1.1, 0.01)));
  check('its ultimate’s window: 6 s', v.stareWindow === 6);
  f.e.stage = 1;
  check('below half its old moves tell quicker, its new ones as long', swarmWindup(f.e, GAZE) < 1.1 && swarmWindup(f.e, TEARS) < 1.1 && swarmWindup(f.e, SHIELD) === 1.1);
  check('never tankier: the health 0.3.48 gave it', ENEMY_STATS.swarm().hp === 1120);
}

section('The Swarm — Gaze Beam');
{
  const f = fight(-10);
  run(f, DT);
  noLash(f);
  tellNow(f, GAZE);
  const a = run(f, swarmWindup(f.e, GAZE) - 0.05);
  check('its tell can’t hurt you', !a.hurt && !a.seen.includes('swarmGaze'));
  const b = run(f, 0.3);
  check('then a thin laser: in its line, you burn', b.seen.includes('swarmGaze') && b.hurt && f.e.phase === 'breath');
  const y0 = f.e.facing;
  f.p.pos.set(10, 0, -10);
  run(f, 0.5);
  const turned = Math.abs(f.e.facing - y0);
  check(`it follows you slowly (${v.gazeTurn} rad/s): you can outrun it`, turned > 0.1 && turned <= v.gazeTurn * 0.5 + 0.05, turned.toFixed(2));
  run(f, v.gazeTime);
  check(`it burns ${v.gazeTime} s, then it rests`, f.e.phase === 'chase');

  const s = fight(-10);
  run(s, DT);
  noLash(s);
  tellNow(s, GAZE);
  run(s, swarmWindup(s.e, GAZE) + 0.02);
  s.p.hurtTime = 0;
  const hp = s.p.hp;
  s.p.pos.set(14, 0, -10);
  s.p.hurtTime = 0;
  run(s, 0.3);
  check('step out of its line and it misses', s.p.hp === hp);

  const wall: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(-3, 0, -5, 6, 5, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const c = fight(-12, wall);
  run(c, DT);
  noLash(c);
  c.e.pos.z = -12;
  tellNow(c, GAZE);
  const d = run(c, swarmWindup(c.e, GAZE) + 1);
  check('with a pillar between you, it can’t reach you', d.seen.includes('swarmGaze') && !d.hurt && c.e.aim.z < -4);
}

section('The Swarm — Burrow Ambush');
{
  const f = fight(-14);
  run(f, DT);
  noLash(f);
  swarmTell(f.e, BURROW, 0, f.p, f.w);
  const a = run(f, DT);
  const list = f.w.wormlings!;
  check('three on their way at once: the floor’s the tell, not its eye', list.filter((q) => q.alive).length === 3 && events.length + a.seen.length >= 0 && f.e.phase === 'chase');
  check('the first’s bulge under your feet', bulge(list[0]) >= 0 && list[0].x === f.p.pos.x && list[0].z === f.p.pos.z);
  f.p.pos.set(3, 0, 2);
  run(f, 0.1);
  check('it follows you', near(list[0].x, 3, 1e-6) && near(list[0].z, 2, 1e-6));
  run(f, v.burrowWindup - v.burrowLock - 0.1);
  f.p.pos.set(8, 0, 8);
  const off = run(f, v.burrowLock + 0.1);
  check('then it stops following: step off it and it misses', off.seen.includes('swarmBurst') && !off.hurt && near(list[0].x, 3, 0.2), `${list[0].x}`);
  run(f, 0.1);
  check('it hangs in the air, to be hit', wormlingUp(list[0]) && list[0].top > 3);
  check('hit it and it dies', hitWormling(list, 0, v.burrowHp) && !wormlingUp(list[0]));
  const left = run(f, 0.8);
  check('then the next bursts, one after another', left.seen.includes('swarmBurst'));
  const g = fight(-14);
  run(g, DT);
  noLash(g);
  swarmTell(g.e, BURROW, 0, g.p, g.w);
  const hit = run(g, v.burrowWindup + 0.2);
  check('stand still and it catches you', hit.seen.includes('swarmBurst') && hit.hurt && g.p.vel.y > 0);
  const j = fight(-14);
  run(j, DT);
  noLash(j);
  swarmTell(j.e, BURROW, 0, j.p, j.w);
  const over = run(j, v.burrowWindup + 0.2, () => {
    j.p.pos.y = v.burrowClear + 0.1;
  });
  check('jump it and it misses', over.seen.includes('swarmBurst') && !over.hurt);
  j.e.cooldown = 99;
  run(j, v.burrowGap * 2 + v.burrowHang + 1);
  check('left alone, they go back down', j.w.wormlings!.every((q) => !q.alive));
}

section('The Swarm — Acid Tears');
{
  const f = fight(-10);
  run(f, DT);
  noLash(f);
  tellNow(f, TEARS);
  const a = run(f, swarmWindup(f.e, TEARS) + v.tearGap * v.tears + 0.05, () => (f.p.hurtTime = 1));
  check(`it weeps ${v.tears} globs, arcing`, a.seen.filter((k) => k === 'swarmTear').length === v.tears && f.w.orbs.some((o) => o.alive && o.look === 'tear' && o.drop > 0));
  const tear = f.w.orbs.find((o) => o.alive && o.look === 'tear')!;
  check('up and over', tear.vel.y !== 0);
  f.p.pos.set(-9, 0, 9);
  run(f, v.tearFlight + 1.5, () => (f.p.hurtTime = 1));
  check('where they land, a puddle', f.pools.some((p) => p.alive && !p.fire && p.by === 'swarm'));
  const hits = fight(-8);
  run(hits, DT);
  noLash(hits);
  tellNow(hits, TEARS);
  const h = run(hits, swarmWindup(hits.e, TEARS) + v.tearFlight + 0.3);
  check('stood still, one reaches you', h.hurt);
  hits.e.stage = 1;
  tellNow(hits, TEARS);
  const more = run(hits, swarmWindup(hits.e, TEARS) + v.tearGap * (v.tears + 1) + 0.1, () => (hits.p.hurtTime = 1));
  check('below half, one more', more.seen.filter((k) => k === 'swarmTear').length === v.tears + 1);
}

/** A real fight's state, a Swarm in it, for what needs the fight's own hits. */
function realFight(): { c: CombatState; p: PlayerState; e: Enemy } {
  const arena: Arena = { name: 'r', boxes: [boxAt(-60, -1, -60, 120, 1, 120, 'floor')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const c = createCombat(arena, false);
  c.rng = createRng(4);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'swarm', new Vector3(0, 0, -8), 0);
  const e = c.enemies[slot];
  e.cooldown = 99;
  return { c, p, e };
}

section('The Swarm — a tear parried back');
{
  const { c, p, e } = realFight();
  updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
  c.events.clear();
  if (e.swarm) e.swarm.lashIn = 99;
  const eye = new Vector3(0, 1.6, 0);
  const ahead = new Vector3(0, 0, -1);
  c.orbs[0].alive = true;
  c.orbs[0].look = 'tear';
  c.orbs[0].drop = 16;
  c.orbs[0].parried = false;
  c.orbs[0].life = 5;
  c.orbs[0].pos.set(0, 1.6, -0.5);
  c.orbs[0].vel.set(0, 0, 10);
  c.orbs[0].by = 'swarm';
  check('you can parry one', parry(c, eye, ahead) >= 0 && c.orbs[0].parried);
  const hp = e.hp;
  for (let i = 0; i < ticks(1) && c.orbs[0].alive; i++) stepParried(c, new FlatWorld(), DT);
  check('it goes through its worms to its eye', e.hp < hp, `${hp} → ${e.hp}`);
  check(`and it reels: wide open (${v.tearStagger} s)`, e.phase === 'stun' && near(e.near, v.tearStagger, 1e-6));
}

section('The Swarm — below half');
{
  const f = fight(-10);
  run(f, DT);
  noLash(f);
  f.e.hp = v.swarmHp * v.phase2At - 1;
  const a = run(f, DT * 2);
  check('its worms brighten and latch on, once', f.e.stage === 1 && a.seen.filter((k) => k === 'swarmPhase').length === 1);
  check('and its ultimate comes first', f.e.phase === 'blast' && f.e.move === STARE);
}

section('The Swarm — Tethered Shield');
{
  const f = fight(-10);
  run(f, DT);
  noLash(f);
  f.e.stage = 1;
  f.e.ult.count = 1;
  tellNow(f, SHIELD);
  const a = run(f, swarmWindup(f.e, SHIELD) + 0.5);
  const list = f.w.wormlings!;
  check(`${v.tethers} big worms rise round it, feeding its shield`, tethersUp(list) === v.tethers && f.e.swarm!.shield && a.seen.includes('swarmShield'));
  check('at their reach from it', list.filter((q) => q.alive).every((q) => near(Math.hypot(q.x - f.e.pos.x, q.z - f.e.pos.z), v.tetherOut, 2)));
  const hp = f.e.hp;
  const worm = 0;
  hitEnemy(f.e, 500, 0, 0, -1, false, new Vector3(f.e.pos.x, swarmEyeHeight(), f.e.pos.z + 0.9));
  check('nothing hurts it while it’s up', f.e.hp === hp, `${f.e.hp}`);
  for (let i = 0; i < v.tethers - 1; i++) hitWormling(list, list.findIndex((q) => q.alive && q.dead < 0), v.tetherHp);
  run(f, 0.1);
  check('still up with one standing', f.e.swarm!.shield && f.e.phase !== 'stun' && worm === 0);
  hitWormling(list, list.findIndex((q) => q.alive && q.dead < 0), v.tetherHp);
  const d = run(f, 0.1);
  check(`the last dead, it pops and its eye drops (${v.dropTime} s)`, !f.e.swarm!.shield && f.e.phase === 'stun' && d.seen.includes('swarmDrop') && near(f.e.near, v.dropTime, 1e-6));
  run(f, 0.5);
  check('down near the floor', f.e.pos.y < -0.2);
  const hp2 = f.e.hp;
  hitEnemy(f.e, 10, 0, 0, -1, false, new Vector3(f.e.pos.x, swarmEyeHeight(), f.e.pos.z + 2));
  check('open to everything, its worms slack: hits reach its eye, and do more', near(hp2 - f.e.hp, 10 * ENEMY_STATS.swarm().stunned, 1e-6) && ENEMY_STATS.swarm().stunned > 1, `${hp2 - f.e.hp}`);
  run(f, v.dropTime);
  check('then it’s back up', f.e.phase !== 'stun' && f.e.pos.y >= -0.01);
  // Its big worms on a real fight: something a blow can land on.
  const { c, p, e } = realFight();
  e.stage = 1;
  e.ult.count = 1;
  updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
  e.move = BURROW;
  c.wormlings[0].alive = true;
  c.wormlings[0].tether = false;
  c.wormlings[0].t = 5;
  c.wormlings[0].x = 0;
  c.wormlings[0].z = -3;
  c.wormlings[0].top = 3;
  c.wormlings[0].hp = 7;
  c.wormlings[0].burst = true;
  c.wormlings[0].dead = -1;
  const hit = emptyTargetHit();
  check('a blow can land on a big worm', nearestTarget(c, new Vector3(0, 1.5, 0), new Vector3(0, 1.5, -2.6), 0.2, hit) && hit.kind === 'wormling');
  const bar = e.hp;
  const killed = landHit(c, hit, 7, 0, 0, -1, 'hitJab', 7);
  check(`killed, it takes ${v.bigWormBar} off its bar`, killed && e.hp === bar - v.bigWormBar, `${bar} → ${e.hp}`);
}

section('The Swarm — Split Pupil');
{
  const f = fight(-10);
  run(f, DT);
  noLash(f);
  f.e.stage = 1;
  f.e.ult.count = 1;
  tellNow(f, SPLIT);
  run(f, swarmWindup(f.e, SPLIT) + 0.02);
  check('three lasers', f.e.phase === 'breath' && f.e.move === SPLIT);
  const y0 = fanYaw(f.e, 0);
  check('120° apart', near(fanYaw(f.e, 1) - y0, (Math.PI * 2) / 3, 1e-6) && near(fanYaw(f.e, 2) - y0, (Math.PI * 4) / 3, 1e-6));
  const a = run(f, 0.5);
  check(`turning like a fan (${v.splitSpin} rad/s)`, near(fanYaw(f.e, 0) - y0, v.splitSpin * 0.5, 0.03));
  const first = a.hurt;
  // One full third of a turn: a laser crosses wherever you stand, on the floor.
  const b = run(f, ((Math.PI * 2) / 3 / v.splitSpin) * 1.02);
  check('on the floor, one catches you', first || b.hurt);
  const j = fight(-10);
  run(j, DT);
  noLash(j);
  j.e.stage = 1;
  j.e.ult.count = 1;
  tellNow(j, SPLIT);
  const over = run(j, swarmWindup(j.e, SPLIT) + v.splitTime + 0.05, () => {
    j.p.pos.y = v.splitClear + 0.1;
  });
  check('in the air, they pass under you', !over.hurt);
  check('then it rests', j.e.phase === 'chase');
}

section('The Swarm — Abyssal Stare');
{
  const f = fight(-10);
  run(f, DT);
  noLash(f);
  f.e.hp = v.swarmHp * v.phase2At - 1;
  const a = run(f, DT * 2);
  check('its cue on screen, its window on the clock', f.e.ult.on && f.e.ult.cue === STARE_CUE && near(f.e.ult.left, v.stareWindow, 0.05) && a.seen.includes('swarmStare'));
  const big = pupilNow(f.e);
  const hp = f.e.hp;
  const lifted = run(f, 1.2);
  check('it rises, just over your head: in reach', near(f.e.pos.y, v.stareLift, 0.01) && f.e.pos.y + swarmEyeHeight() < 3.5);
  check('its heart beats, the ground shaking', lifted.seen.filter((k) => k === 'swarmHeart').length >= 1);
  check('its pupil shrinks', pupilNow(f.e) < big);
  const eye = eyeOf(f.e, new Vector3());
  hitEnemy(f.e, 8, 0, 0, -1, false, eye.clone().add(new Vector3(0, 0, 0.1)));
  check('a hit on its eye counts, and hurts it none', f.e.ult.fill === 1 && f.e.hp === hp);
  // (Update 0.3.77 — the designer: "we just hit the eye - that is it".)
  hitEnemy(f.e, 8, 0, 0, -1, false, eye.clone().add(new Vector3(2, 0, 0)));
  check('anywhere on it', f.e.ult.fill === 2);
  hitEnemy(f.e, 8, 0, 0, -1, true, eye.clone());
  check('a bleed’s or a burn’s tick doesn’t count', f.e.ult.fill === 2);
  hitEnemy(f.e, 8, 0, 0, -1, false, null);
  const b = run(f, DT * 2);
  check(`${v.stareShots} hits and it’s broken: it reels (${v.stareStun} s)`, b.seen.includes('swarmBroken') && !f.e.ult.on && f.e.phase === 'stun' && near(f.e.near, v.stareStun, 1e-6));
  run(f, 1);
  check('and drops, in reach', f.e.pos.y < 0);

  const n = fight(-10);
  run(n, DT);
  noLash(n);
  n.e.hp = v.swarmHp * v.phase2At - 1;
  n.p.hurtTime = 0;
  const hpFull = n.p.hp;
  const g = run(n, v.stareWindow + 0.2, () => {
    // (Its tears kept off: the glare's what's being measured.)
    for (const o of n.w.orbs) o.alive = false;
  });
  check('not in time: its glare, at everything it can see', g.seen.includes('swarmGlare') && n.e.move === GLARE);
  check(`heavy (${v.stareDamage}), not an instant death`, n.p.hp === hpFull - v.stareDamage && !n.p.dead, `${n.p.hp}`);

  const wall: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(-3, 0, -5, 6, 5, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const s = fight(-12, wall);
  run(s, DT);
  noLash(s);
  s.e.pos.z = -12;
  s.e.hp = v.swarmHp * v.phase2At - 1;
  const hide = run(s, v.stareWindow + 0.6, () => {
    for (const o of s.w.orbs) o.alive = false;
    s.e.pos.z = -12;
  });
  check('with a pillar between you, it misses', hide.seen.includes('swarmGlare') && s.p.hp === hpFull);

  // Fists: it weeps all through it, and one parried back breaks it.
  const { c, p, e } = realFight();
  updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
  e.hp = v.swarmHp * v.phase2At - 1;
  if (e.swarm) e.swarm.lashIn = 99;
  const tears: number[] = [];
  for (let i = 0; i < ticks(v.stareWindow - 1); i++) {
    updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
    tears.push(...Array.from({ length: c.events.length }, (_, k) => c.events.at(k).kind).filter((k) => k === 'swarmTear').map(() => i));
    c.events.clear();
    p.hurtTime = 1;
  }
  check(`it weeps through it, every ${v.stareTears} s (what fists can send back)`, tears.length >= 2, `${tears.length}`);
  const tear = c.orbs.find((o) => o.alive && o.look === 'tear');
  check('a tear to send back', !!tear);
  if (tear) {
    tear.pos.set(0, 1.6, -0.5);
    tear.vel.set(0, 0, 8);
    // (Looking up at it: it's lifted.)
    const look = eyeOf(e, new Vector3()).sub(new Vector3(0, 1.6, 0)).normalize();
    parry(c, new Vector3(0, 1.6, 0), look);
    const wasOn = e.ult.on;
    for (let i = 0; i < ticks(2) && tear.alive; i++) stepParried(c, new FlatWorld(), DT);
    check('one parried back cancels it', wasOn && e.ult.fill >= e.ult.need, `${e.ult.fill}`);
  }
}

section('The Swarm — a whole fight, nothing stuck');
{
  const f = fight(-10);
  f.w.rng = createRng(21);
  f.e.cooldown = 0;
  const moves = new Set<number>();
  const phases = new Set<string>();
  let longest = 0;
  let stuckFor = 0;
  let last = '';
  let stares = 0;
  let wasOn = false;
  run(f, 300, () => {
    f.p.hp = 100;
    f.p.hurtTime = 0;
    f.p.pos.set(0, 0, 0);
    f.p.vel.set(0, 0, 0);
    if (f.e.stage === 0 && f.e.t < DT * 2 && f.e.phase === 'chase') f.e.hp -= 60;
    f.e.hp = Math.max(1, f.e.hp);
    for (const q of f.w.wormlings!) if (q.alive && q.tether && q.t > 6) hitWormling(f.w.wormlings!, f.w.wormlings!.indexOf(q), 1e4);
    const key = `${f.e.phase}:${f.e.move}`;
    stuckFor = key === last ? stuckFor + DT : 0;
    last = key;
    if (f.e.phase !== 'chase') longest = Math.max(longest, stuckFor);
    phases.add(f.e.phase);
    if (f.e.phase === 'windup') moves.add(f.e.move);
    if (f.w.wormlings!.some((q) => q.alive && !q.tether)) moves.add(BURROW);
    if (f.e.ult.on && !wasOn) stares++;
    wasOn = f.e.ult.on;
    if (!Number.isFinite(f.e.pos.x + f.e.pos.y + f.e.pos.z + f.e.facing)) throw new Error('its place went bad');
  });
  check('it uses every move', [GAZE, BURROW, TEARS, SHIELD, SPLIT].every((m) => moves.has(m)), [...moves].join());
  check('and goes through every state', ['chase', 'windup', 'breath', 'blast', 'recover', 'stun'].every((p) => phases.has(p)), [...phases].join());
  check(`no state holds it long (${longest.toFixed(1)} s)`, longest <= v.stareWindow + 0.2);
  check(`its stare came back about every ${v.stareEvery} s (${stares})`, stares >= 3 && stares <= 7);
}
