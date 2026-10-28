// Update 0.1.1 — a look at the snake execution without a browser: the real rules play it (sim/combat/execution.ts) and
// the real view code places it (execView.ts: the body in your hands, the view following, the fists' grip). At a list of
// moments the posed meshes are written out for Blender (tools/blender/render_view.py), twice: as you see it (the world
// through the game camera, the arms through theirs, both brought to the arms camera's lens) and from the side (you a
// post, a floor of metre tiles). Shots are only as true as the code they run; feel still needs playing.
//   npx tsx tools/exec-shots.ts <out folder>
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { posedBounds } from '../src/engine/bodyMeasure';
import { followHeld, gripOf, holdStill, placeHeld, stillOf } from '../src/engine/execView';
import { Look } from '../src/engine/look';
import { createPlayer } from '../src/sim/player/state';
import { createCombat } from '../src/sim/combat/state';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { execHeld } from '../src/sim/combat/execution';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { verticalFov } from '../src/state/settings';
import { ARMS } from '../src/tuning/arms';
import { CAMERA } from '../src/tuning/camera';
import { DT, FlatWorld } from '../tests/fakes/flatWorld';
import { OPEN_ARENA } from '../tests/fakes/enemyWorld';

const ASPECT = 16 / 9;
/** The moments shown (s into the moves). */
const AT = [0.06, 0.14, 0.22, 0.38, 0.5, 0.68, 0.84, 1.0, 1.15, 1.3, 1.45, 1.75];

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/exec-shots.ts <out folder>');
mkdirSync(out, { recursive: true });

const armsGltf = await load('../public/models/arms/adventurer.glb');
const vm = new Viewmodel(false);
vm.attach(ArmsRig.fromScene(armsGltf.scene));
vm.setLens(ASPECT);
const snake = await load('../public/models/enemies/snake.glb');
const clip = (n: string) => snake.animations.find((a) => a.name === n || a.name.endsWith(`|${n}`));
const box = posedBounds(snake.scene, clip('Snake_Idle'), new THREE.Box3());
const grip = gripOf('snake', snake.scene)!;
snake.scene.userData.still = stillOf('snake', snake.scene);
const scale = ENEMY_STATS.snake().height / (box.max.y - box.min.y);
const world = new THREE.Scene();
world.add(snake.scene);
const mixer = new THREE.AnimationMixer(snake.scene);
const thrash = mixer.clipAction(clip('Snake_Walk')!);
thrash.timeScale = 3;
thrash.play();
// A floor of metre tiles, and you (a post) for the side view.
const floor = new THREE.Group();
for (let x = -4; x <= 4; x++)
  for (let z = -12; z <= 3; z++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: (x + z) & 1 ? 0x3a3a40 : 0x52525a }));
    m.position.set(x, 0, z);
    floor.add(m);
  }
world.add(floor);
const you = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.3).translate(0, 0.9, 0), new THREE.MeshStandardMaterial({ color: 0x3060c0 }));
world.add(you);

const c = createCombat(OPEN_ARENA);
const p = createPlayer(0, 0, 0, 0);
p.grounded = true;
c.execution = 1;
const s = spawnEnemy(c.enemies, 'snake', new THREE.Vector3(0, 0, -1.8), 0);
const look = new Look();
const cam = new THREE.PerspectiveCamera(verticalFov(100, ASPECT), ASPECT, 0.05, 100);
const side = new THREE.PerspectiveCamera(50, ASPECT, 0.05, 100);
side.position.set(7, 1.6, -3);
side.lookAt(0, 1, -3);
const eye = new THREE.Vector3(0, CAMERA.v.eyeHeight, 0);
const v = new THREE.Vector3();
const shots: { name: string; meshes: { color: number[]; pos: number[]; idx: number[] }[] }[] = [];

/** `scene`'s visible meshes in `camera`'s space, brought to the arms lens (x, y scaled; depth kept). */
function grab(scene: THREE.Object3D, camera: THREE.PerspectiveCamera, skip: THREE.Object3D | null, into: { color: number[]; pos: number[]; idx: number[] }[]) {
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const k = Math.tan((ARMS.v.fov * Math.PI) / 360) / Math.tan((camera.fov * Math.PI) / 360);
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o === skip) return;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pos: number[] = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      pos.push(+(v.x * k).toFixed(5), +(v.y * k).toFixed(5), +v.z.toFixed(5));
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const col = (o.material as THREE.MeshStandardMaterial).color;
    into.push({ color: [col.r, col.g, col.b], pos, idx });
  });
}

let next = 0;
let pressed = false;
for (let k = 0; next < AT.length && k < 2000; k++) {
  const intent = emptyCombatIntent();
  intent.interactPressed = !pressed;
  pressed = true;
  stepCombat(c, p, intent, new FlatWorld(), DT);
  c.events.clear();
  c.hitStop.remaining = 0;
  const ex = c.exec;
  const e = c.enemies[s];
  // As run.ts and enemiesView.ts do it, each frame: the camera, the body, then the hands.
  cam.position.copy(eye);
  cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  cam.updateMatrixWorld(true);
  if (ex.active && e.phase === 'held') placeHeld(snake.scene, ex, scale, grip, e.facing + Math.PI, box.min.y);
  else {
    snake.scene.quaternion.identity();
    snake.scene.scale.setScalar(scale);
    snake.scene.position.copy(e.pos).setY(e.pos.y - box.min.y * scale);
    snake.scene.rotation.set(0, e.facing + Math.PI, 0);
  }
  mixer.update(DT);
  if (e.phase === 'held') holdStill(snake.scene);
  followHeld(ex, execHeld(ex), look, vm, cam, DT);
  vm.update(DT, DT, 0, 0, p, -1);
  if (ex.t + 1e-9 < AT[next] && ex.active) continue;
  const name = `exec_${String(next).padStart(2, '0')}_${AT[next].toFixed(2)}s`;
  const pov: (typeof shots)[number]['meshes'] = [];
  grab(world, cam, you, pov);
  vm.scene.updateMatrixWorld(true);
  grab(vm.scene, vm.camera, null, pov);
  shots.push({ name: `${name}_pov`, meshes: pov });
  const from: (typeof shots)[number]['meshes'] = [];
  grab(world, side, null, from);
  shots.push({ name: `${name}_side`, meshes: from });
  console.log(`${name}  grip (${ex.grip.x.toFixed(2)}, ${ex.grip.y.toFixed(2)}, ${ex.grip.z.toFixed(2)})  middle y ${ex.middle.y.toFixed(2)}  view yaw ${THREE.MathUtils.radToDeg(look.yaw).toFixed(0)}° pitch ${THREE.MathUtils.radToDeg(look.pitch).toFixed(0)}°  fists ${vm.chest.weight.toFixed(2)}  ${e.phase}`);
  next++;
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')}`);
