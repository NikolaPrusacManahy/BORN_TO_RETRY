// Update 0.0.3 — wall running (the designer): up to 2 s per wall, the view tilts clockwise with the wall on your
// left and anticlockwise on your right, and a jump off one wall can catch the next for a chain.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer } from '../src/sim/player/state';
import { BODY } from '../src/sim/player/body';
import { WALL, WALLRUN } from '../src/tuning/movement';
import { CameraRig } from '../src/engine/cameraRig';
import { Look } from '../src/engine/look';

/** In the air beside a wall whose surface is x = `wallX` (on your left when facing -z if `left`), running -z. */
function besideWall(w: FlatWorld, wallX: number, left: boolean, speed = 12) {
  w.walls.push({ x: wallX, normalX: left ? 1 : -1 });
  const p = createPlayer(wallX + (left ? 1 : -1) * (BODY.radius + 0.1), 3, 0, 0);
  p.vel.set(0, 0, -speed);
  return p;
}

section('Wall run — start and stop');
{
  const w = new FlatWorld();
  const p = besideWall(w, -1, true);
  const seen = run(p, w, 1, () => ({ moveZ: 1 }));
  check('running along a wall in the air, holding forward, starts a wall run', p.wallRunning && seen.includes('wallRunStart'));
  const y0 = p.pos.y;
  run(p, w, ticks(1), () => ({ moveZ: 1 }));
  check('a second in, still running, barely dropping', p.wallRunning && Math.abs(p.pos.y - y0) < 1, `moved ${(p.pos.y - y0).toFixed(2)} m`);
  check('at run speed along the wall', near(Math.hypot(p.vel.x + 0, p.vel.z), WALLRUN.v.speed, 1.6) && p.vel.z < -WALLRUN.v.speed + 0.01, `vz ${p.vel.z.toFixed(2)}`);
  let total = 1 + ticks(1);
  while (p.wallRunning && total < ticks(4)) {
    run(p, w, 1, () => ({ moveZ: 1 }));
    total++;
  }
  check('a wall run lasts 2 s at most', near(total * DT, WALLRUN.v.maxTime, 0.03), `${(total * DT).toFixed(2)} s`);
  run(p, w, ticks(0.3), () => ({ moveZ: 1 }));
  check('the same wall can\'t be run again before landing', !p.wallRunning);
}
{
  const w = new FlatWorld();
  const p = besideWall(w, -1, true);
  run(p, w, 1, () => ({}));
  check('no wall run without holding forward', !p.wallRunning);
  const w2 = new FlatWorld();
  const q = besideWall(w2, -1, true, 2);
  run(q, w2, 1, () => ({ moveZ: 1 }));
  check('no wall run when moving slowly', !q.wallRunning);
  const w3 = new FlatWorld();
  const r = besideWall(w3, -1, true);
  run(r, w3, ticks(0.5), () => ({ moveZ: 1 }));
  run(r, w3, 1, () => ({ moveZ: 0 }));
  check('letting go of forward drops you off the wall', !r.wallRunning);
}
{
  // The designer's report: flying up from the jump pad past the drop tower grabbed its wall.
  const w = new FlatWorld();
  const p = besideWall(w, -1, true);
  p.vel.y = 20;
  run(p, w, 1, () => ({ moveZ: 1 }));
  check('rising fast past a wall never starts a run', !p.wallRunning);
  const w2 = new FlatWorld();
  w2.walls.push({ x: -1, normalX: 1 });
  // Facing the wall (-x), turned a little; already sliding along it fast enough.
  const q = createPlayer(-1 + BODY.radius + 0.1, 3, 0, Math.PI / 2 - 0.15);
  q.vel.set(0, 0, -8);
  run(q, w2, 1, () => ({ moveZ: 1 }));
  check('facing into a wall and turning a little never starts a run', !q.wallRunning);
}

section('Wall run — tilt');
{
  for (const left of [true, false]) {
    const w = new FlatWorld();
    const p = besideWall(w, left ? -1 : 1, left);
    run(p, w, ticks(0.2), () => ({ moveZ: 1 }));
    const cam = new THREE.PerspectiveCamera();
    const rig = new CameraRig(cam);
    const look = new Look();
    for (let i = 0; i < 60; i++) rig.update(DT, 1, p.pos, p, look, 100, 16 / 9);
    // Negative roll turns the view clockwise (the head leans right, away from a wall on the left).
    check(left ? 'wall on the left tilts the view clockwise' : 'wall on the right tilts the view anticlockwise', p.wallRunning && (left ? cam.rotation.z < -0.05 : cam.rotation.z > 0.05), `roll ${cam.rotation.z.toFixed(3)}`);
  }
}

section('Wall run — chaining');
{
  // Two walls 6 m apart: left at x = -3, right at x = 3. Start on the left one.
  const w = new FlatWorld();
  const p = besideWall(w, -3, true);
  w.walls.push({ x: 3, normalX: -1 });
  run(p, w, ticks(0.3), () => ({ moveZ: 1 }));
  const jumpsBefore = p.wallJumpsLeft;
  const seen = run(p, w, 1, () => ({ moveZ: 1, jumpPressed: true }));
  check('jumping off a wall run pushes away from the wall and up', seen.includes('wallRunJump') && !p.wallRunning && p.vel.x > 0 && p.vel.y > 0);
  check('it keeps the speed along the wall', p.vel.z < -WALLRUN.v.speed + 0.5);
  check('it doesn\'t use up wall jumps', p.wallJumpsLeft === jumpsBefore && jumpsBefore === WALL.v.count);
  let caught = false;
  for (let i = 0; i < ticks(1.5) && !caught; i++) {
    run(p, w, 1, () => ({ moveZ: 1 }));
    caught = p.wallRunning;
  }
  check('the next wall catches you into a new run', caught && p.wallNormal.x < 0);
  const back = run(p, w, 1, () => ({ moveZ: 1, jumpPressed: true }));
  check('and you can jump back across', back.includes('wallRunJump') && p.vel.x < 0);
}
{
  const w = new FlatWorld();
  const p = besideWall(w, -1, true);
  run(p, w, ticks(2.2), () => ({ moveZ: 1 }));
  check('(after a full run the wall is used up)', !p.wallRunning);
  p.pos.set(0, 0.05, 0);
  p.vel.set(0, -1, 0);
  run(p, w, ticks(0.2));
  check('landing makes every wall runnable again', p.grounded && !p.lastWallSet);
}
