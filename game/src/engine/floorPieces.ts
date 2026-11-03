// Update 0.3.38 — a floor's kit pieces drawn area by area (the designer: "when I boot up the game my PC go full fan
// speed … That sounds so heavy for what it is supposed to be"). They were one InstancedMesh per piece for the whole
// floor, so each was as big as the floor and never left out: every tile and wall of every room drawn every frame,
// wherever you stood (4–15 million triangles), and the walls again in the sun's shadows. Now each piece is instanced
// per square of the floor (AREA m a side): a square out of view, or out of the sun's shadow box round you, isn't drawn.
// The same pieces where they were, the same materials (one per piece and part, shared by its squares).
import * as THREE from 'three';
import type { Placement } from '../world/dungeon/dressing';

/** A square's side (m). */
export const AREA = 30;

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

/** Every placement in `pieces` as instances of its kit piece, square by square, into `group`. `material`: a piece's
 *  part's material (asked once each); `casts`: its instances cast shadows (all take them); `each`: told of every
 *  instance (the pillars' pieces). Returns the pieces the kit hadn't. */
export function placeByArea(
  group: THREE.Object3D,
  kit: THREE.Object3D,
  pieces: readonly Placement[],
  material: (src: THREE.MeshStandardMaterial, piece: string) => THREE.Material,
  casts: (piece: string) => boolean,
  each?: (p: Placement, inst: THREE.InstancedMesh, i: number) => void,
): string[] {
  const missing: string[] = [];
  const byPiece = new Map<string, Placement[]>();
  for (const p of pieces) {
    let list = byPiece.get(p.piece);
    if (!list) byPiece.set(p.piece, (list = []));
    list.push(p);
  }
  for (const [name, list] of byPiece) {
    const root = kit.getObjectByName(name);
    if (!root) {
      missing.push(name);
      continue;
    }
    const inv = root.matrixWorld.clone().invert();
    const areas = byArea(list);
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const local = inv.clone().multiply(o.matrixWorld);
      const mat = material(o.material as THREE.MeshStandardMaterial, name);
      for (const [key, here] of areas) {
        const inst = new THREE.InstancedMesh(o.geometry, mat, here.length);
        inst.name = `${name}@${key}`;
        here.forEach((p, i) => {
          pos.set(p.x, p.y, p.z);
          q.setFromAxisAngle(UP, p.rot);
          scale.set(p.sx, p.sy, p.sz);
          inst.setMatrixAt(i, m.compose(pos, q, scale).multiply(local));
          each?.(p, inst, i);
        });
        inst.computeBoundingSphere();
        inst.castShadow = casts(name);
        inst.receiveShadow = true;
        group.add(inst);
      }
    });
  }
  return missing;
}
