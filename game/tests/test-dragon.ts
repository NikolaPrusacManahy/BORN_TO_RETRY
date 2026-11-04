// Update 0.0.18 — the Dragon, floor 2's boss (the designer: an intro where it screams and the scream shakes; fire breath
// like a laser beam that burns even its own side; fireballs; claws; wing swings; tail swings). Its beam burns you and
// any enemy in its line, stops at a wall and follows you slowly; its fireballs come in a burst; its claws swoop through
// you; its wing blows away what's in front, its tail sweeps all round (jump it); at half health it screams once and
// calls wasps; dead, its show is the Demon's. Floor 2's boss room holds it, and it screams in its stance.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';
import { updateOrbs } from '../src/sim/combat/orbs';
import { updateBombs } from '../src/sim/combat/bombs';
import { createCombat, CombatEvent } from '../src/sim/combat/state';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { BREATH, BURST, CLAWS, FIREBALLS, TAIL, WING } from '../src/sim/enemies/dragonMoves';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf, doomTime, ownBossOf } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { DRAGON } from '../src/tuning/dragon';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = DRAGON.v;
const events = new EventQueue<CombatEvent>(512, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  d: Enemy;
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
  return { w, p, all, d: all[0] };
}

function warnNow(f: Fight, move: number) {
  f.d.move = move;
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
    updateBombs(f.w.bombs, f.p, events, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    seen.push(...kinds());
    events.clear();
  }
  return { seen, hurt: f.p.hp < hp };
}

section('Dragon — its fire beam');
{
  const f = fight(new Vector3(0, 0, -15));
  // A grunt of its own, between you (frozen where it stands).
  const g = spawnEnemy(f.all, 'grunt', new Vector3(0, 0, -2.5), Math.PI);
  f.all[g].frozen = 99;
  warnNow(f, BREATH);
  const a = run(f, v.breathWindup + 0.3);
  check('after its warning it breathes a beam of fire: in its line, you burn', a.seen.includes('dragonBreath') && a.hurt && f.d.phase === 'breath');
  check('so does any enemy in its line, its own side too', !isLive(f.all[g]) && a.seen.includes('burnt') && !a.seen.includes('kill'));
  check('through your chest, the beam ends on the floor just past you', near(f.d.aim.y, 0, 0.05) && f.d.aim.z > 0 && Math.hypot(f.d.aim.x, f.d.aim.z) < 5, `${f.d.aim.x.toFixed(2)}, ${f.d.aim.y.toFixed(2)}, ${f.d.aim.z.toFixed(2)}`);
  const b = run(f, v.beamTime);
  check('it burns out, then it stands a moment', b.seen.length >= 0 && f.d.phase === 'recover');

  // Stepping aside as it starts: it follows, but slowly.
  const s = fight(new Vector3(0, 0, -15));
  warnNow(s, BREATH);
  run(s, v.breathWindup - DT);
  s.p.pos.x = 7;
  const c = run(s, 0.2);
  check('step aside as it starts: the beam lags behind you', c.seen.includes('dragonBreath') && !c.hurt);
  const d = run(s, v.beamTime - 0.3);
  check('but it follows you round', d.hurt);

  // A wall between: the beam stops at it.
  const wall: Arena = { name: 'w', boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(-10, 0, -8, 20, 9, 1, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const w = fight(new Vector3(0, 0, -15), undefined, wall);
  warnNow(w, BREATH);
  const e = run(w, v.breathWindup + 0.5);
  check('a wall stops it: behind one, you’re safe', e.seen.includes('dragonBreath') && !e.hurt && w.d.aim.z < -7.5, `ends at z ${w.d.aim.z.toFixed(2)}`);
}

section('Dragon — fireballs, claws, wing, tail');
{
  const f = fight(new Vector3(0, 0, -15));
  warnNow(f, FIREBALLS);
  const a = run(f, v.fireWindup + v.fireGap * v.fireballs + 1);
  check(`its fireballs come in a burst of ${v.fireballs}, and hit you`, a.seen.filter((k) => k === 'dragonFireball').length === v.fireballs && a.hurt);

  const c = fight(new Vector3(0, 0, -14));
  warnNow(c, CLAWS);
  const b = run(c, v.clawWindup + 1);
  check('its claws: it swoops through you, hurting and throwing you', b.seen.includes('demonCharge') && b.hurt && Math.hypot(c.p.vel.x, c.p.vel.z) > 5);

  const w = fight(new Vector3(0, 0, -6));
  warnNow(w, WING);
  const d = run(w, v.wingWindup + 0.05);
  check('its wing sweeps the front: hurt and blown away', d.seen.includes('dragonWing') && d.hurt && w.p.vel.z > 5);
  const behind = fight(new Vector3(0, 0, -6), 0);
  warnNow(behind, WING);
  const e = run(behind, v.wingWindup + 0.05);
  check('behind it, the wing misses', e.seen.includes('dragonWing') && !e.hurt);

  const t = fight(new Vector3(0, 0, -5), 0);
  t.d.cooldown = 0;
  const g = run(t, v.tailWindup + 0.05);
  check('behind it and close: it coils and its tail sweeps round, hurting you', t.d.move === TAIL && g.seen.includes('dragonTail') && g.hurt);
  const j = fight(new Vector3(0, 0, -5), 0);
  j.d.cooldown = 0;
  const h = run(j, v.tailWindup + 0.05, () => {
    j.p.pos.y = v.tailClear + 0.2;
  });
  check('jump it and it passes under you', h.seen.includes('dragonTail') && !h.hurt);
}

section('Dragon — rage and death');
{
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 300, 0, 0, 0);
  check('it never flinches', f.d.phase !== 'flinch');
  f.d.hp = v.dragonHp * v.rageAt - 1;
  const a = run(f, 0.05);
  // (Update 0.0.21 — the designer: raging, it flies up to bomb you; it no longer stands and roars.)
  check('at half health it screams and takes to the sky', a.seen.filter((k) => k === 'dragonScream').length === 1 && f.d.stage === 1 && f.d.phase === 'sky');
  const b = run(f, v.screamTime + 0.05);
  check('once', !b.seen.includes('dragonScream') && f.d.phase !== 'roar');
  hitEnemy(f.d, 1e9, 0, 0, 0);
  const c = run(f, doomTime() + 0.05);
  check('killed, it rises, hangs, sinks and bursts', c.seen.includes('bossBurst') && f.d.struck);
}

section('Dragon — floor 2’s boss room');
{
  // (Update 0.2.3 — floor 3's is the Bone King now: test-bone-king.ts.)
  check('floor 1’s boss is the Dragon (Update 0.3.41), standing in on floor 2 till the worm swarm', bossOf(1) === 'dragon' && ownBossOf(1) === 'dragon' && bossOf(2) === 'dragon' && ownBossOf(2) === null);
  const level = buildDungeon(planFloor(4242, 2));
  const b = level.boss;
  const room = level.rooms[b.room];
  const run0 = createDungeonRun(level);
  check('floor 2’s boss run is the Dragon’s', run0.boss.kind === 'dragon');
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
  // (Update 0.0.21 — the designer: no more spawning wasps.)
  const minions = combat.enemies.filter((e) => isLive(e) && e.kind !== 'dragon').length;
  check('raging, it calls no wasps (nor anything)', minions === 0 && boss.phase === 'sky');
}

section('Dragon — close, it strikes; far, it burns (Update 0.0.20)');
{
  // The designer: more melee when you're close, the beam and fireballs when you're far; the beam charges 1.5 s and
  // warns you.
  const picks = (dist: number) => {
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
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
  check('close, only melee: wing, tail, claws', close.size > 1 && [...close].every((m) => m === WING || m === TAIL || m === CLAWS), [...close].join());
  check('far, only the beam and fireballs', far.has(BREATH) && far.has(FIREBALLS) && [...far].every((m) => m === BREATH || m === FIREBALLS), [...far].join());
  const pauseAt = (dist: number) => {
    const f = fight(new Vector3(0, 0, -dist));
    f.d.move = WING;
    setPhase(f.d, 'recover');
    f.d.t = 10;
    run(f, DT);
    return f.d.cooldown;
  };
  check('close, it pauses less between moves', near(pauseAt(v.dragonNear - 2), pauseAt(v.dragonFar + 6) * v.closePause, 0.02));
  const f = fight(new Vector3(0, 0, -20));
  warnNow(f, BREATH);
  const charge = run(f, v.breathWindup - 0.1);
  check(`the beam charges ${v.breathWindup} s, aimed at you all the while (the warning line), harmless meanwhile`, v.breathWindup === 1.5 && !charge.seen.includes('dragonBreath') && !charge.hurt && Math.hypot(f.d.aim.x, f.d.aim.z) < 5 && f.d.phase === 'windup');
  const fire = run(f, 0.2);
  check('then it fires', fire.seen.includes('dragonBreath') && fire.hurt);
}

section('Dragon — the sky bombardment (Update 0.0.21)');
{
  // The designer: its second phase starts with it flying up and bombing the ground with massive fireballs, their
  // landing shown; 5 to 8 s in the air.
  const f = fight(new Vector3(0, 0, -12));
  f.d.hp = v.dragonHp * v.rageAt - 1;
  let top = 0;
  let marked = 0;
  let bombs = 0;
  let longest = 0;
  const spots: number[] = [];
  let px = f.p.pos.x;
  let pz = f.p.pos.z;
  const a = run(f, v.skyMax + v.skyRise + 1, () => {
    f.p.hurtTime = 0;
    top = Math.max(top, f.d.pos.y);
    const alive = f.w.bombs.filter((b) => b.alive);
    marked = Math.max(marked, alive.length);
    // (Each bomb just thrown, against where you stood as it was thrown: the last tick.)
    for (const b of alive) if (b.t > 0 && b.t <= DT * 1.01) spots.push(Math.hypot(b.to.x - px, b.to.z - pz));
    px = f.p.pos.x;
    pz = f.p.pos.z;
    if (f.d.phase === 'sky') longest = f.d.t;
  });
  bombs = a.seen.filter((k) => k === 'dragonBomb').length;
  check(`it flies up (${v.skyAlt} m)`, near(top, v.skyAlt, 0.05));
  check(`and bombs the ground with fireballs (${bombs}), each landing spot known from the throw`, bombs >= 6 && marked >= 2 && a.seen.filter((k) => k === 'bombBlast').length >= bombs - 3);
  check('aimed at you or round you', spots.length > 0 && spots.every((d) => d <= v.bombSpread + 0.01) && spots.some((d) => d < 0.01));
  check(`up there ${v.skyMin}–${v.skyMax} s, then back down to fight`, longest >= v.skyMin && longest <= v.skyMax + v.skyRise + 0.05 && f.d.pos.y === 0 && f.d.phase !== 'sky', longest.toFixed(2));
  check('a bomb landing on you hurts', a.hurt);
  // Out of a bomb's reach: unhurt.
  const g = fight(new Vector3(0, 0, -12));
  g.w.bombs[0].alive = true;
  g.w.bombs[0].to.set(20, 0, 20);
  g.w.bombs[0].from.set(20, 10, 20);
  g.w.bombs[0].fall = 0.1;
  g.w.bombs[0].radius = v.bombRadius;
  g.w.bombs[0].damage = v.bombDamage;
  g.d.cooldown = 99;
  const b = run(g, 0.2);
  check('away from where it lands, it misses', b.seen.includes('bombBlast') && !b.hurt);
}

section('Dragon — the flame burst (Update 0.0.21)');
{
  // The designer: stay near it too long (about 30 s) and it charges up and explodes in flames: run.
  const f = fight(new Vector3(0, 0, -4));
  f.d.near = v.burstAfter;
  f.d.cooldown = 0;
  const a = run(f, DT);
  check('after you have stayed close too long, it charges a burst', f.d.phase === 'windup' && f.d.move === BURST && a.seen.includes('dragonWindup'));
  const b = run(f, v.burstWindup + 0.05);
  check(`then bursts into flame: close, you're hurt and thrown far`, b.seen.includes('dragonBurst') && b.hurt && Math.hypot(f.p.vel.x, f.p.vel.z) > 10);
  const g = fight(new Vector3(0, 0, -4));
  g.d.near = v.burstAfter;
  g.d.cooldown = 0;
  run(g, v.burstWindup * 0.5);
  g.p.pos.set(0, 0, v.burstRadius + 4);
  const c = run(g, v.burstWindup * 0.5 + 0.05);
  check('run out of its reach while it charges and you are safe', c.seen.includes('dragonBurst') && !c.hurt);
  const h = fight(new Vector3(0, 0, -4));
  run(h, 3);
  check('close for a while (3 s) counts up; it bursts only after Burst after', near(h.d.near, 3, 0.05) && h.d.move !== BURST);
}
