// M1 — wall jumps (count, push, reset on landing) and the wall slide.
import { check, near, section } from './harness';
import { FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer } from '../src/sim/player/state';
import { WALL } from '../src/tuning/movement';
import { BODY } from '../src/sim/player/body';

section('Wall jump');
{
  const w = new FlatWorld();
  w.walls.push({ x: 1, normalX: -1 });
  const p = createPlayer(1 - BODY.radius - 0.1, 6, 0, 0);
  const seen = run(p, w, 1, () => ({ jumpPressed: true }));
  check('jump next to a wall in the air is a wall jump', seen.includes('wallJump'));
  check('pushed up and away from the wall', p.vel.y > 0 && near(p.vel.x, -WALL.v.outSpeed, 1e-6), `vel ${p.vel.x.toFixed(2)}, ${p.vel.y.toFixed(2)}`);
  check('one wall jump used', p.wallJumpsLeft === WALL.v.count - 1);
}
{
  const w = new FlatWorld();
  w.walls.push({ x: 1, normalX: -1 });
  const p = createPlayer(1 - BODY.radius - 0.1, 50, 0, 0);
  let jumps = 0;
  for (let n = 0; n < WALL.v.count + 2; n++) {
    p.pos.x = 1 - BODY.radius - 0.1;
    p.vel.set(0, 0, 0);
    if (run(p, w, 1, () => ({ jumpPressed: true })).includes('wallJump')) jumps++;
    run(p, w, ticks(0.15));
  }
  check(`at most ${WALL.v.count} wall jumps in a row`, jumps === WALL.v.count, `jumps ${jumps}`);
  p.pos.set(0, 0.05, 0);
  p.vel.set(0, -1, 0);
  run(p, w, ticks(0.2));
  check('landing gives the wall jumps back', p.grounded && p.wallJumpsLeft === WALL.v.count);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 6, 0, 0);
  const seen = run(p, w, 1, () => ({ jumpPressed: true }));
  check('no wall in reach: no wall jump', !seen.includes('wallJump'));
}
{
  const w = new FlatWorld();
  w.walls.push({ x: 1, normalX: -1 });
  const p = createPlayer(1 - BODY.radius, 20, 0, Math.PI / 2); // facing -x; the wall is behind-right
  p.vel.set(0, -20, 0);
  run(p, w, 2, () => ({ moveX: 0, moveZ: -1 })); // back = +x, into the wall
  check('pushing into a wall slows the fall', near(p.vel.y, -WALL.v.slideFall, 0.5), `vy ${p.vel.y.toFixed(2)}`);
}
