// Update 0.1.4 — a look at the Grimoire in your hands without a browser: the game's own arms (Viewmodel, bookArms.ts)
// hold the real book (grimoire.glb) at a few moments (held, the cast's thrust, the charge after one step, at the big
// charge and at the full one, its release), and
// the posed meshes, the book and the palm's flames (each a quad half its size, the soft speck's bright middle, in its
// colour) are written out for Blender
// (tools/blender/render_view.py). Shots are only as true as the code they run; the fire's glow needs the game.
//   npx tsx tools/book-shots.ts <out folder>
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';
import { WEAPONS } from '../src/tuning/weapons';
import { kiFull, kiMid } from '../src/sim/weapons/kiCharge';

const ASPECT = 16 / 9;
const STEP = 1 / 120;
const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/book-shots.ts <out folder>');
mkdirSync(out, { recursive: true });

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const v = new THREE.Vector3();
const m = new THREE.Matrix4();
const c = new THREE.Color();
const QUAD = [new THREE.Vector3(-0.25, -0.25, 0), new THREE.Vector3(0.25, -0.25, 0), new THREE.Vector3(0.25, 0.25, 0), new THREE.Vector3(-0.25, 0.25, 0)];

/** The arms' scene in its camera's space: meshes as they are, each flame a quad in its colour. */
function grab(vm: Viewmodel): Mesh[] {
  vm.scene.updateMatrixWorld(true);
  vm.camera.updateMatrixWorld(true);
  const toCam = vm.camera.matrixWorldInverse;
  const meshes: Mesh[] = [];
  vm.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return;
    if (o instanceof THREE.InstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        if (Math.abs(m.elements[0]) + Math.abs(m.elements[5]) < 1e-6) continue;
        o.getColorAt(i, c);
        if (c.r + c.g + c.b < 0.15) continue;
        const pos: number[] = [];
        for (const q of QUAD) {
          v.copy(q).applyMatrix4(m).applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
          pos.push(v.x, v.y, v.z);
        }
        meshes.push({ color: [Math.min(1, c.r), Math.min(1, c.g), Math.min(1, c.b)], pos, idx: [0, 1, 2, 0, 2, 3] });
      }
      return;
    }
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

const MOMENTS: { name: string; run: (vm: Viewmodel, p: ReturnType<typeof createPlayer>) => void }[] = [
  { name: 'book_held', run: () => {} },
  { name: 'book_cast_out', run: (vm, p) => (vm.book.cast(0), play(vm, p, 0.08)) },
  { name: 'book_cast_back', run: (vm, p) => (vm.book.cast(0), play(vm, p, 0.22)) },
  { name: 'book_charge_step', run: (vm, p) => charge(vm, p, WEAPONS.v.kiStep) },
  { name: 'book_charge_big', run: (vm, p) => charge(vm, p, kiMid()) },
  { name: 'book_charge_full', run: (vm, p) => charge(vm, p, kiFull()) },
  { name: 'book_release', run: (vm, p) => (charge(vm, p, kiFull()), (vm.book.ki = -1), vm.book.cast(kiFull()), play(vm, p, 0.08)) },
];

function play(vm: Viewmodel, p: ReturnType<typeof createPlayer>, secs: number) {
  for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, -1);
}

/** Right click held `secs` s (the ball's size follows the charge; the last half second shown). */
function charge(vm: Viewmodel, p: ReturnType<typeof createPlayer>, secs: number) {
  for (let t = 0; t < secs - 1e-9; t += STEP) {
    vm.book.ki = t;
    if (secs - t <= 0.6) vm.update(STEP, STEP, 0, 0, p, -1);
  }
}

const shots = [];
for (const moment of MOMENTS) {
  const arms = await load('../public/models/arms/adventurer.glb');
  const book = await load('../public/models/weapons/grimoire.glb');
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(ASPECT);
  const held = book.scene.clone();
  held.userData.hold = 'book';
  vm.setWeapon(held);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  // Settled with the book out (the flames already burning).
  play(vm, p, 1.2);
  moment.run(vm, p);
  shots.push({ name: moment.name, meshes: grab(vm) });
  console.log(`posed ${moment.name}  palm (${vm.book.palm.toArray().map((n) => n.toFixed(2)).join(', ')})`);
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')}`);
