// Update 0.3.22 — each enemy body's own materials (out of enemiesView.ts, which had reached its size), and floor 7's
// warband recoloured in code (MD/FLOOR7_WARBAND_PLAN.md): the pack's people come with their own flat colours by
// material name; the dead frost-blue (Haugbui darker), the Völva's robe pale with her hat-band lit, the Thrower in a
// darker tunic; and their eyes (the pack's 'Face': the white eyes on its dark faces) lit: ice-blue, the Berserker's red.
// A lit eye is unlit by the scene and not the body's (a hit's flash, a wind-up's glow leave it). Made in code.
// Update 0.3.33 — and floor 8's martial artists: the Archer in indigo, the Sensei in a black gi with a gold belt, the
// Shadow all black with a blood-red sash (his clones see-through, a shadow of him); the ninjas' and the masters' eyes lit.
import * as THREE from 'three';
import type { EnemyKind } from '../../sim/enemies/kinds';

/** The frozen dead's colours, by material. */
const DEAD: Record<string, number> = { Skin: 0x7d93a3, Clothes: 0x56606b, DarkClothes: 0x363d46, Pants: 0x7c8389, Guts: 0x4f6f80, Brain: 0xa9c4d2, Bones: 0xc9d6dd, Hair: 0xc8d4dc };
const TINTS: Partial<Record<EnemyKind, Record<string, number>>> = {
  axeThrower: { Main: 0x3c3f4a },
  draugr: DEAD,
  barrowMaid: DEAD,
  volva: { Clothes: 0xc3ccd6, Hat: 0x2a3a4e, Belt: 0x5a4a3a },
  haugbui: { ...DEAD, Skin: 0x4f6573, Clothes: 0x2e353d, DarkClothes: 0x1f242a, Pants: 0x4a5258, Brain: 0x7f9aa8 },
  archer: { Clothes: 0x2f4a7a, Band: 0xe8d9b0 },
  sensei: { Clothes: 0x232328, Band: 0xc9a227 },
  kunoichi: { Details: 0x8a1a5a },
  shadow: { Main: 0x08080a, Details: 0x7a0c0c, Grey: 0x1a1a1e },
  shadowClone: { Main: 0x050507, Details: 0x4a0808, Grey: 0x101012, Skin: 0x050507 },
};
/** Update 0.3.33 — see-through, a shadow of someone (the Shadow's clones). */
const GHOST: ReadonlySet<EnemyKind> = new Set<EnemyKind>(['shadowClone']);
const ICE = 0x7fdcff;
/** What's lit on each (material: colour). */
const LIT: Partial<Record<EnemyKind, Record<string, number>>> = {
  raider: { Face: ICE },
  axeThrower: { Face: ICE },
  draugr: { Face: ICE },
  barrowMaid: { Face: ICE },
  volva: { Face: ICE, Gold: ICE },
  berserker: { Face: 0xff4a2a },
  haugbui: { Face: ICE },
  shinobi: { Face: 0xff3a2a },
  kunoichi: { Face: 0xff5ad8 },
  sandNinja: { Face: 0xffb050 },
  sandNinjaF: { Face: 0xffb050 },
  sensei: { Face: 0xffd36a },
  shadow: { Face: 0xff2020 },
  shadowClone: { Face: 0xff2020 },
};

/** One lit material per colour, shared by every body. */
const lit = new Map<number, THREE.MeshBasicMaterial>();
const litOf = (color: number) => lit.get(color) ?? lit.set(color, new THREE.MeshBasicMaterial({ color, toneMapped: false })).get(color)!;

/** A body's meshes each given its own material (its kind's colours; its lit parts shared), casting shadows and never
 *  culled (animated bodies leave their bind-pose bounds). Returns the ones a hit flashes. */
export function ownMaterials(kind: EnemyKind, root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const mats: THREE.MeshStandardMaterial[] = [];
  const tints = TINTS[kind];
  const glows = LIT[kind];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.frustumCulled = false;
    const m = (o.material as THREE.MeshStandardMaterial).clone();
    const name = m.name.split('.')[0];
    if (glows?.[name] !== undefined) {
      m.dispose();
      o.material = litOf(glows[name]);
      return;
    }
    if (tints?.[name] !== undefined) m.color.setHex(tints[name]);
    if (GHOST.has(kind)) {
      m.transparent = true;
      m.opacity = 0.5;
      m.depthWrite = false;
    }
    o.material = m;
    mats.push(m);
  });
  return mats;
}
