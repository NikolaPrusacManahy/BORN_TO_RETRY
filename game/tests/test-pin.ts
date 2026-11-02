// Update 0.3.8 (the designer: "Finishers that interact with environment") — a humanoid runner thrown dead into a wall is
// pinned there (lifted, facing out) for Pinned time, then drops; meanwhile E executes it for free (the meter as it is):
// you're brought up to it, it bursts, it heals Wall finisher heal, its kill isn't counted again. Others aren't pinned.
// The Yeti's execution is the Blue Demon's; those that had the Yeti's keep the old one.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { HAND_MOVES } from '../src/engine/exec/handMoves';
import { emptyCombatIntent, type Punch } from '../src/sim/combat/fists';
import { execTarget, moveOf } from '../src/sim/combat/execution';
import { PIN_AHEAD, PIN_LUNGE, PINNED } from '../src/sim/combat/execPin';
import { resolvePunch } from '../src/sim/combat/punch';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { createPlayer, type PlayerState } from '../src/sim/player/state';
import { FISTS } from '../src/tuning/combat';
import { EXECUTION } from '../src/tuning/execution';
import { type Arena, boxAt } from '../src/world/arena';

const world = new FlatWorld();
/** A wall across your way, its face 5 m ahead. */
const WALLED: Arena = { ...OPEN_ARENA, boxes: [boxAt(-10, 0, -6, 20, 4, 1, 'wall')] };
const JAB: Punch = { kind: 'jab', damage: FISTS.v.jabDamage, knock: FISTS.v.jabKnock, charge: 0, reach: 2.9, radius: 0.6 };

interface Fight {
  c: CombatState;
  p: PlayerState;
  i: number;
  seen: string[];
}

/** A `kind` 1.5 m ahead killed by a jab, flung at the wall; then `secs` of the fight. */
function fling(kind: EnemyKind, secs = 1): Fight {
  const c = createCombat(WALLED);
  const p = createPlayer(0, 0, 0, 0);
  const i = spawnEnemy(c.enemies, kind, new Vector3(0, 0, -1.5), 0);
  c.enemies[i].phase = 'chase';
  c.enemies[i].hp = 1;
  // (A Skeleton with its revives used: brought down, it dies.)
  c.enemies[i].stage = 99;
  resolvePunch(JAB, c, new Vector3(0, 1.62, 0), new Vector3(0, 0, -1), world);
  const f = { c, p, i, seen: [] as string[] };
  run(f, secs);
  return f;
}

function run(f: Fight, secs: number, interact = false) {
  for (let k = 0; k < ticks(secs); k++) {
    const intent = emptyCombatIntent();
    intent.interactPressed = interact && k === 0;
    stepCombat(f.c, f.p, intent, world, DT);
    for (let j = 0; j < f.c.events.length; j++) f.seen.push(f.c.events.at(j).kind);
    f.c.events.clear();
  }
}

section('Pinned — thrown dead into a wall');
{
  const f = fling('grunt');
  const e = f.c.enemies[f.i];
  check('a Grunt flung dead into a wall is pinned there', e.phase === 'dead' && e.pinned > 0 && f.seen.includes('wallSplat'), `pinned ${e.pinned.toFixed(2)}`);
  check('lifted off the floor, facing out from the wall', e.pos.y >= 0.2 && e.pos.y <= 0.9 && near(Math.abs(e.facing), Math.PI, 0.05));
  check('it stays there', near(e.pos.z, -5 + 0.45, 0.1) && e.vel.lengthSq() === 0);
  run(f, EXECUTION.v.pinTime);
  check(`after ${EXECUTION.v.pinTime} s it drops`, e.pinned === 0);
  run(f, 0.6);
  check('to the floor', e.pos.y === 0);
  for (const kind of ['skeleton', 'rabbit', 'leaper'] as EnemyKind[]) check(`a ${kind} is pinned too`, fling(kind).c.enemies[0].pinned > 0);
  const spitter = fling('spitter');
  check('a Spitter (not a humanoid runner) isn’t, though it splats', spitter.c.enemies[0].pinned === 0 && spitter.seen.includes('wallSplat'));
}

section('Pinned — the free execution');
{
  const f = fling('grunt');
  const e = f.c.enemies[f.i];
  f.p.pos.set(0, 0, -2.6);
  f.p.hp = 50;
  f.c.execution = 0;
  const kills = f.c.kills;
  f.seen.length = 0;
  check('with the meter empty, it can be executed', execTarget(f.c, f.p, 0) === f.i);
  run(f, PIN_LUNGE + 0.05, true);
  const ex = f.c.exec;
  check('E takes it: the wall finisher, the meter not spent', ex.active && ex.pinned && f.c.execution === 0);
  check(`you're brought up to it (${PIN_AHEAD} m), facing it`, near(Math.hypot(f.p.pos.x - e.pos.x, f.p.pos.z - e.pos.z), PIN_AHEAD, 0.05) && near(ex.yaw, 0, 0.05));
  run(f, PINNED.endAt + 0.3);
  check('two hooks, a slam to the floor, a smash, and it bursts', f.seen.filter((k) => k === 'execBlow').length === 3 && f.seen.includes('execSlam') && f.seen.includes('execBurst') && !ex.active);
  check(`it heals ${EXECUTION.v.pinHeal}`, f.p.hp === 50 + EXECUTION.v.pinHeal, `${f.p.hp}`);
  check('its kill isn’t counted again, and it’s no longer pinned', f.c.kills === kills && e.pinned === 0 && !f.seen.includes('kill'));
}
{
  const f = fling('grunt', 0.5 + EXECUTION.v.pinTime);
  f.p.pos.set(0, 0, -2.6);
  check('once it has dropped, it can’t', execTarget(f.c, f.p, 0) === -1);
}

section('The Yeti’s execution');
check('the Yeti’s moves and hands are the Blue Demon’s', moveOf('brute') === moveOf('blueDemon') && HAND_MOVES.brute === HAND_MOVES.blueDemon);
check('those that had the Yeti’s keep the old one', moveOf('skullOrc') !== moveOf('blueDemon') && moveOf('skullOrc') === moveOf('cactoroBig') && moveOf('skullOrc').endAt === 0.86);
