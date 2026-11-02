// Update 0.2.11 — swimming (floor 6, the Sunken Grove; spec MD_UPDATES/U0211_SUNKEN_GROVE.md): slower than running,
// forward where you look, rising and diving, gliding to a stop and sinking, pushing off the floor, the kick (slower to
// come back), never out of the water, no wall runs, wall jumps or slides.
import { check, near, section } from './harness';
import { FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer } from '../src/sim/player/state';
import { swimCeiling } from '../src/sim/player/swim';
import { CAMERA } from '../src/tuning/camera';
import { DASH, MOVE } from '../src/tuning/movement';
import { SWIM } from '../src/tuning/swim';
import { SUNKEN } from '../src/world/dungeon/styles';

const v = SWIM.v;
const TOP = 6.5;
const world = new FlatWorld();
const flat = (p: { vel: { x: number; z: number } }) => Math.hypot(p.vel.x, p.vel.z);
/** You, under water `y` m over the floor. */
function swimmer(y = 2) {
  const p = createPlayer(0, y, 0, 0);
  p.swimTop = TOP;
  p.grounded = y === 0;
  return p;
}

section('Swimming — slower than running');
{
  const p = swimmer(0);
  run(p, world, ticks(1.5), () => ({ moveZ: 1 }));
  check(`forward, flat: swim speed (${v.speed} m/s), well under run speed (${MOVE.v.runSpeed})`, near(flat(p), v.speed, 0.05) && v.speed < MOVE.v.runSpeed * 0.6, flat(p).toFixed(2));
  const q = swimmer(0);
  run(q, world, ticks(v.accelTime * 0.5), () => ({ moveZ: 1 }));
  check('it takes a while to get there', flat(q) > 0 && flat(q) < v.speed * 0.7, flat(q).toFixed(2));
  const f = createPlayer(0, 0, 0, 0);
  f.grounded = true;
  run(f, world, ticks(0.3), () => ({ moveZ: 1 }));
  check('out of the water you still run', near(flat(f), MOVE.v.runSpeed, 0.1));
}

section('Swimming — where you look');
{
  const up = swimmer(1);
  run(up, world, ticks(0.6), () => ({ moveZ: 1, pitch: Math.PI / 4 }));
  check('looking up, forward swims up and on', up.vel.y > 0 && near(up.vel.y, flat(up), 0.1) && up.pos.y > 1.5);
  const down = swimmer(4);
  run(down, world, ticks(0.6), () => ({ moveZ: 1, pitch: -Math.PI / 3 }));
  check('looking down, it dives', down.vel.y < -1 && down.pos.y < 4);
  const rise = swimmer(1);
  run(rise, world, ticks(0.5), () => ({ jumpHeld: true }));
  check('jump held: you rise', rise.vel.y > v.speed * 0.9 && rise.pos.y > 2);
  const dive = swimmer(4);
  run(dive, world, ticks(0.5), (i) => ({ slideHeld: true, slidePressed: i === 0 }));
  check('the slide key held: you dive, no slide', dive.vel.y < -v.speed * 0.5 && !dive.sliding);
}

section('Swimming — gliding, sinking, pushing off');
{
  const p = swimmer(3);
  run(p, world, ticks(1.2), () => ({ moveZ: 1 }));
  const z0 = p.pos.z;
  run(p, world, ticks(v.glideTime * 0.5));
  check('let go: you glide on a while', p.pos.z < z0 - 1 && flat(p) > 0.5);
  run(p, world, ticks(v.glideTime + 1));
  check(`then you sink, slowly (${v.sink} m/s)`, near(p.vel.y, -v.sink, 0.05) && flat(p) < 0.01);
  run(p, world, ticks(6));
  check('down to the floor', p.grounded && p.pos.y === 0);
  const seen = run(p, world, 1, () => ({ jumpPressed: true }));
  check(`jump on the floor pushes off it (${v.pushOff} m/s)`, seen.includes('swimPush') && !p.grounded && p.vel.y > v.pushOff * 0.8);
}

section('Swimming — the kick');
{
  const p = swimmer(3);
  const seen = run(p, world, 1, () => ({ dashPressed: true }));
  check(`the dash key kicks: ${v.kickSpeed} m/s, untouchable a moment, a charge gone (no dash)`, seen.includes('swimKick') && !seen.includes('dash') && near(p.vel.length(), v.kickSpeed, 0.6) && p.invuln > 0 && p.dashCharges < DASH.v.charges);
  run(p, world, ticks(1), () => ({ moveZ: 1 }));
  check('it bleeds back to swim speed', near(p.vel.length(), v.speed, 0.1), p.vel.length().toFixed(2));
  const side = swimmer(3);
  run(side, world, 1, () => ({ dashPressed: true, moveX: 1 }));
  check('it goes where you head', side.vel.x > v.kickSpeed * 0.9);
  const a = swimmer(3);
  a.dashCharges = 0;
  run(a, world, ticks(DASH.v.refillTime));
  check(`its charges come back ${v.kickRefill} × slower than dashes`, near(a.dashCharges, 1 / v.kickRefill, 0.02), a.dashCharges.toFixed(3));
}

section('Swimming — never out of the water, no tricks');
{
  const p = swimmer(3);
  run(p, world, ticks(4), () => ({ jumpHeld: true }));
  check(`your eyes stay ${v.head} m under the water’s top`, near(p.pos.y + CAMERA.v.eyeHeight, TOP - v.head, 1e-6) && p.vel.y <= 0);
  // (Update 0.3.14 — the Sunken Grove's water, floor 6's no more: kept for the boss room's.)
  const top = SUNKEN.under ?? 0;
  // (The walls are 6 m, their caps 0.43 m over; the view bobs 0.06 m.)
  check('the Sunken Grove’s water: from as high as you can swim, the walls still hide what’s past them', top > 0 && swimCeiling(top) + CAMERA.v.eyeHeight + 0.07 < 6.43, `eyes at ${(swimCeiling(top) + CAMERA.v.eyeHeight).toFixed(2)}`);
  const w = new FlatWorld();
  w.walls.push({ x: 1, normalX: -1 });
  const r = swimmer(2);
  r.pos.x = 0.55;
  const seen = run(r, w, ticks(1), () => ({ moveZ: 1, moveX: 1, jumpPressed: true, slidePressed: true, slideHeld: true }));
  check('no wall runs, wall jumps or slides', !r.wallRunning && !r.sliding && !seen.includes('wallJump') && !seen.includes('wallRunStart') && !seen.includes('slideStart'));
}
