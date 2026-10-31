// Update 0.2.10 — floor 5's enemies (spec MD_UPDATES/U0210_DROWNED_TEMPLE.md), most of them playing the tide: the
// Snapper swims under high water and comes up under you (the water rings first), or lunges on a dry floor; the Urchin
// rolls spiked (hit it then and its thorns hurt you); the Jelly's shock runs far through the water to you wading; the
// Glub spits water bolts; the Big Glub lobs bubbles from its perch; the Squidle dives through you and inks your view;
// the Spawnling bites. The mini bosses: the Deep One's lash drags you in (dash through its line), the Bog Brute comes up
// under you at high water and leaps at you at low water.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { percherOf, rosterOf } from '../src/sim/dungeon/wavePlan';
import { submerged } from '../src/sim/enemies/drownedKingMoves';
import { dodges } from '../src/sim/enemies/evade';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { EnemyKind, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { shockReach } from '../src/sim/enemies/jelly';
import { createPlayer } from '../src/sim/player/state';
import { CAUSE_NAMES } from '../src/screens/deathText';
import { FOES5 } from '../src/tuning/foes5';
import { FOES5B } from '../src/tuning/foes5b';
import { Arena, boxAt } from '../src/world/arena';

const v = FOES5.v;
const b = FOES5B.v;
const walls = [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')];
const ROOM: Arena = { name: 'temple', boxes: walls, pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const world = new FlatWorld();
const HIGH = 0.45;

/** You at the middle, one `kind` at `at`, the water `tide` m deep. */
function meet(kind: EnemyKind, at: Vector3, tide = 0) {
  const c = createCombat(ROOM);
  c.rng = createRng(5);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, kind, at, Math.atan2(at.x, at.z));
  c.events.clear();
  return { c, p, e: c.enemies[slot], slot, tide };
}
type Meet = ReturnType<typeof meet>;

/** Steps `secs` (`each(i)`: before tick i): what was seen, what you lost. */
function run(m: Meet, secs: number, each?: (i: number) => void) {
  const seen: string[] = [];
  const hp = m.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.(i);
    m.c.tide = m.tide;
    stepCombat(m.c, m.p, emptyCombatIntent(), world, DT);
    m.p.hurtTime = 0;
    m.p.invuln = 0;
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return { seen, lost: hp - m.p.hp };
}
/** Steps until `kind` is seen (at most `secs`). */
function until(m: Meet, kind: string, secs: number) {
  for (let i = 0; i < ticks(secs); i++) if (run(m, DT).seen.includes(kind)) return true;
  return false;
}

section('Floor 5 — its enemies');
{
  const roster = rosterOf(5);
  check('nine of its own: seven, and two mini bosses', roster.length === 9 && MINI_BOSSES.includes('deepOne') && MINI_BOSSES.includes('bogBrute') && roster.every((k) => !rosterOf(4).includes(k)));
  check('the Big Glub is its percher; the floors past it send floor 5’s', percherOf(5) === 'bigGlub' && rosterOf(7) === roster);
  check('each has a name to die by', roster.every((k) => !!CAUSE_NAMES[k]));
}

section('Floor 5 — the Snapper: under high water, or on the floor');
{
  const m = meet('snapper', new Vector3(0, 0, -10), HIGH);
  const r1 = run(m, 0.1);
  check('at high water it dives under: out of reach', r1.seen.includes('snapperDive') && submerged(m.e) && dodges(m.c, m.slot, 0, -1));
  check('it swims to you; the water rings where it’ll come up', until(m, 'snapperRise', 3) && m.e.phase === 'windup' && Math.hypot(m.e.pos.x, m.e.pos.z) < 1.5);
  const r2 = run(m, v.snapperRise + 0.02);
  check(`standing there, it comes up biting (${v.snapperBite})`, r2.seen.includes('snapperBite') && r2.lost === v.snapperBite && !submerged(m.e));
  check('then it stays up: hit it', m.e.phase === 'recover' && !dodges(m.c, m.slot, 0, -1));
  const away = meet('snapper', new Vector3(0, 0, -10), HIGH);
  until(away, 'snapperRise', 3);
  away.p.pos.set(v.snapperReach + 1.5, 0, 0);
  const r3 = run(away, v.snapperRise + 0.02);
  check('step away from the ring and it misses', r3.seen.includes('snapperBite') && r3.lost === 0);
  const dry = meet('snapper', new Vector3(0, 0, -3.5), 0);
  const r4 = run(dry, v.snapperWindup + 0.5);
  check(`at low water it stays on the floor, gathers and lunges (${v.snapperBite})`, !r4.seen.includes('snapperDive') && r4.seen.includes('snapperWindup') && r4.seen.includes('snapperLunge') && r4.lost === v.snapperBite);
  const left = meet('snapper', new Vector3(0, 0, -20), HIGH);
  run(left, 0.1);
  left.tide = 0;
  run(left, 0.1);
  check('the water drains while it’s under: it’s left on the floor', !submerged(left.e) && left.e.phase === 'chase');
}

section('Floor 5 — the Urchin: its roll, its thorns');
{
  const m = meet('urchin', new Vector3(0, 0, -6));
  const r1 = run(m, 0.1);
  check('close enough, it curls up with its spikes out', r1.seen.includes('urchinCurl') && m.e.stage === 1);
  const before = m.p.hp;
  check('hit it spiked: its spikes turn the blow', dodges(m.c, m.slot, 0, -1) && m.c.events.at(m.c.events.length - 1).kind === 'urchinThorns');
  run(m, DT);
  check(`and its thorns hurt you (${v.urchinThorns})`, before - m.p.hp === v.urchinThorns);
  const r2 = run(m, v.urchinWindup + 0.6);
  check(`it rolls into you (${v.urchinDamage}) and throws you aside`, r2.seen.includes('urchinRoll') && r2.seen.includes('urchinHit') && r2.lost === v.urchinDamage && Math.hypot(m.p.vel.x, m.p.vel.z) > 1);
  const r3 = run(m, v.urchinRollTime + v.urchinSpiked + 0.2);
  check('its roll over, its spikes go in: now hit it', r3.seen.includes('urchinOpen') && m.e.stage === 0 && !dodges(m.c, m.slot, 0, -1));
}

section('Floor 5 — the Jelly: its shock runs through the water');
{
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  check(`wading at high water its shock reaches ${v.jellyFar} m; out of the water, ${v.jellyNear} m`, shockReach(p, HIGH) === v.jellyFar && shockReach(p, 0) === v.jellyNear && shockReach({ ...p, pos: new Vector3(0, 1, 0) }, HIGH) === v.jellyNear);
  const wet = meet('jelly', new Vector3(0, 0, -7), HIGH);
  const hp = wet.p.hp;
  const glowed = until(wet, 'jellyGlow', 3);
  const shocked = until(wet, 'jellyShock', v.jellyGlow + 0.1);
  check(`7 m off, you wading: it glows, then shocks you (${v.jellyDamage})`, glowed && shocked && hp - wet.p.hp === v.jellyDamage && Math.hypot(wet.e.pos.x, wet.e.pos.z) > 5);
  const dry = meet('jelly', new Vector3(0, 0, -7), 0);
  dry.e.cooldown = 99;
  const r2 = run(dry, 0.3);
  check('dry, at 7 m: no shock yet', !r2.seen.includes('jellyGlow') && r2.lost === 0);
}

section('Floor 5 — the Glubs, the Squidle, the Spawnling');
{
  const g = meet('glub', new Vector3(0, 2.8, -11));
  const r1 = run(g, 2);
  check(`the Glub puffs up and spits ${v.glubBolts} water bolts`, r1.seen.includes('glubWindup') && r1.seen.includes('glubSpit') && g.c.orbs.filter((o) => o.look === 'water').length >= v.glubBolts);
  const big = meet('bigGlub', new Vector3(0, 4, -14));
  big.e.perch = 3;
  const r2 = run(big, b.leapAir + 4);
  check('the Big Glub, on its perch, swells and lobs a bubble that bursts', r2.seen.includes('bubbleWindup') && r2.seen.includes('bubbleLob') && r2.seen.includes('bubblePop') && big.e.perch === 3);
  const s = meet('squidle', new Vector3(0, 3, -8));
  const r3 = run(s, 3, () => s.p.ink > 0 && s.p.pos.set(0, 0, 0));
  check(`the Squidle dives through you: hurt (${v.squidleDamage}), ink over your view`, r3.seen.includes('squidleDive') && r3.seen.includes('squidleInk') && r3.lost >= v.squidleDamage && s.p.ink > 0);
  const n = meet('spawnling', new Vector3(0, 0, -5));
  const r4 = run(n, 1.5);
  check(`the Spawnling runs in and bites (${v.spawnDamage})`, r4.seen.includes('spawnWindup') && r4.seen.includes('spawnBite') && r4.lost >= v.spawnDamage);
}

section('Floor 5 — the mini bosses: the Deep One’s lash, the Bog Brute');
{
  const m = meet('deepOne', new Vector3(0, 0, -10));
  check('the Deep One’s tentacle glows down its line', until(m, 'deepLashWindup', 4) && m.e.move === 1);
  const r1 = run(m, b.lashWindup + b.lashPull + 0.3, () => {
    // Its drag moves you in (as stepPlayer would).
    m.p.pos.addScaledVector(m.p.vel, DT);
  });
  check(`still on the line: caught, dragged in, slammed (${b.lashDamage})`, r1.seen.includes('deepCatch') && r1.seen.includes('deepSlam') && r1.lost >= b.lashDamage);
  const d = meet('deepOne', new Vector3(0, 0, -10));
  until(d, 'deepLashWindup', 4);
  run(d, b.lashWindup - DT * 2);
  d.p.dashTime = 0.2;
  const r2 = run(d, 0.1);
  check('dashing as it lashes: it misses', r2.seen.includes('deepLash') && !r2.seen.includes('deepCatch'));
  const bog = meet('bogBrute', new Vector3(0, 0, -12), HIGH);
  bog.e.cooldown = 0;
  check('the Bog Brute at high water dives under', until(bog, 'bogDive', 3) && submerged(bog.e));
  check('it swims to you; the water rings', until(bog, 'bogRise', b.diveFind + 1));
  const r3 = run(bog, b.diveWarn + 0.1);
  check(`it comes up under you (${b.diveDamage}) and sends a wave out`, r3.seen.includes('bogSlam') && r3.lost >= b.diveDamage && bog.c.quakes.some((q) => q.alive));
  const leap = meet('bogBrute', new Vector3(0, 0, -12), 0);
  leap.e.cooldown = 0;
  check('at low water it crouches to leap', until(leap, 'bogCrouch', 3));
  leap.p.pos.set(4, 0, 0);
  const r4 = run(leap, b.leapWindup + b.leapAir + 0.1);
  check('it leaps where you were, landing with a wave', r4.seen.includes('bogLeap') && r4.seen.includes('bogSlam') && Math.hypot(leap.e.pos.x, leap.e.pos.z) < 1.5);
}
