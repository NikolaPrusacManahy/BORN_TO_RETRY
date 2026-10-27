// Update 0.0.8 — the character select: the roster (only Joseph playable), and the prison corridor (the shipped .glb,
// parsed here): every node the game uses, each character standing on the floor in its own cell clear of its bars,
// raised bars hidden in the wall, an open cell showing its character, a glide in that passes through nothing, and
// the select itself (Joseph's bars lift, a locked cell stays shut and rattles, the camera follows).
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import type { AudioEngine } from '../src/audio/audio';
import { PRISON, PRISON_NODES, PrisonScene } from '../src/engine/menu/prisonScene';
import { ROSTER, stepCell } from '../src/sim/characters';

section('Characters — the roster');
{
  check('four characters, in the designer’s order', ROSTER.map((c) => c.name).join(', ') === 'Joseph, Fallen King, William Rich, Alpha Team');
  check('only Joseph (the Adventurer) is playable', ROSTER.filter((c) => c.available).map((c) => c.id).join() === 'adventurer');
  check('Joseph: fists only, picks up used weapons', /fists only/i.test(ROSTER[0].kit) && /used weapons/i.test(ROSTER[0].kit));
  check('ids are all different', new Set(ROSTER.map((c) => c.id)).size === ROSTER.length);
  check('stepping stops at the ends of the corridor', stepCell(0, -1) === 0 && stepCell(0, 1) === 1 && stepCell(ROSTER.length - 1, 1) === ROSTER.length - 1);
}

const buf = readFileSync(new URL('../public/models/menu/prison.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
const root = gltf.scene;
root.updateMatrixWorld(true);
const at = (name: string) => root.getObjectByName(name)!.getWorldPosition(new THREE.Vector3());
const box = (name: string) => new THREE.Box3().setFromObject(root.getObjectByName(name)!);
const solids: THREE.Object3D[] = [];
root.traverse((o) => {
  if (o instanceof THREE.Mesh) solids.push(o);
});
const ray = new THREE.Raycaster();
const within = (o: THREE.Object3D, anc: THREE.Object3D) => {
  for (let a: THREE.Object3D | null = o; a; a = a.parent) if (a === anc) return true;
  return false;
};
/** The first thing on the straight line from `a` to `b` (ignoring anything inside `skip`), or null. */
function between(a: THREE.Vector3, b: THREE.Vector3, skip: THREE.Object3D[] = []) {
  const d = b.clone().sub(a);
  ray.set(a, d.clone().normalize());
  ray.far = d.length();
  return ray.intersectObjects(solids.filter((o) => !skip.some((s) => within(o, s))), false)[0] ?? null;
}

section('Characters — the prison corridor');
{
  const missing = PRISON_NODES.filter((n) => !root.getObjectByName(n));
  check('the model has every node the select screen uses', missing.length === 0, `missing ${missing.join(', ')}`);
  for (const c of ROSTER) {
    const body = root.getObjectByName(`Char_${c.id}`)!;
    const feet = at(`Char_${c.id}`);
    ray.set(feet.clone().add(new THREE.Vector3(0, 0.5, 0)), new THREE.Vector3(0, -1, 0));
    ray.far = 2;
    const floor = ray.intersectObjects(solids.filter((o) => !within(o, body)), false)[0];
    const b = box(`Char_${c.id}`);
    const bars = box(`Door_${c.id}`);
    const height = b.max.y - b.min.y;
    check(`${c.name} stands on the floor, a person's height, clear of the bars`, !!floor && floor.distance > 0.4 && floor.distance < 0.6 && height > 1.5 && height < 2.6 && !b.intersectsBox(bars), `floor ${floor?.distance.toFixed(2)}, height ${height.toFixed(2)}`);
  }
  // The wall over the arches: the raised bars must stay inside it.
  let wallTop = -Infinity;
  const door = box(`Door_${ROSTER[0].id}`);
  for (const o of solids) {
    if (within(o, root.getObjectByName(`Door_${ROSTER[0].id}`)!)) continue;
    const w = new THREE.Box3().setFromObject(o);
    if (w.min.x <= door.min.x && w.max.x >= door.min.x && w.min.z <= door.min.z && w.max.z >= door.max.z && w.min.y > door.max.y - 1) wallTop = Math.max(wallTop, w.max.y);
  }
  check('raised, a cell’s bars stay hidden in the wall above the arch', door.max.y + PRISON.doorLift <= wallTop + 1e-6, `bar tops ${(door.max.y + PRISON.doorLift).toFixed(2)} m, wall top ${wallTop.toFixed(2)} m`);
  const from = at('Cam_Prison_From');
  const blocked = ROSTER.filter((c) => between(from, at(`Cam_${c.id}`)) !== null);
  check('the glide in reaches every cell’s camera through nothing', blocked.length === 0, blocked.map((c) => c.id).join(', '));
  const shut = between(at(`Cam_${ROSTER[1].id}`), at(`Look_${ROSTER[1].id}`));
  check('a shut cell is seen through its bars', !!shut && within(shut.object, root.getObjectByName(`Door_${ROSTER[1].id}`)!));
}

section('Characters — the select');
{
  // A silent stand-in for the sound engine (Node has no Web Audio).
  const audio = { ctx: null, sfx: null, noise: null, resume() {} } as unknown as AudioEngine;
  const prison = new PrisonScene(audio, false);
  prison.attach(root);
  prison.enter(0);
  for (let t = 0; t < PRISON.glide + 1.5; t += 1 / 120) prison.update(1 / 120);
  root.updateMatrixWorld(true);
  const cam = prison.camera.position;
  check('after the glide in, the camera faces Joseph’s cell', cam.distanceTo(at(`Cam_${ROSTER[0].id}`)) < 0.05);
  check('Joseph’s bars are up', prison.doorLift(0) > PRISON.doorLift * 0.95);
  const open = between(cam, at(`Look_${ROSTER[0].id}`), []);
  check('and nothing stands between the camera and Joseph', !!open && within(open.object, root.getObjectByName(`Char_${ROSTER[0].id}`)!), open ? open.object.name : 'nothing hit');
  prison.select(1);
  for (let t = 0; t < 1.5; t += 1 / 120) prison.update(1 / 120);
  check('selecting a locked character: their bars stay shut, Joseph’s come down', prison.doorLift(1) < 0.01 && prison.doorLift(0) < 0.05);
  check('and the camera follows to their cell', prison.camera.position.distanceTo(at(`Cam_${ROSTER[1].id}`)) < 0.05);
}
