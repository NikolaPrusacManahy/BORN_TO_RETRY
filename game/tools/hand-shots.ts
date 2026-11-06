// Update 0.1.6 — close-ups of the hands as the game poses them (handPose.ts), to judge the fist like a photo: the right
// fist from the front, the palm side, the thumb side and above, the guard as you see it, and the fist round each
// weapon's grip; and pov.json: the fists and weapons as you see them (the guard, each jab at full stretch, a charge, the
// charged punch, each weapon ready). Meshes are written out in each shot's own camera for Blender
// (tools/blender/render_view.py; render pov.json the same way).
// Update 0.1.9 — the Dual Daggers: a dagger in each fist, both grips up close.
//   npx tsx tools/hand-shots.ts <out folder>   (ARMS=spacesuit: another character's arms)
//   VARIANTS="name:x,y,z,x,y,z;…" npx tsx tools/hand-shots.ts <out folder>   (the fist's thumb tried each way: front and
//   palm views of each, to pick one)
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { MOVES } from '../src/engine/viewmodel/weaponMoves';
import type { Side } from '../src/engine/viewmodel/guard';
import { WEAPON_URL } from '../src/engine/weaponsView';
import type { WeaponKind } from '../src/sim/weapons/catalog';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';
import { PUNCH } from '../src/engine/viewmodel/handPose';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/hand-shots.ts <out folder>');
mkdirSync(out, { recursive: true });
const STEP = 1 / 120;
/** Close-ups: a narrow lens, square. */
const FOV = 32;

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const v = new THREE.Vector3();

/** The scene's meshes in `cam`'s space. */
function grab(scene: THREE.Object3D, cam: THREE.Camera): Mesh[] {
  scene.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const toCam = cam.matrixWorldInverse;
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pos: number[] = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
      pos.push(+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5));
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const col = (o.material as THREE.MeshStandardMaterial).color;
    meshes.push({ color: [col.r, col.g, col.b], pos, idx });
  });
  return meshes;
}

/** The arms in the guard (holding `kind` if given), settled. */
async function arms(kind?: WeaponKind) {
  const a = await load(`../public/models/arms/${process.env.ARMS ?? 'adventurer'}.glb`);
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(a.scene);
  vm.attach(rig);
  vm.setLens(1);
  if (kind) {
    const w = await load(`../public${WEAPON_URL[kind]}`);
    const held = w.scene.clone();
    held.userData.kind = kind;
    if (MOVES[kind].pair) held.userData.pair = w.scene.clone();
    vm.setWeapon(held);
  }
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  for (let t = 0; t < 1.2; t += STEP) vm.update(STEP, STEP, 0, 0, p, -1);
  vm.scene.updateMatrixWorld(true);
  return { vm, rig, scene: a.scene };
}

const wrist = new THREE.Vector3();
const knuckle = new THREE.Vector3();
const back = new THREE.Vector3();
const fwd = new THREE.Vector3();
const side = new THREE.Vector3();
const at = new THREE.Vector3();

/** A camera `dist` m from a fist's middle (the right's, or `hand`), along `dir` (built from its forward, back and
 *  index-side ways). */
function look(vm: Viewmodel, rig: ArmsRig, scene: THREE.Object3D, how: (f: THREE.Vector3, b: THREE.Vector3, s: THREE.Vector3) => THREE.Vector3, dist = 0.32, hand: Side = 'R') {
  rig.handFrame(hand, wrist, knuckle, back);
  fwd.subVectors(knuckle, wrist).normalize();
  scene.getObjectByName(`Index2${hand}`)!.getWorldPosition(side);
  side.sub(scene.getObjectByName(`Pinky2${hand}`)!.getWorldPosition(v)).normalize();
  at.copy(wrist).lerp(knuckle, 0.75).addScaledVector(back, -0.02);
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.01, 5);
  vm.scene.add(cam);
  cam.position.copy(at).addScaledVector(how(fwd.clone(), back.clone(), side.clone()).normalize(), dist);
  cam.up.copy(back);
  cam.lookAt(at);
  const meshes = grab(vm.scene, cam);
  vm.scene.remove(cam);
  return meshes;
}

const shots: { name: string; meshes: Mesh[] }[] = [];
const variants = (process.env.VARIANTS ?? '').split(';').filter(Boolean);
for (const variant of variants) {
  const [name, nums] = variant.split(':');
  nums.split(',').map(Number).forEach((n, i) => (PUNCH.thumb[i] = n));
  const { vm, rig, scene } = await arms();
  shots.push({ name: `v_${name}_front`, meshes: look(vm, rig, scene, (f, b, s) => f.addScaledVector(s, 0.35).addScaledVector(b, -0.3)) });
  shots.push({ name: `v_${name}_palm`, meshes: look(vm, rig, scene, (f, b, s) => f.multiplyScalar(0.6).addScaledVector(b, -1).addScaledVector(s, 0.2)) });
}
if (variants.length) {
  writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: 1, fov: FOV, shots }));
  console.log(`wrote ${shots.length} variant shots`);
  process.exit(0);
}
{
  const { vm, rig, scene } = await arms();
  shots.push({ name: 'fist_front', meshes: look(vm, rig, scene, (f, b, s) => f.addScaledVector(s, 0.35).addScaledVector(b, -0.3)) });
  shots.push({ name: 'fist_palm', meshes: look(vm, rig, scene, (f, b, s) => f.multiplyScalar(0.6).addScaledVector(b, -1).addScaledVector(s, 0.2)) });
  shots.push({ name: 'fist_thumb', meshes: look(vm, rig, scene, (f, b, s) => s.addScaledVector(f, 0.25).addScaledVector(b, 0.1)) });
  shots.push({ name: 'fist_back', meshes: look(vm, rig, scene, (f, b, s) => b.addScaledVector(f, 0.3).addScaledVector(s, 0.2)) });
  vm.camera.updateMatrixWorld(true);
  shots.push({ name: 'guard', meshes: grab(vm.scene, vm.camera) });
}
for (const kind of ['sword', 'goldAxe', 'hammer', 'daggers'] as const) {
  const { vm, rig, scene } = await arms(kind);
  shots.push({ name: `grip_${kind}_thumb`, meshes: look(vm, rig, scene, (f, b, s) => s.addScaledVector(f, 0.3).addScaledVector(b, 0.2), 0.36) });
  shots.push({ name: `grip_${kind}_palm`, meshes: look(vm, rig, scene, (f, b, s) => f.multiplyScalar(0.4).addScaledVector(b, -1).addScaledVector(s, -0.4), 0.36) });
  if (!MOVES[kind].pair) continue;
  shots.push({ name: `grip_${kind}_left_thumb`, meshes: look(vm, rig, scene, (f, b, s) => s.addScaledVector(f, 0.3).addScaledVector(b, 0.2), 0.36, 'L') });
  shots.push({ name: `grip_${kind}_left_palm`, meshes: look(vm, rig, scene, (f, b, s) => f.multiplyScalar(0.4).addScaledVector(b, -1).addScaledVector(s, -0.4), 0.36, 'L') });
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: 1, fov: FOV, shots }));

// As you see them: the arms camera at 16:9.
const pov: { name: string; meshes: Mesh[] }[] = [];
const P = createPlayer(0, 0, 0, 0);
P.grounded = true;
const play = (vm: Viewmodel, secs: number, charge = -1) => {
  for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, P, charge);
};
const seen = (vm: Viewmodel) => (vm.setLens(16 / 9), vm.scene.updateMatrixWorld(true), vm.camera.updateMatrixWorld(true), grab(vm.scene, vm.camera));
const MOMENTS: [string, (vm: Viewmodel) => void][] = [
  ['guard', () => {}],
  ['jab_left', (vm) => (vm.punch('L', 'jab'), play(vm, ARMS.v.punchOut))],
  ['jab_right', (vm) => (vm.punch('R', 'jab'), play(vm, ARMS.v.punchOut))],
  ['charging', (vm) => play(vm, 0.6, 1)],
  ['charged_punch', (vm) => (play(vm, 0.6, 1), vm.punch('R', 'heavy'), play(vm, ARMS.v.punchOut * 1.3))],
  // Update 0.1.7 — the ground slam's clasped fists: dropping, and the moment it lands.
  ['slam_drop', (vm) => (vm.slam.start(), play(vm, 0.3))],
  ['slam_land', (vm) => (vm.slam.start(), play(vm, 0.3), vm.slam.land(), play(vm, ARMS.v.slamDown + ARMS.v.slamHold * 0.5))],
];
for (const [name, run] of MOMENTS) {
  const { vm } = await arms();
  run(vm);
  pov.push({ name: `pov_${name}`, meshes: seen(vm) });
}
for (const kind of ['sword', 'goldAxe', 'hammer', 'daggers'] as const) {
  const { vm } = await arms(kind);
  pov.push({ name: `pov_${kind}`, meshes: seen(vm) });
}
writeFileSync(join(out, 'pov.json'), JSON.stringify({ aspect: 16 / 9, fov: ARMS.v.fov, shots: pov }));
console.log(`wrote ${shots.length} close-ups and ${pov.length} views`);
