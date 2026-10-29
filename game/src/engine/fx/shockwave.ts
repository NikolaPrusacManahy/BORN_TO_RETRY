// Update 0.0.12 — a shockwave: a bright ring that races out over the floor to a radius and fades (your ground slam,
// the brute's slam). A small pool of rings; no garbage.
// Update 0.1.5 — a ring may take longer (the Hammer's smash rolls across the room as its rules do: smashWaves.ts).
// Update 0.1.6 — or be a half ring, rolling out one way only (the smash's).
import * as THREE from 'three';

/** Seconds a ring takes to reach its radius and fade. */
const LIFE = 0.35;

interface Wave {
  mesh: THREE.Mesh;
  t: number;
  radius: number;
  life: number;
}

export class Shockwaves {
  readonly group = new THREE.Group();
  private readonly waves: Wave[] = [];
  private readonly geo = new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2);
  /** Half a ring, before −z (a turn about up points it). */
  private readonly half = new THREE.RingGeometry(0.85, 1, 32, 1, 0, Math.PI).rotateX(-Math.PI / 2);

  constructor(count = 6) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.waves.push({ mesh, t: LIFE, radius: 1, life: LIFE });
    }
  }

  /** A ring out from `at` (on the floor) to `radius` m over `life` s, in `color`; only the half turned `half` radians
   *  about up from −z if given. Reuses the oldest. */
  spawn(at: THREE.Vector3, radius: number, color: number, life = LIFE, half?: number) {
    let w = this.waves[0];
    for (const x of this.waves) if (x.t / x.life > w.t / w.life) w = x;
    w.t = 0;
    w.radius = radius;
    w.life = life;
    w.mesh.geometry = half === undefined ? this.geo : this.half;
    w.mesh.rotation.y = half ?? 0;
    w.mesh.position.set(at.x, at.y + 0.05, at.z);
    (w.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    w.mesh.visible = true;
  }

  update(dt: number) {
    for (const w of this.waves) {
      if (w.t >= w.life) continue;
      w.t += dt;
      const k = Math.min(1, w.t / w.life);
      // Fast out, then slows; fades as it goes.
      w.mesh.scale.setScalar(w.radius * (1 - (1 - k) ** 3));
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      w.mesh.visible = k < 1;
    }
  }

  clear() {
    for (const w of this.waves) {
      w.t = w.life;
      w.mesh.visible = false;
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.half.dispose();
    for (const w of this.waves) (w.mesh.material as THREE.Material).dispose();
  }
}
