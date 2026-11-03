// Update 0.3.34 — an island crashed into floor 8's boss arena, as it lies once Yokai : Okami's show is over
// (world/dungeon/okamiIsles.ts; the designer: "becoming a walkable surface once crashed into the arena, making this a
// very dynamic looking arena with bits of island"): its rock sunk in, a mound you walk up (over its terraces' boxes: as
// wide at its foot, as high at its top), its grass top, shards of its rock thrown up round its foot and the floor
// scorched there; what stood on it (its piece, its sakura: the kit's, as the floor draws them). Made in code.
import * as THREE from 'three';
import type { Isle } from '../../world/dungeon/okamiIsles';
import { kitOf } from '../../world/dungeon/okamiIsles';

/** Its mound from this share of its radius at its foot to this at its top; its grass this thick (m); this many shards
 *  round it. */
const FOOT = 0.94;
const TOP = 0.58;
const GRASS = 0.12;
const SHARDS = 7;

export type KitMaterial = (src: THREE.MeshStandardMaterial, piece: string) => THREE.Material;

/** The kit's piece `name`, its materials the floor's, at (x, y, z), turned, scaled. */
export function kitPiece(kit: THREE.Object3D, name: string, material: KitMaterial, x: number, y: number, z: number, turn: number, s: number): THREE.Object3D | null {
  const src = kit.getObjectByName(name);
  if (!src) return null;
  const p = src.clone(true);
  p.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.material = Array.isArray(o.material) ? o.material.map((m) => material(m as THREE.MeshStandardMaterial, name)) : material(o.material as THREE.MeshStandardMaterial, name);
    o.castShadow = o.receiveShadow = true;
  });
  p.position.set(x, y, z);
  p.rotation.set(0, turn, 0);
  p.scale.setScalar(s);
  return p;
}

export class IsleMeshes {
  private readonly stuff: { dispose(): void }[] = [];
  private readonly rock = new THREE.MeshStandardMaterial({ color: 0x8d8478, roughness: 1, flatShading: true });
  private readonly grass = new THREE.MeshStandardMaterial({ color: 0x7f9c55, roughness: 1, flatShading: true });
  private readonly scorch = new THREE.MeshBasicMaterial({ color: 0x2b2420, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  constructor() {
    this.stuff.push(this.rock, this.grass, this.scorch);
  }

  /** Island `isle` as it lies in the arena (its own group, placed in the world). */
  build(isle: Isle, index: number, kit: THREE.Object3D, material: KitMaterial): THREE.Group {
    const g = new THREE.Group();
    let seed = 777 + index * 131;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    const r = isle.r;
    // Its mound, jagged at its sides, sunk a little under the floor.
    const mound = new THREE.CylinderGeometry(r * TOP, r * FOOT, isle.top + 0.6, 12, 3).translate(0, (isle.top + 0.6) / 2 - 0.6, 0);
    const p = mound.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      if (y > isle.top - 0.01 || y < -0.55) continue;
      const j = 0.9 + 0.2 * rnd();
      p.setXYZ(k, p.getX(k) * j, y + (rnd() - 0.5) * 0.25, p.getZ(k) * j);
    }
    mound.computeVertexNormals();
    const top = new THREE.CylinderGeometry(r * TOP * 1.02, r * TOP * 1.06, GRASS, 12).translate(0, isle.top + GRASS / 2 - 0.02, 0);
    const burn = new THREE.CircleGeometry(r * 1.35, 24).rotateX(-Math.PI / 2).translate(0, 0.03, 0);
    this.stuff.push(mound, top, burn);
    const m = new THREE.Mesh(mound, this.rock);
    const t = new THREE.Mesh(top, this.grass);
    m.castShadow = m.receiveShadow = t.receiveShadow = true;
    g.add(m, t, new THREE.Mesh(burn, this.scorch));
    // Shards of its rock, thrown up round its foot as it struck, leaning out.
    for (let k = 0; k < SHARDS; k++) {
      const a = (k / SHARDS) * Math.PI * 2 + rnd() * 0.6;
      const size = r * (0.12 + 0.12 * rnd());
      const shard = new THREE.ConeGeometry(size * 0.55, size * 1.6, 5).translate(0, size * 0.5, 0);
      this.stuff.push(shard);
      const s = new THREE.Mesh(shard, this.rock);
      const out = r * (FOOT + 0.08 + 0.1 * rnd());
      s.position.set(Math.cos(a) * out, -0.1, Math.sin(a) * out);
      s.rotation.set(Math.sin(a) * (0.5 + 0.4 * rnd()), rnd() * Math.PI, -Math.cos(a) * (0.5 + 0.4 * rnd()));
      s.castShadow = true;
      g.add(s);
    }
    g.position.set(isle.x, 0, isle.z);
    // What stood on it, on its top (world places, so out of the group's).
    const on = new THREE.Group();
    on.position.set(-isle.x, 0, -isle.z);
    if (isle.piece) {
      const pc = kitPiece(kit, kitOf(isle.piece.kind), material, isle.piece.x, isle.top, isle.piece.z, isle.piece.turn, isle.piece.s);
      if (pc) on.add(pc);
    }
    for (const tr of isle.trees) {
      const pc = kitPiece(kit, tr.name, material, tr.x, isle.top, tr.z, tr.turn, 1);
      if (pc) on.add(pc);
    }
    g.add(on);
    return g;
  }

  dispose() {
    for (const s of this.stuff) s.dispose();
  }
}
