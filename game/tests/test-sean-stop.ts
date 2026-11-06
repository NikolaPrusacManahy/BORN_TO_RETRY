// Update 0.3.85 — Gravity Sean's Time Stop (the designer: "a gravity zone that covers the whole room and act like a time stop (when you hit an enemy they looks unfazed and hit will register when time stop ends)").
// Through stepCombat with real blows: the meter, what stops, what doesn't, the hits held back and all landing as it ends.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { seanHand, STOP_CAST, worldHeld } from '../src/sim/combat/gravityMeter';
import { stopShade } from '../src/sim/combat/gravityStop';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { SEAN } from '../src/tuning/sean';
import { StopView } from '../src/engine/sean/stopView';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function room(ult = 1) {
  const c = createCombat(bare);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  c.grav.ult = ult;
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  return { c, p, step };
}
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt', hp = 5000) => {
  const e = c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
  e.hp = hp;
  return e;
};
/** Runs on to the tick it ends, not past it. */
const toEnd = (r: ReturnType<typeof room>) => {
  for (let i = 0; i < ticks(v.stopTime + 1) && r.c.grav.stop; i++) r.step({});
};
const had = (c: CombatState, kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};

section('Time Stop — Q in normal mode');
{
  const none = room(0.5);
  none.step({ throwPressed: true });
  check('not full: nothing', !none.c.grav.stop && none.c.grav.ult === 0.5);
  const r = room();
  r.step({ throwPressed: true });
  check('full: it’s on, the meter spent', !!r.c.grav.stop && r.c.grav.ult === 0 && had(r.c, 'seanStopStart'));
  check('the world’s held', worldHeld(r.c.grav));
  check('both palms out as it goes', seanHand(r.c.grav) === 'raise');
  r.step({}, STOP_CAST + 0.01);
  check('then they’re his again', seanHand(r.c.grav) === 'none');
  check('the view’s drained', stopShade(r.c) > 0.4);
  const j = room();
  j.c.sean = false;
  j.step({ throwPressed: true });
  check('not for Joseph', !j.c.grav.stop);
  const u = room();
  u.step({ interactPressed: true });
  u.step({ throwPressed: true });
  check('Unstable, Q’s Meteor', !u.c.grav.stop && !!u.c.grav.meteor);
}

section('Time Stop — nothing moves but him');
{
  const r = room();
  const e = foe(r.c, 3, -6);
  const orb = r.c.orbs[0];
  orb.alive = true;
  orb.pos.set(0, 1, -9);
  orb.vel.set(0, 0, 8);
  orb.life = 5;
  r.step({}, 0.3);
  const movedAlready = e.pos.clone();
  const orbAt = orb.pos.z;
  r.step({ throwPressed: true });
  const phase = e.phase;
  const t = e.t;
  const at = e.pos.clone();
  r.step({}, 1);
  check('the enemy stands as it was', e.pos.distanceTo(at) === 0 && e.phase === phase && e.t === t);
  check('it had been moving', movedAlready.z !== -6 || movedAlready.x !== 3);
  const shot = orb.pos.z;
  r.step({}, 0.5);
  check('a shot hangs in the air', orb.pos.z === shot && shot >= orbAt && orb.alive);
  const hp = r.p.hp;
  r.step({}, v.stopTime);
  check('then it’s over', r.c.grav.stop === null && had(r.c, 'seanStopEnd') && !worldHeld(r.c.grav));
  r.step({}, 0.3);
  check('and the world goes on', orb.pos.z > shot || !orb.alive);
  check(`(he wasn’t touched: ${hp})`, hp > 0);
  check('it was his time alone: the meter stays spent', r.c.grav.ult === 0);
}

section('Time Stop — a hit: they look unfazed');
{
  const r = room();
  const e = foe(r.c, 0, -5);
  r.step({ throwPressed: true });
  const vel = e.vel.clone();
  const phase = e.phase;
  r.c.events.clear();
  r.step({ attackPressed: true });
  check('no health lost, no flinch, no shove, no flash', e.hp === 5000 && e.phase === phase && e.vel.distanceTo(vel) === 0 && e.flash === 0);
  check('it’s held back, and you’re told, not it', r.c.grav.stop!.stored.length === 1 && had(r.c, 'seanStopHit') && !had(r.c, 'hitJab'));
  const stored = r.c.grav.stop!.stored[0];
  check(`that’s what it would’ve done (${stored.damage})`, near(stored.damage, v.punchDamage, 1e-9) && stored.hits === 1);
  r.step({}, 0.5);
  r.step({ attackPressed: true });
  check('and again: on one target, one sum', r.c.grav.stop!.stored.length === 1 && stored.hits === 2 && near(stored.damage, v.punchDamage * 2, 1e-9));
  check('a hit isn’t a whiff: a swing goes on as it did', !r.c.hitStop.active);
  check('still it stands', e.hp === 5000);
}

section('Time Stop — it all registers when it ends');
{
  const r = room();
  const e = foe(r.c, 0, -5);
  const o = foe(r.c, 3, -2);
  r.step({ throwPressed: true });
  let hits = 0;
  for (let i = 0; i < 4; i++) {
    r.step({ attackPressed: true });
    hits++;
    r.step({}, 0.6);
  }
  r.step({ slamPressed: true });
  check('held till the end', e.hp === 5000 && o.hp === 5000);
  const held = r.c.grav.stop!.stored.find((s) => s.index === r.c.enemies.indexOf(e))!;
  const sum = held.damage;
  check(`${hits} punches and a Ground Slam on it: ${sum.toFixed(0)}`, sum > hits * v.punchDamage && held.hits === hits + 1);
  r.c.events.clear();
  toEnd(r);
  check(`all of it at once (${5000 - e.hp})`, near(5000 - e.hp, sum, 1));
  check('its neighbour’s slam too', o.hp < 5000);
  check('they react now', e.phase === 'flinch' || Math.hypot(e.vel.x, e.vel.z) > 0.5);
  check('you’re told', had(r.c, 'seanStopPop') && had(r.c, 'hitSlam'));
  r.c.events.clear();
  r.step({}, 0.5);
  r.step({ attackPressed: true });
  check('hits land at once again', e.hp < 5000 - sum && had(r.c, 'hitJab'));
}

section('Time Stop — a killing blow waits too');
{
  const r = room();
  const e = foe(r.c, 0, -5, 'grunt', 10);
  r.step({ throwPressed: true });
  const kills = r.c.kills;
  for (let i = 0; i < 3; i++) {
    r.step({ attackPressed: true });
    r.step({}, 0.6);
  }
  check('more than enough, and it stands', isLive(e) && e.hp === 10 && r.c.kills === kills);
  toEnd(r);
  check('then it dies', !isLive(e) && r.c.kills === kills + 1 && had(r.c, 'kill'));
  check('flung', Math.hypot(e.vel.x, e.vel.z) > 3);
  check('the kill feeds the meter', r.c.grav.ult >= v.ultKill);
}

section('Time Stop — nothing dodges what it’s holding');
{
  const r = room();
  const n = foe(r.c, 0, -5, 'ninja');
  r.c.events.clear();
  r.step({ throwPressed: true });
  for (let i = 0; i < 3; i++) {
    r.step({ attackPressed: true });
    r.step({}, 0.6);
  }
  const at = n.pos.clone();
  check('it doesn’t slip them', n.pos.distanceTo(at) === 0 && n.hp === 5000);
  const sum = r.c.grav.stop!.stored[0].damage;
  toEnd(r);
  check(`and it lands (${5000 - n.hp} of ${sum})`, near(5000 - n.hp, sum, 1));
}

section('Time Stop — a boss too');
{
  const r = room();
  const b = foe(r.c, 0, -6, 'boneKing');
  r.step({ throwPressed: true });
  const at = b.pos.clone();
  const t = b.t;
  r.step({ attackPressed: true });
  r.step({}, 1);
  check('it stands, and takes nothing yet', b.pos.distanceTo(at) === 0 && b.t === t && b.hp === 5000);
  r.step({}, v.stopTime);
  check('then it takes it', b.hp < 5000);
}

section('Time Stop — all of his kit goes on');
{
  const a = room();
  a.step({ throwPressed: true });
  a.step({ interactPressed: true });
  check('E: Unstable, while it runs', a.c.grav.unstable && !!a.c.grav.stop);
  const e = foe(a.c, 0, -1.8);
  a.step({ attackPressed: true });
  check('fists held back too', e.hp === 5000 && a.c.grav.stop!.stored.length === 1);
  const before = a.c.grav.instab;
  a.step({ attackPressed: true }, 0.6);
  check('the meters don’t wait', a.c.grav.instab > before);
  a.c.grav.ult = 1;
  a.step({ throwPressed: true });
  check('no Meteor on top of it', !a.c.grav.meteor);
  const s = room();
  const sf = foe(s.c, 0, -3);
  s.step({ throwPressed: true });
  s.step({ interactPressed: true });
  s.step({ slamPressed: true });
  s.step({}, v.shockWindup + DT);
  check('Shockwave Punch held back', sf.hp === 5000 && s.c.grav.stop!.stored.length === 1 && had(s.c, 'seanShock'));
  s.step({}, v.stopTime);
  check('and lands', sf.hp < 5000);
  const h = room();
  h.step({ interactPressed: true });
  h.step({ heavyPressed: true, heavyHeld: true });
  h.step({ heavyHeld: true }, v.palmMin);
  h.step({ pitch: -0.25 });
  h.step({ pitch: -0.25 }, 0.5);
  const open = h.c.grav.hole!;
  check('(a Black Hole, open)', !open.flying);
  h.step({ interactPressed: true });
  h.c.grav.ult = 1;
  h.step({ throwPressed: true });
  const t = open.t;
  h.step({}, 1);
  check('a Black Hole stops with the rest', open.t === t);
  h.step({}, v.stopTime);
  check('and goes on after', h.c.grav.hole === open && open.t > t || h.c.grav.hole === null);
  const k = room();
  const kf = foe(k.c, 0, -6);
  k.step({ throwPressed: true });
  k.step({ pitch: -0.2, heavyPressed: true, heavyHeld: true });
  k.step({ pitch: 0, heavyHeld: true }, v.grabRise + 0.05);
  k.step({ pitch: 0, heavyPressed: true });
  k.step({ pitch: 0 }, 1);
  check('what he throws flies, and it’s held back too', !k.c.grav.rocks.some((q) => q.alive) && kf.hp === 5000 && k.c.grav.stop!.stored.length === 1);
}

section('Time Stop — when it’s cut short');
{
  const r = room();
  const e = foe(r.c, 0, -5);
  r.step({ throwPressed: true });
  r.step({ attackPressed: true });
  r.p.dead = true;
  r.step({});
  check('he’s dead: it ends, and it lands', r.c.grav.stop === null && e.hp < 5000);
  const l = room();
  const f = foe(l.c, 0, -5);
  l.step({ throwPressed: true });
  l.step({ attackPressed: true });
  l.c.sean = false;
  l.step({});
  check('not him any more (the Lab): the world goes on', l.c.grav.stop === null && f.hp < 5000);
}

section('What it shows');
{
  const view = new StopView(new THREE.Scene());
  const r = room();
  const e = foe(r.c, 0, -5);
  view.update(r.c, DT);
  check('off: nothing', !view.showing.shell && !view.showing.dust && view.showing.sparks === 0);
  r.step({ throwPressed: true });
  view.update(r.c, DT);
  check('on: the shell rolls out, the dust hangs', view.showing.shell && view.showing.dust);
  view.update(r.c, 1);
  r.step({}, 1);
  view.update(r.c, DT);
  check('the shell’s gone by, the dust stays', !view.showing.shell && view.showing.dust);
  r.step({ attackPressed: true });
  view.update(r.c, DT);
  check('a hit: a spark on it', view.showing.sparks === 1);
  r.step({}, v.stopTime);
  view.update(r.c, DT);
  check('over: the shell comes back, no dust, no sparks', view.showing.shell && !view.showing.dust && view.showing.sparks === 0 && e.hp < 5000);
  view.update(r.c, 1);
  check('and it’s gone', !view.showing.shell);
  view.dispose();
}
