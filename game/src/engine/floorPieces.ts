// Update 0.3.38 — a floor's kit pieces drawn area by area (the designer: "when I boot up the game my PC go full fan
// speed … That sounds so heavy for what it is supposed to be"). They were one InstancedMesh per piece for the whole
// floor, so each was as big as the floor and never left out: every tile and wall of every room drawn every frame,
// wherever you stood (4–15 million triangles), and the walls again in the sun's shadows. Now each piece is instanced
// per square of the floor (AREA m a side): a square out of view, or out of the sun's shadow box round you, isn't drawn.
// The same pieces where they were, the same materials (one per piece and part, shared by its squares).
// Update 0.3.39 (the designer: "next", fix 4) — and far off, the heaviest pieces lighter: a square more than FAR_FROM
// from you draws the far kit's copies of its pieces (kit_far.glb, tools/blender/kit_far.py: floor 1's tile, wall and
// wall cap, each stone its box), back to the real ones once you're within it again (a little nearer: no flicker on the
// line). The same places, the same materials (a far part takes its near part's, by name); a near part the far piece
// hasn't (a stone's chips) isn't drawn far off.
import * as THREE from 'three';
import type { Placement } from '../world/dungeon/dressing';

/** A square's side (m). */
export const AREA = 30;
/** A square this far from you (m, to its nearest edge) draws its far copies; back to its real pieces nearer than
 *  NEAR_AGAIN. */
export const FAR_FROM = 15;
const NEAR_AGAIN = 12;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** The square a place is in. */
export const areaOf = (x: number, z: number) => `${Math.floor(x / AREA)},${Math.floor(z / AREA)}`;

/** `list` by square. */
export function byArea<T extends { x: number; z: number }>(list: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const p of list) {
    const k = areaOf(p.x, p.z);
    let a = out.get(k);
    if (!a) out.set(k, (a = []));
    a.push(p);
  }
  return out;
}

interface Square {
  /** Its middle (m). */
  x: number;
  z: number;
  near: THREE.InstancedMesh[];
  far: THREE.InstancedMesh[];
  isFar: boolean;
}

/** The squares with far copies, each drawing its real pieces or its far ones by how far you are. */
export class FloorAreas {
  readonly squares = new Map<string, Square>();

  /** Square `key`'s, made the first time it's asked for. */
  square(key: string): Square {
    let s = this.squares.get(key);
    if (!s) {
      const [i, j] = key.split(',').map(Number);
      this.squares.set(key, (s = { x: (i + 0.5) * AREA, z: (j + 0.5) * AREA, near: [], far: [], isFar: false }));
    }
    return s;
  }

  /** You (the camera) at `at`: each square near or far. */
  update(at: { x: number; z: number }) {
    for (const s of this.squares.values()) {
      const d = Math.hypot(Math.max(0, Math.abs(at.x - s.x) - AREA / 2), Math.max(0, Math.abs(at.z - s.z) - AREA / 2));
      const far = s.isFar ? d > NEAR_AGAIN : d > FAR_FROM;
      if (far === s.isFar) continue;
      s.isFar = far;
      for (const o of s.near) o.visible = !far;
      for (const o of s.far) o.visible = far;
    }
  }
}

/** A piece's parts (its meshes) and where each sits in it. */
function partsOf(root: THREE.Object3D): { mesh: THREE.Mesh; local: THREE.Matrix4 }[] {
  const inv = root.matrixWorld.clone().invert();
  const out: { mesh: THREE.Mesh; local: THREE.Matrix4 }[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) out.push({ mesh: o, local: inv.clone().multiply(o.matrixWorld) });
  });
  return out;
}

const matName = (o: THREE.Mesh) => (o.material as THREE.Material).name;

/** Every placement in `pieces` as instances of its kit piece, square by square, into `group`. `material`: a piece's
 *  part's material (asked once each); `casts`: its instances cast shadows (all take them); `each`: told of every
 *  instance (the pillars' pieces; `far`: a far copy's). `far`: the far kit (its pieces drawn instead far off). Returns
 *  the pieces the kit hadn't, and the squares with far copies. */
export function placeByArea(
  group: THREE.Object3D,
  kit: THREE.Object3D,
  pieces: readonly Placement[],
  material: (src: THREE.MeshStandardMaterial, piece: string) => THREE.Material,
  casts: (piece: string) => boolean,
  each?: (p: Placement, inst: THREE.InstancedMesh, i: number, far: boolean) => void,
  far?: THREE.Object3D,
): { missing: string[]; areas: FloorAreas } {
  const missing: string[] = [];
  const areas = new FloorAreas();
  const byPiece = new Map<string, Placement[]>();
  for (const p of pieces) {
    let list = byPiece.get(p.piece);
    if (!list) byPiece.set(p.piece, (list = []));
    list.push(p);
  }
  far?.updateMatrixWorld(true);
  for (const [name, list] of byPiece) {
    const root = kit.getObjectByName(name);
    if (!root) {
      missing.push(name);
      continue;
    }
    const farRoot = far?.getObjectByName(name);
    const near = partsOf(root);
    const mats = near.map(({ mesh }) => material(mesh.material as THREE.MeshStandardMaterial, name));
    const farParts = farRoot ? partsOf(farRoot) : [];
    // A far part in its near part's material (the same name), else its own.
    const farMats = farParts.map(({ mesh }) => {
      const k = near.findIndex((n) => matName(n.mesh) === matName(mesh));
      return k >= 0 ? mats[k] : material(mesh.material as THREE.MeshStandardMaterial, name);
    });
    const shadows = casts(name);
    for (const [key, here] of byArea(list)) {
      const square = farParts.length > 0 ? areas.square(key) : null;
      const make = (geo: THREE.BufferGeometry, mat: THREE.Material, local: THREE.Matrix4, isFar: boolean) => {
        const inst = new THREE.InstancedMesh(geo, mat, here.length);
        inst.name = `${name}@${key}${isFar ? ' far' : ''}`;
        here.forEach((p, i) => {
          pos.set(p.x, p.y, p.z);
          q.setFromAxisAngle(UP, p.rot);
          scale.set(p.sx, p.sy, p.sz);
          inst.setMatrixAt(i, m.compose(pos, q, scale).multiply(local));
          each?.(p, inst, i, isFar);
        });
        inst.computeBoundingSphere();
        inst.castShadow = shadows;
        inst.receiveShadow = true;
        inst.visible = !isFar;
        group.add(inst);
        (isFar ? square!.far : square?.near)?.push(inst);
      };
      near.forEach(({ mesh, local }, k) => make(mesh.geometry, mats[k], local, false));
      farParts.forEach(({ mesh, local }, k) => make(mesh.geometry, farMats[k], local, true));
    }
  }
  return { missing, areas };
}
