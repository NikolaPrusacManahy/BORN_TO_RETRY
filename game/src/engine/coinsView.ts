// Update 0.0.12 — draws the flying coins: small gold discs, spinning, one instanced mesh for the whole pool.
import * as THREE from 'three';
import { COIN_POOL, Coin } from '../sim/combat/coins';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const one = new THREE.Vector3(1, 1, 1);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export class CoinsView {
  readonly mesh: THREE.InstancedMesh;
  private time = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 14).rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.7, roughness: 0.3, emissive: 0x6a4a00 });
    this.mesh = new THREE.InstancedMesh(geo, mat, COIN_POOL);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < COIN_POOL; i++) this.mesh.setMatrixAt(i, HIDDEN);
    scene.add(this.mesh);
  }

  update(coins: Coin[], dt: number) {
    this.time += dt;
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      if (!c.alive) {
        this.mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      q.setFromEuler(e.set(0, this.time * 9 + i, 0));
      this.mesh.setMatrixAt(i, m.compose(c.pos, q, one));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
