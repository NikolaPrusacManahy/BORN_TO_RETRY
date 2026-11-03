// Update 0.3.38 — lighter to run (the designer: "when I boot up the game my PC go full fan speed … That sounds so heavy
// for what it is supposed to be"): a floor's pieces drawn square by square (what's out of view, or out of the sun's
// shadow box round you, left out; every piece still where it was), the frame-rate cap (the menus at 60 at most; a cap at
// the screen's own rate drops no frame), and the menus' scenes merged by material (the same triangles, a few dozen
// meshes) with their shadows drawn once.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { DT } from './fakes/flatWorld';
import type { AudioEngine } from '../src/audio/audio';
import { capOf, DEFAULT_FRAME_CAP, FRAME_CAPS, FramePacer, RESTING_CAP } from '../src/core/framePacer';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { defaultSave, hydrateSave, verticalFov } from '../src/state/settings';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { DungeonView } from '../src/engine/dungeonView';
import { AREA } from '../src/engine/floorPieces';
import { CampScene } from '../src/engine/menu/campScene';
import { mergeStatic } from '../src/engine/menu/mergeStatic';
import { MenuScene } from '../src/engine/menu/menuScene';
import { PillarBreaks } from '../src/engine/pillarBreak';
import type { Pillar } from '../src/sim/combat/pillars';

const trisOf = (o: THREE.Mesh) => ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) * (o instanceof THREE.InstancedMesh ? o.count : 1);
const meshesIn = (root: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) out.push(o);
  });
  return out;
};

section('Lighter — a floor drawn square by square');
{
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  kit.scene.updateMatrixWorld(true);
  const partTris = new Map<string, number>();
  const fr = new THREE.Frustum();
  const pm = new THREE.Matrix4();
  let every = true;
  let small = true;
  let seenShare = 0;
  let shadowShare = 0;
  const floors = [1, 2, 5, 8, 10];
  for (const floor of floors) {
    const level = buildDungeon(planFloor(31, floor));
    const scene = new THREE.Scene();
    const view = new DungeonView(scene, level, false);
    view.build(kit.scene);
    scene.updateMatrixWorld(true);
    // Every placement's piece, its parts' triangles, as many times as it's placed.
    let want = 0;
    for (const p of dress(level.plan).pieces) {
      let t = partTris.get(p.piece);
      if (t === undefined) {
        t = 0;
        kit.scene.getObjectByName(p.piece)?.traverse((o) => (t! += o instanceof THREE.Mesh ? trisOf(o) : 0));
        partTris.set(p.piece, t);
      }
      want += t;
    }
    const areas = meshesIn(view.group).filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh && o.name.includes('@'));
    const got = areas.reduce((a, o) => a + trisOf(o), 0);
    every &&= Math.abs(got - want) < 1;
    small &&= areas.every((o) => o.boundingSphere!.radius < AREA * 1.2);
    // From where you start, looking each way: what's in view; the sun's shadow box round you.
    const all = areas.reduce((a, o) => a + trisOf(o), 0);
    const casters = areas.filter((o) => o.castShadow).reduce((a, o) => a + trisOf(o), 0);
    const s = level.arena.playerStart;
    const eye = new THREE.Vector3(s.x, 1.6, s.z);
    const cam = new THREE.PerspectiveCamera(verticalFov(100, 16 / 9), 16 / 9, 0.05, 400);
    let seen = 0;
    for (let k = 0; k < 4; k++) {
      cam.position.copy(eye);
      cam.rotation.set(0, (k * Math.PI) / 2, 0, 'YXZ');
      cam.updateMatrixWorld(true);
      fr.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      for (const o of areas) if (fr.intersectsObject(o)) seen += trisOf(o);
    }
    seenShare = Math.max(seenShare, seen / 4 / all);
    view.update(DT, createDungeonRun(level), eye);
    const sun = (view as unknown as { sun: THREE.DirectionalLight }).sun;
    sun.updateMatrixWorld(true);
    sun.target.updateMatrixWorld(true);
    sun.shadow.updateMatrices(sun);
    const sf = sun.shadow.getFrustum();
    let shadow = 0;
    for (const o of areas) if (o.castShadow && sf.intersectsObject(o)) shadow += trisOf(o);
    shadowShare = Math.max(shadowShare, shadow / casters);
    view.dispose();
  }
  check(`every piece still placed, each part of it (floors ${floors.join(', ')})`, every);
  check(`in squares of ${AREA} m, not one mesh a floor wide`, small);
  check(`from where you start, at most ${(seenShare * 100).toFixed(0)}% of a floor in view (all of it, before)`, seenShare < 0.5);
  check(`the sun’s shadows: at most ${(shadowShare * 100).toFixed(0)}% of a floor’s walls drawn in them (all of them, before)`, shadowShare < 0.3);
}

section('Lighter — far off, the heaviest pieces lighter');
{
  // Update 0.3.39 — floor 1's tile, wall and cap, each stone its box (kit_far.glb), in a square past FAR_FROM.
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const far = await parseUntextured(new URL('../public/models/dungeon/kit_far.glb', import.meta.url));
  kit.scene.updateMatrixWorld(true);
  const lighter = ['kit_p1_Floor_Modular', 'kit_p1_Wall_Modular', 'kit_p1_WallCover_Modular'].map((n) => {
    let a = 0;
    let b = 0;
    kit.scene.getObjectByName(n)?.traverse((o) => (a += o instanceof THREE.Mesh ? trisOf(o) : 0));
    far.scene.getObjectByName(n)?.traverse((o) => (b += o instanceof THREE.Mesh ? trisOf(o) : 0));
    return [n, a, b] as const;
  });
  check(`its tile, wall and cap far off: ${lighter.map(([, a, b]) => `${a} → ${b}`).join(', ')} triangles`, lighter.every(([, a, b]) => b > 0 && b * 4 < a));
  const level = buildDungeon(planFloor(31, 1));
  const scene = new THREE.Scene();
  const view = new DungeonView(scene, level, false);
  view.build(kit.scene, far.scene);
  scene.updateMatrixWorld(true);
  const all = meshesIn(view.group).filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh && o.name.includes('@'));
  const nears = all.filter((o) => !o.name.endsWith(' far'));
  const fars = all.filter((o) => o.name.endsWith(' far'));
  const byName = new Map(nears.map((n) => [n.name, n]));
  const nearOf = (f: THREE.InstancedMesh) => byName.get(f.name.replace(' far', ''));
  const paired = fars.every((f) => nearOf(f)?.count === f.count);
  check(`a far copy for each of their squares, as many pieces in each (${fars.length} far beside ${nears.length})`, fars.length > 0 && paired);
  const run = createDungeonRun(level);
  const s = level.arena.playerStart;
  const eye = new THREE.Vector3(s.x, 1.6, s.z);
  view.update(DT, run, eye);
  const here = all.filter((o) => o.visible && o.boundingSphere!.center.distanceTo(eye) < 10);
  const farAway = all.filter((o) => o.boundingSphere!.center.distanceTo(eye) > 80);
  const hasFar = new Set(fars.map((f) => f.name.replace(' far', '')));
  const drawnRight = (o: THREE.InstancedMesh) => (o.name.endsWith(' far') ? o.visible : !hasFar.has(o.name) || !o.visible);
  check('where you are, the real pieces; far away, the far ones', here.length > 0 && here.every((o) => !o.name.endsWith(' far')) && farAway.length > 0 && farAway.every(drawnRight));
  // What's drawn from where you start, looking each way: before and now.
  const fr = new THREE.Frustum();
  const pm = new THREE.Matrix4();
  const cam = new THREE.PerspectiveCamera(verticalFov(100, 16 / 9), 16 / 9, 0.05, 400);
  let before = 0;
  let now = 0;
  for (let k = 0; k < 4; k++) {
    cam.position.copy(eye);
    cam.rotation.set(0, (k * Math.PI) / 2, 0, 'YXZ');
    cam.updateMatrixWorld(true);
    fr.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const o of nears) if (fr.intersectsObject(o)) before += trisOf(o);
    for (const o of all) if (o.visible && fr.intersectsObject(o)) now += trisOf(o);
  }
  check(`floor 1 from where you start: ${(before / 4e6).toFixed(2)} million triangles in view, now ${(now / 4e6).toFixed(2)} million`, now < before * 0.6);
  // Coming back near: the real pieces again (a square's far copies hidden, its own shown).
  const square = fars[0];
  const back = square.boundingSphere!.center;
  view.update(DT, run, new THREE.Vector3(back.x, 1.6, back.z));
  check('walk up to a far square: its real pieces again', !square.visible && nearOf(square)!.visible);
  view.dispose();
  // A pillar broken: its pieces' far copies hidden with them, no stone of their own (the stump and the top: the real
  // pieces').
  const near = nears.find((o) => o.name.startsWith('kit_p1_Wall_Modular@'))!;
  const copy = fars.find((o) => o.name === `${near.name} far`)!;
  const one = new PillarBreaks();
  const both = new PillarBreaks();
  one.add(0, near, 0);
  both.add(0, near.clone(), 0);
  both.add(0, copy, 0, true);
  const at = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(near.instanceMatrix.array, 0));
  const pillar = { x: at.x, z: at.z, half: 1, h: 4.9, box: -1, lie: { x: at.x + 3, z: at.z, yaw: 0 } } as unknown as Pillar;
  one.break(0, pillar);
  both.break(0, pillar);
  const pieces = (b: PillarBreaks) => meshesIn(b.group).length;
  const hidden = new THREE.Matrix4();
  copy.getMatrixAt(0, hidden);
  check('a pillar broken: its far copies hidden with it, no stone of their own', hidden.elements.slice(0, 11).every((x) => x === 0) && pieces(both) === pieces(one) && pieces(one) > 0);
}

section('Lighter — the frame-rate cap');
{
  /** `fps` drawn a second on a screen refreshing `hz` times a second (a little wobble in its timing), over 10 s. */
  const drawn = (hz: number, fps: number, wobble = 0.2) => {
    const p = new FramePacer();
    let n = 0;
    let t = 0;
    let seed = 7;
    for (let i = 0; i < hz * 10; i++) {
      seed = (seed * 16807) % 2147483647;
      t = (i * 1000) / hz + ((seed / 2147483647) * 2 - 1) * wobble;
      if (p.ready(t, fps) && i >= hz) n++;
    }
    return n / 9;
  };
  const r = {
    at60on144: drawn(144, 60),
    at30on144: drawn(144, 30),
    at144on165: drawn(165, 144),
    at144on144: drawn(144, 144),
    at144on1441: drawn(144.1, 144),
    at144on60: drawn(60, 144),
    free: drawn(240, 0),
  };
  check(`below the screen’s rate, held to it on average (60 on 144 Hz: ${r.at60on144.toFixed(1)}; 30: ${r.at30on144.toFixed(1)}; 144 on 165 Hz: ${r.at144on165.toFixed(1)})`, Math.abs(r.at60on144 - 60) < 1.5 && Math.abs(r.at30on144 - 30) < 1 && Math.abs(r.at144on165 - 144) < 3);
  check(`at or over the screen’s rate, every refresh drawn (144 on 144 Hz: ${r.at144on144.toFixed(1)}, on 144.1 Hz: ${r.at144on1441.toFixed(1)}; on 60 Hz: ${r.at144on60.toFixed(1)}); Unlimited, all (${r.free.toFixed(0)})`, r.at144on144 >= 143.9 && r.at144on1441 >= 144 && r.at144on60 >= 59.9 && r.free >= 239.9);
  check(`the menus and the pause menu at ${RESTING_CAP} at most, a lower cap kept`, capOf(0, true) === RESTING_CAP && capOf(240, true) === RESTING_CAP && capOf(30, true) === 30 && capOf(240, false) === 240 && capOf(0, false) === 0);
  const old = hydrateSave({ settings: {} }).settings.frameCap;
  const odd = hydrateSave({ settings: { frameCap: 50 } }).settings.frameCap;
  const none = hydrateSave({ settings: { frameCap: 0 } }).settings.frameCap;
  check(`a save without it gets ${DEFAULT_FRAME_CAP}; one not on the list too; Unlimited kept`, old === DEFAULT_FRAME_CAP && odd === DEFAULT_FRAME_CAP && none === 0 && defaultSave().settings.frameCap === DEFAULT_FRAME_CAP && FRAME_CAPS.includes(DEFAULT_FRAME_CAP));
}

section('Lighter — the menus');
{
  const parse = async (name: string) => {
    const buf = readFileSync(new URL(`../public/models/menu/${name}`, import.meta.url));
    return (await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '')).scene;
  };
  const box = (list: THREE.Mesh[]) => {
    const b = new THREE.Box3();
    for (const o of list) b.expandByObject(o, true);
    return b;
  };
  const audio = { ctx: null, sfx: null, noise: null, resume() {} } as unknown as AudioEngine;
  const gateRoot = await parse('gate.glb');
  gateRoot.updateMatrixWorld(true);
  const gateBefore = meshesIn(gateRoot);
  const gateTris = gateBefore.reduce((a, o) => a + trisOf(o), 0);
  const gateBox = box(gateBefore);
  const gate = new MenuScene(audio, false);
  gate.attach(gateRoot);
  gate.scene.updateMatrixWorld(true);
  const gateAfter = meshesIn(gate.scene);
  const portcullis = gateRoot.getObjectByName('Portcullis')!;
  const kept = !!gateRoot.getObjectByName('GateGlow') && meshesIn(portcullis).length > 0 && meshesIn(portcullis).every((o) => gateAfter.includes(o));
  check(`the gate: ${gateBefore.length} meshes now ${gateAfter.length}, the same ${Math.round(gateTris)} triangles in the same place`, gateAfter.length <= 80 && Math.abs(gateAfter.reduce((a, o) => a + trisOf(o), 0) - gateTris) < 1 && box(gateAfter).min.distanceTo(gateBox.min) < 1e-3 && box(gateAfter).max.distanceTo(gateBox.max) < 1e-3);
  check('its portcullis and the gate’s glow as they came (the portcullis rises)', kept);
  const idle = gate.moving;
  gate.startIntro();
  const rising = gate.moving;
  gate.reset();
  check('its shadows drawn again only while the portcullis rises', !idle && rising && !gate.moving);
  const campRoot = await parse('camp.glb');
  campRoot.updateMatrixWorld(true);
  const campBefore = meshesIn(campRoot);
  const campTris = campBefore.reduce((a, o) => a + trisOf(o), 0);
  const camp = new CampScene(audio, false);
  camp.attach(campRoot);
  const campAfter = meshesIn(camp.scene);
  check(`the camp: ${campBefore.length} meshes now ${campAfter.length}, the same triangles`, campAfter.length <= 60 && Math.abs(campAfter.reduce((a, o) => a + trisOf(o), 0) - campTris) < 1);
  // A mirrored piece merged still faces out.
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial();
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  b.position.set(3, 0, 0);
  b.scale.set(-1, 1, 1);
  root.add(a, b);
  const into = new THREE.Scene();
  into.add(root);
  const n = mergeStatic(root, into, () => false);
  const merged = meshesIn(into)[0];
  const g = merged.geometry;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const idx = g.index!;
  let out = true;
  const [p0, p1, p2, e1, e2] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < idx.count; i += 3) {
    p0.fromBufferAttribute(pos, idx.getX(i));
    p1.fromBufferAttribute(pos, idx.getX(i + 1));
    p2.fromBufferAttribute(pos, idx.getX(i + 2));
    const face = e1.subVectors(p1, p0).cross(e2.subVectors(p2, p0));
    out &&= face.dot(new THREE.Vector3().fromBufferAttribute(nor, idx.getX(i))) > 0;
  }
  check('a mirrored piece merged still faces out', n.before === 2 && n.after === 1 && out);
}
