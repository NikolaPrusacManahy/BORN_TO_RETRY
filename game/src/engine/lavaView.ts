// Update 0.0.20 — the lava at the bottom of the pits: one glowing tile per lava cell (instanced), its glow breathing and
// its colour drifting between deep red and orange. The pits' sides are the kit's walls (dressing.ts); the warm lights
// over them are the torch lights that follow you.
// Update 0.2.23 — a look may fill the pits with something else (styles.ts `pit`: floor 2's green sludge), dimmer, and
// bubbling: bubbles swell on it here and there and pop.
import * as THREE from 'three';
import { LAVA_DEPTH } from '../world/dungeon/assemble';
import { CELL } from '../world/dungeon/floorPlan';
import type { PitLook } from '../world/dungeon/styles';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const size = new THREE.Vector3();
const LAVA: PitLook = { base: 0x3a0a02, deep: 0xc8280a, hot: 0xff8a1e, glow: 1 };
/** Update 0.2.23 — bubbles: one for every this many cells (at most BUBBLES), each swelling this long (s) to this size
 *  (m) before it pops. */
const BUBBLE_CELLS = 2;
const BUBBLES = 80;
const BUBBLE_LIFE = 1.6;
const BUBBLE_SIZE = 0.38;

interface Bubble {
  cell: number;
  dx: number;
  dz: number;
  t: number;
  life: number;
}

export class LavaView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2);
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly deep: THREE.Color;
  private readonly hot: THREE.Color;
  private readonly glow: number;
  private readonly bubbleGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  private readonly bubbleMat: THREE.MeshStandardMaterial | null = null;
  private readonly bubbles: Bubble[] = [];
  private readonly bubbleMesh: THREE.InstancedMesh | null = null;
  private time = 0;

  constructor(
    private readonly cells: readonly { x: number; z: number }[],
    look?: PitLook,
  ) {
    const k = look ?? LAVA;
    this.deep = new THREE.Color(k.deep);
    this.hot = new THREE.Color(k.hot);
    this.glow = k.glow;
    this.mat = new THREE.MeshStandardMaterial({ color: k.base, emissive: k.deep, emissiveIntensity: 2 * k.glow, roughness: 0.6 });
    if (cells.length === 0) return;
    const inst = new THREE.InstancedMesh(this.geo, this.mat, cells.length);
    cells.forEach((c, i) => inst.setMatrixAt(i, m.compose(pos.set(c.x, -LAVA_DEPTH + 0.02, c.z), q, one)));
    inst.computeBoundingSphere();
    this.group.add(inst);
    if (!look) return;
    this.bubbleMat = new THREE.MeshStandardMaterial({ color: k.base, emissive: k.hot, emissiveIntensity: 0.9 * k.glow, roughness: 0.3 });
    const n = Math.min(BUBBLES, Math.ceil(cells.length / BUBBLE_CELLS));
    for (let i = 0; i < n; i++) this.bubbles.push({ cell: 0, dx: 0, dz: 0, t: 0, life: 0 });
    for (const b of this.bubbles) {
      this.respawn(b);
      b.t = Math.random() * b.life;
    }
    this.bubbleMesh = new THREE.InstancedMesh(this.bubbleGeo, this.bubbleMat, n);
    this.bubbleMesh.frustumCulled = false;
    this.group.add(this.bubbleMesh);
  }

  /** A bubble starts again somewhere else. */
  private respawn(b: Bubble) {
    b.cell = Math.floor(Math.random() * this.cells.length);
    b.dx = (Math.random() - 0.5) * CELL * 0.8;
    b.dz = (Math.random() - 0.5) * CELL * 0.8;
    b.t = 0;
    b.life = BUBBLE_LIFE * (0.6 + 0.8 * Math.random());
  }

  update(dt: number) {
    this.time += dt;
    const k = 0.5 + 0.5 * Math.sin(this.time * 0.9);
    this.mat.emissive.copy(this.deep).lerp(this.hot, k * (this.bubbleMesh ? 0.35 : 1));
    this.mat.emissiveIntensity = (1.8 + 0.5 * Math.sin(this.time * 2.3)) * this.glow;
    const mesh = this.bubbleMesh;
    if (!mesh) return;
    this.bubbles.forEach((b, i) => {
      b.t += dt;
      if (b.t >= b.life) this.respawn(b);
      const c = this.cells[b.cell];
      const r = BUBBLE_SIZE * Math.sqrt(b.t / b.life);
      mesh.setMatrixAt(i, m.compose(pos.set(c.x + b.dx, -LAVA_DEPTH + 0.02, c.z + b.dz), q, size.set(r, r * 0.8, r)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.bubbleGeo.dispose();
    this.bubbleMat?.dispose();
  }
}
