// Update 0.0.4 — the main menu: the gate scene (the shipped .glb, parsed here) has every node the code needs, the
// menu shot frames the gate low with sky left for the logo, and Start raises the portcullis (out of the doorway,
// never out of the wall's top) before the fade to black, then leaves the gate shut again for next time.
// Update 0.0.5 — the dressing: trees grow from earth, never paving (the designer), and every prop stands on something.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, near, section } from './harness';
import { AudioEngine } from '../src/audio/audio';
import { INTRO, INTRO_LENGTH, gateLift } from '../src/engine/menu/introTimeline';
import { MENU_NODES, MENU_VFOV, MenuEvent, MenuScene, readShot } from '../src/engine/menu/menuScene';

const buf = readFileSync(new URL('../public/models/menu/gate.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
const root = gltf.scene;
const fmt = (v: THREE.Vector3) => v.toArray().map((n) => n.toFixed(2)).join(', ');

section('Menu — the gate scene');
{
  const missing = MENU_NODES.filter((n) => !root.getObjectByName(n));
  check('the model has every node the menu uses', missing.length === 0, `missing ${missing.join(', ')}`);
  let fires = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && (o.material as THREE.Material).name.startsWith('Fire')) fires++;
  });
  check('the torches and the campfire have their Fire material (it glows in the game)', fires >= 3, `${fires} fire meshes`);
}

root.updateMatrixWorld(true);
const shot = readShot(root);
const portcullis = root.getObjectByName('Portcullis')!;
const gateBox = new THREE.Box3().setFromObject(portcullis);
const gateZ = gateBox.getCenter(new THREE.Vector3()).z;
const solids: THREE.Object3D[] = [];
root.traverse((o) => {
  if (o instanceof THREE.Mesh && o.name !== 'GateGlow') solids.push(o);
});
const ray = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
/** Distance from `p` down to the first surface (Infinity over nothing). */
function heightAbove(p: THREE.Vector3): number {
  ray.set(p, DOWN);
  ray.far = 50;
  return ray.intersectObjects(solids, false)[0]?.distance ?? Infinity;
}
/** What the menu camera sees first towards `p` (null: nothing solid on the way). */
function firstHit(p: THREE.Vector3): THREE.Object3D | null {
  const dir = p.clone().sub(shot.pos);
  ray.set(shot.pos, dir.clone().normalize());
  ray.far = dir.length();
  return ray.intersectObjects(solids, true)[0]?.object ?? null;
}

section('Menu — the dressing');
{
  const within = (o: THREE.Object3D, anc: THREE.Object3D) => {
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (a === anc) return true;
    return false;
  };
  /** The first thing straight below `p`, ignoring anything inside `skip`. */
  const below = (p: THREE.Vector3, skip: THREE.Object3D[]) => {
    ray.set(p, DOWN);
    ray.far = 50;
    return ray.intersectObjects(solids.filter((o) => !skip.some((s) => within(o, s))), false)[0] ?? null;
  };
  const named = (re: RegExp) => root.children.filter((o) => re.test(o.name));
  const trees = named(/^BirchTree/);
  const onPaving = trees.filter((t) => {
    const hit = below(t.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.5, 0)), trees);
    return !hit || ((hit.object as THREE.Mesh).material as THREE.Material).name !== 'Soil';
  });
  check('every tree grows from a bed of earth, not from paving', trees.length >= 2 && onPaving.length === 0, `${trees.length} trees; on paving: ${onPaving.map((t) => t.name).join(', ')}`);
  const props = named(/^(Statue_Horse|Crate|Barrel|Woodfire)/);
  const floating = props.filter((o) => {
    const hit = below(o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0)), [o]);
    return !hit || hit.distance > 0.45;
  });
  check('statues, crates, barrels and the campfire all stand on something', props.length >= 6 && floating.length === 0, `${props.length} props; floating: ${floating.map((o) => o.name).join(', ')}`);
}

section('Menu — the menu shot');
{
  check('the camera sits low, under a metre above the ground', heightAbove(shot.pos) < 1, `camera ${fmt(shot.pos)}, ${heightAbove(shot.pos).toFixed(2)} m up`);
  check('and looks up at the gate', shot.look.y > shot.pos.y + 2);
  check('the camera is out in front of the gate (the scene faces +z)', shot.pos.z > gateZ + 10);
  const cam = new THREE.PerspectiveCamera(MENU_VFOV, 16 / 9, 0.05, 300);
  cam.position.copy(shot.pos);
  cam.lookAt(shot.look);
  cam.updateMatrixWorld(true);
  const gate = gateBox.getCenter(new THREE.Vector3()).project(cam);
  check('the gate is near the middle of the screen', Math.abs(gate.x) < 0.15 && gate.y > -0.5 && gate.y < 0.3, `ndc ${gate.x.toFixed(2)}, ${gate.y.toFixed(2)}`);
  // The highest point of the scene on screen: the logo needs the band above it.
  let top = -Infinity;
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name === 'GateGlow') return;
    const box = new THREE.Box3().setFromObject(o);
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          v.set(x, y, z).project(cam);
          if (v.z < 1 && Math.abs(v.x) < 0.45) top = Math.max(top, v.y);
        }
  });
  check('the middle of the top quarter is sky, for the logo', top < 0.5, `scene top at ndc ${top.toFixed(2)}`);
}

section('Menu — Start');
{
  check('the gate starts rising at once', gateLift(0) === 0 && INTRO.gateStart <= 0.2 && gateLift(INTRO.gateStart + 0.3) > 0);
  check('it is nearly up when the fade to black starts', gateLift(INTRO.fadeAt) >= 0.85 * INTRO.gateLift, `${((gateLift(INTRO.fadeAt) / INTRO.gateLift) * 100).toFixed(0)}% up`);
  check('the lab starts as the fade ends', near(INTRO_LENGTH, INTRO.fadeAt + INTRO.fade, 1e-9));
  // How high the wall over the gate goes: the raised bars must stay inside it.
  let wallTop = -Infinity;
  for (const o of solids) {
    if (o === portcullis || o.parent === portcullis) continue;
    const b = new THREE.Box3().setFromObject(o);
    if (b.min.x <= gateBox.min.x && b.max.x >= 0 && b.min.z <= gateBox.min.z && b.max.z >= gateBox.max.z) wallTop = Math.max(wallTop, b.max.y);
    if (b.max.x >= gateBox.max.x && b.min.x <= 0 && b.min.z <= gateBox.min.z && b.max.z >= gateBox.max.z) wallTop = Math.max(wallTop, b.max.y);
  }
  check('raised, the bars stay hidden inside the wall above the arch', gateBox.max.y + INTRO.gateLift <= wallTop, `bar tops ${(gateBox.max.y + INTRO.gateLift).toFixed(2)} m, wall top ${wallTop.toFixed(2)} m`);

  // The doorway, a metre above the sill, as the menu camera sees it.
  const doorway = new THREE.Vector3(0, gateBox.min.y + 1, gateZ);
  check('shut, the menu shot sees the bars across the doorway', firstHit(doorway) === portcullis || firstHit(doorway)?.parent === portcullis);

  const menu = new MenuScene(new AudioEngine({ master: 1, sfx: 1, music: 1 }), false);
  menu.attach(root);
  const cam = menu.camera;
  menu.update(1 / 60);
  check('idle, the camera holds the menu shot (drifting a little)', cam.position.distanceTo(shot.pos) < 0.5, fmt(cam.position));

  menu.startIntro();
  const dt = 1 / 120;
  const events: [MenuEvent, number][] = [];
  let t = 0;
  let wander = 0;
  let openAtFade = false;
  for (let i = 0; i < 1000; i++) {
    const ev = menu.update(dt);
    // What the renderer does each frame before drawing (the raycasts read world matrices).
    menu.scene.updateMatrixWorld();
    t += dt;
    wander = Math.max(wander, cam.position.distanceTo(shot.pos));
    if (ev) events.push([ev, t]);
    if (ev === 'fade') openAtFade = firstHit(doorway) === null;
    if (ev === 'done') break;
  }
  const at = (e: MenuEvent) => events.find(([k]) => k === e)?.[1] ?? NaN;
  check('it runs fade → done, once each', events.map(([e]) => e).join(' ') === 'fade done', events.map(([e, s]) => `${e}@${s.toFixed(2)}`).join(' '));
  check('the fade starts on time and the lab starts on time', near(at('fade'), INTRO.fadeAt, 0.02) && near(at('done'), INTRO_LENGTH, 0.02));
  check('when the fade starts, the menu shot sees through the open doorway', openAtFade);
  check('the camera stays on the menu shot (no walk-in)', wander < 0.5, `${wander.toFixed(2)} m at most`);
  menu.scene.updateMatrixWorld();
  check('afterwards the gate is shut again, ready for the next visit', near(new THREE.Box3().setFromObject(portcullis).min.y, gateBox.min.y, 1e-6));
}
