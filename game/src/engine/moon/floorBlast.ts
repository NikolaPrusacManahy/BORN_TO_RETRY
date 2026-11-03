// Update 0.3.31 — the Moon's floor torn apart in Tidebreaker's show (the designer: "All previous rooms explode"): every
// piece the floor's view draws outside its arena (the kit's pieces, their cores, the slab under them, the craters, the
// pads, the signs, the gates' bars) belongs to the room nearest it; as each room blows (sim/dungeon/tideShow.ts's
// blastOrder) its pieces are flung up and out from its middle, turning, and shrink away into space, the middle's first.
// Drawn from the show's time (the same however the frames fall); gone for good after. Kept: the arena (and its walls,
// its gates) and the dark past its wooden gate.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { blastOrder } from '../../sim/dungeon/tideShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { CELL } from '../../world/dungeon/floorPlan';

/** A piece flies this long (s), shrinking away over the last part; the blast runs out from a room's middle to its walls
 *  over this long (s); its pieces flung out up to this fast, and up (m/s, the most), turning up to this fast (rad/s),
 *  pulled down this hard (m/s²: the moon's, about). */
const LIFE = 2.4;
const SHRINK = 1.2;
const SPREAD = 0.45;
const OUT = 15;
const UP = 20;
const SPIN = 5;
const FALL = 1.6;
/** Kept this far round the arena (m: its walls, its doorways' bars), and round the dark past its wooden gate. */
const KEEP = CELL * 1.5;
const KEEP_DARK = CELL * 3;

interface Room {
  at: number;
  cx: number;
  cz: number;
  half: number;
  /** Its instances: the mesh (in `meshes`) and the instance, in pairs. */
  idx: number[];
  loose: THREE.Object3D[];
  /** Made as it blows: each piece's matrix from where it stood (its own middle at the origin), its middle, its flight. */
  base: Float32Array | null;
  from: Float32Array | null;
  fly: Float32Array | null;
  done: boolean;
}

/** The show's time for the floor (−1: not started; Infinity: over). */
export function showTime(b: BossRun): number {
  if (b.kind !== 'tidebreaker' || b.beat === 'waiting') return -1;
  return b.beat === 'intro' ? b.t : Infinity;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const axis = new THREE.Vector3();
const piece = new THREE.Matrix4();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

export class FloorBlast {
  private readonly rooms: Room[] = [];
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly dirty = new Set<THREE.InstancedMesh>();

  constructor(private readonly level: DungeonLevel) {
    const rooms = level.rooms;
    for (const r of rooms) {
      const half = Math.max(r.max.x - r.min.x, r.max.z - r.min.z) / 2;
      this.rooms.push({ at: Infinity, cx: (r.min.x + r.max.x) / 2, cz: (r.min.z + r.max.z) / 2, half, idx: [], loose: [], base: null, from: null, fly: null, done: false });
    }
    for (const { room, at } of blastOrder(level)) this.rooms[room].at = at;
  }

  /** The room a spot belongs to (−1: kept). */
  roomOf(x: number, z: number): number {
    const b = this.level.boss;
    const within = (r: { min: { x: number; z: number }; max: { x: number; z: number } }, pad: number) => x >= r.min.x - pad && x <= r.max.x + pad && z >= r.min.z - pad && z <= r.max.z + pad;
    if (within(b.end, KEEP) || within(b.dark, KEEP_DARK)) return -1;
    let best = -1;
    let near = Infinity;
    this.level.rooms.forEach((r, i) => {
      if (i === b.room) return;
      const d = Math.hypot(Math.max(r.min.x - x, 0, x - r.max.x), Math.max(r.min.z - z, 0, z - r.max.z));
      if (d < near) {
        near = d;
        best = i;
      }
    });
    return best;
  }

  /** Has the spot's room blown (as of the last update)? */
  gone(x: number, z: number): boolean {
    const r = this.roomOf(x, z);
    return r >= 0 && this.rooms[r].base !== null;
  }

  /** Everything under `roots` (once built): each instance and each mesh to its room. */
  take(roots: readonly THREE.Object3D[]) {
    for (const root of roots) {
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) {
          const k = this.meshes.push(o) - 1;
          for (let i = 0; i < o.count; i++) {
            o.getMatrixAt(i, m);
            pos.setFromMatrixPosition(m.premultiply(o.matrixWorld));
            const r = this.roomOf(pos.x, pos.z);
            if (r >= 0) this.rooms[r].idx.push(k, i);
          }
        } else if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.getWorldPosition(pos);
          const r = this.roomOf(pos.x, pos.z);
          if (r >= 0) this.rooms[r].loose.push(o);
        }
      });
    }
  }

  /** The show `t` s in (showTime). Call after anything else that sets what's shown (the gates' bars). */
  update(t: number) {
    if (t < 0) return;
    for (const room of this.rooms) {
      if (t < room.at) continue;
      if (!room.base) this.blow(room);
      // (Every frame: the gates' bars are shown again each frame.)
      for (const o of room.loose) o.visible = false;
      if (room.done) continue;
      const age = t - room.at;
      const n = room.idx.length / 2;
      const base = room.base!;
      const from = room.from!;
      const fly = room.fly!;
      for (let k = 0; k < n; k++) {
        const mesh = this.meshes[room.idx[k * 2]];
        const i = room.idx[k * 2 + 1];
        const f = k * 8;
        const d = age - fly[f + 7];
        if (d <= 0) continue;
        this.dirty.add(mesh);
        if (d >= LIFE) {
          mesh.setMatrixAt(i, HIDDEN);
          continue;
        }
        pos.set(from[k * 3] + fly[f] * d, from[k * 3 + 1] + fly[f + 1] * d - 0.5 * FALL * d * d, from[k * 3 + 2] + fly[f + 2] * d);
        q.setFromAxisAngle(axis.set(fly[f + 3], fly[f + 4], fly[f + 5]), fly[f + 6] * d);
        scale.setScalar(Math.max(1e-3, 1 - smooth((d - (LIFE - SHRINK)) / SHRINK)));
        m.compose(pos, q, scale).multiply(piece.fromArray(base, k * 16));
        mesh.setMatrixAt(i, m);
      }
      room.done = age >= SPREAD + 0.12 + LIFE;
    }
    for (const mesh of this.dirty) mesh.instanceMatrix.needsUpdate = true;
    this.dirty.clear();
  }

  /** A room blowing: each of its pieces' flight, out from its middle (the middle's first), up, turning. */
  private blow(room: Room) {
    const n = room.idx.length / 2;
    room.base = new Float32Array(n * 16);
    room.from = new Float32Array(n * 3);
    room.fly = new Float32Array(n * 8);
    let seed = Math.round(room.cx * 7 + room.cz * 13) + 99991;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    const back = new THREE.Matrix4();
    for (let k = 0; k < n; k++) {
      const mesh = this.meshes[room.idx[k * 2]];
      mesh.frustumCulled = false;
      mesh.getMatrixAt(room.idx[k * 2 + 1], m);
      pos.setFromMatrixPosition(m);
      room.from.set([pos.x, pos.y, pos.z], k * 3);
      back.makeTranslation(-pos.x, -pos.y, -pos.z).multiply(m).toArray(room.base, k * 16);
      const dx = pos.x - room.cx;
      const dz = pos.z - room.cz;
      const far = Math.min(1, Math.hypot(dx, dz) / Math.max(1, room.half));
      const a = Math.hypot(dx, dz) > 0.5 ? Math.atan2(dz, dx) : rnd() * Math.PI * 2;
      const out = OUT * (0.3 + 0.7 * far) * (0.6 + 0.4 * rnd());
      axis.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      room.fly.set([Math.cos(a) * out, UP * (0.35 + 0.65 * rnd()), Math.sin(a) * out, axis.x, axis.y, axis.z, SPIN * (0.2 + 0.8 * rnd()), far * SPREAD + rnd() * 0.12], k * 8);
    }
  }
}

/** What stands in `group` (the treasure's: chests, the shop's wares, its card) where the floor's been blown away, hidden
 *  (call after it's updated, each frame). Never a light (one going out recompiles every lit surface: the shop card's
 *  stays, lighting nothing). */
export function hideGone(group: THREE.Object3D, gone: (x: number, z: number) => boolean) {
  for (const o of group.children) if (o.visible && !o.userData.keep && gone(o.position.x, o.position.z)) hide(o);
}

function hide(o: THREE.Object3D) {
  if (o instanceof THREE.Light) return;
  let lit = false;
  o.traverse((c) => (lit ||= c instanceof THREE.Light));
  if (!lit) o.visible = false;
  else for (const c of o.children) hide(c);
}
