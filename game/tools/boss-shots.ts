// Update 0.0.15 — a look at the boss room without a browser: the floor's dressing (dungeon-shots.ts) plus the boss room's
// sliding walls at `k` (0: the small room you walk into, 1: slid back), the wooden gate (shut, or open with `--open`)
// and the dark, and the Demon in its stance at the portal; the cameras are the show's own shots. Blender draws it with
// the real kit (tools/blender/render_dungeon.py).
//   npx tsx tools/boss-shots.ts <out folder> [seed] [k] [--open]
//   blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <out folder> --day
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Cinema, Shot } from '../src/engine/boss/cinema';
import { Shell } from '../src/engine/boss/shell';
import { WoodGate } from '../src/engine/boss/woodGate';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { BOSS } from '../src/tuning/boss';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress, KIT, Placement } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { ArenaBox } from '../src/world/arena';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = args[0];
if (!out) throw new Error('usage: npx tsx tools/boss-shots.ts <out folder> [seed] [k] [--open]');
const seed = Number(args[1] ?? 4242);
const k = Number(args[2] ?? 0);
const open = process.argv.includes('--open');
mkdirSync(out, { recursive: true });
const level = buildDungeon(planFloor(seed, 1));
const d = dress(level.plan);
const b = level.boss;
const room = level.rooms[b.room];

// The sliding walls, posed by the game's own code: their kit pieces and cores read back out of the instances.
const buf = readFileSync(new URL('../public/models/dungeon/kit.glb', import.meta.url));
const kit = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
const shell = new Shell(b.start, b.end, new THREE.MeshBasicMaterial(), new THREE.BoxGeometry(1, 1, 1));
shell.build(kit.scene, (src) => src);
shell.set(k);
const pieces: Placement[] = [...d.pieces];
const cores: ArenaBox[] = [...d.cores];
/** Coloured boxes by their matrices: the sliding walls' masses, the wooden gate, the dark. */
const boxes: { m: number[]; color: number[] }[] = [];
const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const e = new THREE.Euler();
// The shell's children: its cores, then the wall face's meshes, then the cap's.
let wallMeshes = 0;
kit.scene.getObjectByName(KIT.wall)!.traverse((o) => {
  if (o instanceof THREE.Mesh) wallMeshes++;
});
if (shell.group.visible) {
  shell.group.children.forEach((o, i) => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    for (let n = 0; n < o.count; n++) {
      o.getMatrixAt(n, m);
      m.decompose(p, q, s);
      if (s.x === 0) continue;
      if (i === 0) boxes.push({ m: m.toArray(), color: [0.06, 0.048, 0.04] });
      // (One placement per piece: its first mesh.)
      else if (i === 1 || i === wallMeshes + 1) pieces.push({ piece: i === 1 ? KIT.wall : KIT.cap, x: p.x, y: p.y, z: p.z, rot: e.setFromQuaternion(q, 'YXZ').y, sx: 1, sy: 1, sz: 1 });
    }
  });
}

// The wooden gate and the dark: boxes with their colours.
const scene = new THREE.Scene();
const gate = new WoodGate(scene, b, 'FLOOR 2');
gate.update(open ? 1 : 0);
scene.updateMatrixWorld(true);
scene.traverse((o) => {
  if (!(o instanceof THREE.Mesh) || !(o.geometry instanceof THREE.BoxGeometry)) return;
  const c = (o.material as THREE.MeshStandardMaterial).color;
  boxes.push({ m: o.matrixWorld.toArray(), color: [c.r, c.g, c.b] });
});

// The show's own shots.
const cin = new Cinema(b);
const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
const half = (room.max.x - room.min.x) / 2;
const mx = (room.min.x + room.max.x) / 2;
const mz = (room.min.z + room.max.z) / 2;
const eye = new THREE.Vector3(mx + ex * (half - 3), 1.6, mz + ez * (half - 3));
cin.start(eye, new THREE.Vector3(-ex, 0, -ez));
const beats = introBeats();
const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const cam = (name: string, t: number) => {
  cin.intro(t, shot);
  return { name, at: shot.pos.toArray(), to: shot.look.toArray() };
};
const g = b.gateAt;
const cams = [
  { name: 'boss-door', at: eye.toArray(), to: [mx, 1.4, mz] },
  cam('boss-high', beats.wallsFrom),
  cam('boss-stance', (beats.riseTo + beats.stanceTo) / 2),
  { name: 'boss-gate', at: [g.x - g.ox * 11, 3.2, g.z - g.oz * 11], to: [g.x + g.ox * 2, 2, g.z + g.oz * 2] },
  { name: 'boss-gate-close', at: [g.x - g.ox * 4, 1.6, g.z - g.oz * 4], to: [g.x + g.ox * 3, 1.5, g.z + g.oz * 3] },
];
const demon = { x: b.portal.x, z: b.portal.z, yaw: Math.atan2(-(eye.x - b.portal.x), -(eye.z - b.portal.z)), height: BOSS.v.demonHeight };
const extent = { min: { x: room.min.x - 8, z: room.min.z - 8 }, max: { x: room.max.x + 8, z: room.max.z + 8 } };
writeFileSync(join(out, 'dungeon.json'), JSON.stringify({ seed, floor: 1, pieces, gates: d.gates, torches: d.torches, cores, pads: level.arena.pads, exit: level.exit, cams, extent, boxes, demon }));
console.log(`seed ${seed}: boss room ${b.room} (entrance ${b.entrance}), walls at ${k}, gate ${open ? 'open' : 'shut'}, ${pieces.length} pieces, ${boxes.length} gate boxes`);
