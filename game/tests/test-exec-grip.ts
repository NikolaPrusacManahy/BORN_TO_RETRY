// Update 0.1.1 — the hands in the snake execution (the designer: "the player's arms are doing that cross arms stance,
// let's make it accurate and make it grab the snake's tail"). Played by the real rules, drawn by the real view code
// (execView.ts, heldGrip.ts, the arms rig) with the real models, as tools/exec-shots.ts does: while you hold it, both
// fists sit on its tail on screen, the tail lies across each fist's curled fingers (never out through the back of the
// hand), leaning in the grip no more than a sword's blade does, and your arms never cross.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { DT, FlatWorld } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { posedBounds } from '../src/engine/bodyMeasure';
import { followHeld, gripOf, holdStill, placeHeld, stillOf } from '../src/engine/execView';
import { Look } from '../src/engine/look';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { execHeld, heldFor } from '../src/sim/combat/execution';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { verticalFov } from '../src/state/settings';
import { CAMERA } from '../src/tuning/camera';

const ASPECT = 16 / 9;
const load = (path: string) => {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
};

section('Execution — your hands on the snake’s tail');
{
  const armsGltf = await load('../public/models/arms/adventurer.glb');
  const rig = ArmsRig.fromScene(armsGltf.scene);
  const vm = new Viewmodel(false);
  vm.attach(rig);
  vm.setLens(ASPECT);
  const snake = await load('../public/models/enemies/snake.glb');
  const clip = (n: string) => snake.animations.find((a) => a.name.endsWith(n));
  const box = posedBounds(snake.scene, clip('Snake_Idle'), new THREE.Box3());
  const grip = gripOf('snake', snake.scene)!;
  snake.scene.userData.still = stillOf('snake', snake.scene);
  const scale = ENEMY_STATS.snake().height / (box.max.y - box.min.y);
  const mixer = new THREE.AnimationMixer(snake.scene);
  const thrash = mixer.clipAction(clip('Snake_Walk')!);
  thrash.timeScale = 3;
  thrash.play();
  const tip = snake.scene.getObjectByName('Tail3')!;
  const next = snake.scene.getObjectByName('Tail2')!;

  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  c.execution = 1;
  const s = spawnEnemy(c.enemies, 'snake', new THREE.Vector3(0, 0, -1.8), 0);
  const look = new Look();
  const cam = new THREE.PerspectiveCamera(verticalFov(100, ASPECT), ASPECT, 0.05, 100);
  const eye = new THREE.Vector3(0, CAMERA.v.eyeHeight, 0);
  // On screen, x in the same units as y.
  const screen = (v: THREE.Vector3, camera: THREE.Camera) => {
    v.project(camera);
    v.x *= ASPECT;
    v.z = 0;
    return v;
  };
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const at = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  const through = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  const rod = new THREE.Vector3();
  const wrist = new THREE.Vector3();
  const knuckle = new THREE.Vector3();
  const back = new THREE.Vector3();
  let worstOff = 0;
  let worstOut = 0;
  let worstLean = 0;
  let crossed = 0;
  let held = 0;
  for (let k = 0; k < Math.ceil(heldFor() / DT) + 2; k++) {
    const intent = emptyCombatIntent();
    intent.interactPressed = k === 0;
    stepCombat(c, p, intent, new FlatWorld(), DT);
    c.events.clear();
    c.hitStop.remaining = 0;
    const ex = c.exec;
    const e = c.enemies[s];
    cam.position.copy(eye);
    cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
    cam.updateMatrixWorld(true);
    if (ex.active && e.phase === 'held') placeHeld(snake.scene, ex, scale, grip, e.facing + Math.PI, box.min.y);
    mixer.update(DT);
    if (e.phase === 'held') holdStill(snake.scene);
    followHeld(ex, execHeld(ex), look, vm, cam, DT);
    vm.update(DT, DT, 0, 0, p, -1);
    // Once the hands have hold of it, until they let go.
    if (!execHeld(ex) || ex.t < 0.3) continue;
    held++;
    snake.scene.updateMatrixWorld(true);
    const t0 = screen(tip.getWorldPosition(a), cam).clone();
    const dir = screen(next.getWorldPosition(b), cam).sub(t0).normalize();
    // The tail's way, as the arms are drawn.
    rod.copy(vm.grip.along).transformDirection(vm.camera.matrixWorld);
    for (const side of ['L', 'R'] as const) {
      rig.gripNow(side, at[side], through[side]);
      rig.handFrame(side, wrist, knuckle, back);
      // Out of the fingers' plane (towards the back of the hand or the palm), and its lean in the grip.
      worstOut = Math.max(worstOut, THREE.MathUtils.radToDeg(Math.asin(Math.min(1, Math.abs(rod.dot(back.normalize()))))));
      worstLean = Math.max(worstLean, THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(rod.dot(through[side]))))));
      // How far the fist's grip is from the tail's line on screen.
      const rel = screen(at[side], vm.camera).sub(t0);
      worstOff = Math.max(worstOff, Math.abs(rel.x * dir.y - rel.y * dir.x));
    }
    const elbowL = screen(armsGltf.scene.getObjectByName('LowerArmL')!.getWorldPosition(a), vm.camera).x;
    const elbowR = screen(armsGltf.scene.getObjectByName('LowerArmR')!.getWorldPosition(b), vm.camera).x;
    if (at.L.x >= at.R.x || elbowL >= elbowR) crossed++;
  }
  check('you hold it for the whole of the moves', held > 100, `${held} frames`);
  check('both fists sit on its tail (on screen)', worstOff < 0.06, `${worstOff.toFixed(3)} off its line at worst`);
  check('it lies across each fist’s curled fingers', worstOut < 10, `${worstOut.toFixed(1)}° out of them at worst`);
  check('leaning in the grip no more than a sword does', worstLean < 60, `${worstLean.toFixed(0)}° at worst`);
  check('your arms never cross (left fist and elbow on the left)', crossed === 0, `${crossed} frames crossed`);
}
