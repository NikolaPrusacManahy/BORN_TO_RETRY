// Update 0.0.20 — the lava at the bottom of the pits: one glowing tile per lava cell (instanced), its glow breathing and
// its colour drifting between deep red and orange. The pits' sides are the kit's walls (dressing.ts); the warm lights
// over them are the torch lights that follow you.
import * as THREE from 'three';
import { LAVA_DEPTH } from '../world/dungeon/assemble';
import { CELL } from '../world/dungeon/floorPlan';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const DEEP = new THREE.Color(0xc8280a);
const HOT = new THREE.Color(0xff8a1e);

export class LavaView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2);
  private readonly mat = new THREE.MeshStandardMaterial({ color: 0x3a0a02, emissive: 0xff5a10, emissiveIntensity: 2, roughness: 0.6 });
  private time = 0;

  constructor(cells: readonly { x: number; z: number }[]) {
    if (cells.length === 0) return;
    const inst = new THREE.InstancedMesh(this.geo, this.mat, cells.length);
    cells.forEach((c, i) => inst.setMatrixAt(i, m.compose(pos.set(c.x, -LAVA_DEPTH + 0.02, c.z), q, one)));
    inst.computeBoundingSphere();
    this.group.add(inst);
  }

  update(dt: number) {
    this.time += dt;
    const k = 0.5 + 0.5 * Math.sin(this.time * 0.9);
    this.mat.emissive.copy(DEEP).lerp(HOT, k);
    this.mat.emissiveIntensity = 1.8 + 0.5 * Math.sin(this.time * 2.3);
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
