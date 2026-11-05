// Update 0.3.49 — the Dragon's Flame Sweep as you see it (the Boss Design Bible): a low wall of flame along the floor, from
// under it to where the fire stops, as high as you have to jump. Instanced tongues of fire, flickering. Updated in place.
import * as THREE from 'three';

/** Tongues of fire along the line, and how wide each is at its foot (m). */
const TONGUES = 28;
const FOOT = 1.5;

const additive = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

const m = new THREE.Matrix4();
const at = new THREE.Vector3();
const size = new THREE.Vector3();
const turn = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export class FlameLineView {
  readonly group = new THREE.Group();
  /** A cone 1 tall, its foot at y 0. */
  private readonly geo = new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0);
  private readonly outerMat = additive(0xff5410, 0.55);
  private readonly innerMat = additive(0xffd27a, 0.8);
  private readonly outer = new THREE.InstancedMesh(this.geo, this.outerMat, TONGUES);
  private readonly inner = new THREE.InstancedMesh(this.geo, this.innerMat, TONGUES);

  constructor() {
    this.outer.frustumCulled = this.inner.frustumCulled = false;
    this.group.add(this.outer, this.inner);
    this.group.visible = false;
  }

  hide() {
    this.group.visible = false;
  }

  /** From `from` to `to` on the floor, `height` m high, `power` 0..1. */
  update(from: THREE.Vector3, to: THREE.Vector3, height: number, power: number, time: number) {
    this.group.visible = power > 0.01;
    if (!this.group.visible) return;
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    turn.setFromAxisAngle(UP, yaw);
    for (let i = 0; i < TONGUES; i++) {
      const k = (i + 0.5) / TONGUES;
      at.set(from.x + (to.x - from.x) * k, 0.02, from.z + (to.z - from.z) * k);
      const flick = 0.75 + 0.25 * Math.sin(time * (17 + (i % 5) * 6) + i * 1.7);
      const tall = height * 1.35 * power * flick;
      m.compose(at, turn, size.set(FOOT, tall, FOOT));
      this.outer.setMatrixAt(i, m);
      m.compose(at, turn, size.set(FOOT * 0.55, tall * 0.72, FOOT * 0.55));
      this.inner.setMatrixAt(i, m);
    }
    this.outer.instanceMatrix.needsUpdate = this.inner.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.outerMat.dispose();
    this.innerMat.dispose();
    this.outer.dispose();
    this.inner.dispose();
  }
}
