// Update 0.3.65 — Hellwarden's mask in its show (the designer's shot list: "A skull from the pile floats up and grows horns as it reaches his face. Close-up on
// the mask: dark socket, then the eye ignites white"): a copy flying up off the heap, its horns growing; then the real one, its socket dark till it ignites.
import * as THREE from 'three';
import { skullShare, wardenBeats } from '../../sim/dungeon/wardenShow';
import type { Enemy } from '../../sim/enemies/enemy';
import { HALOS } from '../halos';
import { Hold, type Parts } from './wardenBake';
import { createWardenUniforms, wardenPatch } from './wardenShader';

/** Where the pile lies: this far toward you from its middle, this far to the right as you look at it (m). */
export const PILE: readonly [number, number] = [3.4, 5];

/** On its mask (m, bind pose), its horns start this high; this much above that is where each starts. It starts from this high off the heap. */
const HORN_FROM = 2.115;
const HORN_BAND = 0.015;
const PILE_Y = 0.6;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? 1 - age / life : 0);

const v0 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const q0 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export class WardenSkull {
  readonly group = new THREE.Group();
  private skull: THREE.Mesh | null = null;
  private skullRest: Float32Array | null = null;
  private hornSide: Int8Array | null = null;
  private readonly hornBase = [new THREE.Vector3(), new THREE.Vector3()];
  private readonly skullHold = new Hold();
  private readonly skullAt = new THREE.Vector3();
  private readonly skullFrom = new THREE.Vector3();

  /** Off the pile, up to its neck, its horns growing as it comes; then its own, the socket dark, the eye igniting. */
  update(e: Enemy, p: Parts, t: number, bake: (names: string[], to: THREE.Vector3) => THREE.Mesh | null, flyMat: () => THREE.MeshStandardMaterial | null) {
    const s = wardenBeats();
    const m = p.meshes.get('Hellwarden_Skull');
    const u = p.uniforms.get('Hellwarden_Skull');
    const head = p.root.getObjectByName('Head');
    if (!m || !u || !head) return;
    m.visible = t >= s.skullAt;
    const eye = t < s.eyeAt ? 0 : 1 + 3 * pulse(t - s.eyeAt, 0.5);
    u.uEye.value.set(eye, 0);
    u.uCrack.value = 0;
    if (eye > 1) {
      head.getWorldPosition(v0);
      HALOS.add(v0.x, v0.y + 0.6, v0.z, 3 * (eye - 1), 0xffffff, 0.5 * (eye - 1));
    }
    if (t >= s.skullFrom && !this.skull) {
      this.skull = bake(['Hellwarden_Skull'], this.skullAt);
      if (this.skull) {
        this.skull.material = this.skullMat(flyMat()!);
        this.group.add(this.skull);
        this.skullHold.fix(head, this.skullAt);
        this.hornsOf(this.skull);
      }
      const fx = -Math.sin(e.facing);
      const fz = -Math.cos(e.facing);
      this.skullFrom.set(e.pos.x + fx * PILE[0] + fz * PILE[1], PILE_Y, e.pos.z + fz * PILE[0] - fx * PILE[1]);
    }
    if (!this.skull) return;
    this.skull.visible = t < s.skullAt;
    if (!this.skull.visible) return;
    const k = skullShare(t);
    this.skullHold.place(head, v2, q0);
    this.skull.position.lerpVectors(this.skullFrom, v2, k);
    this.skull.position.y += Math.sin(k * Math.PI) * 1.2;
    this.skull.quaternion.setFromAxisAngle(UP, (1 - k) * 2.6).multiply(q0);
    this.growHorns(k);
  }

  private skullMat(from: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
    const m = from.clone();
    const u = createWardenUniforms();
    u.uEye.value.set(0, 0);
    u.uEyes.value = 1;
    u.uRim.value = 1.1;
    wardenPatch(m, u);
    return m;
  }

  /** Which of a skull's vertices are its horns (by where they were on its mask), and where each horn starts. */
  private hornsOf(skull: THREE.Mesh) {
    const at = skull.geometry.getAttribute('position') as THREE.BufferAttribute;
    const bind = skull.userData.bind as Float32Array;
    this.skullRest = new Float32Array(at.array);
    this.hornSide = new Int8Array(at.count);
    const sum = [new THREE.Vector3(), new THREE.Vector3()];
    const n = [0, 0];
    for (let i = 0; i < at.count; i++) {
      const y = bind[i * 2 + 1];
      if (y <= HORN_FROM) continue;
      const side = bind[i * 2] < 0 ? 0 : 1;
      this.hornSide[i] = side === 0 ? -1 : 1;
      if (y < HORN_FROM + HORN_BAND) {
        sum[side].add(v0.fromBufferAttribute(at, i));
        n[side]++;
      }
    }
    this.hornBase[0].copy(sum[0]).multiplyScalar(1 / Math.max(1, n[0]));
    this.hornBase[1].copy(sum[1]).multiplyScalar(1 / Math.max(1, n[1]));
  }

  /** Its horns drawn in to its brow at 0, out to their whole length at 1. */
  private growHorns(k: number) {
    const skull = this.skull;
    const rest = this.skullRest;
    const sides = this.hornSide;
    if (!skull || !rest || !sides) return;
    const at = skull.geometry.getAttribute('position') as THREE.BufferAttribute;
    const grow = Math.max(0.02, smooth((k - 0.2) / 0.8));
    for (let i = 0; i < at.count; i++) {
      if (sides[i] === 0) continue;
      const b = this.hornBase[sides[i] < 0 ? 0 : 1];
      at.setXYZ(i, b.x + (rest[i * 3] - b.x) * grow, b.y + (rest[i * 3 + 1] - b.y) * grow, b.z + (rest[i * 3 + 2] - b.z) * grow);
    }
    at.needsUpdate = true;
    skull.geometry.computeVertexNormals();
  }

  reset() {
    if (this.skull) {
      this.skull.removeFromParent();
      this.skull.geometry.dispose();
      (this.skull.material as THREE.Material).dispose();
    }
    this.skull = null;
    this.skullRest = null;
    this.hornSide = null;
  }
}
