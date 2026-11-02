// M1 — the real Rapier world on the Feel Lab: landing, walls, ramps, steps, the low tunnel, wall probes. (Update 0.3.20 —
// no slide: nobody gets through the tunnel now.)
// Runs headless, so collision is checked without a browser.
import { check, near, section } from './harness';
import { run, ticks } from './fakes/flatWorld';
import { RapierWorld, initPhysics } from '../src/physics/rapierWorld';
import { FEEL_LAB } from '../src/world/arenas/feelLab';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
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
  check('no room to stand inside the low tunnel', !world.canStand(new Vector3(20, 0, 5)));
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
}
{
  const p = createPlayer(12, 0, 10.5, 0);
  const seen = run(p, world, ticks(0.1), () => ({}), pads);
  check('the jump pad launches you', seen.includes('pad'));
}
{
  // Regression (the designer's report): from the jump pad, holding forward towards the drop tower (faces at z = 14,
  // top at 8 m) with the view turned to the side, the launch must carry you up, not stick you to its side in a
  // wall run. Under the old rules a 0.6 rad turn wall-ran and stopped at 5.5 m.
  for (const turn of [0.1, 0.6, 0.9]) {
    const p = createPlayer(12, 0, 11.6, Math.PI - turn);
    let ran = false;
    let top = 0;
    for (let i = 0; i < ticks(1.2); i++) {
      run(p, world, 1, () => ({ moveZ: 1 }), pads);
      ran ||= p.wallRunning;
      top = Math.max(top, p.pos.y);
    }
    check(`the pad launch by the drop tower (view turned ${turn} rad) never wall runs and clears the top`, !ran && top > 9, `wall ran ${ran}, highest ${top.toFixed(2)} m`);
  }
  {
    const p = createPlayer(12, 0, 11.6, Math.PI - 0.1);
    let overTop = false;
    for (let i = 0; i < ticks(1.2); i++) {
      run(p, world, 1, () => ({ moveZ: 1 }), pads);
      overTop ||= p.pos.y > 8 && p.pos.z > 14.2 && p.pos.z < 18;
    }
    check('heading at the tower carries you over its top', overTop);
  }
}
{
  // Update 0.0.3 — wall running on the real outer west wall (inner face x = -30), heading north.
  const p = createPlayer(-29.5, 2.5, 14, 0);
  p.vel.set(0, 0, -12);
  run(p, world, ticks(0.5), () => ({ moveZ: 1 }), pads);
  check('wall running along the outer wall', p.wallRunning && p.pos.y > 2 && near(p.wallNormal.x, 1, 0.05), `y ${p.pos.y.toFixed(2)}, normal ${p.wallNormal.x.toFixed(2)}`);
}
{
  // The wall-run lane: run on the first panel (face x = -27), jump, and the second panel (face x = -21) catches you.
  const p = createPlayer(-26.5, 2.5, -2.5, 0);
  p.vel.set(0, 0, -12);
  run(p, world, ticks(0.3), () => ({ moveZ: 1 }), pads);
  const onFirst = p.wallRunning && p.wallNormal.x > 0.9;
  run(p, world, 1, () => ({ moveZ: 1, jumpPressed: true }), pads);
  let caught = false;
  for (let i = 0; i < ticks(1.2) && !caught; i++) {
    run(p, world, 1, () => ({ moveZ: 1 }), pads);
    caught = p.wallRunning && p.wallNormal.x < -0.9;
  }
  check('the wall-run lane chains from one panel to the next', onFirst && caught, `on first ${onFirst}, at x ${p.pos.x.toFixed(2)}, z ${p.pos.z.toFixed(2)}`);
}
world.dispose();

section('Physics — the dungeon gates');
{
  // Update 0.0.12 — a gate is solid only while shut: through it open, stopped shut, through again once it opens.
  const arena = { name: 'gate', boxes: [boxAt(-10, -1, -10, 20, 1, 20, 'floor')], pads: [], playerStart: { x: 0, y: 0, z: 4, yaw: 0 }, spawns: [], dummies: [], turrets: [] } as Arena;
  const gates = new RapierWorld(arena);
  gates.addGates([{ x: 0, y: 3, z: 0, w: 4, h: 6, d: 0.6, kind: 'wall' }]);
  const walk = () => {
    const p = createPlayer(0, 0, 3, 0);
    run(p, gates, ticks(0.1));
    run(p, gates, ticks(0.8), () => ({ moveZ: 1 }));
    return p.pos.z;
  };
  check('open, you walk through it', walk() < -2);
  gates.setGates([true]);
  const z = walk();
  check('shut, it stops you', z > 0.3, `z ${z.toFixed(2)}`);
  gates.setGates([false]);
  check('open again, through', walk() < -2);
  gates.dispose();
}
{
  // A real floor: you land at the start and walk out of the start room through its doorway into the corridor.
  const level = buildDungeon(planFloor(9001, 1));
  const w = new RapierWorld(level.arena);
  w.addGates(level.gates);
  const s = level.arena.playerStart;
  const p = createPlayer(s.x, s.y + 0.5, s.z, s.yaw);
  run(p, w, ticks(0.5));
  check('on a dungeon floor you land at the start', p.grounded && near(p.pos.y, 0, 0.05), `y ${p.pos.y.toFixed(2)}`);
  run(p, w, ticks(1.6), () => ({ moveZ: 1, yaw: s.yaw }));
  const start = level.rooms[0];
  const out = p.pos.x < start.min.x || p.pos.x > start.max.x || p.pos.z < start.min.z || p.pos.z > start.max.z;
  check('and walk out through its doorway', out && p.grounded, `at (${p.pos.x.toFixed(1)}, ${p.pos.z.toFixed(1)})`);
  w.dispose();
}
