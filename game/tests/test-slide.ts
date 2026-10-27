// M1 — slide speed and ease-in, slide-jumps, staying low under a ceiling, steering. Update 0.0.3 (the
// designer): a slide pressed in the air waits for the landing, lasts 0.5 s at most, and needs a fresh press.
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
  check('pressing slide on the ground starts a slide', p.sliding && seen.includes('slideStart'));
  check('a slide heads for at least the slide speed', near(p.slideSpeed, Math.max(MOVE.v.runSpeed, SLIDE.v.speedFloor), 1e-6));
  check('sliding uses the low capsule', w.lastCrouched);
  run(p, w, ticks(SLIDE.v.maxTime * 0.6), () => ({ slideHeld: true }));
  check('the slide reaches and keeps its speed', p.sliding && near(flatSpeed(p), SLIDE.v.speedFloor, 1e-6), `speed ${flatSpeed(p).toFixed(2)}`);
  const jump = run(p, w, 1, () => ({ slideHeld: true, jumpPressed: true }));
  check('jumping out of a slide is a slide-jump', jump.includes('slideJump') && !p.sliding);
  check('a slide-jump keeps the slide speed', near(flatSpeed(p), SLIDE.v.speedFloor * SLIDE.v.jumpKeep, 1e-6), `speed ${flatSpeed(p).toFixed(2)}`);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, 1, () => ({ slidePressed: true, slideHeld: true }));
  run(p, w, 1, () => ({ slideHeld: true }));
  check('a slide eases up to speed instead of jumping to it', p.slideCur > 0 && p.slideCur < p.slideSpeed, `${p.slideCur.toFixed(2)} of ${p.slideSpeed}`);
  run(p, w, ticks(SLIDE.v.rampTime) + 1, () => ({ slideHeld: true }));
  check('it reaches full slide speed within the ease-in time', near(p.slideCur, p.slideSpeed, 1e-6));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, 1, () => ({ slidePressed: true, slideHeld: true }));
  let lasted = 0;
  for (let i = 0; i < ticks(2) && p.sliding; i++) {
    run(p, w, 1, () => ({ slideHeld: true }));
    lasted++;
  }
  check('the slide length is 0.5 s', SLIDE.knobs.maxTime.def === 0.5);
  check('a slide lasts its length at most, even held', !p.sliding && near(lasted * (1 / 120), SLIDE.v.maxTime, 0.02), `${(lasted / 120).toFixed(2)} s`);
  run(p, w, ticks(0.5), () => ({ slideHeld: true }));
  check('holding on doesn\'t start another slide', !p.sliding);
  run(p, w, 1, () => ({}));
  const again = run(p, w, 1, () => ({ slidePressed: true, slideHeld: true }));
  check('a fresh press slides again', p.sliding && again.includes('slideStart'));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  run(p, w, 2, () => ({ slidePressed: true, slideHeld: true }));
  w.ceiling = 1.3; // slid under it
  run(p, w, ticks(0.3));
  check('letting go under a low ceiling keeps you sliding', p.sliding);
  run(p, w, ticks(SLIDE.v.maxTime + 0.5), () => ({ slideHeld: true }));
  check('past the max time too, while there is no room to stand', p.sliding);
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

section('Slide — pressed in the air');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 1.2, 0, 0);
  p.vel.set(0, 0, -MOVE.v.runSpeed);
  const air = run(p, w, 1, () => ({ moveZ: 1, slidePressed: true, slideHeld: true }));
  check('pressing slide in the air neither slams nor slides yet', !p.slamming && !p.sliding && !air.includes('slam') && p.vel.y > -5);
  let startedAirborne = false;
  let landed = false;
  for (let i = 0; i < ticks(1) && !p.sliding; i++) {
    run(p, w, 1, () => ({ moveZ: 1, slideHeld: true }));
    if (p.sliding && !landed) startedAirborne = !p.grounded;
    landed ||= p.grounded;
  }
  check('the slide starts once you land', p.sliding && landed && !startedAirborne);
  check('landing into it is smooth: no burst of speed on the first tick', flatSpeed(p) < SLIDE.v.speedFloor - 0.5, `speed ${flatSpeed(p).toFixed(2)}`);
}
