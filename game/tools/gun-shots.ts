// Update 0.2.4 — the Pistol in the arms without a browser, as tools/view-shots.ts does for the swords: the game's own
// Viewmodel posed with the Pistol at moments (hip, aimed, a shot's kick, the reload's beats, a throw's wind-up), the
// posed meshes written out in the arms camera's space for Blender (tools/blender/render_view.py). It also says how hard
// the wrist bends and, aimed, where the sights are on screen (both should sit on the crosshair, 0, 0).
//   npx tsx tools/gun-shots.ts <out folder> [shot names]
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { createPlayer } from '../src/sim/player/state';
import { reloadTime } from '../src/sim/weapons/gun';
import { ARMS } from '../src/tuning/arms';
import { WEAPONS } from '../src/tuning/weapons';

const ASPECT = 16 / 9;
const DT = 1 / 60;

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

interface GunShot {
  name: string;
  run: (vm: Viewmodel, step: (n: number) => void) => void;
}

/** Into a reload `k` of the way (0 … 1), from empty or not, its beats played on the way. */
const reloading = (k: number, empty: boolean) => (vm: Viewmodel, step: (n: number) => void) => {
  const total = reloadTime(empty);
  vm.gun.sync(0, -1, false, empty ? 0 : 6);
  step(20);
  let t = 0;
  let out = false;
  while (t < k * total) {
    t += DT;
    vm.gun.sync(0, t, empty, t / total >= 0.56 ? 15 : empty ? 0 : 6);
    if (!out && t / total >= 0.16) {
      out = true;
      vm.gun.magOut();
    }
    step(1);
  }
};

const SHOTS: GunShot[] = [
  { name: 'hip', run: (vm, step) => (vm.gun.sync(0, -1, false, 15), step(30)) },
  { name: 'aimed', run: (vm, step) => (vm.gun.sync(1, -1, false, 15), step(40)) },
  { name: 'aimed-half', run: (vm, step) => (vm.gun.sync(0.5, -1, false, 15), step(40)) },
  {
    name: 'hip-kick',
    run: (vm, step) => {
      vm.gun.sync(0, -1, false, 15);
      step(30);
      vm.gun.shot(14);
      step(4);
    },
  },
  {
    name: 'hip-flash',
    run: (vm, step) => {
      vm.gun.sync(0, -1, false, 15);
      step(30);
      vm.gun.shot(14);
      step(1);
    },
  },
  {
    name: 'aimed-kick',
    run: (vm, step) => {
      vm.gun.sync(1, -1, false, 15);
      step(40);
      vm.gun.shot(14);
      step(4);
    },
  },
  {
    name: 'empty-locked',
    run: (vm, step) => {
      vm.gun.sync(0, -1, false, 1);
      step(30);
      vm.gun.shot(0);
      vm.gun.sync(0, -1, false, 0);
      step(12);
    },
  },
  { name: 'reload-show', run: reloading(0.2, true) },
  { name: 'reload-dip', run: reloading(0.36, true) },
  { name: 'reload-down', run: reloading(0.5, true) },
  { name: 'reload-up', run: reloading(0.76, true) },
  { name: 'reload-home', run: reloading(0.86, true) },
  { name: 'reload-tactical-up', run: reloading(0.74, false) },
  {
    name: 'throw',
    run: (vm, step) => {
      vm.gun.sync(0, -1, false, 15);
      step(20);
      vm.sword('throw');
      step(Math.round((WEAPONS.v.throwWindup * 0.7) / DT));
    },
  },
];

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/gun-shots.ts <out folder> [shot names…]');
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });
const v = new THREE.Vector3();
const shots = [];
for (const shot of SHOTS) {
  if (only.length && !only.includes(shot.name)) continue;
  const arms = await load('../public/models/arms/adventurer.glb');
  const gun = await load('../public/models/weapons/pistol.glb');
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(ASPECT);
  const model = gun.scene;
  model.userData.hold = 'gun';
  model.userData.kind = 'pistol';
  vm.setWeapon(model);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const step = (n: number) => {
    for (let i = 0; i < n; i++) vm.update(DT, DT, 0, 0, p, -1);
  };
  shot.run(vm, step);
  // (Its lens as the game draws it: narrower aimed.)
  vm.setLens(ASPECT);
  vm.scene.updateMatrixWorld(true);
  vm.camera.updateMatrixWorld(true);
  const toCam = vm.camera.matrixWorldInverse;
  const meshes: { color: number[]; pos: number[]; idx: number[] }[] = [];
  vm.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    let shown = true;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) shown &&= a.visible;
    if (!shown) return;
    const g = o.geometry as THREE.BufferGeometry;
    if (!g.attributes.position) return;
    const pos: number[] = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
      pos.push(+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5));
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const m = o.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
    const c = m.color ?? new THREE.Color(1, 1, 1);
    meshes.push({ color: [c.r, c.g, c.b], pos, idx });
  });
  shots.push({ name: shot.name, fov: vm.camera.fov, meshes });
  const at = (n: string) => arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
  const fore = at('HandR').sub(at('LowerArmR')).normalize();
  const hand = at('Middle2R').sub(at('HandR')).normalize();
  const bend = THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, fore.dot(hand)))));
  const mark = (n: string) => {
    const o = model.getObjectByName(n);
    if (!o) return '';
    const q = o.getWorldPosition(new THREE.Vector3()).project(vm.camera);
    return `${n} (${q.x.toFixed(3)}, ${q.y.toFixed(3)})`;
  };
  console.log(`posed ${shot.name.padEnd(20)} wrist bend ${bend.toFixed(0).padStart(3)}°  ${mark('RearSight')}  ${mark('FrontSight')}  ${mark('Muzzle')}`);
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')}`);
