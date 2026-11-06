// Update 0.3.73 — the Playable Demon's sword out of its hand (sim/combat/bladeThrow.ts): the real blade in the world, spinning about its middle, on a slant
// so you see it as a wheel from behind and not edge on; a ring of fire round it. Stopped in a wall, it's still, its point in. Its own copy of the
// model (the arms' is in their scene, and it's the one that grows). Only for the Demon.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../../sim/combat/state';
import { HALOS } from '../halos';
import { DEMON_BLADE_URL } from '../viewmodel/armsWardrobe';

/** How fast it spins (rad/s), how far its wheel's slanted (rad). Where its middle and its tip are along it, how far its tip's buried (m). */
const SPIN = 17;
const SLANT = 0.55;
const MIDDLE = 1.13;
const TIP = 2.54;
const BURIED = 0.25;
/** The ring of fire: how many, how far out (m). */
const FLAMES = 10;
const RING = 1.25;

const UP = new THREE.Vector3(0, 1, 0);
const side = new THREE.Vector3();
const over = new THREE.Vector3();
const normal = new THREE.Vector3();
const along = new THREE.Vector3();
const across = new THREE.Vector3();
const by = new THREE.Vector3();
const bx = new THREE.Vector3();
const basis = new THREE.Matrix4();
const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();

export class ThrownBladeView {
  readonly group = new THREE.Group();
  private readonly holder = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);
  private readonly flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames = new THREE.InstancedMesh(this.coneGeo, this.flameMat, FLAMES);
  private spin = 0;
  /** Drawn out of sight for a frame or two when it's loaded, so its texture's on the card before the first throw. */
  private warming = 0;

  /** `fetches`: fetch the model (tests give it parsed, with `hold`). */
  constructor(scene: THREE.Scene, fetches = true) {
    scene.add(this.group);
    this.group.add(this.holder, this.flames);
    this.holder.visible = false;
    this.flames.frustumCulled = false;
    this.flames.count = 0;
    if (fetches) {
      void new GLTFLoader()
        .loadAsync(DEMON_BLADE_URL)
        .then((g) => this.hold(g.scene))
        .catch((err) => console.error('the thrown blade failed to load', err));
    }
  }

  hold(model: THREE.Object3D) {
    this.model = model;
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) o.frustumCulled = false;
    });
    this.holder.add(model);
    this.warming = 2;
  }

  /** Is it drawn (for the tests)? */
  get shown() {
    return this.holder.visible && this.warming === 0;
  }

  /** Which way its point's facing (for the tests). */
  get pointing(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.holder.quaternion);
  }

  get where(): THREE.Vector3 {
    return this.holder.position;
  }

  update(state: CombatState, dt: number) {
    const t = state.blade.flying;
    const out = state.demon && t.stage !== 'hand';
    this.flames.count = 0;
    if (!out && this.warming > 0) {
      this.warming--;
      this.holder.visible = true;
      this.holder.position.set(0, -500, 0);
      return;
    }
    this.warming = 0;
    this.holder.visible = out;
    if (!out || !this.model) return;
    this.holder.position.copy(t.pos);
    side.crossVectors(t.dir, UP);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    if (t.stage === 'stuck') {
      // Still, its point in.
      by.copy(t.dir);
      over.crossVectors(side, by).normalize();
      basis.makeBasis(side, by, over);
      this.holder.quaternion.setFromRotationMatrix(basis);
      this.model.position.y = BURIED - TIP;
      HALOS.add(t.pos.x, t.pos.y, t.pos.z, 3, 0xff7a20, 0.45);
      return;
    }
    this.spin += SPIN * dt;
    over.crossVectors(side, t.dir).normalize();
    normal.copy(over).multiplyScalar(Math.cos(SLANT)).addScaledVector(side, Math.sin(SLANT)).normalize();
    along.copy(t.dir);
    across.crossVectors(normal, along).normalize();
    by.copy(along).multiplyScalar(Math.cos(this.spin)).addScaledVector(across, Math.sin(this.spin));
    bx.crossVectors(by, normal);
    basis.makeBasis(bx, by, normal);
    this.holder.quaternion.setFromRotationMatrix(basis);
    this.model.position.y = -MIDDLE;
    for (let k = 0; k < FLAMES; k++) {
      const a = this.spin * 0.6 + (k / FLAMES) * Math.PI * 2;
      pos.copy(t.pos).addScaledVector(along, Math.cos(a) * RING).addScaledVector(across, Math.sin(a) * RING);
      const s = 0.14 + 0.05 * Math.sin(this.spin + k * 2.1);
      this.flames.setMatrixAt(k, mat.compose(pos, q.setFromAxisAngle(UP, k * 1.7), scl.set(s, s * 3.2, s)));
    }
    this.flames.count = FLAMES;
    this.flames.instanceMatrix.needsUpdate = true;
    HALOS.add(t.pos.x, t.pos.y, t.pos.z, 5.5, 0xff7a20, 0.65);
  }

  dispose() {
    this.group.removeFromParent();
    this.flames.dispose();
    this.coneGeo.dispose();
    this.flameMat.dispose();
    this.model?.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      const m = o.material as THREE.MeshStandardMaterial;
      m.map?.dispose();
      m.emissiveMap?.dispose();
      m.dispose();
    });
  }
}
