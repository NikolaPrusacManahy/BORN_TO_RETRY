// Update 0.2.9 — kit placements drawn as instances, as dungeonView.ts draws a floor (one InstancedMesh per piece and
// material, so a hall of a thousand pieces stays cheap), from any number of loaded kits (the lobby has the dungeon's
// and its own). The kit's flat colours, a little rough; fire and candle wax glow.
import * as THREE from 'three';
import type { Placement } from '../world/dungeon/dressing';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** A kit material as the game draws it (a clone, kept in `mats` to dispose). */
export function kitMaterial(src: THREE.MeshStandardMaterial, mats: THREE.Material[]): THREE.MeshStandardMaterial {
  const mat = src.clone();
  mat.roughness = 0.9;
  mat.metalness = 0;
  if (/fire|candle/i.test(src.name)) {
    mat.emissive.copy(src.color);
    mat.emissiveIntensity = 2.2;
  }
  mats.push(mat);
  return mat;
}

/** Every placement in `pieces` as instances of its piece (found by name in `kits`) into `group`; `casts(piece)`: its
 *  instances cast shadows (all take them). Returns the pieces no kit had. */
export function instancePieces(group: THREE.Group, kits: THREE.Object3D[], pieces: readonly Placement[], mats: THREE.Material[], casts: (piece: string) => boolean): string[] {
  const missing: string[] = [];
  const byPiece = new Map<string, Placement[]>();
  for (const p of pieces) {
    let list = byPiece.get(p.piece);
    if (!list) byPiece.set(p.piece, (list = []));
    list.push(p);
  }
  for (const k of kits) k.updateMatrixWorld(true);
  for (const [name, list] of byPiece) {
    const root = kits.map((k) => k.getObjectByName(name)).find((o) => o);
    if (!root) {
      missing.push(name);
      continue;
    }
    const inv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const local = inv.clone().multiply(o.matrixWorld);
      const inst = new THREE.InstancedMesh(o.geometry, kitMaterial(o.material as THREE.MeshStandardMaterial, mats), list.length);
      list.forEach((p, i) => {
        pos.set(p.x, p.y, p.z);
        q.setFromAxisAngle(UP, p.rot);
        scale.set(p.sx, p.sy, p.sz);
        inst.setMatrixAt(i, m.compose(pos, q, scale).multiply(local));
      });
      inst.computeBoundingSphere();
      inst.castShadow = casts(name);
      inst.receiveShadow = true;
      group.add(inst);
    });
  }
  return missing;
}

/** Plain boxes (centre and size) as one InstancedMesh of a unit cube. */
export function boxInstances(boxes: readonly { x: number; y: number; z: number; w: number; h: number; d: number }[], mat: THREE.Material, geo: THREE.BoxGeometry): THREE.InstancedMesh {
  const inst = new THREE.InstancedMesh(geo, mat, boxes.length);
  boxes.forEach((b, i) => inst.setMatrixAt(i, m.compose(pos.set(b.x, b.y, b.z), q.identity(), scale.set(b.w, b.h, b.d))));
  inst.computeBoundingSphere();
  inst.receiveShadow = true;
  return inst;
}
