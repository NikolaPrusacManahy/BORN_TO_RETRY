// Update 0.3.86 — Gravity Sean's moves as they look in the world, through the game's own views and rules: a floor, stand-ins for enemies (red), what he makes. Only as plain meshes (no glow; the faintest see-through parts are
// left out), to check sizes and what they hide of your view, such as whether a full mass of rocks hides your aim.
//   npx tsx tools/sean-world-shots.ts <out folder> [vertical fov]
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/pov.json --out <out folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { DT, FlatWorld, ticks } from '../tests/fakes/flatWorld';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { CAMERA } from '../src/tuning/camera';
import { SEAN } from '../src/tuning/sean';
import { GravityView } from '../src/engine/sean/gravityView';
import type { Arena } from '../src/world/arena';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/sean-world-shots.ts <out folder> [vertical fov]');
const fov = Number(process.argv[3] ?? 68);
mkdirSync(out, { recursive: true });

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const v3 = new THREE.Vector3();
const inst = new THREE.Matrix4();
const col = new THREE.Color();
const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function grab(scene: THREE.Object3D, cam: THREE.Camera): Mesh[] {
  scene.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const toCam = cam.matrixWorldInverse;
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return;
    const mat = o.material as THREE.MeshBasicMaterial;
    if (mat.transparent && mat.opacity < 0.3) return;
    const g = o.geometry as THREE.BufferGeometry;
    const idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const copies = o instanceof THREE.InstancedMesh ? o.count : 1;
    for (let c = 0; c < copies; c++) {
      const pos: number[] = [];
      for (let i = 0; i < g.attributes.position.count; i++) {
        v3.fromBufferAttribute(g.attributes.position as THREE.BufferAttribute, i);
        if (o instanceof THREE.InstancedMesh) {
          o.getMatrixAt(c, inst);
          v3.applyMatrix4(inst);
        }
        v3.applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
        pos.push(+v3.x.toFixed(4), +v3.y.toFixed(4), +v3.z.toFixed(4));
      }
      if (o instanceof THREE.InstancedMesh && o.instanceColor) o.getColorAt(c, col);
      else col.copy(mat.color);
      meshes.push({ color: [col.r, col.g, col.b], pos, idx });
    }
  });
  return meshes;
}

interface Scene {
  c: CombatState;
  step: (intent: Partial<CombatIntent>, secs?: number) => void;
  shot: (name: string) => void;
}
const shots: { name: string; meshes: Mesh[] }[] = [];

function setup(foes: [number, number][], unstable = false): Scene {
  const c = createCombat(bare);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const scene = new THREE.Scene();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb0a488 }));
  scene.add(floor);
  // Lines on the floor, for scale: every 5 m.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a7f66 });
  for (let i = -12; i <= 12; i++) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(120, 0.01, 0.05), lineMat);
    a.position.set(0, 0.01, i * 5);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 120), lineMat);
    b.position.set(i * 5, 0.01, 0);
    scene.add(a, b);
  }
  const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 0.05, 300);
  cam.position.set(0, CAMERA.v.eyeHeight, 0);
  scene.add(cam);
  const view = new GravityView(scene, cam);
  const bodies = foes.map(([x, z]) => {
    const e = c.enemies[spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(x, 0, z), 0)];
    e.hp = 50000;
    e.frozen = 100;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xc23a2a }));
    scene.add(m);
    return { e, m };
  });
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      c.events.clear();
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
      view.update(c, DT);
      for (const b of bodies) {
        b.m.visible = isLive(b.e);
        b.m.position.set(b.e.pos.x, b.e.pos.y + 0.9, b.e.pos.z);
      }
    }
  };
  if (unstable) step({ interactPressed: true });
  return { c, step, shot: (name) => shots.push({ name, meshes: grab(scene, cam) }) };
}

const FOES: [number, number][] = [
  [0, -14],
  [-5, -10],
  [6, -11],
  [-2, -7],
];

// Grab, held.
{
  const s = setup(FOES);
  s.step({ pitch: -0.3, heavyPressed: true, heavyHeld: true });
  s.step({ heavyHeld: true }, 0.3);
  s.shot('grab_0s');
  s.step({ heavyHeld: true }, 1.4);
  s.shot('grab_2s');
  s.step({ heavyHeld: true }, v.gatherTime);
  s.shot('grab_full');
  s.step({});
  s.step({}, 0.2);
  s.shot('grab_thrown');
}
// Gravity Punch, its third.
{
  const s = setup(FOES);
  for (let i = 0; i < ticks(3); i++) {
    s.step({ attackHeld: true });
    if (s.c.fists.step === 0 && i > 60) break;
  }
  s.step({}, 0.03);
  s.shot('punch');
}
// Shockwave Punch.
{
  const s = setup(FOES, true);
  s.step({ slamPressed: true });
  s.step({}, v.shockWindup + DT);
  s.step({}, 0.05);
  s.shot('shock_early');
  s.step({}, 0.09);
  s.shot('shock_late');
}
// Black Hole.
{
  const s = setup(FOES, true);
  s.step({ pitch: -0.2, heavyPressed: true, heavyHeld: true });
  s.step({ pitch: -0.2, heavyHeld: true }, v.palmMin);
  s.step({ pitch: -0.2 });
  s.step({ pitch: -0.2 }, 0.1);
  s.shot('hole_flying');
  s.step({ pitch: -0.2 }, 1.4);
  s.shot('hole_open');
}
// Meteor.
{
  const s = setup(FOES, true);
  s.c.grav.ult = 1;
  s.step({ throwPressed: true, pitch: -0.25 });
  s.step({ pitch: -0.25 }, v.meteorAim * 0.8);
  s.shot('meteor_zone');
  s.step({ pitch: -0.25 }, v.meteorAim * 0.2 + v.meteorFall * 0.8);
  s.shot('meteor_falling');
}
// Time Stop.
{
  const s = setup(FOES);
  s.c.grav.ult = 1;
  s.step({ throwPressed: true });
  for (let i = 0; i < 4; i++) {
    s.step({ attackPressed: true, yaw: 0.28 });
    s.step({}, 0.4);
  }
  s.shot('stop_marks');
}

writeFileSync(join(out, 'pov.json'), JSON.stringify({ aspect: 16 / 9, fov, shots }));
console.log(`wrote ${shots.length} views at ${fov}°`);
