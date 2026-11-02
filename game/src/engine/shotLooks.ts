// Update 0.2.27 — what each enemy's shot looks like (the designer: "better uses of assets instead of having balls as
// projectiles"), made in code: a fireball (a white-hot core in two flickering shells of flame: the Dragon's, the
// Demon's, a Dragonling's, the Lab turret's; the Blue Demon's blue), the Spitter's acid (a glossy green glob that
// wobbles), the Glubs' water (a bolt drawn out along its flight), a Tribal's spear (a shaft with a steel point), a
// Cactoro's thorn, a Mask Tribal's feather (white, red-tipped, fluttering), a White Rabbit's carrot (leaves and all,
// tumbling). And what each leaves behind it and where it lands (shotsView.ts). Pure data and meshes.
// Update 0.3.18 — floor 8's: a blaster bolt (a pink-white streak, glowing) and the Bee mech's missile (a steel body,
// its nose cone, its exhaust glowing and smoking behind it).
import * as THREE from 'three';
import type { Orb } from '../sim/combat/targets';

export type ShotStyle = 'fire' | 'blueFire' | 'acid' | 'water' | 'spear' | 'spine' | 'feather' | 'carrot' | 'laser' | 'missile';

/** A shot's style: by who fired it, then by its look. */
export function shotStyle(o: Orb): ShotStyle {
  if (o.by === 'blueDemon') return 'blueFire';
  if (o.by === 'spitter') return 'acid';
  if (o.by === 'maskTribal') return 'feather';
  if (o.look === 'laser' || o.look === 'missile') return o.look;
  return o.look === 'water' ? 'water' : o.look === 'spear' ? 'spear' : o.look === 'spine' ? 'spine' : o.look === 'carrot' ? 'carrot' : 'fire';
}

/** A fireball's size by who threw it (times the orbs' size). */
export const fireScale = (o: Orb) => (o.by === 'dragon' ? 1.7 : o.by === 'demon' ? 1.35 : o.by === 'dragonling' ? 0.85 : 1);

/** What a style leaves behind it (particles a second; their colour; whether they fall) and throws out where it lands
 *  (how many; their colour; a flash of fire). */
export interface ShotTrail {
  rate: number;
  color: number;
  falls: boolean;
  burst: number;
  burstColor: number;
  flash: number | null;
}

export const TRAILS: Record<ShotStyle, ShotTrail> = {
  fire: { rate: 45, color: 0xffa040, falls: false, burst: 18, burstColor: 0xff7a20, flash: 0xffa040 },
  blueFire: { rate: 45, color: 0x6aa8ff, falls: false, burst: 18, burstColor: 0x3a7bff, flash: 0x7ab8ff },
  acid: { rate: 20, color: 0x7bd42a, falls: true, burst: 14, burstColor: 0x8be03a, flash: null },
  water: { rate: 30, color: 0x9fe8ff, falls: true, burst: 14, burstColor: 0xbff0ff, flash: null },
  spear: { rate: 0, color: 0, falls: true, burst: 8, burstColor: 0x8a5a34, flash: null },
  spine: { rate: 0, color: 0, falls: true, burst: 6, burstColor: 0xe8d6a0, flash: null },
  feather: { rate: 4, color: 0xf4f0e8, falls: true, burst: 6, burstColor: 0xf4f0e8, flash: null },
  carrot: { rate: 0, color: 0, falls: true, burst: 8, burstColor: 0xff7418, flash: null },
  laser: { rate: 0, color: 0, falls: false, burst: 10, burstColor: 0xff8ad0, flash: 0xff8ad0 },
  missile: { rate: 40, color: 0xd8d2cc, falls: false, burst: 20, burstColor: 0xff8a30, flash: 0xffa040 },
};

/** Every style's meshes for one shot's slot (each hidden but its own: shotsView.ts shows one). Geometries and
 *  materials go into `geos` and `mats` (shared by every slot). */
export class ShotMeshes {
  readonly group = new THREE.Group();
  readonly parts: Record<ShotStyle, THREE.Object3D>;
  /** A fireball's core and two shells (they flicker). */
  readonly flame: THREE.Mesh[] = [];
  readonly blue: THREE.Mesh[] = [];

  constructor(kit: ShotKit) {
    const fireball = (core: THREE.Material, inner: THREE.Material, outer: THREE.Material, into: THREE.Mesh[]) => {
      const g = new THREE.Group();
      const c = new THREE.Mesh(kit.ball, core);
      const a = new THREE.Mesh(kit.shell, inner);
      const b = new THREE.Mesh(kit.shell, outer);
      c.scale.setScalar(0.55);
      a.scale.setScalar(1);
      b.scale.setScalar(1.3);
      into.push(c, a, b);
      g.add(c, a, b);
      return g;
    };
    const acid = new THREE.Mesh(kit.ball, kit.acid);
    const water = new THREE.Mesh(kit.ball, kit.water);
    // Along +y, its point at the top (the way it flies).
    const spear = new THREE.Group();
    const shaft = new THREE.Mesh(kit.rod, kit.wood);
    shaft.scale.set(0.035, 1.5, 0.035);
    shaft.position.y = -0.75;
    const tip = new THREE.Mesh(kit.cone, kit.steel);
    tip.scale.set(0.07, 0.28, 0.07);
    tip.position.y = 0.14;
    spear.add(shaft, tip);
    const spine = new THREE.Mesh(kit.cone, kit.thorn);
    spine.scale.set(0.035, 0.6, 0.035);
    const feather = new THREE.Group();
    const vane = new THREE.Mesh(kit.leaf, kit.feather);
    vane.scale.set(0.09, 0.42, 1);
    const quill = new THREE.Mesh(kit.cone, kit.featherTip);
    quill.scale.set(0.03, 0.12, 0.03);
    quill.position.y = 0.24;
    feather.add(vane, quill);
    const carrot = new THREE.Group();
    const root = new THREE.Mesh(kit.cone, kit.carrot);
    root.scale.set(0.075, 0.42, 0.075);
    root.position.y = 0.05;
    carrot.add(root);
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(kit.cone, kit.leafGreen);
      leaf.scale.set(0.025, 0.18, 0.025);
      leaf.position.set(Math.cos(k * 2.1) * 0.03, -0.24, Math.sin(k * 2.1) * 0.03);
      leaf.rotation.set(Math.PI + Math.cos(k * 2.1) * 0.4, 0, Math.sin(k * 2.1) * 0.4);
      carrot.add(leaf);
    }
    const laser = new THREE.Mesh(kit.ball, kit.laser);
    // Along +y, its nose at the top.
    const missile = new THREE.Group();
    const body = new THREE.Mesh(kit.rod, kit.steel);
    body.scale.set(0.07, 0.42, 0.07);
    const nose = new THREE.Mesh(kit.cone, kit.steel);
    nose.scale.set(0.07, 0.16, 0.07);
    nose.position.y = 0.29;
    const jet = new THREE.Mesh(kit.ball, kit.fireInner);
    jet.scale.set(0.08, 0.14, 0.08);
    jet.position.y = -0.27;
    missile.add(body, nose, jet);
    this.parts = {
      laser,
      missile,
      fire: fireball(kit.fireCore, kit.fireInner, kit.fireOuter, this.flame),
      blueFire: fireball(kit.blueCore, kit.blueInner, kit.blueOuter, this.blue),
      acid,
      water,
      spear,
      spine,
      feather,
      carrot,
    };
    for (const p of Object.values(this.parts)) {
      p.visible = false;
      p.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = o.material instanceof THREE.MeshStandardMaterial;
      });
      this.group.add(p);
    }
  }
}

/** The shapes and materials every shot's slot shares. */
export class ShotKit {
  readonly ball = new THREE.SphereGeometry(1, 16, 12);
  readonly shell = new THREE.IcosahedronGeometry(1, 1);
  readonly rod = new THREE.CylinderGeometry(1, 1, 1, 6);
  /** A cone 1 tall along +y, its point at the top. */
  readonly cone = new THREE.ConeGeometry(1, 1, 7);
  /** A feather's vane: a thin diamond in the plane. */
  readonly leaf = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, -0.5), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5), new THREE.Vector2(-0.5, 0)]));
  private readonly glow = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  readonly fireCore = new THREE.MeshBasicMaterial({ color: 0xfff4c8, toneMapped: false });
  readonly fireInner = this.glow(0xff9a2a, 0.75);
  readonly fireOuter = this.glow(0xff4a10, 0.4);
  readonly blueCore = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, toneMapped: false });
  readonly blueInner = this.glow(0x4a8cff, 0.75);
  readonly blueOuter = this.glow(0x1a3aff, 0.4);
  readonly acid = new THREE.MeshStandardMaterial({ color: 0x7bd42a, emissive: 0x2c6a08, roughness: 0.15, metalness: 0.05 });
  readonly water = new THREE.MeshStandardMaterial({ color: 0x8fe4ff, emissive: 0x1a6a8a, roughness: 0.05, transparent: true, opacity: 0.8 });
  readonly wood = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.8 });
  readonly steel = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.35, metalness: 0.6 });
  readonly thorn = new THREE.MeshStandardMaterial({ color: 0xe8d6a0, roughness: 0.6 });
  readonly feather = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.9, side: THREE.DoubleSide });
  readonly featherTip = new THREE.MeshStandardMaterial({ color: 0xc42a2a, roughness: 0.7 });
  readonly carrot = new THREE.MeshStandardMaterial({ color: 0xff7418, roughness: 0.7 });
  readonly leafGreen = new THREE.MeshStandardMaterial({ color: 0x4caa2e, roughness: 0.8 });
  readonly laser = new THREE.MeshBasicMaterial({ color: 0xffd6ee, toneMapped: false });

  dispose() {
    for (const v of Object.values(this)) if (v instanceof THREE.BufferGeometry || v instanceof THREE.Material) v.dispose();
  }
}
