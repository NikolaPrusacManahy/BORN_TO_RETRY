// Update 0.3.9 (the designer: "The animation for the pillar is simply break in half and the upper part fly and rest
// fixed once landed … Not just that kind of pillar, anything that looks like this kind of fixed architecture") — a
// pillar broken by the pillar finisher (sim/combat/pillars.ts). Its pieces (every kit piece standing in its cell: the
// column, whatever the floor's look, and anything on it, as the dungeon drew them: dungeonView.ts) are taken out of
// their instanced meshes and cut where it snaps (each triangle across the cut cut in two along it), the stone flying
// from the break (combatFeedback.ts). The lower half stays standing with broken stone on top; the upper half flies off the way the body was punched, tipping
// over, and lies where it lands (along that way, or across it where the wall is too close) and stays there. Made in
// code from the kit's own pieces. Update 0.3.10 — it lands where the rules say it lies (its collision is there).
// Update 0.3.29 — the Moon's boss, Tidebreaker, tears one out (`uproot`): cut the same way, the stump left, the rest
// handed over to be carried and hurled (engine/pillarEvents.ts) till it smashes (`shatter`).
import * as THREE from 'three';
import { Pillar, PILLAR_CUT } from '../sim/combat/pillars';

/** How long the upper half flies (s), how high it rises on the way (m); the broken stone's shade (× the stone's). */
const FALL = 0.75;
const ARC = 1.1;
const SHADE = 0.6;

interface Falling {
  pivot: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  turn: THREE.Quaternion;
  t: number;
}

const m = new THREE.Matrix4();
const none = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** `g` (world, unindexed) cut at height `cut`: what's below and above (a triangle across it cut in two along it, every
 *  attribute carried to the cut), and how far from the axis at (`x`, `z`) its surface reaches there (m). */
export function splitAt(g: THREE.BufferGeometry, cut: number, x: number, z: number): [THREE.BufferGeometry | null, THREE.BufferGeometry | null, number] {
  // (The position first, whatever order the kit's attributes come in.)
  const attrs = Object.entries(g.attributes).sort((a, b) => (a[0] === 'position' ? -1 : b[0] === 'position' ? 1 : 0));
  const width = attrs.reduce((n, [, a]) => n + a.itemSize, 0);
  const pos = g.attributes.position;
  const out: number[][] = [[], []];
  let reach = 0;
  // A vertex as all its attributes in a row (the position first).
  const vert = (k: number) => {
    const v: number[] = [];
    for (const [, a] of attrs) for (let c = 0; c < a.itemSize; c++) v.push(a.getComponent(k, c));
    return v;
  };
  const across = (a: number[], b: number[]) => {
    const t = (cut - a[1]) / (b[1] - a[1]);
    const v = a.map((n, i) => n + (b[i] - n) * t);
    reach = Math.max(reach, Math.hypot(v[0] - x, v[2] - z));
    return v;
  };
  const tri = (side: number, a: number[], b: number[], c: number[]) => out[side].push(...a, ...b, ...c);
  for (let t = 0; t < pos.count; t += 3) {
    const v = [vert(t), vert(t + 1), vert(t + 2)];
    const up = v.map((p) => (p[1] >= cut ? 1 : 0));
    const n = up[0] + up[1] + up[2];
    if (n === 0 || n === 3) {
      tri(n ? 1 : 0, v[0], v[1], v[2]);
      continue;
    }
    // The one alone on its side first (the turn kept), the other two after.
    const lone = up.findIndex((s) => (n === 1 ? s === 1 : s === 0));
    const [a, b, c] = [v[lone], v[(lone + 1) % 3], v[(lone + 2) % 3]];
    const ab = across(a, b);
    const ac = across(a, c);
    const side = up[lone];
    tri(side, a, ab, ac);
    tri(1 - side, ab, b, c);
    tri(1 - side, ab, c, ac);
  }
  const half = (flat: number[]) => {
    if (!flat.length) return null;
    const geo = new THREE.BufferGeometry();
    const count = flat.length / width;
    let o = 0;
    for (const [name, a] of attrs) {
      const n = a.itemSize;
      const arr = new Float32Array(count * n);
      for (let k = 0; k < count; k++) for (let c = 0; c < n; c++) arr[k * n + c] = flat[k * width + o + c];
      geo.setAttribute(name, new THREE.BufferAttribute(arr, n));
      o += n;
    }
    return geo;
  };
  return [half(out[0]), half(out[1]), reach];
}

export class PillarBreaks {
  readonly group = new THREE.Group();
  private readonly pieces = new Map<number, { mesh: THREE.InstancedMesh; index: number; copy: boolean }[]>();
  private readonly falling: Falling[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];

  /** Instance `index` of `mesh` stands in pillar `i`'s cell. Update 0.3.39 — `copy`: a far copy of a piece (floorPieces.ts):
   *  hidden with it, no stone of its own. */
  add(i: number, mesh: THREE.InstancedMesh, index: number, copy = false) {
    let list = this.pieces.get(i);
    if (!list) this.pieces.set(i, (list = []));
    list.push({ mesh, index, copy });
  }

  /** Pillar `i` (`p`) breaks. */
  break(i: number, p: Pillar) {
    const cut = this.cut(i, p);
    if (!cut) return;
    // Where it lands: where the rules have it lie (the way it fell, or across it where the wall's too close).
    const lie = new THREE.Vector3(-Math.sin(p.lie.yaw), 0, -Math.cos(p.lie.yaw));
    const to = new THREE.Vector3(p.lie.x, cut.reach, p.lie.z);
    this.falling.push({ pivot: cut.top, from: cut.top.position.clone(), to, turn: new THREE.Quaternion().setFromUnitVectors(UP, lie), t: 0 });
  }

  /** Update 0.3.29 — pillar `i` (`p`) torn out whole: its stump left standing, the rest (its snapped end at its origin,
   *  running up +y) given back to be carried; null if it has no pieces. */
  uproot(i: number, p: Pillar): THREE.Object3D | null {
    return this.cut(i, p)?.top ?? null;
  }

  /** Update 0.3.29 — a carried pillar smashed to pieces: gone (the stone flying is combat feedback's). */
  shatter(top: THREE.Object3D) {
    top.visible = false;
    top.removeFromParent();
  }

  /** Pillar `i`'s pieces taken out of the floor's meshes and cut where it snaps: its stump left there, its upper half's
   *  group (at the cut) and how far its stone reaches there. */
  private cut(i: number, p: Pillar): { top: THREE.Group; reach: number } | null {
    const refs = this.pieces.get(i);
    if (!refs) return null;
    this.pieces.delete(i);
    const cut = p.h * PILLAR_CUT;
    const low = new THREE.Group();
    const top = new THREE.Group();
    top.position.set(p.x, cut, p.z);
    let reach = 0.3;
    let stone: THREE.Color | null = null;
    for (const { mesh, index, copy } of refs) {
      mesh.getMatrixAt(index, m);
      mesh.setMatrixAt(index, HIDDEN);
      mesh.instanceMatrix.needsUpdate = true;
      if (copy) continue;
      const g = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(m);
      const [below, above, r] = splitAt(g, cut, p.x, p.z);
      g.dispose();
      reach = Math.max(reach, r);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      stone ??= mat.color ?? null;
      if (below) low.add(this.mesh(below, mat));
      if (above) top.add(this.mesh(above.translate(-p.x, -cut, -p.z), mat));
    }
    // The broken stone: on the stump, and under the upper half.
    const capMat = new THREE.MeshStandardMaterial({ color: (stone ?? new THREE.Color(0x9a9a9a)).clone().multiplyScalar(SHADE), roughness: 1 });
    this.mats.push(capMat);
    const capGeo = new THREE.CircleGeometry(reach * 0.92, 9).rotateX(-Math.PI / 2);
    this.geos.push(capGeo);
    const capLow = new THREE.Mesh(capGeo, capMat);
    capLow.position.set(p.x, cut - 0.01, p.z);
    const capTop = new THREE.Mesh(capGeo, capMat);
    capTop.rotation.x = Math.PI;
    capTop.position.y = 0.01;
    top.add(capTop);
    low.add(capLow);
    this.group.add(low, top);
    return { top, reach };
  }

  private mesh(g: THREE.BufferGeometry, mat: THREE.Material) {
    g.computeBoundingSphere();
    this.geos.push(g);
    const out = new THREE.Mesh(g, mat);
    out.castShadow = out.receiveShadow = true;
    return out;
  }

  /** The upper halves flying, till they've landed (then they stay). */
  update(dt: number) {
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      const k = Math.min(1, f.t / FALL);
      f.pivot.position.lerpVectors(f.from, f.to, k).addScaledVector(UP, ARC * 4 * k * (1 - k));
      f.pivot.quaternion.copy(none).slerp(f.turn, k * k);
      if (k >= 1) this.falling.splice(i, 1);
    }
  }

  /** Anything still flying (for tests). */
  get busy() {
    return this.falling.length > 0;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of this.geos) g.dispose();
    for (const mat of this.mats) mat.dispose();
  }
}
