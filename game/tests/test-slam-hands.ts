// Update 0.2.21 — a tester: "Ground smash hands animations is stuck in the hands up starting animation when pressing
// ground smash and pressing left mouse button when ground smashing". The clasped fists follow the slam (a slam that ends
// without landing lets them go back), and barehanded, a click in a slam punches as you land, not under the clasp.
import { check, section } from './harness';
import { DT, FlatWorld } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { SlamArms } from '../src/engine/viewmodel/slamArms';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';

const frames = (arms: SlamArms, s: number, slamming: boolean) => {
  for (let t = 0; t < s; t += DT) {
    arms.follow(slamming);
    arms.update(DT);
  }
};

section('Slam hands — they follow the slam');
{
  const arms = new SlamArms();
  arms.start();
  frames(arms, 0.3, true);
  check('dropping: the fists up', arms.weight > 0.99);
  arms.land();
  frames(arms, ARMS.v.slamDown + ARMS.v.slamHold + ARMS.v.slamBack + 0.05, false);
  check('landed: down, then back to the guard', arms.weight === 0);
  const cut = new SlamArms();
  cut.start();
  frames(cut, 0.3, true);
  // (A dash, a wall jump, a pad or the water: no landing.)
  frames(cut, 0.05, false);
  check('a slam cut short (no landing): the fists start back at once', cut.weight > 0 && cut.weight < 0.99, cut.weight.toFixed(2));
  frames(cut, ARMS.v.slamBack, false);
  check('and are back at the guard, not stuck up', cut.weight === 0);
  cut.land();
  check('a landing after that changes nothing', cut.weight === 0);
}

section('Slam hands — a click in a slam');
{
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 4, 0, 0);
  p.slamming = true;
  const world = new FlatWorld();
  const events = () => Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
  stepCombat(c, p, { ...emptyCombatIntent(), attackPressed: true, attackHeld: true }, world, DT);
  check('barehanded, no punch as it drops (the fists are clasped)', !events().some((k) => k === 'jabL' || k === 'jabR'));
  c.events.clear();
  stepCombat(c, p, emptyCombatIntent(), world, DT);
  check('still none while it falls', !events().some((k) => k === 'jabL' || k === 'jabR'));
  p.slamming = false;
  stepCombat(c, p, emptyCombatIntent(), world, DT);
  check('landed: the click punches then', events().includes('jabL'));
  c.events.clear();
  stepCombat(c, p, emptyCombatIntent(), world, DT);
  check('once', !events().some((k) => k === 'jabL' || k === 'jabR'));
}
