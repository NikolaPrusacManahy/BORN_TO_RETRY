// M1 — dash charges, refill, invincibility, flat dashes and dash-jumps.
import { check, near, section } from './harness';
import { DT, FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer, flatSpeed } from '../src/sim/player/state';
import { DASH } from '../src/tuning/movement';

section('Dash');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  const seen = run(p, w, 1, () => ({ dashPressed: true }));
  check('a dash fires the dash event', seen.includes('dash'));
  check('a dash uses one charge', near(p.dashCharges, DASH.v.charges - 1, 1e-9), `charges ${p.dashCharges}`);
  check('you are invincible for the dash', near(p.invuln, DASH.v.duration - DT, DT * 1.01) && p.invuln > 0);
  check('dash speed', near(flatSpeed(p), DASH.v.speed, 1e-6), `speed ${flatSpeed(p).toFixed(2)}`);
  check('no input dashes the way you face (-z at yaw 0)', p.vel.z < 0);
  run(p, w, ticks(DASH.v.duration));
  check('the dash ends at the exit speed', p.dashTime === 0 && flatSpeed(p) <= DASH.v.exitSpeed + 1e-6 && flatSpeed(p) > DASH.v.exitSpeed - 3, `speed ${flatSpeed(p).toFixed(2)}`);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  let dashes = 0;
  for (let n = 0; n < 4; n++) {
    if (run(p, w, 1, () => ({ dashPressed: true })).includes('dash')) dashes++;
    run(p, w, ticks(DASH.v.duration) + 1);
  }
  check('three charges, then none', dashes === 3, `dashes ${dashes}`);
  run(p, w, ticks(DASH.v.refillTime) + 2);
  check('one charge refills after the refill time', p.dashCharges >= 1, `charges ${p.dashCharges.toFixed(2)}`);
  check('charges never pass the max', (run(p, w, ticks(DASH.v.refillTime * 10)), p.dashCharges === DASH.v.charges));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  run(p, w, 1, () => ({ dashPressed: true }));
  const y = p.pos.y;
  run(p, w, ticks(DASH.v.duration) - 2);
  check('an air dash stays flat', near(p.pos.y, y, 1e-9), `dropped ${(y - p.pos.y).toFixed(3)} m`);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, 3, (i) => ({ dashPressed: i === 0 }));
  const seen = run(p, w, 1, () => ({ jumpPressed: true }));
  check('jumping out of a dash is a dash-jump', seen.includes('dashJump'));
  check('a dash-jump keeps part of the dash speed', near(flatSpeed(p), DASH.v.speed * DASH.v.jumpKeep, 0.01), `speed ${flatSpeed(p).toFixed(2)}`);
}
