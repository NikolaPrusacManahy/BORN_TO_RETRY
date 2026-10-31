// M1 — camera feel: mouse look, shake, landing dip, slide eye height, FOV kick, step smoothing.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { Look, PITCH_LIMIT, RAD_PER_PX } from '../src/engine/look';
import { Shake, shakeNoise } from '../src/engine/shake';
import { CameraRig } from '../src/engine/cameraRig';
import { createPlayer } from '../src/sim/player/state';
import { CAMERA, SHAKE } from '../src/tuning/camera';
import { verticalFov } from '../src/state/settings';
import { Spring, stepSpring } from '../src/core/spring';
import { MAX_FRAME } from '../src/core/fixedStep';

section('Camera — look and shake');
{
  const l = new Look();
  l.apply(100, 0, { sensitivity: 2, invertY: false });
  check('mouse right turns right (yaw down) by sensitivity × rad/px', near(l.yaw, -100 * RAD_PER_PX * 2, 1e-12));
  l.apply(0, -1e6, { sensitivity: 1, invertY: false });
  check('pitch is clamped', l.pitch === PITCH_LIMIT);
  const m = new Look();
  m.apply(0, 10, { sensitivity: 1, invertY: true });
  check('invert Y flips pitch', m.pitch > 0);
}
{
  let lo = 0;
  let hi = 0;
  for (let t = 0; t < 50; t += 0.013) {
    lo = Math.min(lo, shakeNoise(t, 3));
    hi = Math.max(hi, shakeNoise(t, 3));
  }
  check('shake noise stays within -1..1', lo >= -1 && hi <= 1 && hi > 0.5 && lo < -0.5);
  const s = new Shake();
  s.add(0.5);
  let t = 0;
  while (s.trauma > 0 && t < 5) {
    s.update(1 / 120);
    t += 1 / 120;
  }
  check('trauma fades at the tuned rate', near(t, 0.5 / SHAKE.v.decay, 0.02), `${t.toFixed(3)} s`);
  check('no trauma, no shake', s.x === 0 && s.roll === 0);
}

section('Camera — rig');
{
  const cam = new THREE.PerspectiveCamera();
  const rig = new CameraRig(cam);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const look = new Look();
  const frame = () => rig.update(1 / 120, 1, p.pos, p, look, 100, 16 / 9);
  frame();
  check('eye at standing height', near(cam.position.y, CAMERA.v.eyeHeight, 1e-6));
  check('FOV matches the setting at rest', near(cam.fov, verticalFov(100, 16 / 9), 0.01));

  rig.land(20);
  let lowest = 0;
  for (let i = 0; i < 120; i++) {
    frame();
    lowest = Math.min(lowest, cam.position.y - CAMERA.v.eyeHeight);
  }
  const expected = Math.min(CAMERA.v.landDipMax, 20 * CAMERA.v.landDip);
  check('a landing dips the view about the tuned depth', lowest < 0 && near(-lowest, expected, expected * 0.35), `dip ${(-lowest).toFixed(3)} m, tuned ${expected.toFixed(3)}`);
  check('and springs back', near(cam.position.y, CAMERA.v.eyeHeight, 0.01));

  p.sliding = true;
  for (let i = 0; i < 120; i++) frame();
  check('sliding lowers the eye', near(cam.position.y, CAMERA.v.slideEyeHeight, 0.01));
  p.sliding = false;

  p.dashTime = 0.1;
  for (let i = 0; i < 60; i++) frame();
  check('a dash kicks the FOV wider', cam.fov > verticalFov(100, 16 / 9) + 2);
  p.dashTime = 0;

  for (let i = 0; i < 240; i++) frame();
  const before = cam.position.y;
  p.pos.y += 0.35;
  rig.step(0.35);
  frame();
  check('a step up does not jolt the view', Math.abs(cam.position.y - before) < 0.05, `moved ${(cam.position.y - before).toFixed(3)} m`);
  for (let i = 0; i < 120; i++) frame();
  check('then the view eases up to the new height', near(cam.position.y, 0.35 + CAMERA.v.eyeHeight, 0.01));
}

section('Camera — slow frames (Update 0.2.14)');
{
  // An alpha tester's view flew into the sky and back after landings: the dip spring, stepped once a frame, grew on
  // every frame slower than ~12 fps. Stepped in slices, it settles at any frame rate.
  for (const fps of [8, 4]) {
    const cam = new THREE.PerspectiveCamera();
    const rig = new CameraRig(cam);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    const look = new Look();
    rig.update(1 / 120, 1, p.pos, p, look, 100, 16 / 9);
    rig.land(20);
    let far = 0;
    for (let i = 0; i < fps * 3; i++) {
      rig.update(1 / fps, 1, p.pos, p, look, 100, 16 / 9);
      far = Math.max(far, Math.abs(cam.position.y - CAMERA.v.eyeHeight));
    }
    check(`at ${fps} fps a landing's dip stays within its tuned depth`, far <= CAMERA.v.landDipMax + 1e-6, `${far.toFixed(3)} m from the eye`);
    check(`and settles`, near(cam.position.y, CAMERA.v.eyeHeight, 0.01), `${(cam.position.y - CAMERA.v.eyeHeight).toFixed(3)} m off`);
  }
}
{
  // The same springs as the arms' dip (140, 16) and the gun's recoil (260, 26): one long frame or many short ones.
  for (const [k, c] of [[140, 16], [260, 26], [600, 60]]) {
    const slow: Spring = { x: 0, v: -3 };
    const fast: Spring = { x: 0, v: -3 };
    let far = 0;
    for (let i = 0; i < 8; i++) {
      stepSpring(slow, k, c, MAX_FRAME);
      far = Math.max(far, Math.abs(slow.x));
    }
    for (let i = 0; i < 240; i++) stepSpring(fast, k, c, 1 / 120);
    check(`a spring (${k}, ${c}) at 4 fps never flies off and settles as at 120`, far < 0.3 && Math.abs(slow.x) < 1e-3 && Math.abs(fast.x) < 1e-3, `furthest ${far.toFixed(3)}, ends ${slow.x.toFixed(5)}`);
  }
  const s: Spring = { x: 0.1, v: 0 };
  stepSpring(s, 140, 16, 0);
  check('no time, no change', s.x === 0.1 && s.v === 0);
}
