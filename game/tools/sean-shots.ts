// Update 0.3.83 — Gravity Sean's arms as you see them, through the game's own viewmodel: each stance with its gravity (the pebbles, rings and arcs written out as plain meshes, so they show), and each open hand; prints every wrist.
//   npx tsx tools/sean-shots.ts <out folder>
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/pov.json --out <out folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SeanHand } from '../src/sim/combat/gravityMeter';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import type { GravityMode } from '../src/engine/viewmodel/gravityArms';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/sean-shots.ts <out folder>');
mkdirSync(out, { recursive: true });
const STEP = 1 / 120;

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const v = new THREE.Vector3();
const inst = new THREE.Matrix4();

function grab(scene: THREE.Object3D, cam: THREE.Camera): Mesh[] {
  scene.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const toCam = cam.matrixWorldInverse;
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return;
    const g = o.geometry as THREE.BufferGeometry;
    const col = (o.material as THREE.MeshStandardMaterial).color;
    const allIdx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const start = g.drawRange.start;
    const range = g.drawRange.count === Infinity ? allIdx.length : g.drawRange.count;
    const idx = allIdx.slice(start, start + range);
    if (idx.length === 0) return;
    const copies = o instanceof THREE.InstancedMesh ? o.count : 1;
    for (let c = 0; c < copies; c++) {
      const pos: number[] = [];
      for (let i = 0; i < g.attributes.position.count; i++) {
        if (o instanceof THREE.InstancedMesh) {
          v.fromBufferAttribute(g.attributes.position as THREE.BufferAttribute, i);
          o.getMatrixAt(c, inst);
          v.applyMatrix4(inst).applyMatrix4(o.matrixWorld);
        } else {
          o.getVertexPosition(i, v);
          v.applyMatrix4(o.matrixWorld);
        }
        v.applyMatrix4(toCam);
        pos.push(+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5));
      }
      meshes.push({ color: [col.r, col.g, col.b], pos, idx });
    }
  });
  return meshes;
}

const buf = readFileSync(new URL('../public/models/arms/spacesuit.glb', import.meta.url));
const parsed = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
const vm = new Viewmodel(false);
const rig = ArmsRig.fromScene(parsed.scene);
vm.attach(rig);
vm.setLens(16 / 9);
const p = createPlayer(0, 0, 0, 0);
p.grounded = true;
const play = (secs: number) => {
  for (let t = 0; t < secs; t += STEP) vm.update(STEP, STEP, 0, 0, p, -1);
  vm.scene.updateMatrixWorld(true);
};
const wrist = (side: 'L' | 'R') => {
  const a = rig.arms[side];
  const el = a.fore.bone.getWorldPosition(new THREE.Vector3());
  const wr = a.hand.bone.getWorldPosition(new THREE.Vector3());
  const kn = a.knuckle.getWorldPosition(new THREE.Vector3());
  return THREE.MathUtils.radToDeg(wr.clone().sub(el).normalize().angleTo(kn.clone().sub(wr).normalize())).toFixed(0);
};

const SHOTS: { name: string; mode: GravityMode; instab: number; hand: SeanHand }[] = [
  { name: 'normal', mode: 1, instab: 0, hand: 'none' },
  { name: 'unstable_low', mode: 2, instab: 0.1, hand: 'none' },
  { name: 'unstable_full', mode: 2, instab: 1, hand: 'none' },
  { name: 'reach', mode: 1, instab: 0, hand: 'reach' },
  { name: 'gather', mode: 1, instab: 0, hand: 'gather' },
  { name: 'raise', mode: 1, instab: 0, hand: 'raise' },
  { name: 'sky', mode: 2, instab: 0.4, hand: 'sky' },
];
const pov: { name: string; meshes: Mesh[] }[] = [];
for (const s of SHOTS) {
  vm.setGravity(s.mode, s.instab);
  vm.seanHands.set(s.hand);
  play(1.2);
  console.log(`${s.name}: wrists L ${wrist('L')}°, R ${wrist('R')}°`);
  pov.push({ name: s.name, meshes: grab(vm.scene, vm.camera) });
}
writeFileSync(join(out, 'pov.json'), JSON.stringify({ aspect: 16 / 9, fov: ARMS.v.fov, shots: pov }));
console.log(`wrote ${pov.length} views`);
