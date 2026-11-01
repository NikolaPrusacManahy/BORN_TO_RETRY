// Update 0.3.1 (the designer: "when in the air, player's body falls down and hands remain up"; "when a flying enemy is
// up, we fall down and player execute the enemy off screen") — while you hold an execution you stay where you grabbed
// it, in the air too; let go, you fall as before.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { execHeld } from '../src/sim/combat/execution';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { emptyIntent } from '../src/sim/player/intent';
import { createPlayer } from '../src/sim/player/state';
import { stepPlayer } from '../src/sim/player/step';
import { OPEN_ARENA } from './fakes/enemyWorld';

section('Executions — held where you are');
{
  const c = createCombat(OPEN_ARENA);
  const world = new FlatWorld();
  // In the air (a jump), a Wasp just ahead and above.
  const p = createPlayer(0, 2.2, 0, 0);
  p.grounded = false;
  p.sliding = true;
  c.execution = 1;
  spawnEnemy(c.enemies, 'wasp', new Vector3(0, 3.2, -1.6), 0);
  const grab = emptyCombatIntent();
  grab.interactPressed = true;
  let lowest = Infinity;
  let highest = -Infinity;
  let held = 0;
  for (let k = 0; k < ticks(8); k++) {
    stepPlayer(p, emptyIntent(0), world, [], DT);
    stepCombat(c, p, k === 0 ? grab : emptyCombatIntent(), world, DT);
    c.events.clear();
    c.hitStop.remaining = 0;
    if (execHeld(c.exec)) {
      held++;
      lowest = Math.min(lowest, p.pos.y);
      highest = Math.max(highest, p.pos.y);
    }
  }
  check(`grabbing a Wasp in mid-air: you hang where you were the whole time (${held} ticks)`, held > 30 && Math.abs(lowest - 2.2) < 0.02 && Math.abs(highest - 2.2) < 0.02, `${lowest.toFixed(2)}–${highest.toFixed(2)} m`);
  check('no slide or dash carried into it', !p.sliding && p.dashTime === 0);
  check('let go, you fall back to the floor', !execHeld(c.exec) && p.pos.y < 0.05);
}
