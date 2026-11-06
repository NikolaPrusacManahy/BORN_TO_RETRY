// Update 0.3.86 — Gravity Sean's moves as they look in the world, through the game's own views and rules: a floor, stand-ins for enemies (red), what he makes, to check sizes and what they hide of your view, such as whether a
// full mass of rocks hides your aim. Update 0.3.89 — and how they look: two passes, the solid things and what the game adds over them, which you add together. No bloom, no fog, no real lighting.
//   npx tsx tools/sean-world-shots.ts <out folder> [vertical fov] [only the shots starting with this]
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/pov.json --out <out folder>/solid --pass vsolid
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/pov.json --out <out folder>/glow --pass trail
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
const only = process.argv[4];
mkdirSync(out, { recursive: true });

type Mesh = { color: number[]; pos: number[]; idx: number[]; colors?: number[]; vcol?: number[] };
const v3 = new THREE.Vector3();
const inst = new THREE.Matrix4();
const col = new THREE.Color();
const tint = new THREE.Color();
const FLOOR = new THREE.Color(0xb0a488);
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
    const g = o.geometry as THREE.BufferGeometry;
    const idxAll = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const vc = g.attributes.color as THREE.BufferAttribute | undefined;
    // What the game adds over the rest, or fades by its vertices: its own pass, in colours scaled by how strong it is.
    const glows = mat.blending === THREE.AdditiveBlending || (!!vc && vc.itemSize === 4);
    if (glows && mat.opacity < 0.01) return;
    if (mat.transparent && !glows && mat.opacity < 0.05) return;
    const copies = o instanceof THREE.InstancedMesh ? o.count : 1;
    for (let c = 0; c < copies; c++) {
      const pos: number[] = [];
      const colors: number[] = [];
      if (o instanceof THREE.InstancedMesh && o.instanceColor) o.getColorAt(c, tint);
      else tint.setRGB(1, 1, 1);
      for (let i = 0; i < g.attributes.position.count; i++) {
        v3.fromBufferAttribute(g.attributes.position as THREE.BufferAttribute, i);
        if (o instanceof THREE.InstancedMesh) {
          o.getMatrixAt(c, inst);
          v3.applyMatrix4(inst);
        }
        v3.applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
        pos.push(+v3.x.toFixed(4), +v3.y.toFixed(4), +v3.z.toFixed(4));
        if (vc) {
          const al = vc.itemSize === 4 ? vc.getW(i) : 1;
          colors.push(vc.getX(i) * al, vc.getY(i) * al, vc.getZ(i) * al);
        } else colors.push(1, 1, 1);
      }
      col.copy(mat.color);
      // (A dark decal the game blends over the floor: mixed with the floor's colour here, as it's no light.)
      if (vc && vc.itemSize === 4 && mat.blending !== THREE.AdditiveBlending && vc.getX(0) + vc.getY(0) + vc.getZ(0) < 0.5) {
        const vcol: number[] = [];
        for (let i = 0; i < vc.count; i++) {
          const al = vc.getW(i) * mat.opacity;
          vcol.push(FLOOR.r + (vc.getX(i) - FLOOR.r) * al, FLOOR.g + (vc.getY(i) - FLOOR.g) * al, FLOOR.b + (vc.getZ(i) - FLOOR.b) * al);
        }
        meshes.push({ color: [col.r, col.g, col.b], pos, idx: idxAll, vcol });
        continue;
      }
      if (glows) {
        const k = mat.opacity;
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] *= col.r * tint.r * k;
          colors[i + 1] *= col.g * tint.g * k;
          colors[i + 2] *= col.b * tint.b * k;
        }
        meshes.push({ color: [col.r, col.g, col.b], pos, idx: idxAll, colors });
      } else if (vc) meshes.push({ color: [col.r, col.g, col.b], pos, idx: idxAll, vcol: colors });
      else {
        if ((mat as unknown as THREE.MeshStandardMaterial).emissiveIntensity > 0) col.lerp((mat as unknown as THREE.MeshStandardMaterial).emissive, Math.min(1, (mat as unknown as THREE.MeshStandardMaterial).emissiveIntensity * 0.5));
        meshes.push({ color: [col.r * tint.r, col.g * tint.g, col.b * tint.b], pos, idx: idxAll });
      }
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: FLOOR }));
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
  return { c, step, shot: (name) => {
    if (!only || name.startsWith(only)) shots.push({ name, meshes: grab(scene, cam) });
  } };
}

const FOES: [number, number][] = [
  [0, -14],
  [-5, -10],
  [6, -11],
  [-2, -7],
];

// Grab, held: in his hand, his palms joined, growing, coming down, landing.
{
  const s = setup(FOES);
  const pitch = -0.14;
  s.step({ pitch, heavyPressed: true, heavyHeld: true });
  s.step({ pitch, heavyHeld: true }, 0.7);
  s.shot('a_in_hand');
  s.step({ pitch, heavyHeld: true }, 1);
  s.shot('b_joined');
  s.step({ pitch, heavyHeld: true }, 3);
  s.shot('c_half');
  s.step({ pitch, heavyHeld: true }, 5);
  s.shot('d_full');
  s.step({ pitch });
  s.step({ pitch }, 0.65);
  s.shot('e_falling');
  s.step({ pitch }, 0.3);
  s.step({ pitch }, 0.1);
  s.shot('f_landed');
  s.step({ pitch }, 1);
  s.shot('g_after');
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
