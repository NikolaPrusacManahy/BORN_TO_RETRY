// M1 — the ground slam (no key for now since Update 0.0.3, so it's started directly), its bounce window, and
// jump pads.
import { check, near, section } from './harness';
import { DT, FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer } from '../src/sim/player/state';
import { MOVE, SLAM } from '../src/tuning/movement';
import { jumpSpeed } from '../src/sim/player/jump';
import { tryStartSlam } from '../src/sim/player/slam';

section('Slam');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  p.vel.set(8, 3, 0);
  const started = tryStartSlam(p, true);
  check('a slam starts in the air', started && p.slamming);
  check('a slam drops straight down', p.vel.x === 0 && p.vel.z === 0 && near(p.vel.y, -SLAM.v.speed, 1e-9));
  let land: string[] = [];
  for (let i = 0; i < ticks(0.3) && !land.includes('slamLand'); i++) land = run(p, w, 1);
  check('a slam landing fires slamLand', land.includes('slamLand') && !p.slamming && p.grounded);
  const bounce = run(p, w, 1, () => ({ jumpPressed: true }));
  check('a jump right after a slam landing bounces', bounce.includes('slamBounce'));
  // One tick of gravity has already pulled on it.
  check('the bounce is higher than a jump', near(p.vel.y, jumpSpeed(SLAM.v.bounceHeight) - MOVE.v.gravity * DT, 1e-6) && p.vel.y > jumpSpeed());
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  tryStartSlam(p, true);
  run(p, w, ticks(0.3));
  run(p, w, ticks(SLAM.v.bounceWindow) + 2);
  const late = run(p, w, 1, () => ({ jumpPressed: true }));
  check('a late jump after a slam is a normal jump', late.includes('jump') && !late.includes('slamBounce'));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  const seen = run(p, w, 1, () => ({ slidePressed: true, slideHeld: true }));
  check('the slide key in the air no longer slams (Update 0.0.3)', !p.slamming && !seen.includes('slam'));
  const q = createPlayer(0, 0, 0, 0);
  check('nor can a slam start on the ground', !tryStartSlam(q, true) || !q.grounded);
}

section('Jump pads');
{
  const w = new FlatWorld();
  const pad = { x: 0, y: 0, z: 0, radius: 1, launch: 24 };
  const p = createPlayer(0.5, 0, 0, 0);
  const seen = run(p, w, 2, () => ({}), [pad]);
  check('standing on a pad launches you', seen.includes('pad') && p.vel.y > 20, `vy ${p.vel.y.toFixed(2)}`);
  const q = createPlayer(3, 0, 0, 0);
  const none = run(q, w, 2, () => ({}), [pad]);
  check('a pad does nothing beside it', !none.includes('pad'));
}
