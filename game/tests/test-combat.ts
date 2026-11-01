// M1 step 6 — punches against targets, dummies, the turret and its orbs.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { segmentDistance } from '../src/sim/combat/geometry';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { fireOrb } from '../src/sim/combat/orbs';
import { createPlayer } from '../src/sim/player/state';
import { FEEDBACK, FISTS, TARGETS } from '../src/tuning/combat';
import type { Arena } from '../src/world/arena';

/** A bare arena: the player at the origin facing -z, one dummy 1.5 m ahead, one turret far ahead. */
function arena(dummyZ = -1.5, turretZ = -20): Arena {
  return { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [{ x: 0, y: 0, z: dummyZ }], turrets: [{ x: 0, y: 0, z: turretZ }] };
}

function kinds(s: CombatState): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.events.length; i++) out.push(s.events.at(i).kind);
  return out;
}

function tick(s: CombatState, p: ReturnType<typeof createPlayer>, w: FlatWorld, intent: Partial<CombatIntent> = {}) {
  stepCombat(s, p, { ...emptyCombatIntent(), ...intent }, w, DT);
}

section('Geometry');
{
  const d = segmentDistance(new Vector3(0, 0, 0), new Vector3(0, 0, -10), new Vector3(1, -1, -5), new Vector3(1, 1, -5));
  check('crossing segments 1 m apart', near(d, 1, 1e-9));
  const e = segmentDistance(new Vector3(0, 0, 0), new Vector3(0, 0, -1), new Vector3(0, 0, -3), new Vector3(0, 0, -3));
  check('a point past the end of a segment', near(e, 2, 1e-9));
}

section('Combat — punches');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat(arena());
  tick(s, p, w, { attackPressed: true });
  const ev = kinds(s);
  check('a jab at a dummy in reach hits it', ev.includes('jabL') && ev.includes('hitJab'), ev.join(','));
  check('the dummy loses the jab damage', s.dummies[0].hp === TARGETS.v.dummyHp - FISTS.v.jabDamage);
  check('the hit flashes the dummy and pushes it away (-z)', s.dummies[0].flash > 0 && s.dummies[0].offsetVel.z < 0);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat(arena(-(FISTS.v.reach + 1.5)));
  tick(s, p, w, { attackPressed: true });
  check('a dummy out of reach is a whiff', kinds(s).includes('whiff') && s.dummies[0].hp === TARGETS.v.dummyHp);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, Math.PI);
  const s = createCombat(arena());
  tick(s, p, w, { attackPressed: true, yaw: Math.PI });
  check('a dummy behind you is not hit', kinds(s).includes('whiff'));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat(arena());
  let thrown = 0;
  for (let i = 0; i < ticks(3) && !s.dummies[0].broken; i++) {
    s.events.clear();
    tick(s, p, w, { attackHeld: true });
    if (kinds(s).some((k) => k.startsWith('jab'))) thrown++;
  }
  check('enough punches break the dummy', s.dummies[0].broken, `after ${thrown} jabs`);
  check('breaking it freezes for the kill hit-stop', near(s.hitStop.remaining, Math.max(FEEDBACK.v.stopKill, FEEDBACK.v.stopFinisher) / 1000, 1e-9) || s.hitStop.remaining > 0);
  for (let i = 0; i < ticks(TARGETS.v.dummyRespawn + 0.1); i++) tick(s, p, w);
  check('it comes back after the respawn time, whole', !s.dummies[0].broken && s.dummies[0].hp === TARGETS.v.dummyHp);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat(arena());
  // Update 0.3.5 (the designer: "no more heavy punches from fists, now right click is parry").
  for (let i = 0; i < ticks(FISTS.v.chargeTime) + 2; i++) tick(s, p, w, { heavyHeld: true });
  s.events.clear();
  tick(s, p, w);
  check('right click held and let go: no charged punch, the dummy untouched', !kinds(s).includes('hitHeavy') && !kinds(s).includes('heavy') && s.dummies[0].hp === TARGETS.v.dummyHp);
  tick(s, p, w, { attackPressed: true });
  check('a jab knocks it', s.dummies[0].hp === TARGETS.v.dummyHp - FISTS.v.jabDamage);
  for (let i = 0; i < ticks(3); i++) tick(s, p, w);
  check('the dummy springs back home', s.dummies[0].offset.length() < 0.01 && Math.abs(s.dummies[0].tilt.x) < 0.01);
}

section('Combat — turret and orbs');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat(arena(5)); // dummy behind the player, out of the way
  let warnedAt = -1;
  let firedAt = -1;
  for (let i = 0; i < ticks(TARGETS.v.turretInterval + TARGETS.v.turretTelegraph + 0.5) && firedAt < 0; i++) {
    s.events.clear();
    tick(s, p, w);
    if (kinds(s).includes('telegraph')) warnedAt = i;
    if (kinds(s).includes('orbFire')) firedAt = i;
  }
  check('the turret warns before it fires', warnedAt >= 0 && firedAt > warnedAt);
  check('the warning lasts the tuned time', near((firedAt - warnedAt) * DT, TARGETS.v.turretTelegraph, DT * 1.5), `${((firedAt - warnedAt) * DT).toFixed(3)} s`);
  const orb = s.orbs.find((o) => o.alive);
  check('the orb flies at you at orb speed', !!orb && orb.vel.z > 0 && near(orb.vel.length(), TARGETS.v.orbSpeed, 1e-6));
  let hit = false;
  for (let i = 0; i < ticks(4) && !hit; i++) {
    s.events.clear();
    tick(s, p, w);
    hit = kinds(s).includes('orbHitPlayer');
  }
  check('an orb that reaches you hits you', hit);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  p.invuln = 10; // dashing
  const s = createCombat(arena(5));
  fireOrb(s.orbs, new Vector3(0, 1.2, -3), new Vector3(0, 0, 1), 9, 20);
  let hit = false;
  for (let i = 0; i < ticks(1); i++) {
    s.events.clear();
    tick(s, p, w);
    hit ||= kinds(s).includes('orbHitPlayer');
  }
  check('orbs pass through you while you dash', !hit);
}
{
  // The parry was removed (the designer's call): a punch at an incoming orb did nothing to it. Update 0.3.3 — the
  // designer: "Yes, parrying": it's back (parry.ts; test-parry.ts). Update 0.3.5 — right click's, not a punch's.
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat(arena(5, -30));
  fireOrb(s.orbs, new Vector3(0, 1.4, -1.2), new Vector3(0, 0, 1), TARGETS.v.orbSpeed, TARGETS.v.orbDamage);
  tick(s, p, w, { attackPressed: true });
  const o = s.orbs.find((x) => x.alive && x.parried);
  check('a punch no longer turns an incoming orb around', !o);
  const t = createCombat(arena(5, -30));
  fireOrb(t.orbs, new Vector3(0, 1.4, -1.2), new Vector3(0, 0, 1), TARGETS.v.orbSpeed, TARGETS.v.orbDamage);
  tick(t, p, w, { heavyHeld: true });
  const back = t.orbs.find((x) => x.alive)!;
  check('right click (barehanded) does', !!back && back.parried && back.vel.z < 0);
}
{
  // A wall between the turret and you blocks its sight: no warning, no shot.
  const w = new FlatWorld();
  w.walls.push({ x: -1, normalX: 1 });
  const p = createPlayer(0, 0, 0, 0);
  const s = createCombat({ ...arena(5), turrets: [{ x: -10, y: 0, z: 0 }] });
  let warned = false;
  for (let i = 0; i < ticks(TARGETS.v.turretInterval + 1); i++) {
    s.events.clear();
    tick(s, p, w);
    warned ||= kinds(s).includes('telegraph');
  }
  check('the turret holds fire without a line of sight', !warned);
}
