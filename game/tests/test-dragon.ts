// Update 0.0.18 — the Dragon, its floor's boss (the designer). Its show, its scream in its stance, its death.
// Update 0.3.49 — its moves are the Boss Design Bible's ("Read the tell"): Flame Sweep, Wing Gust, Tail Quake; at half
// health it takes to the sky (Dive Bomb, Ember Rain, its old moves quicker and chained), its ultimate first (Inferno Core).
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';
import { updateBombs } from '../src/sim/combat/bombs';
import { fireOrb } from '../src/sim/combat/orbs';
import { parry } from '../src/sim/combat/parry';
import { updateOrbs } from '../src/sim/combat/orbs';
import { Pillar } from '../src/sim/combat/pillars';
import { createPuddles, updatePuddles } from '../src/sim/combat/puddles';
import { updateQuakes } from '../src/sim/combat/quakes';
import { createCombat, CombatEvent } from '../src/sim/combat/state';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { dragonWindup } from '../src/sim/enemies/dragon';
import { BLAST_FOR, CORE_CUE, startCore } from '../src/sim/enemies/dragonCore';
import { BLAST, CORE, DIVE, EMBER, SWEEP, TAIL, WING } from '../src/sim/enemies/dragonMoves';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf, doomTime, ENEMY_STATS, ownBossOf } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { BOSS } from '../src/tuning/boss';
import { FISTS } from '../src/tuning/combat';
import { MOVE } from '../src/tuning/movement';
import { DRAGON } from '../src/tuning/dragon';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = DRAGON.v;
const events = new EventQueue<CombatEvent>(2048, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  d: Enemy;
  pools: ReturnType<typeof createPuddles>;
}

/** A dragon at `at` facing `facing` (default: you). */
function fight(at: Vector3, facing = Math.atan2(at.x, at.z), arena?: Arena): Fight {
  const w = arenaWorld(events, arena);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  w.enemies = all;
  spawnEnemy(all, 'dragon', at, facing);
  events.clear();
  return { w, p, all, d: all[0], pools: createPuddles() };
}

function warnNow(f: Fight, move: number) {
  f.d.move = move;
  f.d.shots = 0;
  setPhase(f.d, 'windup');
}

/** Ticks for `secs`: the events and whether you were hurt. `each`: before every tick. */
function run(f: Fight, secs: number, each?: () => void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    updateEnemies(f.all, f.p, f.w, OPEN_WORLD, DT);
    updateOrbs(f.w.orbs, f.p, new FlatWorld(), events, DT);
    updateBombs(f.w.bombs, f.p, events, DT, f.pools);
    updateQuakes(f.w.quakes, f.p, events, DT);
    updatePuddles(f.pools, f.p, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    seen.push(...kinds());
    events.clear();
  }
  return { seen, hurt: f.p.hp < hp };
}

/** A dragon in phase 2, up in the sky, its first ultimate behind it. */
function inSky(at = new Vector3(0, 0, -9)): Fight {
  const f = fight(at);
  f.d.stage = 1;
  f.d.pos.y = v.skyAlt;
  f.d.ult.count = 1;
  setPhase(f.d, 'sky');
  return f;
}

/** A dragon charging its core: `at` its room's middle. */
function charging(at = new Vector3(0, 0, -6)): Fight {
  const f = fight(at);
  f.d.stage = 1;
  f.d.pos.y = 4;
  startCore(f.d);
  run(f, v.coreGlide + 0.02);
  return f;
}

section('Dragon — the bible’s dials');
{
  const f = fight(new Vector3(0, 0, -15));
  check('Boss 1’s tells are about 1.2 s', [SWEEP, WING, TAIL, DIVE, EMBER].every((m) => near(dragonWindup(f.d, m), 1.2, 0.01)));
  check('its ultimate’s window is 8 s', v.coreWindow === 8);
  check('phase 2 at half health', v.rageAt === 0.5);
  f.d.stage = 1;
  check('in phase 2 its old moves tell quicker; its new ones as long', dragonWindup(f.d, SWEEP) < 1.2 && dragonWindup(f.d, WING) < 1.2 && dragonWindup(f.d, TAIL) < 1.2 && dragonWindup(f.d, DIVE) === 1.2);
  check('never tankier: the health 0.3.48 gave it', ENEMY_STATS.dragon().hp === 1120);
}

section('Dragon — Flame Sweep');
{
  const f = fight(new Vector3(0, 0, -15));
  warnNow(f, SWEEP);
  const tell = run(f, v.sweepWindup - DT);
  check('its tell can’t hurt you, and the fire doesn’t start till it’s over', !tell.hurt && !tell.seen.includes('dragonBreath') && f.d.phase === 'windup');
  const a = run(f, v.sweepTime + 0.05);
  check('then fire low across the floor, catching you where you stand', a.seen.includes('dragonBreath') && a.hurt);
  check('and its head stays low a while: open to be hit', f.d.phase === 'recover' && f.d.move === SWEEP);
  const yaw = f.d.facing;
  f.p.pos.set(9, 0, 9);
  run(f, v.sweepRecover - 0.1);
  check('it doesn’t turn meanwhile', f.d.facing === yaw && f.d.phase === 'recover');
  const on = run(f, 0.15);
  check('then it’s back to flying at you', f.d.phase === 'chase' && !on.seen.includes('dragonBreath'));

  // Left to right, across where it faced.
  const s = fight(new Vector3(0, 0, -15));
  warnNow(s, SWEEP);
  run(s, v.sweepWindup + 0.02);
  const start = s.d.facing;
  run(s, v.sweepTime * 0.5);
  const mid = s.d.facing;
  run(s, v.sweepTime * 0.45);
  check(`it swings steadily across its ${v.sweepArc}° arc`, near(mid - start, ((v.sweepArc * Math.PI) / 180) * 0.5, 0.05) && s.d.facing > mid, `${start.toFixed(2)} ${mid.toFixed(2)} ${s.d.facing.toFixed(2)}`);

  const j = fight(new Vector3(0, 0, -15));
  warnNow(j, SWEEP);
  const over = run(j, v.sweepWindup + v.sweepTime + 0.05, () => {
    j.p.pos.y = v.sweepClear + 0.1;
  });
  check('jump it and it passes under you', over.seen.includes('dragonBreath') && !over.hurt);

  const dash = fight(new Vector3(0, 0, -15));
  warnNow(dash, SWEEP);
  const through = run(dash, v.sweepWindup + v.sweepTime + 0.05, () => {
    dash.p.invuln = 1;
  });
  check('dash through it (a dash’s invincibility) and it can’t touch you', through.seen.includes('dragonBreath') && !through.hurt);

  const wall: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(-10, 0, -8, 20, 9, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const w = fight(new Vector3(0, 0, -15), undefined, wall);
  warnNow(w, SWEEP);
  const e = run(w, v.sweepWindup + v.sweepTime + 0.05);
  check('a wall stops it: behind one, you’re safe', e.seen.includes('dragonBreath') && !e.hurt);
}

section('Dragon — Wing Gust');
{
  const f = fight(new Vector3(0, 0, -10));
  warnNow(f, WING);
  const tell = run(f, v.wingWindup - DT);
  check('its tell leaves you be', f.p.vel.z === 0 && !tell.seen.includes('dragonWing'));
  let most = 0;
  const a = run(f, v.gustTime * 0.5, () => {
    most = Math.max(most, f.p.vel.z);
  });
  check('then the wind pushes you back', a.seen.includes('dragonWing') && most > 1 && f.d.phase === 'breath', most.toFixed(2));
  const b = run(f, v.gustTime * 0.5 + 0.05);
  const thrown = [...a.seen, ...b.seen].filter((k) => k === 'dragonRubble').length;
  check(`and it throws ${v.rubbles} chunks of rubble at you`, thrown === v.rubbles && f.w.orbs.some((o) => o.look === 'rubble'), `${thrown}`);
  check('then it stands a moment', f.d.phase === 'recover' && f.d.move === WING);

  const side = fight(new Vector3(0, 0, -10));
  warnNow(side, WING);
  run(side, v.wingWindup + 0.02);
  side.p.pos.set(14, 0, -10);
  side.p.vel.set(0, 0, 0);
  run(side, 0.3);
  check('strafe out of its arc and the wind leaves you be', side.p.vel.x === 0 && side.p.vel.z === 0);

  const r = fight(new Vector3(0, 0, -8));
  warnNow(r, WING);
  const hit = run(r, v.wingWindup + 1);
  check('rubble that reaches you hurts', hit.hurt);
}

section('Dragon — Tail Quake');
{
  const f = fight(new Vector3(0, 0, -12));
  warnNow(f, TAIL);
  const toward = f.d.facing;
  const tell = run(f, v.tailWindup - DT);
  const off = Math.abs(Math.atan2(Math.sin(f.d.facing - toward), Math.cos(f.d.facing - toward)));
  check('through its tell it turns its back on you', off > 3 && !tell.seen.includes('dragonTail'), off.toFixed(2));
  const a = run(f, 0.05);
  check('then the slam: a ring rolls out over the floor', a.seen.includes('dragonTail') && f.w.quakes.some((q) => q.alive));
  const yaw = f.d.facing;
  const b = run(f, 1.2);
  check('on the floor, it catches you', b.hurt);
  run(f, v.tailExposed - 1.3);
  check(`its back stays to you for ${v.tailExposed} s`, f.d.phase === 'recover' && f.d.facing === yaw);
  run(f, 0.2);
  check('then it’s back to flying at you', f.d.phase === 'chase');

  const j = fight(new Vector3(0, 0, -12));
  warnNow(j, TAIL);
  const over = run(j, v.tailWindup + 1.3, () => {
    j.p.pos.y = v.tailClear + 0.1;
  });
  check('jump the ring and it passes under you', over.seen.includes('dragonTail') && !over.hurt);
}

section('Dragon — which move, where you are');
{
  const picks = (dist: number) => {
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const f = fight(new Vector3(0, 0, -dist));
      f.w.rng = createRng(100 + i);
      f.d.cooldown = 0;
      run(f, DT);
      if (f.d.phase === 'windup') seen.add(f.d.move);
    }
    return seen;
  };
  const close = picks(v.dragonNear - 2);
  const far = picks(v.dragonFar + 6);
  check('close or far, phase 1 is its three moves', [close, far].every((s) => s.size === 3 && s.has(SWEEP) && s.has(WING) && s.has(TAIL)), `${[...close]} / ${[...far]}`);
  const pauseAt = (dist: number) => {
    const f = fight(new Vector3(0, 0, -dist));
    f.d.move = WING;
    setPhase(f.d, 'recover');
    f.d.t = 10;
    run(f, DT);
    return f.d.cooldown;
  };
  check('close, it pauses less between moves', near(pauseAt(v.dragonNear - 2), pauseAt(v.dragonFar + 6) * v.closePause, 0.02));
}

section('Dragon — phase 2: it takes to the sky');
{
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 300, 0, 0, 0);
  check('it never flinches', f.d.phase !== 'flinch');
  f.d.hp = v.dragonHp * v.rageAt - 1;
  const a = run(f, 0.05);
  check('at half health it screams and takes to the sky, once', a.seen.filter((k) => k === 'dragonScream').length === 1 && f.d.stage === 1 && f.d.phase === 'sky');
  run(f, v.skyRise + 0.05);
  check('its ultimate first, as phase 2 starts: it comes down to it', f.d.phase === 'dive' && f.d.move === CORE);

  const g = fight(new Vector3(0, 0, -20));
  warnNow(g, SWEEP);
  run(g, v.sweepWindup + 0.1);
  g.d.hp = v.dragonHp * v.rageAt - 1;
  run(g, 0.05);
  check('in the middle of its fire, it finishes first', g.d.stage === 0 && g.d.phase === 'breath');

  const s = inSky();
  s.d.cooldown = 99;
  s.p.pos.set(30, 0, 0);
  run(s, 3);
  check(`it holds ${v.skyAlt} m up, drifting after you`, near(s.d.pos.y, v.skyAlt, 0.01) && s.d.pos.x > 5, `${s.d.pos.x.toFixed(1)}`);
  const seen = new Set<number>();
  for (let i = 0; i < 60; i++) {
    const t = inSky();
    t.w.rng = createRng(500 + i);
    t.d.cooldown = 0;
    run(t, DT);
    seen.add(t.d.move);
  }
  check('up there: Dive Bomb, Ember Rain, or down to its Flame Sweep', seen.size === 3 && seen.has(DIVE) && seen.has(EMBER) && seen.has(SWEEP), [...seen].join());
}

section('Dragon — Dive Bomb');
{
  const f = inSky();
  warnNow(f, DIVE);
  f.p.pos.set(3, 0, 2);
  const tell = run(f, v.diveWindup * 0.5);
  check('a screech’s tell, high up: it doesn’t fall', near(f.d.pos.y, v.skyAlt, 0.01) && !tell.hurt);
  check('its shadow follows you all through it', f.d.aim.x === 3 && f.d.aim.z === 2);
  f.p.pos.set(-4, 0, 1);
  run(f, v.diveWindup * 0.5 - DT);
  check('still following', f.d.aim.x === -4 && f.d.aim.z === 1);
  const lock = run(f, 2 * DT);
  check('then it locks on and dives', f.d.phase === 'dive' && f.d.move === DIVE && lock.seen.includes('dragonDive'));
  const a = run(f, v.diveFall);
  check('where you stood, it lands: hurt and thrown', a.seen.includes('dragonSlam') && a.hurt && near(f.d.pos.y, 0, 0.01) && near(f.d.pos.x, -4, 0.01));
  check('and it’s stuck in the ground', f.d.phase === 'stun' && f.d.move === DIVE);
  const hp = f.d.hp;
  hitEnemy(f.d, 100, 0, 1, 0);
  check('hits do more while it’s stuck', near(hp - f.d.hp, 100 * BOSS.v.stunBonus, 0.01));
  run(f, v.diveStuck - 0.1);
  check(`for ${v.diveStuck} s`, f.d.phase === 'stun');
  run(f, 0.15);
  check('then it chains its Tail Quake', f.d.phase === 'windup' && f.d.move === TAIL);
  run(f, dragonWindup(f.d, TAIL) + v.tailExposed + 0.05);
  check('then back up', f.d.phase === 'sky');

  const s = inSky();
  warnNow(s, DIVE);
  run(s, v.diveWindup + 2 * DT);
  s.p.pos.set(v.diveRadius + 2, 0, 0);
  const b = run(s, v.diveFall);
  check('dash aside at the last moment and it misses', b.seen.includes('dragonSlam') && !b.hurt);
}

section('Dragon — Ember Rain');
{
  const f = inSky();
  warnNow(f, EMBER);
  const tell = run(f, v.emberWindup - DT);
  check('it hovers through its tell: nothing falls yet', near(f.d.pos.y, v.skyAlt, 0.01) && !tell.seen.includes('dragonBomb'));
  let first = Infinity;
  let spread = 0;
  let circling = false;
  f.d.ult.since = 0;
  const a = run(f, DT + v.emberGap * v.embers + v.bombFall + 0.1, () => {
    f.p.hurtTime = 1;
    if (f.d.phase === 'sky') circling = true;
    for (const b of f.w.bombs) {
      if (!b.alive || b.look !== 'ember') continue;
      const d = Math.hypot(b.to.x, b.to.z);
      if (first === Infinity) first = d;
      spread = Math.max(spread, d);
    }
  });
  check(`${v.embers} fireballs fall`, a.seen.filter((k) => k === 'dragonBomb').length === v.embers, `${a.seen.filter((k) => k === 'dragonBomb').length}`);
  check('the first on you, the rest near you', first === 0 && spread > 1 && spread <= v.emberSpread + 0.01, `${first} ${spread.toFixed(1)}`);
  check('each leaves a burning pool', f.pools.filter((p) => p.alive && p.fire).length === v.embers);
  check('then it’s back to circling', circling);

  const g = inSky();
  g.d.cooldown = 99;
  g.pools[0].alive = true;
  g.pools[0].fire = true;
  g.pools[0].x = g.pools[0].z = g.pools[0].y = 0;
  g.pools[0].r = v.poolRadius;
  g.pools[0].life = g.pools[0].full = v.poolTime;
  const burn = run(g, 0.1);
  check('standing in a pool burns you', burn.hurt);
  g.p.hurtTime = 0;
  const hp = g.p.hp;
  run(g, 0.1, () => {
    g.p.pos.y = 1;
  });
  check('over it, in the air, it can’t', g.p.hp === hp);
  run(g, v.poolTime);
  check(`it fades after ${v.poolTime} s`, !g.pools[0].alive);
}

section('Dragon — its old moves chained, in phase 2');
{
  const f = inSky();
  f.w.rng = () => 0.99; // the last of its picks: down to its sweep
  f.d.cooldown = 0;
  run(f, DT);
  check('it comes down', f.d.phase === 'dive' && f.d.move === SWEEP);
  run(f, v.skyRise + 0.05);
  check('to its Flame Sweep', f.d.pos.y === 0 && f.d.phase === 'windup' && f.d.move === SWEEP);
  run(f, dragonWindup(f.d, SWEEP) + v.sweepTime + v.sweepRecover + 0.1);
  check('chained into its Wing Gust', f.d.phase === 'windup' && f.d.move === WING);
  run(f, dragonWindup(f.d, WING) + v.gustTime + v.swingRecover + 0.1);
  check('then back up', f.d.phase === 'sky');
}

section('Dragon — Inferno Core, its ultimate');
{
  const f = charging();
  check('it lands in its room’s middle, on the floor, its chest open', f.d.phase === 'blast' && f.d.pos.x === f.d.from.x && f.d.pos.z === f.d.from.z && f.d.pos.y === 0);
  check(`the cue on screen, ${v.coreWindow} s on the clock`, f.d.ult.on && f.d.ult.cue === CORE_CUE && near(f.d.ult.left, v.coreWindow, 0.05));
  const rumble = run(f, 1);
  check('the ground shakes through it', rumble.seen.filter((k) => k === 'dragonRumble').length >= 2);
  const hp = f.d.hp;
  // (It faces you, along +z: a blow on its front travels along −z.)
  hitEnemy(f.d, 30, 0, 0, -1);
  check('a blow on its front goes to the core, not its health', f.d.ult.fill === 30 && f.d.hp === hp);
  hitEnemy(f.d, 30, 0, 0, 1);
  check('a blow on its back hurts it, and the core none', f.d.ult.fill === 30 && f.d.hp === hp - 30);
  hitEnemy(f.d, v.coreHp, 0, 0, -1);
  const broke = run(f, DT * 2);
  check('enough on the core and it breaks', broke.seen.includes('dragonCoreBroken') && !f.d.ult.on);
  check('it’s stunned: hits do more', f.d.phase === 'stun' && f.d.move === CORE);
  const left = f.d.hp;
  hitEnemy(f.d, 100, 0, 0, -1);
  check('its health now, not the core', near(left - f.d.hp, 100 * BOSS.v.stunBonus, 0.01));
  const after = run(f, v.coreStagger - 0.1);
  check(`for ${v.coreStagger} s, no blast`, f.d.phase === 'stun' && !after.seen.includes('dragonBurst'));
  run(f, 0.15);
  check('then back up', f.d.phase === 'sky');

  const n = charging();
  const hpFull = n.p.hp;
  const b = run(n, v.coreWindow + 0.05);
  check('not broken in time: the blast', b.seen.includes('dragonBurst') && !n.d.ult.on && n.d.move === BLAST);
  check(`heavy damage (${v.coreDamage}), thrown; not an instant death`, n.p.hp === hpFull - v.coreDamage && !n.p.dead && Math.hypot(n.p.vel.x, n.p.vel.z) > 5);
  run(n, v.coreRecover + 0.1);
  check('then back up', n.d.phase === 'sky');

  // A pillar between you.
  const pillar = (x: number, z: number): Pillar => ({ x, z, half: 0.6, h: 8, box: null, broken: false, yaw: 0, room: 0, lie: { x: 0, z: 0, yaw: 0 }, stump: null, top: null });
  const s = charging();
  (s.w as unknown as { pillars: Pillar[] }).pillars = [pillar(0, -3), pillar(8, -3)];
  const safe = run(s, v.coreWindow + BLAST_FOR + 0.1);
  const pillars = (s.w as unknown as { pillars: Pillar[] }).pillars;
  check('a pillar between you takes the blast', safe.seen.includes('dragonBurst') && s.p.hp === hpFull);
  check('and it goes (that one)', pillars[0].broken && !pillars[1].broken && safe.seen.includes('pillarBreak'));

  const t = charging();
  (t.w as unknown as { pillars: Pillar[] }).pillars = [pillar(8, -3)];
  run(t, v.coreWindow + BLAST_FOR + 0.1);
  check('a pillar off to the side does nothing', t.p.hp === hpFull - v.coreDamage && !(t.w as unknown as { pillars: Pillar[] }).pillars[0].broken);

  const dash = charging();
  const dashed = run(dash, v.coreWindow + 0.1, () => {
    if (dash.d.move === BLAST && dash.d.t < 0.1) dash.p.invuln = 0.1;
    else dash.p.invuln = 0;
  });
  run(dash, BLAST_FOR);
  check('a dash’s moment doesn’t slip all of it', dashed.seen.includes('dragonBurst') && dash.p.hp === hpFull - v.coreDamage, `${dash.p.hp}`);

  // Every so often.
  const e = inSky();
  e.d.ult.since = 0;
  e.d.cooldown = 99;
  run(e, v.coreEvery - 0.5);
  check(`not before its time (about ${v.coreEvery} s on)`, e.d.phase === 'sky');
  run(e, 1);
  check('then again', e.d.phase === 'dive' && e.d.move === CORE);
}

section('Dragon — death');
{
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 1e9, 0, 0, 0);
  const c = run(f, doomTime() + 0.05);
  check('killed, it rises, hangs, sinks and bursts', c.seen.includes('bossBurst') && f.d.struck);
  const g = charging();
  hitEnemy(g.d, 1e9, 0, 0, 1);
  run(g, 0.1);
  check('killed at its back mid-charge, its window doesn’t matter: no blast', !isLive(g.d));
}

section('Dragon — fair to fists (ARE YOU EVEN HUMAN?)');
{
  // Its core must break with bare hands, from the far corner of its room, by running alone.
  const combo = FISTS.v.jabDamage * 2 + FISTS.v.finisherDamage;
  const dps = combo / (FISTS.v.jabInterval * 3);
  const room = 60;
  const run_ = (Math.SQRT2 * (room / 2)) / MOVE.v.runSpeed;
  const needed = run_ + v.coreHp / dps;
  check(`jabs alone break the core from a far corner in time (${needed.toFixed(1)} s of ${v.coreWindow})`, needed < v.coreWindow);
  // Rubble can be parried back, bare-handed: its bonus damage.
  const f = fight(new Vector3(0, 0, -20));
  const eye = new Vector3(0, 1.6, 0);
  const ahead = new Vector3(0, 0, -1);
  const c = createCombat({ name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] }, false);
  fireOrb(c.orbs, new Vector3(0, 1.6, -0.5), new Vector3(0, 0, 1), v.rubbleSpeed, v.rubbleDamage, 'dragon', 'rubble');
  check('its rubble can be parried back', parry(c, eye, ahead) >= 0 && c.orbs.some((o) => o.parried && o.look === 'rubble'));
  check('no damage yet to its fight', f.d.hp === v.dragonHp);
}

section('Dragon — a whole fight, nothing stuck');
{
  // You stand and take it (kept alive), and hit it now and then.
  const f = fight(new Vector3(0, 0, -20));
  f.w.rng = createRng(77);
  const moves = new Set<number>();
  const phases = new Set<string>();
  let stuckFor = 0;
  let last = '';
  let longest = 0;
  let ultimates = 0;
  let wasOn = false;
  const secs = 400;
  run(f, secs, () => {
    f.p.hp = 100;
    f.p.hurtTime = 0;
    f.p.vel.set(0, 0, 0);
    f.p.pos.set(0, 0, 0);
    const key = `${f.d.phase}:${f.d.move}`;
    stuckFor = key === last ? stuckFor + DT : 0;
    last = key;
    longest = Math.max(longest, f.d.phase === 'chase' || f.d.phase === 'sky' ? 0 : stuckFor);
    phases.add(f.d.phase);
    if (f.d.phase === 'windup') moves.add(f.d.move);
    if (f.d.ult.on && !wasOn) ultimates++;
    wasOn = f.d.ult.on;
    // Phase 1 lasts a while, then half its health.
    if (f.d.stage === 0 && f.d.t < DT * 2 && f.d.phase === 'chase') f.d.hp -= 60;
    f.d.hp = Math.max(1, f.d.hp);
    if (!Number.isFinite(f.d.pos.x + f.d.pos.y + f.d.pos.z + f.d.facing)) throw new Error('its place went bad');
  });
  check('it uses every move', [SWEEP, WING, TAIL, DIVE, EMBER].every((m) => moves.has(m)), [...moves].join());
  check('it goes through every state', ['chase', 'windup', 'breath', 'recover', 'sky', 'dive', 'stun', 'blast'].every((p) => phases.has(p)), [...phases].join());
  check(`no state holds it longer than its window (${longest.toFixed(1)} s)`, longest <= v.coreWindow + 0.1);
  check(`its ultimate came back about every ${v.coreEvery} s (${ultimates})`, ultimates >= 4 && ultimates <= 8);
}

section('Dragon — floor 1’s boss room');
{
  check('floor 1’s boss is the Dragon (Update 0.3.41); floor 2’s The Swarm (Update 0.3.42)', bossOf(1) === 'dragon' && ownBossOf(1) === 'dragon' && bossOf(2) === 'swarm' && ownBossOf(2) === 'swarm');
  const level = buildDungeon(planFloor(4242, 1));
  const b = level.boss;
  const room = level.rooms[b.room];
  const inRoom = (level.arena.pillars ?? []).filter((p) => p.x > room.min.x && p.x < room.max.x && p.z > room.min.z && p.z < room.max.z);
  check('its room has the bible’s 4 stone pillars', inRoom.length === 4, `${inRoom.length}`);
  const run0 = createDungeonRun(level);
  check('floor 1’s boss run is the Dragon’s', run0.boss.kind === 'dragon');
  const combat = createCombat(level.arena, false);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const rng = createRng(3);
  const seen: string[] = [];
  const tick = (secs: number, each?: () => void) => {
    for (let i = 0; i < ticks(secs); i++) {
      each?.();
      stepRooms(run0, p, combat, rng, DT);
      updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
      for (let e = 0; e < combat.events.length; e++) seen.push(combat.events.at(e).kind);
      combat.events.clear();
    }
  };
  const mx = (room.min.x + room.max.x) / 2;
  const mz = (room.min.z + room.max.z) / 2;
  const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
  const half = (room.max.x - room.min.x) / 2;
  p.pos.set(mx + ex * (half - 3), 0, mz + ez * (half - 3));
  tick(DT);
  const s = introBeats();
  tick(s.riseTo - 0.05);
  const boss = combat.enemies[run0.boss.slot];
  check('it rises out of the portal', run0.boss.slot >= 0 && boss.kind === 'dragon' && !seen.includes('dragonScream'));
  tick(0.1);
  check('and screams as it takes its stance', seen.filter((k) => k === 'dragonScream').length === 1 && boss.phase === 'intro');
  tick(s.end - s.riseTo);
  check('then the fight starts', run0.boss.beat === 'fight' && boss.phase === 'chase');
  boss.hp = v.dragonHp * v.rageAt - 1;
  tick(0.5, () => {
    p.hp = 100;
  });
  const minions = combat.enemies.filter((e) => isLive(e) && e.kind !== 'dragon').length;
  check('phase 2: it calls nothing', minions === 0 && boss.phase === 'sky');
  tick(v.skyRise + v.coreGlide + 0.1, () => {
    p.hp = 100;
  });
  check('its core, in its room’s middle, where its portal was', boss.phase === 'blast' && near(boss.pos.x, b.portal.x, 0.01) && near(boss.pos.z, b.portal.z, 0.01));
  // Your back to a pillar: the blast breaks it.
  const pillar = inRoom[0];
  const dx = pillar.x - boss.pos.x;
  const dz = pillar.z - boss.pos.z;
  const dist = Math.hypot(dx, dz);
  tick(v.coreWindow + BLAST_FOR + 0.1, () => {
    p.pos.set(pillar.x + (dx / dist) * 2, 0, pillar.z + (dz / dist) * 2);
    p.hurtTime = 0;
  });
  check('behind one of its pillars, the blast misses you and breaks it', combat.pillars.some((q) => q.broken) && seen.includes('pillarBreak') && p.hp === 100, `${p.hp}`);
}
