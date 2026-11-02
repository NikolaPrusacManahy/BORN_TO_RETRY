// Update 0.3.15 — Skull Cove's Kraken Tentacle and its mini bosses (spec MD_UPDATES/U0315_COVE_CREW.md). The Tentacle
// lurks out in the sea (none without sea) and grabs you by surprise when you come near: click free or be slammed down,
// on the shore either way, never in the sea; up, it rears back before each lunge; it sinks under once, at half health.
// Mako dives into the sand, swims at you and erupts under you (on boards it charges instead). Barbarossa's red line follows you, slower than you run, and
// his shot goes down it; cover stops it; up close his hook.
import { check, section } from './harness';
import { Vector3 } from 'three';
import { at, crew, Crew, DT, ready, run, until } from './fakes/crewMeet';
import { ticks } from './fakes/flatWorld';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { over } from '../src/sim/dungeon/ground';
import { hitEnemy, isLive } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { BURIED } from '../src/sim/enemies/cactoro';
import { maxHpOf } from '../src/sim/player/health';
import { LAVA_DEPTH } from '../src/world/dungeon/assemble';
import { boxAt } from '../src/world/arena';
import { FOES_COVE_B } from '../src/tuning/foesCoveB';

const v = FOES_COVE_B.v;
/** The sea: from 6 m in front of you to 12 m, 20 m wide. */
const SEA = boxAt(-10, -LAVA_DEPTH - 1, -12, 20, 1, 6, 'lava');

/** A Tentacle sent in by that sea (in the room's walk grid too), you at `you`. */
function sea(you: Vector3) {
  const m = crew('tentacle', [at(0, 0, -4)], [SEA]);
  m.c.ground.pits = [SEA];
  m.p.pos.copy(you);
  m.p.grounded = you.y === 0;
  return m;
}

/** Steps `secs` with your attack pressed every 0.1 s (you not held in place): what was seen. */
function click(m: Crew, secs: number): string[] {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs); i++) {
    const intent = emptyCombatIntent();
    intent.attackPressed = i % ticks(0.1) === 0;
    stepCombat(m.c, m.p, intent, m.world, DT);
    m.p.hurtTime = 0;
    m.p.invuln = 0;
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return seen;
}

section('Floor 6 — the Kraken Tentacle');
{
  const free = () => undefined;
  const dry = crew('tentacle', [at(0, 0, -4)]);
  run(dry, 0.1);
  check('no sea in its room: it isn’t there', !dry.e.alive);
  const m = sea(at(0, 0, 10));
  run(m, 0.5, free);
  check('it goes into the sea nearest its spot, out in the water (2 m from its edge; the sea’s edge no longer pushes it out), and lurks unseen', m.e.phase === 'burrow' && m.e.pos.y < -5 && Math.abs(m.e.pos.z + 8) < 0.01);
  const narrow = crew('tentacle', [at(0, 0, -4)]);
  narrow.c.ground.pits = [boxAt(-10, -LAVA_DEPTH - 1, -8, 20, 1, 2, 'lava')];
  run(narrow, 0.1);
  check('in a narrow channel, its middle', Math.abs(narrow.e.pos.z + 7) < 0.01);
  // Come near the water: it bursts out and grabs you.
  m.p.pos.set(1, 0, -4);
  const g = until(m, () => m.c.grab.on, 1, free);
  check(`come near (${v.tentacleReach} m) and it bursts out and grabs you by surprise, lifting you up`, g.includes('tentacleRise') && g.includes('tentacleGrab') && m.c.grab.on && m.e.phase === 'grab' && m.p.pos.y > 1.5);
  const held = m.p.pos.clone();
  const s = until(m, () => !m.c.grab.on, v.tentacleGrabTime + 1, free);
  check(`held, the world still: no clicks in ${v.tentacleGrabTime} s and it slams you down on the shore (${v.tentacleDamage})`, s.includes('tentacleSlam') && maxHpOf(m.p) - m.p.hp === v.tentacleDamage && m.c.grab.end === 'thrown');
  check('you land on solid ground, never in the sea', !over([SEA], m.p.pos.x, m.p.pos.z) && m.p.pos.y === 0 && held.z < m.p.pos.z, `${m.p.pos.x.toFixed(1)}, ${m.p.pos.z.toFixed(1)}`);
  // Click free.
  const c = sea(at(1, 0, -4));
  until(c, () => c.c.grab.on, 1, free);
  const hp = c.e.hp;
  const r = click(c, 1.5);
  check(`click ${v.tentacleGrabHits} times (each a hit on it) before its time’s up and you break free: it reels, you’re dropped on the shore unhurt`, r.includes('tentacleFree') && c.e.phase === 'stun' && c.p.hp === maxHpOf(c.p) && c.e.hp === hp - v.tentacleGrabHits * v.tentacleGrabHit && !over([SEA], c.p.pos.x, c.p.pos.z) && c.c.grab.end === 'free');
  // Caught over the water: still down on the shore.
  const j = sea(at(0, 1, -6.5));
  until(j, () => j.c.grab.on, 1, free);
  until(j, () => !j.c.grab.on, v.tentacleGrabTime + 1, free);
  check('caught jumping over the water, you’re still put down on the shore', !over([SEA], j.p.pos.x, j.p.pos.z) && j.p.pos.z > -6, `${j.p.pos.z.toFixed(1)}`);
  // Never near: it rises anyway; then it lunges, rearing back first.
  const l = sea(at(0, 0, 10));
  const rl = run(l, v.tentacleLurk + 1.2, free);
  check(`never near it, it rises anyway after ${v.tentacleLurk} s, no grab`, rl.seen.includes('tentacleRise') && l.e.phase === 'chase' && Math.abs(l.e.pos.y + LAVA_DEPTH) < 0.01 && !l.c.grab.on);
  l.p.pos.set(0, 0, -4);
  const w = until(l, () => l.e.phase === 'windup', 1, free);
  l.p.pos.set(0, 0, 4);
  const wl = until(l, () => l.e.phase !== 'windup', v.tentacleWindup + 0.5, free);
  check(`up, it rears back (${v.tentacleWindup} s) before each lunge: step away and it misses`, w.includes('tentacleWindup') && !wl.includes('tentacleGrab') && l.e.phase === 'recover' && !l.c.grab.on);
  hitEnemy(l.e, 40, 4, 0, 1);
  check('it never flinches', l.e.phase !== 'flinch');
  // It doesn't sink any more (the designer: it vanished as you broke free).
  hitEnemy(l.e, ENEMY_STATS.tentacle().hp * 0.6, 4, 0, 1);
  run(l, 0.1, free);
  check('worn down past half it stays up and fights on (it sank there before)', v.tentacleSinkAt === 0 && l.e.phase !== 'burrow' && l.e.pos.y > -5 && isLive(l.e));
  // Low, your clicks free you but can't finish it: it reels, up, and the last blow is yours.
  const low = sea(at(1, 0, -4));
  until(low, () => low.c.grab.on, 1, free);
  low.e.hp = 15;
  const rl2 = click(low, 1.5);
  check('nearly dead, your clicks still only free you: it’s left reeling, up, for your last blow', rl2.includes('tentacleFree') && isLive(low.e) && low.e.hp >= 1 && low.e.phase === 'stun' && low.e.pos.y > -5);
  hitEnemy(low.e, 12, 4, 0, 1);
  check('and a punch then finishes it', !isLive(low.e));
}

section('Floor 6 — Mako');
{
  const m = crew('mako', [at(0, 0, -7)]);
  m.e.near = v.makoUp - 0.05;
  const r = run(m, 0.2);
  check(`on its feet a while (${v.makoUp} s), then on sand it dives in: out of reach`, r.seen.includes('makoDive') && m.e.phase === 'burrow' && m.e.pos.y === BURIED);
  const s = until(m, () => m.e.phase === 'windup', 3);
  check(`it swims through the sand at you (${v.makoSwim} m/s); under you the sand churns`, s.includes('makoRise') && Math.hypot(m.e.pos.x, m.e.pos.z) <= 1.05);
  const b = until(m, () => m.e.phase === 'recover', 1.5, () => undefined);
  check(`stay and it erupts, biting: ${v.makoBite}, thrown up`, b.includes('makoBite') && maxHpOf(m.p) - m.p.hp === v.makoBite && m.p.vel.y > 5);
  const d = crew('mako', [at(0, 0, -7)]);
  d.e.near = v.makoUp - 0.05;
  until(d, () => d.e.phase === 'windup', 4);
  d.p.pos.set(4, 0, 0);
  until(d, () => d.e.phase === 'recover', 1.5);
  check('step off the churning sand and it misses', d.p.hp === maxHpOf(d.p) && d.e.pos.y === 0);
  const c = crew('mako', [at(0, 0, -9)]);
  c.c.ground.boards = [boxAt(-20, -0.05, -20, 40, 0.1, 40, 'floor')];
  c.e.near = v.makoUp - 0.05;
  const rc = until(c, () => c.e.phase === 'recover', 2);
  check(`on boards it can’t dive: it charges you down (${v.makoChargeDamage}), shoving you`, rc.includes('makoCharge') && !rc.includes('makoDive') && maxHpOf(c.p) - c.p.hp === v.makoChargeDamage);
  check('only a hard hit staggers it', ENEMY_STATS.mako().stagger > 0 && ENEMY_STATS.mako().stagger < Infinity);
}

section('Floor 6 — Captain Barbarossa');
{
  const m = crew('captain', [at(0, 0, -12)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'recover', 3);
  check(`at range he aims (${v.captainAim} s), then fires down his line: ${v.captainShot}`, r.includes('captainAim') && r.includes('captainShot') && maxHpOf(m.p) - m.p.hp === v.captainShot);
  const d = crew('captain', [at(0, 0, -12)]);
  ready(d.e);
  until(d, () => d.e.phase === 'windup', 1);
  const rd = until(d, () => d.e.phase === 'recover', 3, () => d.p.pos.x += 0.06);
  check(`run across his line (it follows at ${v.captainTrack} m/s) and his shot misses`, rd.includes('captainShot') && d.p.hp === maxHpOf(d.p));
  const w = crew('captain', [at(0, 0, -12)], [boxAt(1, 0, -6, 5, 4, 2, 'wall')]);
  ready(w.e);
  until(w, () => w.e.phase === 'windup', 1);
  w.p.pos.set(5, 0, 2);
  const rw = until(w, () => w.e.phase === 'recover', 3);
  check('get behind something and it stops his shot', rw.includes('captainShot') && w.p.hp === maxHpOf(w.p));
  const c = crew('captain', [at(0, 0, -3)]);
  ready(c.e);
  const rc = until(c, () => c.e.phase === 'recover', 3);
  check(`up close his hook sweeps: ${v.captainDamage}`, !rc.includes('captainAim') && rc.includes('captainSweep') && maxHpOf(c.p) - c.p.hp === v.captainDamage);
  hitEnemy(c.e, 1, 4, 0, 1);
  check('a light hit doesn’t stagger him', c.e.phase !== 'flinch' && isLive(c.e));
}
