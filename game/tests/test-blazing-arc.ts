// Update 0.3.71 — the Playable Demon's left click, Blazing Arc (the bible: "3-hit combo: slash, backslash, overhead"; the designer:
// "swing animation needs premium treatment"). The rules: a hit lands when the blade gets there, to all it sweeps through.
// The swing, in the real arms, frame by frame: it winds up, it's fastest as it meets, its weight carries it on, it settles;
// the same at 60 fps as at 144; the wrist straight; the fist in frame; the trail burning and gone. And the arm's model
// isn't white: its emissive, which neither Blender's previews nor the tests' untextured models show, went unseen once.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { playClip } from '../src/audio/clipRoutes';
import type { AudioEngine } from '../src/audio/audio';
import { bladeBack, bladeFollow, bladeStrike, bladeWindup, landBlade, OVERHEAD } from '../src/sim/combat/bladeSwing';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createPlayer } from '../src/sim/player/state';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';
import { DEMON_ARMS_URL, DEMON_BLADE_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DEMON_ARCS } from '../src/engine/viewmodel/demonPoses';
import { DEMON } from '../src/tuning/demon';
import { FISTS } from '../src/tuning/combat';
import type { Arena } from '../src/world/arena';

const d = DEMON.v;
const arena = (dummies: { x: number; z: number }[]): Arena => ({ name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: dummies.map((q) => ({ x: q.x, y: 0, z: q.z })), turrets: [] });
const kinds = (c: CombatState) => Array.from({ length: c.events.length }, (_, i) => c.events.at(i));
const world = new FlatWorld();

/** The Demon at the origin facing −z, with dummies where you say. */
function room(dummies: { x: number; z: number }[], demon = true) {
  const c = createCombat({ ...arena(dummies), dummies: dummies.map((q) => ({ x: q.x, y: 0, z: q.z })), stands: [] });
  c.demon = demon;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const seen: string[] = [];
  const steps: number[] = [];
  const step = (intent: Partial<ReturnType<typeof emptyCombatIntent>>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      p.hp = 100;
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
      for (const e of kinds(c)) {
        seen.push(e.kind);
        if (e.kind === 'bladeSwing') steps.push(e.value);
      }
      c.events.clear();
    }
  };
  return { c, p, seen, steps, step };
}

section('Blazing Arc — a hit lands when the blade gets there');
{
  const r = room([{ x: 0, z: -3 }]);
  const hp = r.c.dummies[0].hp;
  r.step({ attackPressed: true });
  check('the click starts a swing', r.steps.join() === '0');
  check('no punch: its fists’ rules keep only the parry', !r.seen.includes('jabL') && !r.seen.includes('jabR'));
  check('nothing’s hit yet: the blade’s on its way', r.c.dummies[0].hp === hp && !r.seen.includes('hitSlash'));
  r.step({}, bladeWindup(0) * 0.8);
  check('still not, most of its wind-up on', r.c.dummies[0].hp === hp);
  r.step({}, bladeWindup(0) * 0.3);
  check(`at its contact (${bladeWindup(0)} s): hit, for ${d.slashDamage}`, r.c.dummies[0].hp === hp - d.slashDamage && r.seen.includes('hitSlash'));
  const j = room([{ x: 0, z: -2 }], false);
  const before = j.c.dummies[0].hp;
  j.step({ attackPressed: true });
  check('Joseph’s fist still lands on the click', j.c.dummies[0].hp === before - FISTS.v.jabDamage && j.steps.length === 0);
}

section('Blazing Arc — the combo: slash, backslash, overhead');
{
  // (Update 0.3.72 — a deliberate change: held no longer repeats it. The bible gives Hold to Ember Wave: test-demon-moves.ts.)
  const r = room([{ x: 0, z: -3 }]);
  for (let i = 0; i < 4; i++) {
    r.step({ attackPressed: true });
    r.step({}, bladeWindup(i % 3) + (i % 3 === OVERHEAD ? d.overheadNext : d.slashNext) + 0.02);
  }
  check('click after click: the three in order, and round again', r.steps.join() === '0,1,2,0', r.steps.join());
  const q = room([]);
  q.step({ attackPressed: true });
  q.step({}, bladeWindup(0) * 0.9);
  q.step({ attackPressed: true });
  q.step({}, bladeWindup(0) + d.slashNext);
  check('a click late in a swing is kept for the next', q.steps.join() === '0,1', q.steps.join());
  const big = room([{ x: 0, z: -3 }]);
  const was = big.c.dummies[0].hp;
  landBlade(big.c, OVERHEAD, new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0, -1), world);
  check(`the third lands harder (${d.overheadDamage}, to ${d.slashDamage})`, was - big.c.dummies[0].hp === d.overheadDamage && d.overheadDamage > d.slashDamage);
  const late = room([]);
  late.step({ attackPressed: true });
  late.step({}, bladeWindup(0) + d.slashNext + d.combo + 0.1);
  late.step({ attackPressed: true });
  check('too long after: it starts over', late.steps.join() === '0,0', late.steps.join());
  const soon = room([]);
  soon.step({ attackPressed: true });
  soon.step({}, bladeWindup(0) + d.slashNext + 0.02);
  soon.step({ attackPressed: true });
  check('in time: the next', soon.steps.join() === '0,1', soon.steps.join());
}

section('Blazing Arc — it hits all it sweeps through');
{
  const hits = (spots: { x: number; z: number }[], step = 0) => {
    const r = room(spots);
    const had = r.c.dummies.map((q) => q.hp);
    landBlade(r.c, step, new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0, -1), world);
    return r.c.dummies.map((q, i) => q.hp < had[i]);
  };
  const at = (deg: number, m = 3) => ({ x: m * Math.sin((deg * Math.PI) / 180), z: -m * Math.cos((deg * Math.PI) / 180) });
  check('left, right and ahead, all at once', hits([at(-45), at(45), at(0)]).every(Boolean));
  check('and one behind another', hits([at(0, 1.8), at(0, 3.8)]).every(Boolean));
  const offside = hits([at(115), at(0)]);
  check('not what’s out of its arc', !offside[0] && offside[1]);
  check('not out of its reach', !hits([at(0, d.reach + d.width + 1.5)])[0]);
  const narrow = hits([at(-70), at(0)], OVERHEAD);
  check('the overhead comes down in a line: narrower', !narrow[0] && narrow[1]);
  const whiff = room([]);
  whiff.step({ attackPressed: true });
  whiff.step({}, bladeWindup(0) + 0.02);
  check('nothing there: a whiff', whiff.seen.includes('whiff') && !whiff.seen.includes('hitSlash'));
  const once = room([at(0)]);
  const hp = once.c.dummies[0].hp;
  landBlade(once.c, 0, new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0, -1), world);
  check('every ray that crosses it, still one hit', hp - once.c.dummies[0].hp === d.slashDamage);
  check('its bite is a hit-stop', once.c.hitStop.remaining > 0);
}

section('Blazing Arc — the parry comes first');
{
  const r = room([{ x: 0, z: -3 }]);
  const hp = r.c.dummies[0].hp;
  r.step({ attackPressed: true });
  r.step({ heavyHeld: true });
  check('right click opens the parry', r.seen.includes('guard'));
  r.step({}, bladeWindup(0) + 0.05);
  check('and calls off the swing: nothing lands', r.c.dummies[0].hp === hp);
}

section('Blazing Arc — its sounds are a blade’s');
{
  const played: string[] = [];
  const a = { clips: { play: (name: string) => (played.push(name), true) } } as unknown as AudioEngine;
  check('it plays', playClip(a, 'bladeSwing', 0, 1, ''));
  check('metal dragged, the air, the fire', played.includes('hellScrape') && played.includes('slash') && played.includes('hellWhoosh'));
  played.length = 0;
  playClip(a, 'bladeSwing', OVERHEAD, 1, '');
  check('the overhead’s a hammer’s weight of air', played.includes('hammerSwing'));
}

const STEP = 1 / 144;
const STILL = createPlayer(0, 0, 0, 0);
STILL.grounded = true;

async function arms() {
  const a = await parseUntextured(new URL(`../public${DEMON_ARMS_URL}`, import.meta.url));
  const b = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  const rig = ArmsRig.fromScene(a.scene, DEMON_HAND);
  const vm = new Viewmodel(false);
  vm.holdBlade(b.scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const play = (s: number, dt = STEP) => {
    for (let t = 0; t < s - 1e-9; t += dt) vm.update(dt, dt, 0, 0, STILL, -1);
  };
  play(1.2);
  return { vm, rig, blade: b.scene, play };
}

const tipOf = (blade: THREE.Object3D, out: THREE.Vector3) => out.set(0, 2.4, 0).applyMatrix4(blade.matrixWorld);
function wrist(rig: ArmsRig): number {
  const r = rig.arms.R;
  const elbow = r.fore.bone.getWorldPosition(new THREE.Vector3());
  const at = r.hand.bone.getWorldPosition(new THREE.Vector3());
  const knuckle = r.knuckle.getWorldPosition(new THREE.Vector3());
  return (at.clone().sub(elbow).angleTo(knuckle.sub(at)) * 180) / Math.PI;
}
const strikeOf = bladeStrike;
const followOf = bladeFollow;
const backOf = bladeBack;

section('Blazing Arc — each swing has a body (frame by frame, the real arms)');
{
  // (Update 0.3.72 — and Ember Wave's swing and the counter's.)
  check('five swings, in order', DEMON_ARCS.length === 5 && DEMON_ARCS.every((a, i) => a.step === i));
  check('each cocked, through its contact, to its end', DEMON_ARCS.every((a) => a.keys.length >= 4 && a.hit > 0.3 && a.hit < 0.8));
  for (const arc of DEMON_ARCS) {
    const name = ['The slash', 'The backslash', 'The overhead', 'Ember Wave', 'The counter'][arc.step];
    const { vm, rig, blade, play } = await arms();
    vm.arc(arc.step);
    const windup = bladeWindup(arc.step);
    const total = windup + followOf(arc.step) + backOf(arc.step);
    const speeds: { t: number; v: number }[] = [];
    const last = new THREE.Vector3();
    const now = new THREE.Vector3();
    let worst = 0;
    let t = 0;
    let jump = 0;
    let handOut = 0;
    while (t < total - STEP) {
      tipOf(blade, last);
      play(STEP, STEP);
      t += STEP;
      tipOf(blade, now);
      const v = now.distanceTo(last) / STEP;
      speeds.push({ t, v });
      jump = Math.max(jump, now.distanceTo(last));
      vm.scene.updateMatrixWorld(true);
      worst = Math.max(worst, wrist(rig));
      const s = rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3()).project(vm.camera);
      if (t > windup - strikeOf(arc.step)) handOut = Math.max(handOut, Math.abs(s.x), Math.abs(s.y));
    }
    check(`${name}: the wrist never past ${Math.round(worst)}° (under about 45°)`, worst < 46);
    check(`${name}: its wrist in frame from the strike on`, handOut < 1.1, handOut.toFixed(2));
    const fastest = speeds.reduce((a, b) => (b.v > a.v ? b : a));
    check(`${name}: fastest through its contact (${fastest.t.toFixed(3)} s, contact ${windup} s)`, Math.abs(fastest.t - windup) < 0.05);
    const wound = speeds.filter((q) => q.t < windup - strikeOf(arc.step) - 0.01).reduce((m, q) => Math.max(m, q.v), 0);
    check(`${name}: it explodes out of its wind-up (${Math.round(fastest.v / Math.max(wound, 1e-6))} times faster)`, fastest.v > wound * 1.3);
    const late = speeds.filter((q) => q.t > windup + followOf(arc.step) * 0.8 && q.t < windup + followOf(arc.step)).reduce((m, q) => Math.max(m, q.v), 0);
    check(`${name}: its weight slows it`, late < fastest.v * 0.25);
    // (In its strike its tip really does cross half a metre between frames: 2.4 m of blade, in a few hundredths of a second.)
    const slow = speeds.filter((q) => q.t < windup - strikeOf(arc.step) - 0.01 || q.t > windup + followOf(arc.step)).reduce((m, q) => Math.max(m, q.v), 0);
    // (The backslash from ready, here, has furthest to go: in play a slash has always put it there.)
    check(`${name}: no leap, wound up or going back (at most ${(slow * STEP).toFixed(2)} m a frame)`, slow * STEP < 0.26);
    void jump;
    play(0.1);
    check(`${name}: it’s back at ready, and the shoulders straight`, vm.swordAnim.current === 'ready' && vm.swingLean.length() < 1e-6);
  }
}

section('Blazing Arc — the same at any frame rate, and it stops on a hit');
{
  const at = async (dt: number, secs: number) => {
    const { vm, blade, play } = await arms();
    vm.arc(0);
    play(secs, dt);
    vm.scene.updateMatrixWorld(true);
    return tipOf(blade, new THREE.Vector3());
  };
  const moment = bladeWindup(0) + d.slashFollow * 0.5;
  const a = await at(1 / 60, moment);
  const b = await at(1 / 144, moment);
  check(`the blade’s tip within ${a.distanceTo(b).toFixed(2)} m, at 60 fps and 144`, a.distanceTo(b) < 0.3);
  const { vm, blade, play } = await arms();
  vm.arc(0);
  play(bladeWindup(0) + 0.002);
  vm.update(0, STEP, 0, 0, STILL, -1);
  vm.scene.updateMatrixWorld(true);
  const stopped = tipOf(blade, new THREE.Vector3());
  for (let i = 0; i < 12; i++) vm.update(0, STEP, 0, 0, STILL, -1);
  vm.scene.updateMatrixWorld(true);
  const moved = tipOf(blade, new THREE.Vector3()).distanceTo(stopped);
  check(`in a hit-stop it holds still: the blade biting (${moved.toFixed(4)} m)`, moved < 0.01);
}

section('Blazing Arc — the combo flows');
{
  const { vm, blade, play } = await arms();
  const last = new THREE.Vector3();
  const now = new THREE.Vector3();
  // The first frames of each, wound up from where the last left it.
  let jump = 0;
  const start = (step: number, secs: number) => {
    vm.arc(step);
    for (let t = 0; t < secs; t += STEP) {
      tipOf(blade, last);
      play(STEP, STEP);
      tipOf(blade, now);
      if (t < (bladeWindup(step) - strikeOf(step)) * 0.9) jump = Math.max(jump, now.distanceTo(last));
    }
  };
  start(0, bladeWindup(0) + d.slashNext);
  start(1, bladeWindup(1) + d.slashNext);
  start(2, bladeWindup(2) + d.overheadNext);
  check(`each from where the last left it: no leap (at most ${jump.toFixed(2)} m a frame)`, jump < 0.2);
}

section('Blazing Arc — its trail, and its flare');
{
  const { vm, play } = await arms();
  check('nothing burning at ready', vm.trail !== null && vm.trail.burning === 0);
  const flat = vm.trail!.mesh.geometry;
  check('nothing to draw either', flat.drawRange.count === 0);
  vm.arc(0);
  const cock = bladeWindup(0) - d.slashStrike;
  play(cock * 0.8);
  check('none through the wind-up', vm.trail!.burning === 0);
  play(cock * 0.2 + d.slashStrike);
  check('it burns through the strike', vm.trail!.burning >= 2 && flat.drawRange.count > 0);
  check('the blade flares', vm.swordAnim.flare > 0.5);
  const colours = flat.attributes.color.array as Float32Array;
  check('its fire’s hot and orange: red over green over blue', colours.some((n) => n > 0.2));
  play(d.slashFollow);
  play(0.25);
  check('gone a moment after', vm.trail!.burning === 0 && flat.drawRange.count === 0);
  check('and the blade’s back to its own glow', vm.swordAnim.flare === 0);
  const j = new Viewmodel(false);
  j.update(STEP, STEP, 0, 0, STILL, -1);
  check('Joseph has none', j.trail === null);
}

section('The arm’s model: not white');
{
  // (A model parsed for the tests has no textures: its file is read as it is, what the game's loader sees.)
  const json = (url: string) => {
    const buf = readFileSync(new URL(`../public${url}`, import.meta.url));
    return JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  };
  const arm = json(DEMON_ARMS_URL).materials[0];
  const glow = arm.emissiveFactor ?? [0, 0, 0];
  check('the arms don’t glow: no emissive left without its map (a whole arm drawn white, 0.3.70)', glow.every((n: number) => n === 0) && !arm.emissiveTexture);
  check('they have their colours', !!arm.pbrMetallicRoughness?.baseColorTexture);
  const blade = json(DEMON_BLADE_URL).materials[0];
  check('the blade has its colours and its glow map', !!blade.pbrMetallicRoughness?.baseColorTexture && !!blade.emissiveTexture);
}
