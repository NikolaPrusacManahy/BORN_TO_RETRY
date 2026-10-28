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
import { createCombat, CombatEvent } from '../src/sim/combat/state';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { BREATH, CLAWS, FIREBALLS, TAIL, WING } from '../src/sim/enemies/dragonMoves';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf, doomTime } from '../src/sim/enemies/kinds';
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
  check('at half health it screams', a.seen.filter((k) => k === 'dragonScream').length === 1 && f.d.stage === 1 && f.d.phase === 'roar');
  const b = run(f, v.screamTime + 0.05);
  check('once', !b.seen.includes('dragonScream') && f.d.phase !== 'roar');
  hitEnemy(f.d, 1e9, 0, 0, 0);
  const c = run(f, doomTime() + 0.05);
  check('killed, it rises, hangs, sinks and bursts', c.seen.includes('bossBurst') && f.d.struck);
}

section('Dragon — floor 2’s boss room');
{
  check('floor 1’s boss is the Demon, floor 2’s the Dragon (floor 3: the Dragon for now)', bossOf(1) === 'demon' && bossOf(2) === 'dragon' && bossOf(3) === 'dragon');
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
  const wasps = combat.enemies.filter((e) => isLive(e) && e.kind === 'wasp').length;
  check(`raging, it calls ${v.summonWasps} wasps`, wasps === v.summonWasps);
}
