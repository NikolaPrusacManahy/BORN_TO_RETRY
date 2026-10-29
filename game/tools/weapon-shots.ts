// Update 0.1.5 — a look at a held weapon's own moves without a browser (the Gold Axe's, the Hammer's, the sword's): the
// game's own arms (Viewmodel, weaponMoves.ts) hold the real model at a few moments (ready, a swing's wind, contact and
// end, the charge, the charged blow, a throw's draw), and the posed meshes are written out for Blender
// (tools/blender/render_view.py). Shots are only as true as the code they run; the motion needs the game.
//   npx tsx tools/weapon-shots.ts <goldAxe|hammer|sword> <out folder>
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { WEAPON_URL } from '../src/engine/weaponsView';
import type { WeaponKind } from '../src/sim/weapons/catalog';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';
import { WEAPONS } from '../src/tuning/weapons';

const ASPECT = 16 / 9;
const STEP = 1 / 120;
const kind = process.argv[2] as WeaponKind;
const out = process.argv[3];
if (!kind || !out) throw new Error('usage: npx tsx tools/weapon-shots.ts <kind> <out folder>');
mkdirSync(out, { recursive: true });

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const v = new THREE.Vector3();

/** The arms' scene in its camera's space. */
function grab(vm: Viewmodel): Mesh[] {
  vm.scene.updateMatrixWorld(true);
  vm.camera.updateMatrixWorld(true);
  const toCam = vm.camera.matrixWorldInverse;
  const meshes: Mesh[] = [];
  vm.scene.traverse((o) => {
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

type P = ReturnType<typeof createPlayer>;
function play(vm: Viewmodel, p: P, secs: number, charge = -1) {
  for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, charge);
}
/** Into a swing until its path is `k` of the way (the swing eases out: 1 − (1 − x)³). */
const swingTo = (k: number) => (vm: Viewmodel, p: P) => (vm.slash(), play(vm, p, vm.swordAnim.moves.swing() * (1 - Math.cbrt(1 - k))));

const MOMENTS: { name: string; run: (vm: Viewmodel, p: P) => void }[] = [
  { name: 'ready', run: () => {} },
  { name: 'swing_wind', run: swingTo(0.25) },
  { name: 'swing_contact', run: swingTo(0.5) },
  { name: 'swing_end', run: swingTo(1) },
  { name: 'charged', run: (vm, p) => play(vm, p, 0.6, 1) },
  { name: 'blow', run: (vm, p) => (play(vm, p, 0.6, 1), vm.sword('pierce'), play(vm, p, vm.swordAnim.moves.out())) },
  { name: 'throw_draw', run: (vm, p) => (vm.sword('throw'), play(vm, p, WEAPONS.v.throwWindup * 0.6)) },
];

const shots = [];
for (const moment of MOMENTS) {
  const arms = await load('../public/models/arms/adventurer.glb');
  const weapon = await load(`../public${WEAPON_URL[kind]}`);
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(ASPECT);
  const held = weapon.scene.clone();
  held.userData.kind = kind;
  vm.setWeapon(held);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  play(vm, p, 1.2);
  moment.run(vm, p);
  shots.push({ name: `${kind}_${moment.name}`, meshes: grab(vm) });
  console.log(`posed ${kind}_${moment.name}`);
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')}`);
