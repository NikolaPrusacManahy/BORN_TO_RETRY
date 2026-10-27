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
import { WEAPONS } from '../src/tuning/weapons';

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
  // M2 / Update 0.0.10 — the sword arm (the designer: a real grip, no left hand, the tip pointed while a pierce
  // charges, a throw that looks like the pierce). Posed through the game's own Viewmodel with the real models.
  const armsBuf = readFileSync(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const arms = await new GLTFLoader().parseAsync(armsBuf.buffer.slice(armsBuf.byteOffset, armsBuf.byteOffset + armsBuf.byteLength) as ArrayBuffer, '');
  const swordBuf = readFileSync(new URL('../public/models/weapons/sword.glb', import.meta.url));
  const sword = await new GLTFLoader().parseAsync(swordBuf.buffer.slice(swordBuf.byteOffset, swordBuf.byteOffset + swordBuf.byteLength) as ArrayBuffer, '');
  const tip = new THREE.Box3().setFromObject(sword.scene).max.y;
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(16 / 9);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const STEP = 1 / 120;
  const play = (secs: number, charge = -1) => {
    for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, charge);
    vm.scene.updateMatrixWorld(true);
  };
  const bone = (n: string) => arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
  const ndc = (n: string) => bone(n).project(vm.camera);
  /** Degrees the right hand turns from the forearm's line. */
  const wrist = () => THREE.MathUtils.radToDeg(bone('HandR').sub(bone('LowerArmR')).normalize().angleTo(bone('Middle2R').sub(bone('HandR')).normalize()));
  const blade = (k: number) => new THREE.Vector3(0, tip * k, 0).applyMatrix4(sword.scene.matrixWorld);
  const offScreen = (v: THREE.Vector3) => v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;

  vm.setWeapon(sword.scene);
  play(1);
  const fingers = new THREE.Vector3();
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const j of [2, 3, 4]) fingers.add(bone(`${f}${j}R`));
  fingers.divideScalar(12);
  // The point of the handle held (Sword in the fist, up from the handle's middle; Update 0.0.10).
  const grip = new THREE.Vector3(0, ARMS.v.swordGripSlide / ARMS.v.weaponScale, 0).applyMatrix4(sword.scene.matrixWorld);
  check('the grip sits where the fingers curl round (not in the palm)', grip.distanceTo(fingers) < 0.005, `${(grip.distanceTo(fingers) * 100).toFixed(1)} cm off`);
  check('the left arm is out of view', ['HandL', 'LowerArmL', 'Middle2L'].every((n) => offScreen(ndc(n))), ['HandL', 'LowerArmL'].map((n) => `${n} (${ndc(n).x.toFixed(2)}, ${ndc(n).y.toFixed(2)})`).join(' '));
  const samples = Array.from({ length: 12 }, (_, i) => blade(i / 11).project(vm.camera));
  check('ready: the sword shows', samples.filter((q) => !offScreen(q)).length >= 4);
  check('ready: and keeps clear of the crosshair', samples.every((q) => Math.abs(q.x) >= 0.12 || Math.abs(q.y) >= 0.2));
  const held: [string, () => void][] = [
    ['ready', () => play(0.1)],
    ['the end of a forehand', () => (vm.sword('forehand'), play(ARMS.v.swordSwing))],
    ['the end of the backhand', () => (vm.sword('backhand'), play(ARMS.v.swordSwing))],
    ['a full pierce charge', () => play(1.5, 1)],
    ['the thrust', () => (vm.sword('pierce'), play(ARMS.v.pierceOut + 0.02))],
  ];
  for (const [name, pose] of held) {
    pose();
    check(`${name}: the wrist stays nearly straight`, wrist() < 40, `${wrist().toFixed(0)}°`);
  }
  play(1, 1);
  const g = new THREE.Vector3().setFromMatrixPosition(sword.scene.matrixWorld).applyMatrix4(vm.camera.matrixWorldInverse);
  const along = blade(1).applyMatrix4(vm.camera.matrixWorldInverse).sub(g).normalize();
  const toAim = new THREE.Vector3(0, 0, -3).sub(g).normalize();
  check('charging a pierce points the tip at the crosshair', THREE.MathUtils.radToDeg(along.angleTo(toAim)) < 3, `${THREE.MathUtils.radToDeg(along.angleTo(toAim)).toFixed(1)}° off`);
  vm.sword('pierce');
  play(ARMS.v.pierceOut);
  const thrust = new THREE.Vector3().setFromMatrixPosition(sword.scene.matrixWorld).applyMatrix4(vm.camera.matrixWorldInverse);
  check('the pierce thrusts the sword ahead', thrust.z < g.z - 0.1, `${((g.z - thrust.z) * 100).toFixed(0)} cm`);
  // The throw: drawn back, then thrust to let go when the wind-up ends.
  play(1);
  vm.sword('throw');
  play(WEAPONS.v.throwWindup * 0.5);
  const drawn = new THREE.Vector3().setFromMatrixPosition(sword.scene.matrixWorld).applyMatrix4(vm.camera.matrixWorldInverse);
  play(WEAPONS.v.throwWindup * 0.5);
  const release = new THREE.Vector3().setFromMatrixPosition(sword.scene.matrixWorld).applyMatrix4(vm.camera.matrixWorldInverse);
  check('a throw draws back, then thrusts as it lets go', release.z < drawn.z - 0.1, `${((drawn.z - release.z) * 100).toFixed(0)} cm`);
  vm.setWeapon(null);
  play(ARMS.v.armedSwap + 0.05);
  check('barehanded again, both fists are back', !offScreen(ndc('Middle2L')) && !offScreen(ndc('Middle2R')));
}

section('Arms — the slash');
{
  // Update 0.0.10 — the designer: the first slash was atrocious (the hand stayed at the screen's edge and only the
  // wrist turned; it rested stiffly; the backhand drove the hand into the camera). Now the arm swings through the
  // middle of the view to low left, then straight back; a slash before it's back swings back; hit-stop freezes it on
  // contact.
  const armsBuf = readFileSync(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const arms = await new GLTFLoader().parseAsync(armsBuf.buffer.slice(armsBuf.byteOffset, armsBuf.byteOffset + armsBuf.byteLength) as ArrayBuffer, '');
  const swordBuf = readFileSync(new URL('../public/models/weapons/sword.glb', import.meta.url));
  const sword = await new GLTFLoader().parseAsync(swordBuf.buffer.slice(swordBuf.byteOffset, swordBuf.byteOffset + swordBuf.byteLength) as ArrayBuffer, '');
  const tip = new THREE.Box3().setFromObject(sword.scene).max.y;
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(16 / 9);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const STEP = 1 / 120;
  const play = (secs: number, frozen = false) => {
    for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(frozen ? 0 : STEP, STEP, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
  };
  const onScreen = (local: THREE.Vector3) => local.applyMatrix4(sword.scene.matrixWorld).project(vm.camera);
  const wristX = () => arms.scene.getObjectByName('HandR')!.getWorldPosition(new THREE.Vector3()).project(vm.camera).x;
  vm.setWeapon(sword.scene);
  play(1);

  // The guard rests on the fist (the designer: the sword sat too low in it).
  const origin = new THREE.Vector3().setFromMatrixPosition(sword.scene.matrixWorld);
  const up = new THREE.Vector3(0, 1, 0).transformDirection(sword.scene.matrixWorld);
  const along = (v: THREE.Vector3) => v.clone().sub(origin).dot(up);
  const guard = along(new THREE.Vector3(0, 0.125, 0).applyMatrix4(sword.scene.matrixWorld));
  const fistTop = Math.max(...['Index2R', 'Index3R', 'Thumb2R', 'Thumb3R'].map((n) => along(arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3()))));
  check('ready: the guard rests on top of the fist', guard - fistTop >= 0 && guard - fistTop < 0.025, `${((guard - fistTop) * 100).toFixed(1)} cm above the knuckles`);

  // A forehand from ready: the blade passes the crosshair and the whole arm travels across.
  const startX = wristX();
  vm.slash();
  let nearest = 9;
  for (let t = 0; t < ARMS.v.swordSwing; t += STEP / 4) {
    vm.update(STEP / 4, STEP / 4, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
    const a = onScreen(new THREE.Vector3(0, 0, 0));
    const b = onScreen(new THREE.Vector3(0, tip, 0));
    const ab = b.clone().sub(a).setZ(0);
    const k = Math.max(0, Math.min(1, -a.clone().setZ(0).dot(ab) / ab.lengthSq()));
    nearest = Math.min(nearest, a.clone().addScaledVector(ab, k).setZ(0).length());
  }
  check('a forehand sweeps the blade across the crosshair', nearest < 0.1, `nearest ${nearest.toFixed(2)}`);
  check('the arm swings across (not just the wrist)', startX - wristX() > 0.6, `wrist ${startX.toFixed(2)} → ${wristX().toFixed(2)}`);
  check('it ends on the left', vm.swordAnim.path > 0.99 && onScreen(new THREE.Vector3(0, tip, 0)).x < 0);
  // The designer: back right away (resting on the left read as a freeze).
  play(ARMS.v.swordRest + ARMS.v.swordRecover + STEP);
  check('then goes straight back to ready', vm.swordAnim.current === 'ready', `${(ARMS.v.swordSwing + ARMS.v.swordRest + ARMS.v.swordRecover).toFixed(2)} s after the click`);
  vm.slash();
  play(ARMS.v.swordSwing);
  vm.slash();
  check('a slash before it is back swings back (a backhand)', vm.swordAnim.current === 'backhand');
  play(ARMS.v.swordSwing + STEP);
  check('ending in the ready pose', vm.swordAnim.current === 'ready' && vm.swordAnim.path === 0);

  // Left alone, a forehand drifts home; the next slash is a forehand again.
  vm.slash();
  play(ARMS.v.swordSwing + ARMS.v.swordRest + ARMS.v.swordRecover + 0.05);
  check('a forehand left alone is back in the ready pose', vm.swordAnim.current === 'ready');
  vm.slash();
  check('then the next slash is a forehand', vm.swordAnim.current === 'forehand');
  play(1);

  // The hit lands on the click; hit-stop freezes the arm at contact, not at the start.
  vm.slash();
  play(0.2, true);
  const frozenAt = vm.swordAnim.path;
  check('hit-stop freezes the swing on contact (half-way), not before it', frozenAt > 0.45 && frozenAt < 0.65, `path ${frozenAt.toFixed(2)}`);
  play(0.02);
  check('then it carries on past the contact', vm.swordAnim.path > frozenAt + 0.1, `path ${vm.swordAnim.path.toFixed(2)}`);
}
