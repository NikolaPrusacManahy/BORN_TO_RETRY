// Menu scenes (the gate, the camp) — what they share: finding marker positions, readying the materials (fires glow,
// everything else matte, shadows on), and flickering flame lights. Moved out of menuScene.ts when the camp joined.
import * as THREE from 'three';

/** A node's world position; throws if the model lacks it (the scene builders and the game share the names). */
export function nodeAt(root: THREE.Object3D, name: string): THREE.Vector3 {
  root.updateMatrixWorld(true);
  const o = root.getObjectByName(name);
  if (!o) throw new Error(`menu model: missing node ${name}`);
  return o.getWorldPosition(new THREE.Vector3());
}

/** Fire materials glow; everything else is matte and casts and takes shadows. Meshes named in `keep` are left as
 *  they come, with no shadows (glow panels). */
export function readyMaterials(root: THREE.Object3D, keep: readonly string[] = []) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const kept = keep.includes(o.name);
    o.castShadow = o.receiveShadow = !kept;
    if (kept) return;
    const m = o.material as THREE.MeshStandardMaterial;
    // Blender names a second piece's fire material Fire.001, and so on.
    if (m.name.startsWith('Fire')) {
      m.emissive.setHex(0xff7a22);
      m.emissiveIntensity = 2.5;
    } else {
      m.roughness = 0.9;
      m.metalness = 0;
    }
  });
}

/** Warm point lights that flicker, each a little out of step with the others. */
export class Flames {
  private readonly list: { light: THREE.PointLight; base: number; seed: number }[] = [];

  /** `base`: intensity (cd); `reach`: how far the light goes (m). */
  add(scene: THREE.Scene, at: THREE.Vector3, base: number, reach: number) {
    const light = new THREE.PointLight(0xff8a3c, base, reach, 2);
    light.position.copy(at);
    scene.add(light);
    this.list.push({ light, base, seed: 1 + this.list.length * 6 });
  }

  update(time: number) {
    for (const t of this.list) {
      const f = Math.sin(time * 9 + t.seed) * 0.5 + Math.sin(time * 23 + t.seed * 3) * 0.3 + Math.sin(time * 5.3 + t.seed) * 0.2;
      t.light.intensity = t.base * (0.85 + 0.15 * f);
    }
  }
}
