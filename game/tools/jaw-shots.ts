// Update 0.3.16 — a look at the Big Shark's jaws holding you without a browser (sim/combat/jaws.ts; your hands:
// engine/exec/jawHands.ts): played by the real rules, the shark drawn by the real view code with its model, your hands on
// its jaws and the arms posed (as tests/fakes/execRig.ts does for executions), written out at its moments for Blender
// (tools/blender/render_view.py) as you see it, and from the side.
//   npx tsx tools/jaw-shots.ts <out folder>
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { armsModel } from '../tests/fakes/execRig';
import { parseUntextured } from '../tests/fakes/glb';
import { DT, FlatWorld } from '../tests/fakes/flatWorld';
import { OPEN_ARENA } from '../tests/fakes/enemyWorld';
import { EnemiesView } from '../src/engine/enemiesView';
import { followJaws } from '../src/engine/exec/jawHands';
import { Look } from '../src/engine/look';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { jawsEye, startJaws } from '../src/sim/combat/jaws';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { verticalFov } from '../src/state/settings';
import { ARMS } from '../src/tuning/arms';
import { BIG_SHARK } from '../src/tuning/bigShark';
import { CAMERA } from '../src/tuning/camera';

const ASPECT = 16 / 9;
const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/jaw-shots.ts <out folder>');
mkdirSync(out, { recursive: true });

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const shots: { name: string; meshes: Mesh[] }[] = [];
const v = new THREE.Vector3();

/** `scene`'s visible meshes in `camera`'s space, brought to the arms lens; the shark in `tint`. */
function grab(scene: THREE.Object3D, camera: THREE.PerspectiveCamera, skip: THREE.Object3D | null, tint: number[] | null, into: Mesh[]) {
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
      pos.push(+(v.x * k).toFixed(4), +(v.y * k).toFixed(4), +v.z.toFixed(4));
    }
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const col = (o.material as THREE.MeshStandardMaterial).color;
    into.push({ color: tint && o instanceof THREE.SkinnedMesh ? tint : [col.r, col.g, col.b], pos, idx });
  });
}

const arms = await armsModel();
const vm = new Viewmodel(false);
vm.attach(ArmsRig.fromScene(arms.scene));
vm.setLens(ASPECT);
const shark = await parseUntextured(new URL('../public/models/enemies/big_shark.glb', import.meta.url));
const scene = new THREE.Scene();
const view = new EnemiesView(scene as unknown as THREE.Scene, false);
view.attach('bigShark', shark.scene, shark.animations);
const c = createCombat(OPEN_ARENA);
c.tide = BIG_SHARK.v.floodTop;
const p = createPlayer(0, 2, 0, 0);
const slot = spawnEnemy(c.enemies, 'bigShark', new THREE.Vector3(0, 1.5, -6), 0);
startJaws(c, slot, p);
const look = new Look();
const cam = new THREE.PerspectiveCamera(verticalFov(100, ASPECT), ASPECT, 0.05, 100);
const side = new THREE.PerspectiveCamera(50, ASPECT, 0.05, 100);
const world = new FlatWorld();
const eye = new THREE.Vector3();
// Its moments: just caught; half way through your clicks; your punch to its throat.
const at = [0.15, 1.2, 1.25 + 0.12, 1.25 + 0.3];
let t = 0;
let next = 0;
let clicks = 0;
for (let i = 0; next < at.length && i < 2000; i++) {
  const intent = emptyCombatIntent();
  // Six clicks by 1.2 s, then the rest at once (the punch).
  const want = t < 1.2 ? Math.floor(t / 0.2) : Math.round(BIG_SHARK.v.holdHits);
  intent.attackPressed = clicks < want;
  if (intent.attackPressed) clicks++;
  stepCombat(c, p, intent, world, DT);
  c.events.clear();
  jawsEye(c, slot, eye);
  look.yaw = Math.atan2(-(eye.x - p.pos.x), -(eye.z - p.pos.z));
  look.pitch = Math.atan2(eye.y - p.pos.y - CAMERA.v.eyeHeight, Math.hypot(eye.x - p.pos.x, eye.z - p.pos.z));
  cam.position.set(p.pos.x, p.pos.y + CAMERA.v.eyeHeight, p.pos.z);
  cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  cam.updateMatrixWorld(true);
  view.update(c, 1, DT);
  vm.grip.weight = 0;
  followJaws(c, vm, cam, look.yaw, p.pos, (k) => view.rootOf(k));
  vm.update(DT, DT, 0, 0, p, -1);
  scene.updateMatrixWorld(true);
  t += DT;
  if (t + 1e-9 < at[next]) continue;
  const name = `jaws_${String(next).padStart(2, '0')}_${at[next].toFixed(2)}s`;
  const pov: Mesh[] = [];
  grab(scene, cam, null, [0.55, 0.65, 0.75], pov);
  vm.scene.updateMatrixWorld(true);
  grab(vm.scene, vm.camera, null, null, pov);
  shots.push({ name: `${name}_pov`, meshes: pov });
  side.position.set(p.pos.x + 7, p.pos.y + 2.5, p.pos.z - 2);
  side.lookAt(p.pos.x, p.pos.y + 1.5, p.pos.z - 2);
  const from: Mesh[] = [];
  grab(scene, side, null, [0.55, 0.65, 0.75], from);
  shots.push({ name: `${name}_side`, meshes: from });
  console.log(`${name}  grab ${c.grab.on ? 'on' : 'off'} hits ${c.grab.hits} fly ${c.grab.fly.toFixed(2)} shark ${c.enemies[slot].phase} hands ${vm.grip.weight}`);
  next++;
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')} (${shots.length} shots)`);
