// Update 0.3.3 (the designer: "Yes, parrying") — an enemy's shot sent back, faster, onto the enemy nearest your aim; it
// hits enemies, never you; a freeze and the 'parry' event.
// Update 0.3.5 (the designer: "now right click is parry … it still has to time the hit with the projectile properly") —
// barehanded, right click's press opens the parry's window: a shot reaching your fists while it's open goes back. Held
// on, it's only the block: pressed too soon, the shot gets through. Punches no longer parry. Cold Snap goes off where a
// parried shot hits. Update 0.3.6 (the designer: "4 sec cooldown") — a parry that lands, 4 s till the next.
// Update 0.3.10 (the designer: "Allow parries melee attacks, not mini bosses") — a melee blow met by the window: no harm,
// the counter (the parry's damage), it's staggered, the long wait; a mini boss's or a boss's lands as ever.
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
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer, type PlayerState } from '../src/sim/player/state';
import { CARDS } from '../src/tuning/cards';
import { meleeHit } from '../src/sim/combat/meleeParry';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { ENEMIES } from '../src/tuning/enemies';
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

section('Parry — melee blows');
{
  /** `kind` 1.2 m ahead swinging at you with your parry's window open (or not: `open`). */
  const blow = (kind: EnemyKind, open: boolean) => {
    const c = createCombat(OPEN_ARENA);
    const p = createPlayer(0, 0, 0, 0);
    const i = spawnEnemy(c.enemies, kind, new Vector3(0, 0, -1.2), 0);
    c.enemies[i].phase = 'windup';
    c.enemies[i].hp = 999;
    c.fists.parryWindow = open ? 0.2 : 0;
    const hurt = meleeHit(p, c, c.enemies[i], i, 10);
    const kinds = Array.from({ length: c.events.length }, (_, k) => c.events.at(k).kind);
    return { c, p, e: c.enemies[i], hurt, kinds };
  };
  const g = blow('grunt', true);
  check('a Grunt’s blow met by the window: it doesn’t touch you', !g.hurt && g.p.hp === 100);
  check(`your fist punches back (${FISTS.v.parryDamage}), it’s staggered; the parry`, g.e.hp === 999 - FISTS.v.parryDamage && g.e.phase === 'flinch' && g.kinds.includes('parry') && g.c.hitStop.remaining > 0);
  check('the window shuts', g.c.fists.parryWindow === 0 && g.c.fists.parried);
  const late = blow('grunt', false);
  check('with the window shut, it lands', late.hurt && late.p.hp < 100 && !late.kinds.includes('parry'));
  const brute = blow('brute', true);
  check('a mini boss’s blow is never parried (the Yeti’s)', brute.hurt && brute.e.hp === 999);
  const boss = blow('dragon', true);
  check('nor a boss’s', boss.hurt);
  const k = createCombat(OPEN_ARENA);
  const kp = createPlayer(0, 0, 0, 0);
  const ki = spawnEnemy(k.enemies, 'grunt', new Vector3(0, 0, -1.2), 0);
  k.enemies[ki].phase = 'windup';
  k.enemies[ki].hp = 1;
  k.fists.parryWindow = 0.2;
  meleeHit(kp, k, k.enemies[ki], ki, 10);
  const body = k.enemies[ki];
  check('a counter that kills flings the body', !isLive(body) && body.vel.z < -5);
}
{
  // In the fight: a Grunt's swing landing just after right click is pressed.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  const i = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -1.3), 0);
  const e = c.enemies[i];
  e.phase = 'windup';
  e.hp = 999;
  e.facing = Math.PI;
  e.t = ENEMIES.v.gruntWindup - 0.05;
  const seen = run(c, p, 0.3, (t) => t < 0.1);
  check('in the fight: pressed as the swing lands, it’s parried; the long wait starts', p.hp === 100 && seen.includes('parry') && Math.abs(c.fists.parryCooldown - (FISTS.v.parryCooldown - 0.3 + 0.05)) < 0.06, `hp ${p.hp}, wait ${c.fists.parryCooldown.toFixed(2)}`);
}
