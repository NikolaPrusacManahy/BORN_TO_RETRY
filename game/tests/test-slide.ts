// M1 — slide speed, slide-jumps, staying low under a ceiling, steering.
import { check, near, section } from './harness';
import { FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer, flatSpeed } from '../src/sim/player/state';
import { MOVE, SLIDE } from '../src/tuning/movement';

section('Slide');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, ticks(0.2), () => ({ moveZ: 1 }));
  const seen = run(p, w, 1, () => ({ moveZ: 1, slidePressed: true, slideHeld: true }));
  check('holding slide on the ground starts a slide', p.sliding && seen.includes('slideStart'));
  check('a slide is never slower than the slide speed', near(p.slideSpeed, Math.max(MOVE.v.runSpeed, SLIDE.v.speedFloor), 1e-6));
  check('sliding uses the low capsule', w.lastCrouched);
  run(p, w, ticks(1), () => ({ slideHeld: true }));
  check('the slide keeps its speed (no friction by default)', near(flatSpeed(p), SLIDE.v.speedFloor, 1e-6), `speed ${flatSpeed(p).toFixed(2)}`);
  const jump = run(p, w, 1, () => ({ slideHeld: true, jumpPressed: true }));
  check('jumping out of a slide is a slide-jump', jump.includes('slideJump') && !p.sliding);
  check('a slide-jump keeps the slide speed', near(flatSpeed(p), SLIDE.v.speedFloor * SLIDE.v.jumpKeep, 1e-6), `speed ${flatSpeed(p).toFixed(2)}`);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, 2, () => ({ slidePressed: true, slideHeld: true }));
  w.ceiling = 1.3; // slid under it
  run(p, w, ticks(0.3));
  check('letting go under a low ceiling keeps you sliding', p.sliding);
  w.ceiling = null;
  run(p, w, 2);
  check('the slide ends once there is room to stand', !p.sliding);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, 1, () => ({ slidePressed: true, slideHeld: true }));
  run(p, w, ticks(0.25), () => ({ slideHeld: true, moveX: 1 }));
  const turned = Math.atan2(p.slideDir.x, -p.slideDir.z);
  check('steering bends the slide slowly', turned > 0 && turned <= SLIDE.v.steer * 0.25 + 0.02, `turned ${turned.toFixed(3)} rad`);
}
