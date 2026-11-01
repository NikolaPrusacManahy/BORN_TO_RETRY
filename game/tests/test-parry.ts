// Update 0.3.3 (the designer: "Yes, parrying") — a fist punch that meets an enemy's shot sends it back, faster, onto
// the enemy nearest your aim; it hits enemies, never you; a freeze and the 'parry' event; a sword's swing doesn't.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import type { Punch } from '../src/sim/combat/fists';
import { fireOrb, updateOrbs } from '../src/sim/combat/orbs';
import { stepParried } from '../src/sim/combat/parry';
import { resolvePunch } from '../src/sim/combat/punch';
import { createCombat } from '../src/sim/combat/state';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { FISTS } from '../src/tuning/combat';

const eye = new Vector3(0, 1.62, 0);
const ahead = new Vector3(0, 0, -1);
const punch = (kind: Punch['kind']): Punch => ({ kind, damage: 7, knock: 2, charge: 0, reach: 2.9, radius: 0.6 });

section('Parry — a punch sends a shot back');
{
  const c = createCombat(OPEN_ARENA);
  const world = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  // A Brute away down your aim (a little off it); a Spitter's shot coming at you.
  const b = spawnEnemy(c.enemies, 'brute', new Vector3(1.2, 0, -14), 0);
  const hp = c.enemies[b].hp;
  fireOrb(c.orbs, new Vector3(0, 1.6, -1.6), new Vector3(0, 0, 1), 12, 10, 'spitter');
  const o = c.orbs.find((x) => x.alive)!;
  const caught = resolvePunch(punch('jab'), c, eye, ahead, world);
  const kinds = Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
  check('a jab meeting a shot sends it back (a freeze, the parry)', caught >= 0 && o.parried && o.vel.z < 0 && kinds.includes('parry') && c.hitStop.remaining > 0);
  check('faster than it came, and far deadlier', o.vel.length() >= Math.max(12 * FISTS.v.parrySpeed, FISTS.v.parryMinSpeed) - 1e-6 && o.damage === FISTS.v.parryDamage);
  check('drawn onto the enemy near your aim', o.vel.x > 0);
  c.events.clear();
  let hurt = false;
  for (let k = 0; k < ticks(2) && o.alive; k++) {
    updateOrbs(c.orbs, p, world, c.events, DT);
    stepParried(c, world, DT);
    hurt ||= p.hp < 100;
  }
  check('it flies into that enemy and hurts it, never you', !o.alive && c.enemies[b].hp <= hp - FISTS.v.parryDamage + 1e-6 && !hurt, `${c.enemies[b].hp} of ${hp}`);
}
{
  const c = createCombat(OPEN_ARENA);
  const world = new FlatWorld();
  fireOrb(c.orbs, new Vector3(0, 1.6, -1.6), new Vector3(0, 0, 1), 12, 10, 'spitter');
  resolvePunch(punch('slash'), c, eye, ahead, world);
  check('a sword’s swing doesn’t parry (fists only)', !c.orbs.some((x) => x.parried));
  const d = createCombat(OPEN_ARENA);
  fireOrb(d.orbs, new Vector3(0, 1.6, -9), new Vector3(0, 0, 1), 12, 10, 'spitter');
  resolvePunch(punch('jab'), d, eye, ahead, world);
  check('a shot out of reach isn’t caught', !d.orbs.some((x) => x.parried));
}
