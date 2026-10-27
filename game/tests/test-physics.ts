// M1 — the real Rapier world on the Feel Lab: landing, walls, ramps, steps, the slide tunnel, wall probes.
// Runs headless, so collision is checked without a browser.
import { check, near, section } from './harness';
import { run, ticks } from './fakes/flatWorld';
import { RapierWorld, initPhysics } from '../src/physics/rapierWorld';
import { FEEL_LAB } from '../src/world/arenas/feelLab';
import { createPlayer } from '../src/sim/player/state';
import { BODY } from '../src/sim/player/body';
import { Vector3 } from 'three';

await initPhysics();
const world = new RapierWorld(FEEL_LAB);
const pads = FEEL_LAB.pads;

section('Physics — Rapier on the Feel Lab');
{
  const p = createPlayer(0, 2, 24, 0);
  run(p, world, ticks(1), () => ({}), pads);
  check('falls and lands on the floor', p.grounded && near(p.pos.y, 0, 0.05), `y ${p.pos.y.toFixed(3)}, grounded ${p.grounded}`);
  const z0 = p.pos.z;
  run(p, world, ticks(0.5), () => ({ moveZ: 1 }), pads);
  check('runs forward across the floor', z0 - p.pos.z > 5 && near(p.pos.y, 0, 0.05), `moved ${(z0 - p.pos.z).toFixed(2)} m, y ${p.pos.y.toFixed(3)}`);
}
{
  // Near the north wall: its inner face is z = -30.
  const p = createPlayer(-20, 0, -27, 0);
  let touched = false;
  for (let i = 0; i < ticks(1); i++) {
    run(p, world, 1, () => ({ moveZ: 1 }), pads);
    touched ||= p.onWall;
  }
  check('a wall stops you', p.pos.z >= -30 + BODY.radius - 0.05, `z ${p.pos.z.toFixed(3)}`);
  check('touching a wall is reported', touched);
}
{
  const n = new Vector3();
  const near1 = world.probeWall(new Vector3(-29.5, 0, -5), 0.35, n);
  check('the wall probe finds a wall in reach', near1 && near(n.x, 1, 0.01), `normal ${n.x.toFixed(2)}, ${n.z.toFixed(2)}`);
  check('the wall probe finds nothing in the open', !world.probeWall(new Vector3(0, 0, 0), 0.35, n));
}
{
  check('no room to stand inside the slide tunnel', !world.canStand(new Vector3(20, 0, 5)));
  check('room to stand in the open', world.canStand(new Vector3(0, 0, 20)));
}
{
  // The ramp runs from z = 0 (ground) to z = -11 (the 4 m plateau) at x = 18, just past the tunnel's exit.
  const p = createPlayer(18, 0, 1, 0);
  run(p, world, ticks(0.2), () => ({}), pads);
  run(p, world, ticks(2), () => ({ moveZ: 1 }), pads);
  check('runs up the ramp onto the plateau', near(p.pos.y, 4, 0.1) && p.pos.z < -11, `at y ${p.pos.y.toFixed(2)}, z ${p.pos.z.toFixed(2)}`);
}
{
  // Three 0.35 m steps from x = -14 to -8 at z 20..23; yaw -π/2 faces +x.
  const p = createPlayer(-16, 0, 21.5, -Math.PI / 2);
  run(p, world, ticks(0.2), () => ({}), pads);
  let top = 0;
  for (let i = 0; i < ticks(0.9); i++) {
    run(p, world, 1, () => ({ moveZ: 1 }), pads);
    top = Math.max(top, p.pos.y);
  }
  check('walks up the steps without jumping', top > 1, `highest ${top.toFixed(2)} m`);
}
{
  // Regression: starting from a standstill right against a step (slow first ticks) used to get stuck.
  const p = createPlayer(-14.45, 0, 21.5, -Math.PI / 2);
  run(p, world, ticks(0.2), () => ({}), pads);
  run(p, world, ticks(0.4), () => ({ moveZ: 1 }), pads);
  check('walks onto a step from a standstill', p.pos.y > 0.3, `y ${p.pos.y.toFixed(2)}, x ${p.pos.x.toFixed(2)}`);
}
{
  const p = createPlayer(-16, 0, 21.5, -Math.PI / 2);
  run(p, world, ticks(0.2), () => ({}), pads);
  run(p, world, ticks(0.3), () => ({ moveZ: 1 }), pads);
  let slowest = Infinity;
  for (let i = 0; i < ticks(0.4); i++) {
    run(p, world, 1, () => ({ moveZ: 1 }), pads);
    slowest = Math.min(slowest, Math.hypot(p.vel.x, p.vel.z));
  }
  check('running up steps keeps full speed', slowest > 11.9, `slowest ${slowest.toFixed(2)} m/s`);
}
{
  // The tunnel's roof is 1.3 m high, from z = 2 to 8 at x 18..22. Start south of it facing north.
  const standing = createPlayer(20, 0, 11, 0);
  run(standing, world, ticks(0.2), () => ({}), pads);
  run(standing, world, ticks(1), () => ({ moveZ: 1 }), pads);
  check('standing, you cannot get into the tunnel', standing.pos.z > 8, `z ${standing.pos.z.toFixed(2)}`);
  const sliding = createPlayer(20, 0, 11, 0);
  run(sliding, world, ticks(0.2), () => ({}), pads);
  run(sliding, world, ticks(0.15), () => ({ moveZ: 1 }), pads);
  run(sliding, world, ticks(1), () => ({ moveZ: 1, slidePressed: true, slideHeld: true }), pads);
  check('sliding, you get through the tunnel', sliding.pos.z < 2, `z ${sliding.pos.z.toFixed(2)}`);
}
{
  const p = createPlayer(12, 0, 10.5, 0);
  const seen = run(p, world, ticks(0.1), () => ({}), pads);
  check('the jump pad launches you', seen.includes('pad'));
}
world.dispose();
