// M2 — a look at the first-person arms without a browser: the game's own Viewmodel (the real models) is posed for a
// list of moments, the posed meshes are written out in the arms camera's space, and Blender draws them
// (tools/blender/render_view.py). Shots are only as true as the code they run; feel still needs playing.
//   npx tsx tools/view-shots.ts <out folder> [shot names, or a prefix ending in *]
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';
import { FILMS, SHOTS } from './view-shots-list';

const ASPECT = 16 / 9;

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/view-shots.ts <out folder> [shot names…]');
const only = process.argv.slice(3);
const picked = (name: string) => !only.length || only.some((o) => (o.endsWith('*') ? name.startsWith(o.slice(0, -1)) : name === o));
mkdirSync(out, { recursive: true });

const v = new THREE.Vector3();
const shots = [];
for (const shot of [...SHOTS, ...FILMS]) {
  if (!picked(shot.name)) continue;
  // A fresh model per shot, so one shot's pose never leaks into the next.
  const arms = await load('../public/models/arms/adventurer.glb');
  const sword = await load('../public/models/weapons/sword.glb');
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(ASPECT);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const tipY = new THREE.Box3().setFromObject(sword.scene).max.y;
  shot.run(vm, sword.scene, p);
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
    const pos: number[] = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
      pos.push(+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5));
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const c = (o.material as THREE.MeshStandardMaterial).color;
    meshes.push({ color: [c.r, c.g, c.b], pos, idx });
  });
  shots.push({ name: shot.name, meshes });
  // How hard the right wrist bends (forearm line to the hand's), and where the sword's tip lands on screen.
  const at = (n: string) => arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
  const fore = at('HandR').sub(at('LowerArmR')).normalize();
  const hand = at('Middle2R').sub(at('HandR')).normalize();
  const bend = THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, fore.dot(hand)))));
  const tip = new THREE.Vector3(0, tipY, 0);
  const onScreen = vm.heldWeapon ? tip.applyMatrix4(vm.heldWeapon.matrixWorld).project(vm.camera) : null;
  const elbow = at('LowerArmR').project(vm.camera);
  const wrist = at('HandR').project(vm.camera);
  const xy = (q: THREE.Vector3) => `(${q.x.toFixed(2)}, ${q.y.toFixed(2)})`;
  console.log(`posed ${shot.name.padEnd(20)} wrist bend ${bend.toFixed(0).padStart(3)}°  elbow ${xy(elbow)}  wrist ${xy(wrist)}${onScreen ? `  tip ${xy(onScreen)}` : ''}`);
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')}`);
