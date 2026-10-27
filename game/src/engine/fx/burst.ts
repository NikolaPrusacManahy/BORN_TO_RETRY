// M1 step 6 — a pool of small flying pieces drawn as one instanced mesh: sparks on hits (no gravity, quick
// fade) and chunks when a dummy breaks (gravity, bounce on the floor). Spawning reuses dead slots; no garbage.
import * as THREE from 'three';

export interface BurstStyle {
  /** Starting speed range (m/s). */
  speed: [number, number];
  /** Lifetime range (s). */
  life: [number, number];
  /** Piece size (m). */
  size: number;
  gravity: number;
  /** How bouncy the floor is (0 = pieces stop). */
  bounce: number;
}

interface Piece {
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export class Burst {
  readonly mesh: THREE.InstancedMesh;
  private readonly pieces: Piece[];
  private next = 0;

  constructor(
    count: number,
    material: THREE.Material,
    private readonly style: BurstStyle,
  ) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.pieces = Array.from({ length: count }, () => ({ life: 0, maxLife: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), rot: new THREE.Euler() }));
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, HIDDEN);
  }

  /** Sends `n` pieces out from `at`, mostly along `dir` (length 1) within a cone of `spread` (0..1+). */
  spawn(at: THREE.Vector3, dir: THREE.Vector3, n: number, spread: number) {
    const st = this.style;
    for (let i = 0; i < n; i++) {
      const p = this.pieces[this.next];
      this.next = (this.next + 1) % this.pieces.length;
      p.maxLife = p.life = st.life[0] + Math.random() * (st.life[1] - st.life[0]);
      p.pos.copy(at);
      const speed = st.speed[0] + Math.random() * (st.speed[1] - st.speed[0]);
      p.vel.set(dir.x + (Math.random() - 0.5) * 2 * spread, dir.y + (Math.random() - 0.5) * 2 * spread, dir.z + (Math.random() - 0.5) * 2 * spread).normalize().multiplyScalar(speed);
      p.spin.set(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
    }
  }

  update(dt: number) {
    const st = this.style;
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      p.vel.y -= st.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < st.size / 2 && p.vel.y < 0) {
        p.pos.y = st.size / 2;
        p.vel.y *= -st.bounce;
        p.vel.x *= 0.6;
        p.vel.z *= 0.6;
      }
      p.rot.set(p.rot.x + p.spin.x * dt, p.rot.y + p.spin.y * dt, p.rot.z + p.spin.z * dt);
      const k = st.size * Math.min(1, (p.life / p.maxLife) * 3);
      m.compose(p.pos, q.setFromEuler(p.rot), s.set(k, k, k));
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.pieces.length; i++) {
      this.pieces[i].life = 0;
      this.mesh.setMatrixAt(i, HIDDEN);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
