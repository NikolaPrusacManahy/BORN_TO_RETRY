// Update 0.2.11 — floor 6's boss, the Old Whale (spec MD_UPDATES/U0211_SUNKEN_GROVE.md): its laps round its room and
// its wake; phase 1, its ram (into a wall: stunned) and its song (behind something you're safe); phase 2 below half: its
// roar, its brood of Clownfish once, its inhale (pulled to its mouth, swallowed) and its breach (its shock throws what's
// near the floor).
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { at, meet, Meet, run, TOP, until } from './fakes/fishMeet';
import { bossCoins, createBossRun, stepBoss } from '../src/sim/dungeon/bossRoom';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { CAUSE_NAMES } from '../src/screens/deathText';
import { hitEnemy, isLive, setPhase } from '../src/sim/enemies/enemy';
import { fishMiddle } from '../src/sim/enemies/fishSwim';
import { bossOf, ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { BREACH, INHALE, RAM, SONG } from '../src/sim/enemies/whaleMoves';
import { maxHpOf } from '../src/sim/player/health';
import { WHALE } from '../src/tuning/whale';
import { Vector3 } from 'three';

const v = WHALE.v;
const mid = new Vector3();

/** The Whale (its room's middle at the origin), you `y` m up at (x, z); the first seed whose first pick is `move` (in
 *  phase `stage`), its pick started. */
function picking(move: number, x: number, z: number, y = 2, stage = 0): Meet {
  for (let seed = 1; seed < 300; seed++) {
    const m = meet('whale', at(0, 1, 0), y, seed);
    m.p.pos.set(x, y, z);
    m.e.stage = stage;
    m.e.pos.set(0, 1, -v.lapRing);
    m.e.cooldown = 0;
    run(m, DT);
    if (m.e.move === move && m.e.phase !== 'chase') return m;
  }
  throw new Error(`no seed picks ${move}`);
}

section('Old Whale — the boss of floor 6');
{
  const s = ENEMY_STATS.whale();
  check(`a boss, ${v.whaleHp} health, never flinches; stunned, hits do more`, s.boss && s.hp === v.whaleHp && s.stagger === Infinity && s.stunned > 1);
  check('floor 6’s boss (and the floors past it); not a mini boss', bossOf(6) === 'whale' && bossOf(7) === 'whale' && !MINI_BOSSES.includes('whale'));
  check(`its name, its death’s, ${v.whaleCoins} coins in its chest`, BOSS_NAMES.whale === 'THE OLD WHALE' && CAUSE_NAMES.whale === 'The Old Whale' && bossCoins('whale') === v.whaleCoins);
}

section('Old Whale — its laps and its wake');
{
  const m = meet('whale', at(0, 1, 0), 2);
  m.p.pos.set(0, 2, 30);
  m.e.cooldown = 99;
  run(m, 6);
  fishMiddle(m.e, mid);
  const r = Math.hypot(m.e.pos.x, m.e.pos.z);
  check(`it swims laps round its room (${v.lapRing} m from the middle), halfway up the water`, Math.abs(r - v.lapRing) < 3 && near(mid.y, TOP / 2, 0.6), `${r.toFixed(1)} m, ${mid.y.toFixed(1)} m up`);
  m.p.pos.set(m.e.pos.x + Math.cos(m.e.facing) * 3, 2, m.e.pos.z - Math.sin(m.e.facing) * 3);
  run(m, DT, () => undefined);
  const drag = Math.hypot(m.p.current.x, m.p.current.z);
  const along = -Math.sin(m.e.facing) * m.p.current.x - Math.cos(m.e.facing) * m.p.current.z;
  check(`close by, its wake drags you along with it (${v.wakePull} m/s)`, near(drag, v.wakePull, 0.05) && along > 0);
}

section('Old Whale — phase 1: its ram, its song');
{
  const m = picking(RAM, 0, 0);
  const r = until(m, () => m.e.phase !== 'windup' && m.e.phase !== 'charge', 4);
  check(`its lane shows, then it rams through you (${v.ramDamage})`, r.includes('whaleRam') && maxHpOf(m.p) - m.p.hp === v.ramDamage);
  const w = picking(RAM, 0, -8);
  w.world.walls.push({ x: 8, normalX: -1 });
  w.p.pos.set(-3, 2, -10);
  w.e.aim.set(30, w.e.aim.y, w.e.pos.z);
  const rw = until(w, () => w.e.phase === 'stun', 5);
  check('into a wall it’s stunned (hits do more)', rw.includes('whaleCrash') && w.e.phase === 'stun');
  const s = picking(SONG, 0, 0);
  const rs = until(s, () => s.e.phase === 'recover', 6);
  check(`its song rolls out and catches you in the open (${v.songDamage})`, rs.includes('whaleSong') && rs.includes('whaleSongHit') && maxHpOf(s.p) - s.p.hp === v.songDamage);
  const c = picking(SONG, 0, 0);
  // (A wall between it, north, and you.)
  c.p.pos.set(9, 2, -v.lapRing);
  c.world.walls.push({ x: 5, normalX: -1 });
  until(c, () => c.e.phase === 'recover', 6);
  check('behind something, it can’t touch you', c.p.hp === maxHpOf(c.p));
}

section('Old Whale — phase 2: its roar, its brood, its inhale, its breach');
{
  const m = meet('whale', at(0, 1, 0), 2);
  m.e.cooldown = 99;
  m.e.hp = ENEMY_STATS.whale().hp * (v.phase2At - 0.05);
  const r = run(m, DT);
  check('below half, it roars and turns on you', r.seen.includes('whaleRoar') && m.e.stage === 1);
  const b = createBossRun('whale');
  b.beat = 'fight';
  b.slot = m.slot;
  const spawns = [{ x: 15, y: 0, z: 15 }, { x: -15, y: 0, z: 15 }, { x: 15, y: 0, z: -15 }, { x: -15, y: 0, z: -15 }];
  const brood = () => m.c.enemies.filter((e) => isLive(e) && e.kind === 'clownfish').length;
  stepBoss(b, { x: 0, z: 0 }, spawns, m.p, m.c, m.c.rng, DT);
  const first = brood();
  m.c.enemies.forEach((e) => e.kind === 'clownfish' && hitEnemy(e, e.hp + 1, 0, 0, 0));
  for (let i = 0; i < ticks(60); i++) stepBoss(b, { x: 0, z: 0 }, spawns, m.p, m.c, m.c.rng, 1 / 2);
  check(`its brood: ${v.brood} Clownfish, once, never again`, first === v.brood && brood() === 0, `${first}`);
  const i = picking(INHALE, 0, -v.lapRing + 14, 2, 1);
  until(i, () => i.e.phase === 'breath', 2);
  run(i, 0.3);
  const pull = Math.hypot(i.p.current.x, i.p.current.z);
  check('it inhales: in front of it the water pulls you to its mouth', pull > v.inhalePull * 0.4 && i.p.current.z < 0);
  const sw = picking(INHALE, 0, -v.lapRing + 14, 2, 1);
  until(sw, () => sw.e.phase === 'breath', 2);
  const rs = until(sw, () => sw.e.phase !== 'breath', 4, () => sw.p.pos.addScaledVector(sw.p.current, DT));
  check(`don’t swim away and you’re swallowed (${v.swallowDamage}), spat out`, rs.includes('whaleSwallow') && maxHpOf(sw.p) - sw.p.hp === v.swallowDamage);
  const br = picking(BREACH, 6, 0, 0, 1);
  const rb = until(br, () => br.e.phase === 'stun', 8);
  check(`its breach: it rises, marks where it'll crash, crashes; its shock throws you off the floor (${v.breachDamage})`, rb.includes('whaleBreachWarn') && rb.includes('whaleCrashDown') && br.p.hp < maxHpOf(br.p));
  const up = picking(BREACH, 6, 0, 0, 1);
  until(up, () => up.e.phase === 'windup', 4);
  up.p.pos.set(up.e.aim.x + 9, 3.5, up.e.aim.z);
  until(up, () => up.e.phase === 'stun', 6);
  check('off the floor and clear of it, the shock misses you', up.p.hp === maxHpOf(up.p));
  setPhase(up.e, 'dead');
}
