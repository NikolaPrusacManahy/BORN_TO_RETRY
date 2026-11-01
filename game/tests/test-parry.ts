// Update 0.3.3 (the designer: "Yes, parrying") — an enemy's shot sent back, faster, onto the enemy nearest your aim; it
// hits enemies, never you; a freeze and the 'parry' event.
// Update 0.3.5 (the designer: "now right click is parry … it still has to time the hit with the projectile properly") —
// barehanded, right click's press opens the parry's window: a shot reaching your fists while it's open goes back. Held
// on, it's only the block: pressed too soon, the shot gets through. Punches no longer parry. Cold Snap goes off where a
// parried shot hits. Update 0.3.6 (the designer: "4 sec cooldown") — a parry that lands, 4 s till the next.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { emptyCombatIntent, type Punch } from '../src/sim/combat/fists';
import { fireOrb, updateOrbs } from '../src/sim/combat/orbs';
import { parry, stepParried } from '../src/sim/combat/parry';
import { resolvePunch } from '../src/sim/combat/punch';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer, type PlayerState } from '../src/sim/player/state';
import { CARDS } from '../src/tuning/cards';
import { FISTS } from '../src/tuning/combat';

const eye = new Vector3(0, 1.62, 0);
const ahead = new Vector3(0, 0, -1);
const world = new FlatWorld();
const SPEED = 12;

/** A Spitter's shot `far` m down your aim, coming at you. */
const shoot = (c: CombatState, far: number) => fireOrb(c.orbs, new Vector3(0, 1.6, -far), new Vector3(0, 0, 1), SPEED, 10, 'spitter');

/** `secs` of the fight, right click held while `held(t)`; the events seen. */
function run(c: CombatState, p: PlayerState, secs: number, held: (t: number) => boolean): string[] {
  const seen: string[] = [];
  for (let k = 0; k < ticks(secs); k++) {
    const intent = emptyCombatIntent();
    intent.heavyHeld = held(k * DT);
    c.events.clear();
    stepCombat(c, p, intent, world, DT);
    for (let i = 0; i < c.events.length; i++) seen.push(c.events.at(i).kind);
  }
  return seen;
}

section('Parry — right click, timed');
{
  // Pressed as the shot comes into reach.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  const hp = p.hp;
  shoot(c, 6);
  const seen = run(c, p, 1.5, (t) => t >= 0.12);
  check('pressed as the shot comes into reach: it goes back (the parry, a freeze)', c.orbs.some((o) => o.parried) && seen.includes('parry') && seen.includes('guard') && p.hp === hp);
}
{
  // Pressed too soon and held on.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  const hp = p.hp;
  shoot(c, 12);
  const seen = run(c, p, 1.5, () => true);
  check('pressed too soon and held on: holding doesn’t parry, the shot gets through', !c.orbs.some((o) => o.parried) && !seen.includes('parry') && p.hp < hp);
}
{
  // Pressed too soon, let go and pressed again before the cooldown.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  shoot(c, 8);
  const again = FISTS.v.parryWindow + 0.05;
  run(c, p, 1.2, (t) => t < 0.05 || t >= again);
  check('mashing it doesn’t help: a press inside the retry opens nothing', FISTS.v.parryRetry > again && !c.orbs.some((o) => o.parried));
}
{
  // A parry that lands: the long wait.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  shoot(c, 3);
  run(c, p, 0.3, () => true);
  check(`a parry that lands: ${FISTS.v.parryCooldown} s till the next`, c.orbs.some((o) => o.parried) && c.fists.parryWindow === 0 && Math.abs(c.fists.parryCooldown - (FISTS.v.parryCooldown - 0.3)) < 0.05, `${c.fists.parryCooldown.toFixed(2)} s left`);
  const soon = run(c, p, FISTS.v.parryCooldown - 0.5, (t) => t >= 0.1);
  check('a press meanwhile opens nothing', !soon.includes('guard') && c.fists.parryWindow === 0);
  run(c, p, 0.6, () => false);
  run(c, p, DT, () => true);
  check('after it, a press opens the window again', c.fists.parryWindow > 0);
}
{
  // Punches no longer parry.
  const c = createCombat(OPEN_ARENA);
  shoot(c, 1.6);
  const jab: Punch = { kind: 'jab', damage: 7, knock: 2, charge: 0, reach: 2.9, radius: 0.6 };
  resolvePunch(jab, c, eye, ahead, world);
  check('a jab meeting a shot no longer sends it back', !c.orbs.some((o) => o.parried));
  const d = createCombat(OPEN_ARENA);
  shoot(d, 9);
  check('a shot out of reach isn’t caught', parry(d, eye, ahead) < 0 && !d.orbs.some((o) => o.parried));
}

section('Parry — the shot sent back');
{
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  // A Brute away down your aim (a little off it); a Spitter's shot coming at you.
  const b = spawnEnemy(c.enemies, 'brute', new Vector3(1.2, 0, -14), 0);
  const hp = c.enemies[b].hp;
  shoot(c, 1.6);
  const o = c.orbs.find((x) => x.alive)!;
  const caught = parry(c, eye, ahead);
  const kinds = Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
  check('sent back: a freeze, the parry', caught >= 0 && o.parried && o.vel.z < 0 && kinds.includes('parry') && c.hitStop.remaining > 0);
  check('faster than it came, and far deadlier', o.vel.length() >= Math.max(SPEED * FISTS.v.parrySpeed, FISTS.v.parryMinSpeed) - 1e-6 && o.damage === FISTS.v.parryDamage);
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
  // Cold Snap (a Fate Card; the charged punch's before): what a parried shot hits freezes.
  const c = createCombat(OPEN_ARENA);
  c.items.cards.add('coldSnap');
  const p = createPlayer(0, 0, 0, 0);
  const b = spawnEnemy(c.enemies, 'brute', new Vector3(0, 0, -10), 0);
  shoot(c, 1.6);
  parry(c, eye, ahead);
  for (let k = 0; k < ticks(2) && c.orbs.some((o) => o.alive); k++) stepParried(c, world, DT);
  check(`Cold Snap: a parried shot freezes what it hits (${CARDS.v.coldSnap} s)`, c.enemies[b].frozen > 0 && p.hp === 100);
}
