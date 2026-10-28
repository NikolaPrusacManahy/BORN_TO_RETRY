// Update 0.0.15 — the boss room's walls sliding back (the designer: the walls expand smoothly, as if the room reshapes
// itself). Until the show, solid blocks of wall fill the room's edges, so you walk into a smaller room built against
// the wall you came in by; as the show runs, their brick faces slide out to the real walls and the blocks shrink
// behind them, until the room is whole and they're gone. Each block is a dark core (like the walls' cores) with the
// kit's brick faces and caps along its inside edge; faces run the room's whole length (their ends hide in the blocks
// beside them). Updated in place: nothing is made per frame.
// Update 0.0.20 — in the floor's look (floor 3: stone faces).
import * as THREE from 'three';
import type { Rect } from '../../world/dungeon/assemble';
import { CORE_BOTTOM, CORE_INSET } from '../../world/dungeon/dressing';
import { BRICK, DungeonStyle } from '../../world/dungeon/styles';
import { HEIGHT } from '../../world/dungeon/assemble';

/** The kit wall's size (m) as dressing.ts places it. */
const PIECE = 2;
const ROWS = 3;
/** Thinner than this, a block is gone. */
const GONE = 0.02;

type Edge = 'w' | 'e' | 'n' | 's';
const EDGES: Edge[] = ['w', 'e', 'n', 's'];
/** Which way each block's face looks (into the room), as a turn of the kit piece (its front is +z). */
const TURN: Record<Edge, number> = { w: Math.PI / 2, e: -Math.PI / 2, n: 0, s: Math.PI };

const m = new THREE.Matrix4();
const local = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

/** One kit piece as instanced meshes (one per mesh in it), placed by index. */
class Pieces {
  readonly meshes: { inst: THREE.InstancedMesh; local: THREE.Matrix4 }[] = [];

  constructor(root: THREE.Object3D, material: (src: THREE.MeshStandardMaterial) => THREE.Material, count: number, group: THREE.Group) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const inst = new THREE.InstancedMesh(o.geometry, material(o.material as THREE.MeshStandardMaterial), count);
      inst.castShadow = inst.receiveShadow = true;
      inst.frustumCulled = false;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(inst);
      this.meshes.push({ inst, local: inv.clone().multiply(o.matrixWorld) });
    });
  }

  place(i: number, x: number, y: number, z: number, rot: number) {
    pos.set(x, y, z);
    q.setFromAxisAngle(UP, rot);
    m.compose(pos, q, scale.set(1, 1, 1));
    for (const p of this.meshes) p.inst.setMatrixAt(i, local.multiplyMatrices(m, p.local));
  }

  hide(i: number) {
    for (const p of this.meshes) p.inst.setMatrixAt(i, HIDE);
  }

  commit() {
    for (const p of this.meshes) p.inst.instanceMatrix.needsUpdate = true;
  }
}

export class Shell {
  readonly group = new THREE.Group();
  private readonly cores: THREE.InstancedMesh;
  private walls: Pieces | null = null;
  private caps: Pieces | null = null;
  /** Pieces along each edge (the room's length / a piece). */
  private readonly perEdge: number;
  private shown = -1;
  /** The wall faces' depth (the floor's look's). */
  private depth = BRICK.wallDepth;

  constructor(
    private readonly start: Rect,
    private readonly end: Rect,
    coreMat: THREE.Material,
    box: THREE.BufferGeometry,
  ) {
    this.cores = new THREE.InstancedMesh(box, coreMat, EDGES.length);
    this.cores.castShadow = this.cores.receiveShadow = true;
    this.cores.frustumCulled = false;
    this.cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.cores);
    this.perEdge = Math.ceil(Math.max(end.max.x - end.min.x, end.max.z - end.min.z) / PIECE);
    this.set(0);
  }

  /** The kit has loaded: the faces and caps, in the floor's look. */
  build(kit: THREE.Object3D, material: (src: THREE.MeshStandardMaterial) => THREE.Material, style: DungeonStyle = BRICK) {
    const wall = kit.getObjectByName(style.wall);
    const cap = kit.getObjectByName(style.cap);
    this.depth = style.wallDepth;
    if (!wall || !cap) return;
    const n = EDGES.length * this.perEdge;
    this.walls = new Pieces(wall, material, n * ROWS, this.group);
    this.caps = new Pieces(cap, material, n, this.group);
    const k = this.shown;
    this.shown = -1;
    this.set(Math.max(0, k));
  }

  /** `k`: how far the walls have slid back (0..1). */
  set(k: number) {
    if (k === this.shown) return;
    this.shown = k;
    this.group.visible = k < 1;
    if (k >= 1) return;
    const s = this.start;
    const e = this.end;
    const x0 = s.min.x + (e.min.x - s.min.x) * k;
    const x1 = s.max.x + (e.max.x - s.max.x) * k;
    const z0 = s.min.z + (e.min.z - s.min.z) * k;
    const z1 = s.max.z + (e.max.z - s.max.z) * k;
    const top = HEIGHT.wall! - 0.02;
    for (let b = 0; b < EDGES.length; b++) {
      const edge = EDGES[b];
      // The block between the room's edge and the moving face; its face, and how thick it is.
      const thick = edge === 'w' ? x0 - e.min.x : edge === 'e' ? e.max.x - x1 : edge === 'n' ? z0 - e.min.z : e.max.z - z1;
      const along = edge === 'w' || edge === 'e';
      const face = edge === 'w' ? x0 : edge === 'e' ? x1 : edge === 'n' ? z0 : z1;
      const inward = edge === 'w' || edge === 'n' ? 1 : -1;
      // The core: from the room's edge to just behind the faces, from under the floor to just under the caps (the side
      // blocks run the room's whole depth; the end blocks reach a little into them so no seam opens at the corners).
      const lo = edge === 'w' ? e.min.x : edge === 'e' ? x1 + CORE_INSET : edge === 'n' ? e.min.z : z1 + CORE_INSET;
      const hi = edge === 'w' ? x0 - CORE_INSET : edge === 'e' ? e.max.x : edge === 'n' ? z0 - CORE_INSET : e.max.z;
      if (thick <= GONE || hi <= lo) {
        this.cores.setMatrixAt(b, HIDE);
      } else {
        const span0 = along ? e.min.z : x0 - CORE_INSET;
        const span1 = along ? e.max.z : x1 + CORE_INSET;
        pos.set(along ? (lo + hi) / 2 : (span0 + span1) / 2, (CORE_BOTTOM + top) / 2, along ? (span0 + span1) / 2 : (lo + hi) / 2);
        scale.set(along ? hi - lo : span1 - span0, top - CORE_BOTTOM, along ? span1 - span0 : hi - lo);
        this.cores.setMatrixAt(b, m.compose(pos, q.identity(), scale));
      }
      if (!this.walls || !this.caps) continue;
      // Brick faces along its inside edge, the room's whole length.
      const from = along ? e.min.z : e.min.x;
      const at = face - inward * (this.depth / 2);
      for (let j = 0; j < this.perEdge; j++) {
        const i = b * this.perEdge + j;
        const u = from + PIECE / 2 + j * PIECE;
        if (thick <= GONE) {
          for (let r = 0; r < ROWS; r++) this.walls.hide(i * ROWS + r);
          this.caps.hide(i);
          continue;
        }
        const x = along ? at : u;
        const z = along ? u : at;
        for (let r = 0; r < ROWS; r++) this.walls.place(i * ROWS + r, x, r * PIECE, z, TURN[edge]);
        this.caps.place(i, x, ROWS * PIECE, z, TURN[edge]);
      }
    }
    this.cores.instanceMatrix.needsUpdate = true;
    this.walls?.commit();
    this.caps?.commit();
  }
}
