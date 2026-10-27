// Update 0.0.7 — the settings screen's night camp (the shipped .glb, parsed here): every node the game uses, trees,
// bushes and logs standing on the forest floor (never floating), a clear clearing round the fire, the fire in sight
// on the left of the screen with the right side free for the panel, and a glide in that passes through nothing and
// ends sat on the log.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import type { AudioEngine } from '../src/audio/audio';
import { CAMP_GLIDE, CAMP_NODES, CAMP_VFOV, CampScene, readCampShot } from '../src/engine/menu/campScene';

const buf = readFileSync(new URL('../public/models/menu/camp.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
const root = gltf.scene;
root.updateMatrixWorld(true);
const fmt = (v: THREE.Vector3) => v.toArray().map((n) => n.toFixed(2)).join(', ');
const shot = readCampShot(root);
const fire = root.getObjectByName('Campfire')!.getWorldPosition(new THREE.Vector3());
const solids: THREE.Object3D[] = [];
root.traverse((o) => {
  if (o instanceof THREE.Mesh) solids.push(o);
});
const ray = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
const matName = (o: THREE.Object3D) => ((o as THREE.Mesh).material as THREE.Material).name;
const within = (o: THREE.Object3D, anc: THREE.Object3D) => {
  for (let a: THREE.Object3D | null = o; a; a = a.parent) if (a === anc) return true;
  return false;
};
/** What's straight below `p` (ignoring `skip`), or null. */
function below(p: THREE.Vector3, skip: THREE.Object3D) {
  ray.set(p, DOWN);
  ray.far = 50;
  return ray.intersectObjects(solids.filter((o) => !within(o, skip)), false)[0] ?? null;
}
/** The first thing on the straight line from `a` to `b`, or null. */
function between(a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  ray.set(a, d.clone().normalize());
  ray.far = d.length();
  return ray.intersectObjects(solids, false)[0] ?? null;
}

section('Camp — the scene');
{
  const missing = CAMP_NODES.filter((n) => !root.getObjectByName(n));
  check('the model has every node the camp uses', missing.length === 0, `missing ${missing.join(', ')}`);
  let fires = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && matName(o).startsWith('Fire')) fires++;
  });
  check('the campfire has its Fire material (it glows in the game)', fires >= 1);
  const things = root.children.filter((o) => /^(CommonTree|BirchTree|Bush|Log)/.test(o.name));
  const trees = things.filter((o) => /Tree/.test(o.name));
  const floating = things.filter((o) => {
    const hit = below(o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)), o);
    return !hit || !['ForestFloor', 'Dirt'].includes(matName(hit.object)) || hit.distance > 0.9;
  });
  check('every tree, bush and log stands on the forest floor', trees.length >= 20 && floating.length === 0, `${things.length} things; floating: ${floating.map((o) => o.name).join(', ')}`);
  const growing = root.children.filter((o) => /^(CommonTree|BirchTree|Bush)/.test(o.name));
  const crowded = growing.filter((o, i) => growing.some((q, j) => j !== i && Math.hypot(o.position.x - q.position.x, o.position.z - q.position.z) < 1.5));
  check('nothing grows into anything else (trees and bushes 1.5 m apart at least)', crowded.length === 0, crowded.map((o) => o.name).join(', '));
  const inClearing = trees.filter((t) => Math.hypot(t.position.x - fire.x, t.position.z - fire.z) < 5);
  check('no tree in the clearing round the fire', inClearing.length === 0, inClearing.map((t) => t.name).join(', '));
}

section('Camp — the shot');
{
  check('the camera sits at a seated height', shot.pos.y > 0.8 && shot.pos.y < 1.4, fmt(shot.pos));
  check('the glide starts further back than it ends', shot.from.distanceTo(fire) > shot.pos.distanceTo(fire) + 1);
  const hit = between(shot.pos, fire.clone().add(new THREE.Vector3(0, 0.3, 0)));
  check('the fire is in plain sight', !hit || matName(hit.object).startsWith('Fire') || hit.distance > shot.pos.distanceTo(fire) - 0.9, hit ? `${hit.object.name} in the way` : '');
  const glide = between(shot.from, shot.pos);
  check('the glide in passes through nothing', glide === null, glide ? `${glide.object.name} at ${glide.distance.toFixed(2)} m` : '');
  const cam = new THREE.PerspectiveCamera(CAMP_VFOV, 16 / 9, 0.05, 200);
  cam.position.copy(shot.pos);
  cam.lookAt(shot.look);
  cam.updateMatrixWorld(true);
  const f = fire.clone().project(cam);
  check('the fire is on the left of the screen, leaving the right for the panel', f.x > -0.85 && f.x < -0.15 && f.y > -0.85 && f.y < 0.2, `ndc ${f.x.toFixed(2)}, ${f.y.toFixed(2)}`);
}

section('Camp — the glide');
{
  // A silent stand-in for the sound engine (Node has no Web Audio).
  const audio = { ctx: null, sfx: null, noise: null, resume() {} } as unknown as AudioEngine;
  const camp = new CampScene(audio, false);
  camp.attach(root);
  camp.enter();
  camp.update(1 / 120);
  check('entering starts the camera back at the glide start', camp.camera.position.distanceTo(shot.from) < 0.3, fmt(camp.camera.position));
  for (let t = 0; t < CAMP_GLIDE + 0.1; t += 1 / 120) camp.update(1 / 120);
  check('and it ends sat on the log', camp.camera.position.distanceTo(shot.pos) < 0.05, fmt(camp.camera.position));
}
