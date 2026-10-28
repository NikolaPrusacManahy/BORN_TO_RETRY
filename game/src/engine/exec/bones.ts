// Update 0.1.2 — a body's bones by name, looked up once per body (kept on it), so per-frame code finds them without
// searching.
import type * as THREE from 'three';

export function boneOf(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let map = root.userData.bones as Map<string, THREE.Object3D> | undefined;
  if (!map) {
    map = new Map();
    root.traverse((o) => {
      if (o.name && !map!.has(o.name)) map!.set(o.name, o);
    });
    root.userData.bones = map;
  }
  return map.get(name) ?? null;
}
