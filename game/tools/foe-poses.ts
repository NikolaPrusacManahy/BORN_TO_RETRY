// Update 0.5.4 — a baked enemy posed through its clips, without a browser (floor 10's Imp, Puglin and bone warriors: tools/ual_bake.py): each clip's moments side by side in a strip, seen from its front
// and a little to its side (meshes in the camera's space, its texture's UVs kept, for tools/blender/render_view.py --image), and where its weapon reaches furthest out in front of its hips through each
// clip (the moments its blows land, a share of the clip: for the sim's clip table) and how far (m, at the model's own size).
//   npx tsx tools/foe-poses.ts <out folder> <model name in public/models/enemies> [clip …]
//   blender --background --python tools/blender/render_view.py -- --json <out>/poses.json --out <out> --image <its base colour .png>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { parseUntextured } from '../tests/fakes/glb';

const [out, model, ...only] = process.argv.slice(2);
if (!out || !model) throw new Error('usage: npx tsx tools/foe-poses.ts <out folder> <model> [clip …]');
mkdirSync(out, { recursive: true });
/** Moments shown a clip; moments measured a clip; the strip's step between them (m, times its height). */
const SHOWN = 7;
const SAMPLES = 90;
const WEAPON = /Mace|Stick|Axe|Sword|Club/;

const gltf = await parseUntextured(new URL(`../public/models/enemies/${model}.glb`, import.meta.url));
const root = gltf.scene;
root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(root);
const height = box.max.y - box.min.y;
const hips = root.getObjectByName('pelvis') ?? root;
const mixer = new THREE.AnimationMixer(root);
const v = new THREE.Vector3();
const hip = new THREE.Vector3();
const skinned: THREE.SkinnedMesh[] = [];
root.traverse((o) => {
  if (o instanceof THREE.SkinnedMesh) skinned.push(o);
});
const weapon = skinned.find((m) => WEAPON.test(m.name));

/** Its forward (glTF): +z. How far its weapon's furthest point is in front of its hips now. */
function reach(): number {
  if (!weapon) return 0;
  hips.getWorldPosition(hip);
  const pos = weapon.geometry.attributes.position;
  let best = -Infinity;
  for (let i = 0; i < pos.count; i += 3) {
    weapon.getVertexPosition(i, v);
    v.applyMatrix4(weapon.matrixWorld);
    best = Math.max(best, v.z - hip.z);
  }
  return best;
}

type Mesh = { color: number[]; pos: number[]; idx: number[]; uv?: number[] };
const shots: { name: string; meshes: Mesh[] }[] = [];
const lands: Record<string, { len: number; peaks: number[]; reach: number }> = {};
const cam = new THREE.PerspectiveCamera(30, 3.2, 0.01, 200);
for (const clip of gltf.animations) {
  if (only.length && !only.includes(clip.name)) continue;
  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.reset().play();
  // Where it reaches, through the clip: the peaks of its weapon's reach, from a still start.
  const curve: number[] = [];
  for (let k = 0; k < SAMPLES; k++) {
    mixer.setTime((clip.duration * k) / (SAMPLES - 1));
    root.updateMatrixWorld(true);
    curve.push(reach());
  }
  const rest = curve[0];
  const top = Math.max(...curve);
  const peaks: number[] = [];
  for (let k = 1; k < SAMPLES - 1; k++) {
    if (curve[k] >= curve[k - 1] && curve[k] > curve[k + 1] && curve[k] > rest + (top - rest) * 0.55) peaks.push(+(k / (SAMPLES - 1)).toFixed(2));
  }
  lands[clip.name] = { len: +clip.duration.toFixed(2), peaks, reach: +top.toFixed(2) };
  // Its moments side by side, seen from in front and a little to its right.
  const meshes: Mesh[] = [];
  const step = height * 1.25;
  cam.position.set(((SHOWN - 1) * step) / 2 + height * 0.6, height * 0.7, height * 5.4);
  cam.lookAt(((SHOWN - 1) * step) / 2, height * 0.5, 0);
  cam.updateMatrixWorld(true);
  for (let k = 0; k < SHOWN; k++) {
    mixer.setTime((clip.duration * k) / (SHOWN - 1));
    root.updateMatrixWorld(true);
    for (const m of skinned) {
      const g = m.geometry;
      const pos: number[] = [];
      for (let i = 0; i < g.attributes.position.count; i++) {
        m.getVertexPosition(i, v);
        v.applyMatrix4(m.matrixWorld);
        v.x += k * step;
        v.applyMatrix4(cam.matrixWorldInverse);
        pos.push(+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4));
      }
      const uv = g.attributes.uv ? Array.from(g.attributes.uv.array as ArrayLike<number>).map((n) => +n.toFixed(4)) : undefined;
      meshes.push({ color: m === weapon ? [0.8, 0.55, 0.3] : [0.75, 0.75, 0.78], pos, idx: Array.from(g.index!.array), uv });
    }
  }
  shots.push({ name: `${model}_${clip.name}`, meshes });
}
writeFileSync(join(out, 'poses.json'), JSON.stringify({ aspect: 3.2, fov: 30, shots }));
writeFileSync(join(out, 'lands.json'), JSON.stringify({ model, height: +height.toFixed(2), weapon: weapon?.name ?? null, lands }, null, 1));
console.log(`${model}: ${height.toFixed(2)} m, weapon ${weapon?.name ?? 'none'}`);
for (const [name, l] of Object.entries(lands)) console.log(`  ${name.padEnd(22)} ${l.len.toFixed(2)} s  lands ${l.peaks.join(', ') || '-'}  reach ${l.reach}`);
