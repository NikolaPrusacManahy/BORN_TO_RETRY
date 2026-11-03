// Update 0.3.38 — a menu scene's still pieces merged (the designer: "when I boot up the game my PC go full fan speed"):
// the gate came as 653 meshes and the camp as 207, each drawn on its own every frame, and again in the moon's shadows.
// Now the pieces that look the same (one material, or copies of it) are one mesh (baked where they stand): a few dozen
// to draw. What moves, or is looked up by name later, is kept as it came (`keep`: it and all under it).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A geometry's layout: meshes are merged only with others laid out the same. */
function layoutOf(g: THREE.BufferGeometry): string {
  const attrs = Object.keys(g.attributes)
    .sort()
    .map((k) => {
      const a = g.attributes[k] as THREE.BufferAttribute;
      return `${k}:${a.itemSize}:${a.normalized ? 1 : 0}:${a.array.constructor.name}`;
    });
  return `${g.index ? 'i' : 'n'}|${attrs.join(',')}|${Object.keys(g.morphAttributes).length}`;
}

/** A material by how it looks (flat colours: Blender's copies of one, Green.031 and Green, are the same); with a texture,
 *  only itself. */
function lookOf(m: THREE.Material): string {
  if (!(m instanceof THREE.MeshStandardMaterial) || m.map || m.normalMap || m.emissiveMap || m.alphaMap) return m.uuid;
  return [m.type, m.color.getHexString(), m.emissive.getHexString(), m.emissiveIntensity, m.roughness, m.metalness, m.transparent, m.opacity, m.side, m.vertexColors, m.flatShading, m.alphaTest].join(':');
}

/** A mirrored piece baked in turns inside out: its triangles' winding turned back. */
function unmirror(g: THREE.BufferGeometry) {
  const idx = g.index;
  if (idx) {
    for (let i = 0; i + 2 < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
    return;
  }
  for (const a of Object.values(g.attributes) as THREE.BufferAttribute[]) {
    const n = a.itemSize;
    for (let i = 0; i + 2 < a.count; i += 3)
      for (let k = 0; k < n; k++) {
        const v = a.array[(i + 1) * n + k];
        a.array[(i + 1) * n + k] = a.array[(i + 2) * n + k];
        a.array[(i + 2) * n + k] = v;
      }
  }
}

/** Merges `root`'s still meshes by material into `into` (world space; `root` should sit in it unmoved). Returns how
 *  many meshes there were and are. */
export function mergeStatic(root: THREE.Object3D, into: THREE.Object3D, keep: (o: THREE.Object3D) => boolean): { before: number; after: number } {
  root.updateMatrixWorld(true);
  const kept = new Set<THREE.Object3D>();
  root.traverse((o) => {
    if (keep(o)) o.traverse((c) => kept.add(c));
  });
  const groups = new Map<string, THREE.Mesh[]>();
  let before = 0;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    before++;
    if (kept.has(o) || o instanceof THREE.SkinnedMesh || o instanceof THREE.InstancedMesh || Array.isArray(o.material)) return;
    const k = `${lookOf(o.material as THREE.Material)}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${layoutOf(o.geometry)}`;
    let list = groups.get(k);
    if (!list) groups.set(k, (list = []));
    list.push(o);
  });
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => {
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (o.matrixWorld.determinant() < 0) unmirror(g);
      return g;
    });
    const geo = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!geo) continue;
    const first = list[0];
    const mesh = new THREE.Mesh(geo, first.material);
    mesh.name = `merged ${(first.material as THREE.Material).name}`;
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    into.add(mesh);
    for (const o of list) o.removeFromParent();
    merged += list.length - 1;
  }
  return { before, after: before - merged };
}
