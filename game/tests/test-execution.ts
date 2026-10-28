// Update 0.1.0 — the Execution Power meter (the designer: a new meter just above the dash bar; "it fills up with kills,
// eg 10 kills makes it full"). Your kills fill it a tenth each; it stops at full; it comes down to the next floor with you
// and empties on a new run. What a full meter does comes later.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { carryOver, createCombat, resetCombat } from '../src/sim/combat/state';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { EXECUTION } from '../src/tuning/execution';
import { FEEL_LAB } from '../src/world/arenas/feelLab';

section('Execution Power meter');
{
  const c = createCombat(OPEN_ARENA, false);
  const kill = () => {
    const i = spawnEnemy(c.enemies, 'grunt', new Vector3(3, 0, 0), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(c.enemies[i].pos);
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
    c.enemies[i].alive = false;
  };
  check('it starts empty', c.execution === 0);
  kill();
  check(`a kill fills a ${EXECUTION.v.killsToFill}th of it`, near(c.execution, 1 / EXECUTION.v.killsToFill, 1e-9));
  for (let k = 1; k < EXECUTION.v.killsToFill; k++) kill();
  check(`${EXECUTION.v.killsToFill} kills fill it`, near(c.execution, 1, 1e-9));
  kill();
  check('it stops at full', c.execution === 1);
  const next = createCombat(OPEN_ARENA, false);
  carryOver(c, next);
  check('it comes down to the next floor with you', next.execution === 1);
  resetCombat(next, OPEN_ARENA);
  check('a new run (or back to the start) empties it', next.execution === 0);
  // The Feel Lab's dummies aren't kills.
  const lab = createCombat(FEEL_LAB);
  const hit = emptyTargetHit();
  hit.kind = 'dummy';
  hit.index = 0;
  landHit(lab, hit, 1e6, 0, 0, 1, 'hitJab', 1);
  check('a training dummy doesn’t count', lab.execution === 0);
}
