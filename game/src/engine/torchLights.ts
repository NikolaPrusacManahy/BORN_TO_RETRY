// Update 0.2.10 (out of dungeonView.ts, which had reached its size; the lobby's lights did the same) — a few warm lights
// that follow you from torch to torch: the nearest torches get them.
import type * as THREE from 'three';

/** Each of `lights` to one of the torches nearest `at` (a few comparisons; nothing made per frame). */
export function lightNearest(lights: readonly THREE.PointLight[], torches: readonly { x: number; y: number; z: number }[], at: THREE.Vector3) {
  for (let k = 0; k < lights.length; k++) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < torches.length; i++) {
      const d = (torches[i].x - at.x) ** 2 + (torches[i].z - at.z) ** 2;
      if (d >= bestD) continue;
      let used = false;
      for (let j = 0; j < k; j++) used ||= lights[j].userData.torch === i;
      if (!used) {
        bestD = d;
        best = i;
      }
    }
    const l = lights[k];
    l.visible = best >= 0;
    l.userData.torch = best;
    if (best >= 0) l.position.set(torches[best].x, torches[best].y, torches[best].z);
  }
}
