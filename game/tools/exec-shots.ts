// Update 0.1.1 — a look at an execution without a browser: played by the real rules and drawn by the real view code
// (tests/fakes/execRig.ts), written out at its moments for Blender (tools/blender/render_view.py), twice: as you see it
// (the world through the game camera, the arms through theirs, both brought to the arms camera's lens) and from the
// side (you a post, a floor of metre tiles). Update 0.1.2 — any enemy's, at its keys and blows. Shots are only as true
// as the code they run; feel still needs playing.
//   npx tsx tools/exec-shots.ts <out folder> [kinds…]   (Update 0.3.8 — a kind as grunt:pin: its wall finisher)
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { execRig } from '../tests/fakes/execRig';
import { moveOf } from '../src/sim/combat/execution';
import { PINNED } from '../src/sim/combat/execPin';
import { OPEN_ARENA } from '../tests/fakes/enemyWorld';
import { EXECUTABLE } from '../src/sim/combat/execMoves';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { ARMS } from '../src/tuning/arms';
import { DT } from '../tests/fakes/flatWorld';

const ASPECT = 16 / 9;
const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx tools/exec-shots.ts <out folder> [kinds…]');
const kinds = process.argv.length > 3 ? process.argv.slice(3) : (EXECUTABLE as string[]);
mkdirSync(out, { recursive: true });

type Mesh = { color: number[]; pos: number[]; idx: number[] };
const shots: { name: string; meshes: Mesh[] }[] = [];
const v = new THREE.Vector3();

/** `scene`'s visible meshes in `camera`'s space, brought to the arms lens (x, y scaled; depth kept); the enemy and its
 *  pieces in `tint` (their textures aren't loaded here). */
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
    const tinted = tint && (o instanceof THREE.SkinnedMesh || o.parent?.parent?.name === 'pieces');
    into.push({ color: tinted ? tint : [col.r, col.g, col.b], pos, idx });
  });
}

for (const arg of kinds) {
  const [kind, pin] = arg.split(':') as [EnemyKind, string?];
  const r = await execRig(kind, OPEN_ARENA, pin === 'pin');
  // A floor of metre tiles, and you (a post) for the side view.
  const floor = new THREE.Group();
  for (let x = -6; x <= 6; x++)
    for (let z = -14; z <= 6; z++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: (x + z) & 1 ? 0x3a3a40 : 0x52525a }));
      m.position.set(x, 0, z);
      floor.add(m);
    }
  r.scene.add(floor);
  r.exec.pieces.group.name = 'pieces';
  const you = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.3).translate(0, 0.9, 0), new THREE.MeshStandardMaterial({ color: 0x3060c0 }));
  r.scene.add(you);
  const side = new THREE.PerspectiveCamera(50, ASPECT, 0.05, 100);
  side.position.set(8, 1.8, -3);
  side.lookAt(0, 1.2, -3);
  // Its moments: each key and blow (a few of a barrage), and after.
  const move = pin === 'pin' ? PINNED : moveOf(kind);
  const beats = move.beats.length > 8 ? [move.beats[0], move.beats[15], move.beats[move.beats.length - 1]] : move.beats;
  const at = [...new Set([0.08, ...move.keys.filter((k, i) => !k.glide || i % 5 === 0).map((k) => k.t), ...beats.map((b) => b.t + 0.01), move.endAt + 0.15, move.endAt + 0.45].filter((t) => t > 0).map((t) => +t.toFixed(2)))].sort((a, b) => a - b).slice(0, 14);
  let next = 0;
  let t = 0;
  for (let k = 0; next < at.length && k < 4000; k++) {
    r.step();
    t += DT;
    if (t + 1e-9 < at[next]) continue;
    const name = `${kind}${pin ? '-pin' : ''}_${String(next).padStart(2, '0')}_${at[next].toFixed(2)}s`;
    const pov: Mesh[] = [];
    grab(r.scene, r.cam, you, [0.45, 0.7, 0.5], pov);
    r.vm.scene.updateMatrixWorld(true);
    grab(r.vm.scene, r.vm.camera, null, null, pov);
    shots.push({ name: `${name}_pov`, meshes: pov });
    const from: Mesh[] = [];
    grab(r.scene, side, null, [0.45, 0.7, 0.5], from);
    shots.push({ name: `${name}_side`, meshes: from });
    const e = r.c.enemies[r.s];
    console.log(`${name}  ${e.phase.padEnd(5)} ex ${r.c.exec.active ? 'on ' : 'off'} middle (${r.c.exec.middle.toArray().map((n) => n.toFixed(2)).join(', ')})  look ${THREE.MathUtils.radToDeg(r.look.yaw).toFixed(0)}°/${THREE.MathUtils.radToDeg(r.look.pitch).toFixed(0)}°  hands ${r.vm.grip.weight}`);
    next++;
  }
  r.exec.dispose();
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')} (${shots.length} shots)`);
