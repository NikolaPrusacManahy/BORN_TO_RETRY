// Update 0.3.7 (the designer: "Punched enemies launching into the air and splatting against walls") — a killing punch
// flings the body; a large one or a boss stays put; a live one is never thrown up (the designer: "no 3rd punch of a
// combo launches … it is like a stun I do not want"). Anything meeting a wall fast splats there (Splat damage to one
// alive, a 'wallSplat'); a slow one doesn't.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { emptyCombatIntent, type Punch, type PunchKind } from '../src/sim/combat/fists';
import { resolvePunch } from '../src/sim/combat/punch';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { launch } from '../src/sim/enemies/flight';
import { ENEMY_STATS, type EnemyKind } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { FISTS } from '../src/tuning/combat';
import { LAUNCH } from '../src/tuning/launch';
import { type Arena, boxAt } from '../src/world/arena';

const eye = new Vector3(0, 1.62, 0);
const ahead = new Vector3(0, 0, -1);
const world = new FlatWorld();
/** A wall across your way, its face 5 m ahead; another 2.2 m ahead (in a punch's reach). */
const WALLED: Arena = { ...OPEN_ARENA, boxes: [boxAt(-10, 0, -6, 20, 4, 1, 'wall')] };
const CLOSE: Arena = { ...OPEN_ARENA, boxes: [boxAt(-10, 0, -3.2, 20, 4, 1, 'wall')] };

interface Flight {
  c: CombatState;
  /** How high it went (m), how far back it came down (m), the furthest it got (z), and the events after the punch. */
  top: number;
  back: number;
  deepest: number;
  seen: string[];
}

/** A `foe` `far` m ahead (with `hp`) punched by `kind`, then `secs` of the fight. */
function punch(kind: PunchKind, foe: EnemyKind, hp: number, arena: Arena = OPEN_ARENA, far = 1.5, secs = 1.2): Flight {
  const c = createCombat(arena);
  const p = createPlayer(0, 0, 0, 0);
  const i = spawnEnemy(c.enemies, foe, new Vector3(0, 0, -far), 0);
  const e = c.enemies[i];
  e.phase = 'chase';
  e.hp = hp;
  const blow: Punch = { kind, damage: kind === 'jab' ? FISTS.v.jabDamage : FISTS.v.finisherDamage, knock: kind === 'jab' ? FISTS.v.jabKnock : FISTS.v.finisherKnock, charge: 0, reach: 2.9, radius: 0.6 };
  const seen: string[] = [];
  resolvePunch(blow, c, eye, ahead, world);
  let top = 0;
  let landed = 0;
  let deepest = 0;
  for (let k = 0; k < ticks(secs); k++) {
    for (let j = 0; j < c.events.length; j++) seen.push(c.events.at(j).kind);
    c.events.clear();
    stepCombat(c, p, emptyCombatIntent(), world, DT);
    top = Math.max(top, e.pos.y);
    deepest = Math.min(deepest, e.pos.z);
    if (top > 0.05 && e.pos.y <= 1e-6 && !landed) landed = -e.pos.z - far;
  }
  for (let j = 0; j < c.events.length; j++) seen.push(c.events.at(j).kind);
  return { c, top, back: landed || -e.pos.z - far, deepest, seen };
}

section('Launch — bodies flung');
{
  const kill = punch('jab', 'grunt', 1);
  check('a killing punch flings the body up and far', kill.top > 0.8 && kill.back > 4 && kill.seen.includes('kill'), `${kill.top.toFixed(2)} m up, ${kill.back.toFixed(1)} m back`);
  check('and it comes down to the floor', kill.c.enemies[0].pos.y === 0);
  const fin = punch('finisher', 'grunt', 999);
  check('a finisher throws nothing up (no stun: the designer)', fin.top === 0 && fin.back < 1.5, `${fin.back.toFixed(2)} m back`);
  check('nor a jab', punch('jab', 'grunt', 999).top === 0);
  check('a Brute’s body (large) drops where it is', punch('jab', 'brute', 1).top === 0);
  // (A boss's body is placed by its death show.)
  const c = createCombat(OPEN_ARENA);
  const boss = c.enemies[spawnEnemy(c.enemies, 'dragon', new Vector3(0, 0, -3), 0)];
  boss.phase = 'dead';
  launch(boss, 0, -1);
  check('a boss’s isn’t flung', boss.vel.lengthSq() === 0 && boss.pos.y === 0);
}

section('Launch — splatting against walls');
{
  const body = punch('jab', 'grunt', 1, WALLED);
  const b = body.c.enemies[0];
  check('a body flung into a wall 3 m behind it splats there, not through it', body.seen.includes('wallSplat') && Math.abs(b.wall.z + 5) < 0.15 && body.deepest > -5, `the wall at ${b.wall.z.toFixed(2)}, furthest ${body.deepest.toFixed(2)}`);
  check('(no second kill)', body.seen.filter((k) => k === 'kill').length === 1);
  // A Grunt with its back to the wall, a finisher's knock.
  const f = punch('finisher', 'grunt', 999, CLOSE, 2.2 - ENEMY_STATS.grunt().radius - 0.05);
  const e = f.c.enemies[0];
  check(`a Grunt punched hard into the wall at its back splats on it: ${LAUNCH.v.splatDamage} more`, f.seen.includes('wallSplat') && e.hp === 999 - FISTS.v.finisherDamage - LAUNCH.v.splatDamage && f.top === 0);
  const slow = punch('jab', 'grunt', 999, WALLED);
  check('a jab’s little knock doesn’t', !slow.seen.includes('wallSplat'));
  const open = punch('finisher', 'grunt', 999);
  check('nor anything with no wall to hit', !open.seen.includes('wallSplat'));
}
