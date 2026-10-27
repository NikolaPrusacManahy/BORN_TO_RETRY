// M1 — running, stopping, jumping, coyote time, jump buffer, air control and overspeed.
import { check, near, section } from './harness';
import { FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer, flatSpeed } from '../src/sim/player/state';
import { MOVE } from '../src/tuning/movement';
import { jumpSpeed } from '../src/sim/player/jump';
import { wishDirection } from '../src/sim/player/step';
import { Vector3 } from 'three';

section('Movement — ground');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2); // settle on the floor
  run(p, w, ticks(MOVE.v.accelTime) + 2, () => ({ moveZ: 1 }));
  check('reaches run speed within the accel time', near(flatSpeed(p), MOVE.v.runSpeed, 0.01), `speed ${flatSpeed(p).toFixed(2)}`);
  check('yaw 0 runs towards -z', p.vel.z < -11 && Math.abs(p.vel.x) < 1e-6);
  run(p, w, ticks(MOVE.v.stopTime) + 2);
  check('stops within the stop time', flatSpeed(p) < 1e-6, `speed ${flatSpeed(p).toFixed(3)}`);
}
{
  const out = new Vector3();
  wishDirection(1, 0, 0, out);
  check('strafe right at yaw 0 is +x', near(out.x, 1, 1e-9) && near(out.z, 0, 1e-9));
  wishDirection(1, 1, 0, out);
  check('diagonal input is normalised', near(out.length(), 1, 1e-9));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  p.vel.set(0, 0, -20);
  run(p, w, ticks(0.1), () => ({ moveZ: 1 }));
  const expected = 20 - MOVE.v.overspeedDecel * 0.1;
  check('extra speed bleeds off instead of vanishing', near(flatSpeed(p), expected, 0.3), `speed ${flatSpeed(p).toFixed(2)}, expected ~${expected}`);
}

section('Movement — jumping');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 0, 0, 0);
  run(p, w, 2);
  let top = 0;
  const seen = run(p, w, 1, () => ({ jumpPressed: true }));
  for (let i = 0; i < ticks(1.5); i++) {
    run(p, w, 1);
    top = Math.max(top, p.pos.y);
  }
  check('a jump fires the jump event', seen.includes('jump'));
  check('jump height matches the tuning', near(top, MOVE.v.jumpHeight, MOVE.v.jumpHeight * 0.03), `top ${top.toFixed(3)} m`);
  check('lands back on the floor', p.grounded && p.pos.y === 0);
  check('jumpSpeed is sqrt(2gh)', near(jumpSpeed(), Math.sqrt(2 * MOVE.v.gravity * MOVE.v.jumpHeight), 1e-9));
}
{
  // Coyote time: run off a ledge at z = 0 (floor only where z >= 0), then jump a moment later.
  const w = new FlatWorld();
  w.floorFromZ = 0;
  const p = createPlayer(0, 0, 0.3, 0);
  run(p, w, 2);
  p.vel.set(0, 0, -MOVE.v.runSpeed);
  let leftAt = -1;
  for (let i = 0; i < 60 && leftAt < 0; i++) {
    run(p, w, 1, () => ({ moveZ: 1 }));
    if (!p.grounded) leftAt = i;
  }
  const late = run(p, w, ticks(MOVE.v.coyoteTime * 0.5));
  const jumped = run(p, w, 1, () => ({ jumpPressed: true }));
  check('a jump just after walking off a ledge still counts', leftAt >= 0 && late.length === 0 && jumped.includes('jump'));
}
{
  const w = new FlatWorld();
  w.floorFromZ = 0;
  const p = createPlayer(0, 0, 0.3, 0);
  run(p, w, 2);
  p.vel.set(0, 0, -MOVE.v.runSpeed);
  run(p, w, 10, () => ({ moveZ: 1 }));
  run(p, w, ticks(MOVE.v.coyoteTime + 0.05));
  const jumped = run(p, w, 1, () => ({ jumpPressed: true }));
  check('a jump long after leaving the ledge does not count', !jumped.includes('jump'));
}
{
  // Jump buffer: press jump while falling, just before landing.
  const w = new FlatWorld();
  const p = createPlayer(0, 0.3, 0, 0);
  p.vel.set(0, -6, 0);
  const seen = run(p, w, ticks(0.2), (i) => ({ jumpPressed: i === 0 }));
  check('a jump pressed just before landing fires on landing', seen.indexOf('land') >= 0 && seen.indexOf('jump') > seen.indexOf('land'), seen.join(','));
}

section('Movement — air');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 10, 0, 0);
  p.vel.set(0, 0, -MOVE.v.runSpeed);
  let fastest = 0;
  for (let i = 0; i < ticks(0.5); i++) {
    run(p, w, 1, () => ({ moveX: 1, moveZ: 1 }));
    fastest = Math.max(fastest, flatSpeed(p));
  }
  check('steering in the air never adds speed past run speed', fastest <= MOVE.v.runSpeed + 1e-6, `fastest ${fastest.toFixed(3)}`);
  check('air steering turns you', p.vel.x > 1);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 10, 0, 0);
  p.vel.set(0, 0, -25);
  run(p, w, ticks(0.3), () => ({ moveX: 1 }));
  check('extra speed is kept in the air', near(flatSpeed(p), 25, 1e-6), `speed ${flatSpeed(p).toFixed(3)}`);
}
