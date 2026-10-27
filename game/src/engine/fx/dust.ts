// Main menu — slow drifting dust motes, lit warm by the torches: one Points cloud, updated in place (no garbage).
import * as THREE from 'three';

export class Dust {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly speed: Float32Array;
  private time = 0;

  /** Fills the box `min`..`max` with `count` motes. */
  constructor(
    count: number,
    private readonly min: THREE.Vector3,
    private readonly max: THREE.Vector3,
  ) {
    this.pos = new Float32Array(count * 3);
    this.speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.pos[i * 3] = min.x + Math.random() * (max.x - min.x);
      this.pos[i * 3 + 1] = min.y + Math.random() * (max.y - min.y);
      this.pos[i * 3 + 2] = min.z + Math.random() * (max.z - min.z);
      this.speed[i] = 0.05 + Math.random() * 0.15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({ color: 0xffc890, size: 0.06, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  update(dt: number) {
    this.time += dt;
    const n = this.speed.length;
    const height = this.max.y - this.min.y;
    for (let i = 0; i < n; i++) {
      const s = this.speed[i];
      this.pos[i * 3] += Math.sin(this.time * 0.4 + i) * 0.04 * dt;
      this.pos[i * 3 + 1] += s * dt;
      this.pos[i * 3 + 2] += Math.cos(this.time * 0.3 + i * 1.7) * 0.03 * dt;
      if (this.pos[i * 3 + 1] > this.max.y) this.pos[i * 3 + 1] -= height;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
