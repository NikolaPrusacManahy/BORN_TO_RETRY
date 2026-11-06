// Update 0.3.65 — Hellwarden's sword in its show (the designer's shot list: "The sword rises from the lava last, dull grey ... the orange glow follows his hand from
// hilt to tip, like metal coming out of a forge"): a cold copy coming up out of the lava, point first, and in to its hand; then the real one, the heat coming along it.
import * as THREE from 'three';
import { heatShare, wardenBeats } from '../../sim/dungeon/wardenShow';
import type { Enemy } from '../../sim/enemies/enemy';
import { farthest, Hold, type Parts } from './wardenBake';
import { createWardenUniforms, wardenPatch } from './wardenShader';

/** How far along its blade the heat starts, and how much more of it there is. */
const HEAT_FROM = 0.16;
const HEAT_SPAN = 0.86;
/** It comes out of the lava this far toward you from it (m), rising this high. */
const SWORD_OUT = 4;
const SWORD_UP = 10;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const v0 = new THREE.Vector3();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const q0 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

let dull: THREE.MeshStandardMaterial | null = null;
/** Its sword in flight: cold, grey. */
function dullOf(src: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  if (dull) return dull;
  dull = src.clone();
  const u = createWardenUniforms();
  u.uBlade.value = 1;
  u.uHeat.value = -100;
  u.uRim.value = 1;
  wardenPatch(dull, u);
  return dull;
}

export class WardenSword {
  readonly group = new THREE.Group();
  private sword: THREE.Mesh | null = null;
  private readonly swordHold = new Hold();
  private readonly swordUp = new THREE.Quaternion();
  private readonly swordAt = new THREE.Vector3();
  private readonly swordFrom = new THREE.Vector3();

  /** Up out of the lava, point first, dull; into its hand; then real, the heat coming along it from its hand as its claws drag along it. */
  update(e: Enemy, p: Parts, t: number, tip: THREE.Vector3 | null, bake: (names: string[], to: THREE.Vector3) => THREE.Mesh | null, flyMat: () => THREE.MeshStandardMaterial | null, flare: (at: THREE.Vector3, t: number) => void) {
    const s = wardenBeats();
    const m = p.meshes.get('Hellwarden_Sword');
    const u = p.uniforms.get('Hellwarden_Sword');
    const hand = p.root.getObjectByName('hand_r');
    if (!m || !u || !hand) return;
    m.visible = t >= s.swordAt;
    u.uBlade.value = 1;
    const front = t >= s.heatTo ? 2 : HEAT_FROM + HEAT_SPAN * heatShare(t);
    u.uHeat.value = front;
    if (t >= s.heatFrom && t < s.heatTo && tip) flare(hand.localToWorld(v0.copy(tip).multiplyScalar(Math.min(1, front))), t);
    if (t >= s.swordFrom && !this.sword) {
      this.sword = bake(['Hellwarden_Sword'], this.swordAt);
      if (this.sword) {
        this.sword.material = dullOf(flyMat()!);
        this.group.add(this.sword);
        this.swordHold.fix(hand, this.swordAt);
        // Its point up, as it rises.
        hand.getWorldPosition(v1);
        const far = farthest(this.sword, v2.copy(v1).sub(this.swordAt));
        this.swordUp.setFromUnitVectors(far, UP);
      }
      const fx = -Math.sin(e.facing);
      const fz = -Math.cos(e.facing);
      this.swordFrom.set(e.pos.x + fx * SWORD_OUT, -3, e.pos.z + fz * SWORD_OUT);
    }
    if (!this.sword) return;
    const k = (t - s.swordFrom) / (s.swordAt - s.swordFrom);
    this.sword.visible = k < 1;
    if (k >= 1) return;
    // Straight up out of the lava, then in to its hand, turning to lie in its grip.
    v1.copy(this.swordFrom).setY(-3 + SWORD_UP * smooth(k / 0.6));
    this.swordHold.place(hand, v2, q0);
    const home = smooth((k - 0.5) / 0.5);
    this.sword.position.lerpVectors(v1, v2, home);
    this.sword.quaternion.copy(this.swordUp).slerp(q0, home);
  }

  reset() {
    if (this.sword) {
      this.sword.removeFromParent();
      this.sword.geometry.dispose();
    }
    this.sword = null;
  }
}
