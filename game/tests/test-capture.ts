// Update 0.3.37 — the capture kit, for filming the trailer (engine/capture/): its keys (dev only, none a default
// control), the HUD gone and back, slow motion and the freeze, the field of view, the free camera flying where it
// looks, the dolly's glide (through every point, eased, the short way round, held at its end), the views taken over
// (the rig's shake still on them), and nothing of yours pressed while it flies.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DEFAULT_BINDINGS, isBindable } from '../src/input/bindings';
import { devKeyAction } from '../src/state/devTools';
import { verticalFov } from '../src/state/settings';
import { Capture, CAPTURE_HELP, CAPTURE_KEYS, controlsOf, FOV_HI, SLOWS } from '../src/engine/capture/capture';
import { CamPose, Dolly, DOLLY_LENGTHS, DOLLY_POINTS, glide, unwound } from '../src/engine/capture/dolly';
import { emptyControls, FLY_MAX, FLY_SPEED, FreeCam } from '../src/engine/capture/freeCam';

const pose = (x: number, y: number, z: number, yaw = 0, pitch = 0, fov = 100): CamPose => ({ x, y, z, yaw, pitch, fov });
const still = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
const sens = { sensitivity: 1, invertY: false };

section('Capture kit — its keys');
{
  check('F7 (or \\) turns it on and off; neither can be bound in a dev build', devKeyAction('F7') === 'capture' && devKeyAction('Backslash') === 'capture' && !isBindable('F7') && !isBindable('Backslash'));
  const bound = new Set(Object.values(DEFAULT_BINDINGS));
  check('none of its keys is a default control', Object.keys(CAPTURE_KEYS).every((k) => !bound.has(k)) && !bound.has('F7') && !bound.has('Backslash'));
  check('each says what it does on the key card', Object.values(CAPTURE_KEYS).every((a) => CAPTURE_HELP[a].length > 0));
  const c = new Capture();
  const off = !c.key('Digit6') && !c.clean && c.timeScale === 1 && !c.frozen;
  c.toggle();
  const on = c.on && c.clean && c.cardLeft > 0;
  const hud = c.key('Digit6') && !c.clean && c.key('Digit6') && c.clean;
  const held = c.key('Digit6', true) && c.clean;
  const other = !c.key('KeyW');
  check('off, its keys are nobody’s; on, the HUD’s gone at once and the key card shows', off && on);
  check('6 brings the HUD back and takes it away; held, nothing more; a game key isn’t its', hud && held && other);
  c.key('Digit7');
  c.key('Digit8');
  c.key('Digit9');
  c.key('Digit0');
  c.key('Equal');
  c.toggle();
  check('off again: all as it was (arms, view, time, field of view)', !c.on && !c.clean && c.arms && !c.fly && !c.freeze && c.timeScale === 1 && c.fovOf(100) === 100 && c.armsShown);
}

section('Capture kit — time, field of view, arms');
{
  const c = new Capture();
  c.toggle();
  const scales = [c.timeScale];
  for (let i = 0; i < 3; i++) {
    c.key('Digit9');
    scales.push(c.timeScale);
  }
  check(`9: slow motion ${scales.join(' → ')}`, scales.join() === [...SLOWS, 1].join());
  c.key('Digit0');
  const frozen = c.frozen;
  c.key('Digit0');
  check('0: the world frozen, then running', frozen && !c.frozen);
  const base = c.fovOf(100);
  c.key('Equal');
  c.key('Equal', true);
  const wider = c.fovOf(100);
  for (let i = 0; i < 20; i++) c.key('Equal', true);
  const most = c.fovOf(100);
  c.key('Minus');
  check(`- and =: the field of view ${base} → ${wider}, at most ${most}, held to repeat`, base === 100 && wider === 110 && most === FOV_HI && c.fovOf(100) === FOV_HI - 5);
  c.key('Digit7');
  check('7: the arms not drawn', !c.armsShown);
  c.key('Period');
  check('.: the boss’s show asked for again, once', c.takeBoss() && !c.takeBoss());
}

section('Capture kit — the free camera');
{
  const cam = new FreeCam();
  cam.seat(pose(0, 2, 0));
  const ctl = emptyControls();
  ctl.forward = true;
  for (let i = 0; i < 120; i++) cam.steer(ctl, 1, false, 1 / 60);
  const p = cam.pose;
  check(`W: where it looks (${(-p.z).toFixed(1)} m in 2 s, easing up to ${FLY_SPEED} m/s)`, p.z < -9 && p.z > -12.1 && near(p.x, 0, 1e-6) && near(p.y, 2, 1e-6));
  cam.seat(pose(0, 2, 0, Math.PI / 2, 0.5));
  for (let i = 0; i < 60; i++) cam.steer(ctl, 1, false, 1 / 60);
  check('turned and tilted, it flies that way (up and to the left)', cam.pose.x < -2 && cam.pose.y > 3 && Math.abs(cam.pose.z) < 1e-6);
  const turn = emptyControls();
  cam.seat(pose(0, 0, 0));
  turn.dx = 100;
  cam.steer(turn, 1, false, 1 / 60);
  turn.dx = 0;
  for (let i = 0; i < 60; i++) cam.steer(turn, 1, false, 1 / 60);
  check(`the mouse turns it as your view turns, smoothly (${cam.pose.yaw.toFixed(3)} rad)`, near(cam.pose.yaw, -0.22, 0.005));
  turn.wheel = 2;
  cam.steer(turn, 1, false, 0);
  const faster = cam.speed;
  turn.wheel = 40;
  cam.steer(turn, 1, false, 0);
  check(`the wheel its speed (${faster.toFixed(2)} m/s, at most ${FLY_MAX})`, near(faster, FLY_SPEED * 1.5625, 1e-9) && cam.speed === FLY_MAX);
  const up = emptyControls();
  up.up = true;
  cam.seat(pose(0, 0, 0));
  for (let i = 0; i < 30; i++) cam.steer(up, 1, false, 1 / 60);
  check('jump up, dash down', cam.pose.y > 0.5);
}

section('Capture kit — the dolly');
{
  const a = pose(0, 2, 0, 0);
  const b = pose(10, 2, 0, 1);
  const c = pose(10, 6, 10, 2, -0.3, 80);
  const path = unwound([a, b, c]);
  const at = pose(0, 0, 0);
  const first = glide(path, 0, pose(0, 0, 0));
  const last = glide(path, 1, pose(0, 0, 0));
  let nearest = Infinity;
  let jump = 0;
  let prev = glide(path, 0, pose(0, 0, 0));
  for (let i = 1; i <= 2000; i++) {
    glide(path, i / 2000, at);
    nearest = Math.min(nearest, Math.hypot(at.x - b.x, at.y - b.y, at.z - b.z));
    jump = Math.max(jump, Math.hypot(at.x - prev.x, at.y - prev.y, at.z - prev.z));
    prev = { ...at };
  }
  check('from its first point to its last, its turn and its zoom too', near(first.x, 0, 1e-9) && near(last.z, 10, 1e-9) && near(last.yaw, 2, 1e-9) && near(last.fov, 80, 1e-9));
  check(`through every point between (within ${nearest.toFixed(3)} m), smoothly (no step over ${jump.toFixed(3)} m)`, nearest < 0.02 && jump < 0.05);
  const early = glide(path, 0.02, pose(0, 0, 0)).x;
  const mid = glide(path, 0.5, pose(0, 0, 0));
  const midNext = glide(path, 0.52, pose(0, 0, 0));
  const midStep = Math.hypot(midNext.x - mid.x, midNext.y - mid.y, midNext.z - mid.z);
  check('eased: slow off its first point, quicker on its way', early < midStep);
  const round = unwound([pose(0, 0, 0, 3), pose(5, 0, 0, -3)]);
  let wide = 0;
  for (let i = 0; i <= 50; i++) wide = Math.max(wide, Math.abs(glide(round, i / 50, at).yaw - 3));
  check(`its turn the short way round (${wide.toFixed(2)} rad, not ${(6).toFixed(2)})`, wide < 0.3);
  const spot = unwound([pose(1, 1, 1, 0), pose(1, 1, 1, Math.PI / 2)]);
  check('a turn on the spot takes its time', near(glide(spot, 0.5, at).yaw, Math.PI / 4, 1e-6));
  const d = new Dolly();
  let marked = 0;
  for (let i = 0; i < DOLLY_POINTS + 1; i++) marked += d.mark(pose(i, 0, 0)) ? 1 : 0;
  const lengths = [d.length];
  for (let i = 0; i < DOLLY_LENGTHS.length; i++) lengths.push(d.nextLength());
  check(`at most ${DOLLY_POINTS} points; its lengths ${lengths.join(' → ')} s`, marked === DOLLY_POINTS && lengths.join() === [...DOLLY_LENGTHS, DOLLY_LENGTHS[0]].join());
  d.play();
  d.step(d.length / 2);
  const playing = d.state === 'playing';
  d.step(d.length);
  const end = d.pose(at);
  check('played in its time, then held at its last point', playing && d.state === 'held' && near(end.x, DOLLY_POINTS - 1, 1e-9));
  d.stop();
  const stopped = d.state === 'off';
  d.clear();
  check('stopped; cleared, nothing to play', stopped && !d.play() && d.points.length === 0);
}

section('Capture kit — the view taken over');
{
  const c = new Capture();
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 400);
  camera.position.set(1, 2, 3);
  camera.rotation.set(0.2, 0.7, 0, 'YXZ');
  const off = !c.view(camera, still, 100, 16 / 9, 1 / 60) && camera.position.x === 1;
  check('off, the view is yours, remembered (where a point or the free camera starts)', off && near(c.last.yaw, 0.7, 1e-9) && near(c.last.pitch, 0.2, 1e-9) && c.last.z === 3);
  c.toggle();
  c.key('Digit8');
  const ctl = emptyControls();
  ctl.forward = true;
  for (let i = 0; i < 60; i++) c.steer(ctl, sens, 1 / 60);
  const shake = { ...still, x: 0.25 };
  const taken = c.view(camera, shake, 100, 16 / 9, 1 / 60);
  check('8: the free camera’s view in place of yours, from where you were, the shake on it', taken && Math.hypot(camera.position.x - 1.25, camera.position.z - 3) > 2 && near(camera.position.x - c.cam.pose.x, 0.25, 1e-9) && near(camera.fov, verticalFov(100, 16 / 9), 1e-6));
  // Two points, then the dolly: from the first to the second.
  c.key('Digit8');
  camera.position.set(0, 2, 0);
  camera.rotation.set(0, 0, 0, 'YXZ');
  c.view(camera, still, 100, 16 / 9, 0);
  c.key('BracketLeft');
  camera.position.set(8, 3, -4);
  camera.rotation.set(-0.1, 1.2, 0, 'YXZ');
  c.view(camera, still, 90, 16 / 9, 0);
  c.key('BracketLeft');
  c.key('BracketRight');
  const startOn = c.view(camera, still, 100, 16 / 9, 0) && near(camera.position.x, 0, 1e-6);
  c.view(camera, still, 100, 16 / 9, c.dolly.length + 1);
  const endOn = near(camera.position.x, 8, 1e-6) && near(camera.position.z, -4, 1e-6) && near(camera.fov, verticalFov(90, 16 / 9), 1e-6);
  check('[ marks, ] plays: from the first point, held at the last (its zoom too)', c.dolly.points.length === 2 && startOn && endOn);
  c.key('Semicolon');
  camera.position.set(5, 5, 5);
  check('; stops it: your view again', !c.view(camera, still, 100, 16 / 9, 1 / 60) && camera.position.x === 5);
}

section('Capture kit — yours held while it flies');
{
  const c = new Capture();
  let cleared = 0;
  const input = { locked: true, mouseDX: 4, mouseDY: -2, wheelSteps: 1, action: (a: string) => a === 'forward' || a === 'jump', clearPressed: () => cleared++ };
  const free = controlsOf(input, c);
  const notYet = cleared === 0 && free.forward && free.up && !free.back && free.dx === 4 && free.wheel === 1;
  c.toggle();
  c.key('Digit8');
  controlsOf(input, c);
  const flying = cleared === 1;
  c.key('Digit8');
  c.key('Digit0');
  controlsOf(input, c);
  check('flying or frozen, what you press is dropped (no jump, no skipped show, kept for later)', notYet && flying && cleared === 2);
  input.locked = false;
  const loose = controlsOf(input, c);
  check('the mouse not the game’s: nothing steers it', !loose.forward && loose.dx === 0 && loose.wheel === 0);
}
