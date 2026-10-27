// M1 step 6 — the first-person arms: the posing math, the punch timeline, and the real model (the shipped .glb,
// parsed here) posed into the guard and a full punch, checked bone by bone.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, near, section } from './harness';
import { aimBone, frameQuat, solveElbow } from '../src/engine/viewmodel/armsMath';
import { punchExtension } from '../src/engine/viewmodel/armsAnim';
import { ArmPose, ArmsRig } from '../src/engine/viewmodel/armsRig';
import { FIST_REACH, GUARD } from '../src/engine/viewmodel/guard';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

section('Arms — math');
{
  const s = V(0, 0, 0);
  const w = V(0.3, 0, 0);
  const e = solveElbow(s, w, 0.2, 0.2, V(0, -1, 0), new THREE.Vector3());
  check('the elbow keeps both bone lengths', near(e.distanceTo(s), 0.2, 1e-9) && near(e.distanceTo(w), 0.2, 1e-9));
  check('the elbow bends towards the pole', e.y < 0);
  const far = solveElbow(s, V(5, 0, 0), 0.2, 0.2, V(0, -1, 0), new THREE.Vector3());
  check('out of reach, the arm points straight at the target', far.y > -0.01 && far.x > 0.19);
  const q = frameQuat(V(0, 0, 1), V(0, 1, 0), new THREE.Quaternion());
  check('frameQuat turns +y onto the given direction', V(0, 1, 0).applyQuaternion(q).distanceTo(V(0, 0, 1)) < 1e-9);
  const rest = new THREE.Quaternion();
  const out = aimBone(rest, V(1, 0, 0), V(0, 1, 0), V(0, 0, 1), V(0, 1, 0), new THREE.Quaternion());
  check('aimBone points the rest direction where asked', V(1, 0, 0).applyQuaternion(out).distanceTo(V(0, 0, 1)) < 1e-9);
}

section('Arms — punch timeline');
{
  const v = ARMS.v;
  check('a punch starts at the guard', punchExtension(0, 'jab') === 0);
  check('it is fully out after the out time', near(punchExtension(v.punchOut, 'jab'), 1, 1e-9));
  check('it holds', punchExtension(v.punchOut + v.punchHold * 0.5, 'jab') === 1);
  let lowest = 1;
  for (let t = v.punchOut + v.punchHold; t < v.punchOut + v.punchHold + v.punchBack; t += 0.002) lowest = Math.min(lowest, punchExtension(t, 'jab'));
  check('it comes back with a little overshoot past the guard', lowest < 0 && lowest > -0.25, `lowest ${lowest.toFixed(3)}`);
  check('then it is done', punchExtension(1, 'jab') === 0);
}

section('Arms — the real model');
{
  const buf = readFileSync(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
  const rig = ArmsRig.fromScene(gltf.scene);
  check('the arms load with their bones', rig.reach('L') > 0.3 && near(rig.reach('L'), rig.reach('R'), 1e-6), `reach ${rig.reach('L').toFixed(3)} m`);
  check('the eye sits above and between the shoulders', rig.eye.y > rig.between.y && Math.abs(rig.eye.x) < 1e-3, `eye ${rig.eye.toArray().map((n) => n.toFixed(3)).join(', ')}`);

  const pose: ArmPose = { fist: new THREE.Vector3(), knuckles: new THREE.Vector3(), back: new THREE.Vector3() };
  const hand = new THREE.Vector3();
  const knuckle = new THREE.Vector3();
  for (const side of ['L', 'R'] as const) {
    rig.guard(side, pose);
    rig.apply(side, pose);
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.getObjectByName(`Hand${side}`)!.getWorldPosition(hand);
    const wrist = pose.fist.clone().addScaledVector(pose.knuckles, -FIST_REACH);
    check(`${side} guard: the wrist lands on its target`, hand.distanceTo(wrist) < 0.01, `${(hand.distanceTo(wrist) * 100).toFixed(1)} cm off`);
    gltf.scene.getObjectByName(`Middle2${side}`)!.getWorldPosition(knuckle);
    const pointing = knuckle.sub(hand).normalize();
    check(`${side} guard: the fist points about the way the guard says`, pointing.dot(GUARD[side].knuckles) > 0.8, `dot ${pointing.dot(GUARD[side].knuckles).toFixed(2)}`);
  }
  // A full punch: the left fist aimed far ahead stretches the arm straight towards it.
  pose.fist.copy(rig.eye).add(new THREE.Vector3(0, -0.06, 2));
  pose.knuckles.set(0, 0, 1);
  pose.back.set(0, 1, 0);
  rig.apply('L', pose);
  gltf.scene.updateMatrixWorld(true);
  const shoulder = gltf.scene.getObjectByName('UpperArmL')!.getWorldPosition(new THREE.Vector3());
  gltf.scene.getObjectByName('HandL')!.getWorldPosition(hand);
  check('a full punch straightens the arm', near(hand.distanceTo(shoulder), rig.reach('L'), 0.01), `${hand.distanceTo(shoulder).toFixed(3)} of ${rig.reach('L').toFixed(3)} m`);
  check('and reaches forward', hand.z > shoulder.z + 0.3);
}

section('Arms — on screen');
{
  // Update 0.0.3 — the guard must leave the centre of the screen clear (the designer's call): measured through the
  // game's own arms camera on 16:9 and on a 2:1 window like the designer's.
  const buf = readFileSync(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(gltf.scene));
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const at = new THREE.Vector3();
  for (const aspect of [16 / 9, 2]) {
    vm.update(0, 0, 0, 0, p, -1);
    vm.setLens(aspect);
    vm.scene.updateMatrixWorld(true);
    const ndc = (bone: string) => gltf.scene.getObjectByName(bone)!.getWorldPosition(at).project(vm.camera);
    const l = ndc('Middle2L').clone();
    const r = ndc('Middle2R').clone();
    const label = aspect === 2 ? '2:1' : '16:9';
    check(`${label}: the left fist sits low left`, l.x < -0.25 && l.x > -0.95 && l.y < -0.2 && l.y > -0.95, `(${l.x.toFixed(2)}, ${l.y.toFixed(2)})`);
    check(`${label}: the right fist sits low right`, r.x > 0.25 && r.x < 0.95 && r.y < -0.2 && r.y > -0.95, `(${r.x.toFixed(2)}, ${r.y.toFixed(2)})`);
  }
}

section('Arms — holding the sword');
{
  // M2 — the sword in the right fist (the Arms tab's weapon knobs): its blade shows, and never crosses the crosshair.
  const armsBuf = readFileSync(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const arms = await new GLTFLoader().parseAsync(armsBuf.buffer.slice(armsBuf.byteOffset, armsBuf.byteOffset + armsBuf.byteLength) as ArrayBuffer, '');
  const swordBuf = readFileSync(new URL('../public/models/weapons/sword.glb', import.meta.url));
  const sword = await new GLTFLoader().parseAsync(swordBuf.buffer.slice(swordBuf.byteOffset, swordBuf.byteOffset + swordBuf.byteLength) as ArrayBuffer, '');
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setWeapon(sword.scene);
  const tip = new THREE.Box3().setFromObject(sword.scene).max.y;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  for (const aspect of [16 / 9, 2]) {
    vm.update(0, 0, 0, 0, p, -1);
    vm.setLens(aspect);
    vm.scene.updateMatrixWorld(true);
    const samples = Array.from({ length: 12 }, (_, i) => new THREE.Vector3(0, (tip * i) / 11, 0).applyMatrix4(sword.scene.matrixWorld).project(vm.camera));
    const label = aspect === 2 ? '2:1' : '16:9';
    const onScreen = samples.filter((s) => Math.abs(s.x) <= 1 && Math.abs(s.y) <= 1 && s.z < 1);
    const centre = samples.filter((s) => Math.abs(s.x) < 0.12 && Math.abs(s.y) < 0.2);
    check(`${label}: the held sword shows`, onScreen.length >= 4, `${onScreen.length} of 12 blade points on screen`);
    check(`${label}: and keeps clear of the crosshair`, centre.length === 0, centre.map((s) => `(${s.x.toFixed(2)}, ${s.y.toFixed(2)})`).join(' '));
  }
}
