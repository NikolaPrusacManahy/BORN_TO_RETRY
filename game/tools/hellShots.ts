// Update 0.3.43 — floor 10's own for the dungeon shots (dungeon-shots.ts): Hell's chains and braziers' iron as the game
// builds them (engine/hell/hellView.ts: every instance's mesh, in the floor's space), the crack map its stone glows
// along (cracks.png, its rows bottom first as Blender reads them), and what the renderer needs to copy the look:
// which materials crack and how bright, the sky's colours by height, the light from below. Blender copies the look
// (tools/blender/render_dungeon.py), not the game's renderer.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import * as THREE from 'three';
import type { DungeonLevel } from '../src/world/dungeon/assemble';
import type { DungeonStyle } from '../src/world/dungeon/styles';
import { HellView } from '../src/engine/hell/hellView';
import { CRACK, CRACK_SPAN, crackMap } from '../src/engine/hell/cracks';
import { HELL } from '../src/tuning/hell';

/** A PNG of `rgba` (`w` by `h`), its rows bottom first. */
function png(w: number, h: number, rgba: Uint8Array): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = table[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4;
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + src, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const rgb = (hex: number) => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

/** Hell's part of the shots' data (null on another floor); writes cracks.png into `out`. */
export function hellShots(level: DungeonLevel, style: DungeonStyle, out: string) {
  if (style.id !== 'hell') return null;
  const view = new HellView(level);
  view.group.updateMatrixWorld(true);
  const meshes: { color: number[]; pos: number[]; idx: number[] }[] = [];
  const v = new THREE.Vector3();
  const im = new THREE.Matrix4();
  view.group.traverse((o) => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pos: number[] = [];
    const idx: number[] = [];
    const n = g.attributes.position.count;
    const gi = g.index ? Array.from(g.index.array) : Array.from({ length: n }, (_, i) => i);
    for (let k = 0; k < o.count; k++) {
      o.getMatrixAt(k, im);
      const base = pos.length / 3;
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(im).applyMatrix4(o.matrixWorld);
        pos.push(+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4));
      }
      for (const i of gi) idx.push(base + i);
    }
    const c = (o.material as THREE.MeshStandardMaterial).color;
    meshes.push({ color: [c.r, c.g, c.b], pos, idx });
  });
  const map = crackMap();
  writeFileSync(join(out, 'cracks.png'), png(map.image.width, map.image.height, map.image.data as Uint8Array));
  view.dispose();
  return {
    meshes,
    cracks: { on: style.cracks?.on ?? [], color: rgb(style.cracks?.color ?? 0xff5a18), strength: HELL.v.cracks, span: CRACK_SPAN, map: 'cracks.png', edges: CRACK },
    dome: { foot: rgb(style.sky ?? 0xf2a46c), glow: rgb(0xf08650), high: rgb(0xc8512e), top: rgb(0x96301f) },
    ground: rgb(style.ground ?? 0xff7436),
    braziers: level.hell.braziers,
    chains: level.hell.chains.length,
  };
}
