// Update 0.3.65 — the bones on the floor of Hellwarden's throne room (the designer's shot list: "the bones scattered around the arena drag across the floor
// and slide into the lava river. He is built from the player's dead"). Lying there as you come in; in its show, pulled by nothing, jerking at first,
// faster and faster, each into the nearest of the river, and gone in a spit of fire; a few left in a heap on its bank, for the skull that'll be its
// mask. None in the fight. The more you've fallen, the more there are.
import * as THREE from 'three';
import { wardenBeats } from '../../sim/dungeon/wardenShow';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { type ThroneBone, throneBones } from '../../world/dungeon/throne';
import type { FloorPlan } from '../../world/dungeon/floorPlan';
import { HALOS } from '../halos';
import type { KitMaterial } from '../shrine/isleMesh';

/** How hard they speed up; the river's half-width and half-length as they see it (m); how long a spit of fire lasts (s). */
const PULL = 2.4;
const SPITS = 48;
const SPIT = 0.36;

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);
const IDENTITY = new THREE.Quaternion();

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

interface Lot {
  mesh: THREE.InstancedMesh;
  bones: ThroneBone[];
}

export class ThroneBones {
  readonly group = new THREE.Group();
  private readonly lots: Lot[] = [];
  private readonly bones: ThroneBone[];
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
  private readonly spitMat = new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly spits = new THREE.InstancedMesh(this.coneGeo, this.spitMat, SPITS);
  private readonly own: { dispose(): void }[] = [];
  private lastT = -1;

  constructor(plan: FloorPlan, mx: number, mz: number, ux: number, uz: number, riverHalf: number, riverLong: number, extra: number) {
    this.bones = throneBones(plan, mx, mz, ux, uz, riverHalf, riverLong, extra);
    this.spits.frustumCulled = false;
    this.spits.count = 0;
    this.group.add(this.spits);
  }

  /** How many are lying there (for the tests). */
  get count() {
    return this.bones.length;
  }

  get list(): readonly ThroneBone[] {
    return this.bones;
  }

  /** The kit's come: an instanced mesh for each piece. */
  take(kit: THREE.Object3D, material?: KitMaterial) {
    const pieces = new Map<string, ThroneBone[]>();
    for (const b of this.bones) pieces.set(b.piece, [...(pieces.get(b.piece) ?? []), b]);
    for (const [piece, bones] of pieces) {
      let src: THREE.Mesh | null = null;
      kit.getObjectByName(piece)?.traverse((o) => {
        if (!src && o instanceof THREE.Mesh) src = o;
      });
      if (!src) continue;
      const s = src as THREE.Mesh;
      const mat = material ? material(s.material as THREE.MeshStandardMaterial, piece) : (s.material as THREE.Material);
      const mesh = new THREE.InstancedMesh(s.geometry, mat, bones.length);
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.own.push(mesh);
      this.lots.push({ mesh, bones });
      this.group.add(mesh);
    }
    this.lastT = -1;
    this.place(0);
  }

  /** Where it is at `t`: at its place, or dragged toward the lava; false once it's gone. */
  private where(b: ThroneBone, t: number): boolean {
    const s = wardenBeats();
    const stretch = HELLWARDEN.v.showBones / 3;
    const from = s.bonesFrom + b.delay * stretch;
    const long = b.dur * stretch;
    const k = (t - from) / long;
    if (b.keep || k <= 0) {
      pos.set(b.x, 0, b.z);
      q.setFromAxisAngle(Y, b.yaw);
      return true;
    }
    if (k >= 1) return false;
    const e = k ** PULL;
    // Jerking at first, as if on a rope.
    const jerk = Math.sin(k * 15 + b.seed * 6) * 0.22 * (1 - k);
    pos.set(b.x + (b.toX - b.x) * e - (b.toZ - b.z) * jerk * 0.1, 0, b.z + (b.toZ - b.z) * e + (b.toX - b.x) * jerk * 0.1);
    // Under, once it's over the edge.
    const sink = smooth((e - b.edge) / Math.max(0.05, 1 - b.edge));
    pos.y = -1.5 * sink;
    q.setFromAxisAngle(Y, b.yaw + e * (b.seed - 0.5) * 7);
    return true;
  }

  private place(t: number) {
    for (const lot of this.lots) {
      lot.bones.forEach((b, i) => {
        const here = this.where(b, t);
        lot.mesh.setMatrixAt(i, m.compose(pos, q, scl.setScalar(here ? b.size : 0)));
      });
      lot.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** `t`: the show's time, stopped through its freeze frame; off: gone (the fight), or lying there (`waiting`). */
  update(state: 'waiting' | 'show' | 'gone', t: number) {
    this.group.visible = state !== 'gone';
    if (state !== 'show') {
      this.spits.count = 0;
      // (Back as they were, for a floor played again in the same view.)
      if (state === 'waiting' && this.lastT >= 0) {
        this.lastT = -1;
        this.place(0);
      }
      return;
    }
    const s = wardenBeats();
    if (t === this.lastT || t < s.bonesFrom - 0.1) {
      this.spits.count = 0;
      return;
    }
    // (All gone by then: once, in case the frames jumped past it.)
    if (t > s.bonesTo + 0.3) {
      this.spits.count = 0;
      if (this.lastT <= s.bonesTo + 0.3) this.place(t);
      this.lastT = t;
      return;
    }
    this.lastT = t;
    this.place(t);
    // A spit of fire where each goes in.
    let n = 0;
    const stretch = HELLWARDEN.v.showBones / 3;
    for (const b of this.bones) {
      if (b.keep) continue;
      const hit = s.bonesFrom + (b.delay + b.dur * b.edge ** (1 / PULL)) * stretch;
      const age = t - hit;
      if (age < 0 || age >= SPIT || n >= SPITS) continue;
      const k = age / SPIT;
      const h = Math.sin(k * Math.PI) * (1.4 + b.size * 1.6);
      pos.set(b.x + (b.toX - b.x) * b.edge, 0.05, b.z + (b.toZ - b.z) * b.edge);
      this.spits.setMatrixAt(n++, m.compose(pos, IDENTITY, scl.set(0.5 * b.size + 0.2, h, 0.5 * b.size + 0.2)));
      if (n < 12) HALOS.add(pos.x, 0.6, pos.z, 2.2 * (1 - k), 0xff8a30, 0.7);
    }
    this.spits.count = n;
    if (n > 0) this.spits.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.spits.dispose();
    this.coneGeo.dispose();
    this.spitMat.dispose();
    for (const o of this.own) o.dispose();
  }
}
