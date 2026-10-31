// Update 0.0.16 — how the three keys look (the designer): the RPG pack's key standing on end, so it shows as it turns;
// the white key pale silver in a blue aura, the gold key gold in a yellow aura. Built once from items.glb's key and
// cloned wherever a key shows (the shop, the floor, flying to you, in your palm).
// Update 0.0.17 — the kill bonuses glow too: the snowflake pale blue, the gold ingots yellow, the blue potion blue.
// Update 0.1.9 — the Dual Daggers show as two crossed (pairLook.ts). Update 0.1.10 — the Great Heart glows.
import * as THREE from 'three';
import { crossedPair } from './pairLook';
import type { KeyKind } from '../sim/items/items';
import type { DropKind } from '../sim/items/drops';
import type { BonusKind } from '../sim/items/bonuses';
import { SCAR_KINDS } from '../sim/scars/scars';
import { scarLook } from './scarLook';

/** Each key's metal, and its aura's colour (none for the normal key). */
const METAL: Record<KeyKind, { color: number; metal: number; rough: number; glow: number } | null> = {
  key: null,
  whiteKey: { color: 0xeef3fa, metal: 0.55, rough: 0.3, glow: 0x16305a },
  goldKey: { color: 0xffc23a, metal: 0.85, rough: 0.25, glow: 0x3a2600 },
};
export const AURA: Record<KeyKind, number | null> = { key: null, whiteKey: 0x4d9dff, goldKey: 0xffd23a };
const BONUS_AURA: Record<BonusKind, number> = { snowflake: 0x9ad8ff, goldIngots: 0xffcf3a, bluePotion: 0x3d7bff };
/** Update 0.1.10 — the Great Heart's glow (a chest's better heart). */
const GREAT_HEART_AURA = 0xff5a8a;
/** The aura's size, against the key's length. */
const AURA_SIZE = 2.2;

let auraTex: THREE.DataTexture | null = null;

/** A soft round glow (made in code: no image to load). Update 0.2.1 — a keyed chest's aura too (treasureFx.ts). */
export function auraTexture(): THREE.DataTexture {
  if (auraTex) return auraTex;
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const a = Math.max(0, 1 - r) ** 2;
      data.set([255, 255, 255, Math.round(a * 255)], (y * n + x) * 4);
    }
  }
  auraTex = new THREE.DataTexture(data, n, n);
  auraTex.needsUpdate = true;
  return auraTex;
}

/** The key's look for `kind` from items.glb's key (`proto`): standing on end, tinted, in its aura. */
export function keyLook(kind: KeyKind, proto: THREE.Object3D): THREE.Object3D {
  const look = new THREE.Group();
  look.name = `item_${kind}`;
  const key = proto.clone();
  key.position.set(0, 0, 0);
  // It lies along z: stand it up.
  key.rotation.set(Math.PI / 2, 0, 0);
  const m = METAL[kind];
  key.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !m) return;
    const mat = (o.material as THREE.MeshStandardMaterial).clone();
    mat.color.setHex(m.color);
    mat.metalness = m.metal;
    mat.roughness = m.rough;
    mat.emissive.setHex(m.glow);
    o.material = mat;
  });
  look.add(key);
  const aura = AURA[kind];
  if (aura !== null) addAura(look, key, aura);
  return look;
}

/** A soft glow of `colour` round `around`, in `look`. */
function addAura(look: THREE.Object3D, around: THREE.Object3D, colour: number) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTexture(), color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const size = new THREE.Box3().setFromObject(around).getSize(new THREE.Vector3());
  sprite.scale.setScalar(Math.max(size.x, size.y, size.z) * AURA_SIZE);
  sprite.name = 'aura';
  look.add(sprite);
}

/** A kill bonus's look (Update 0.1.10 — or the Great Heart's): as it comes, in its glow. */
function bonusLook(kind: BonusKind | 'greatHeart', proto: THREE.Object3D): THREE.Object3D {
  const look = new THREE.Group();
  look.name = `item_${kind}`;
  const body = proto.clone();
  body.position.set(0, 0, 0);
  // The snowflake stands up to face you as it turns.
  if (kind === 'snowflake') body.rotation.set(Math.PI / 2, 0, 0);
  look.add(body);
  addAura(look, body, kind === 'greatHeart' ? GREAT_HEART_AURA : BONUS_AURA[kind]);
  return look;
}

/** Every item's look: the keys built from the key, the daggers crossed, the rest as they come. Update 0.2.15 — and the
 *  Scars' (scarLook.ts: made in code). */
export function itemLooks(protos: Partial<Record<DropKind, THREE.Object3D>>): Partial<Record<DropKind, THREE.Object3D>> {
  const out = { ...protos };
  const key = protos.key;
  if (key) Object.assign(out, { key: keyLook('key', key), whiteKey: keyLook('whiteKey', key), goldKey: keyLook('goldKey', key) });
  // (Update 0.1.10 — the gold pair too.)
  for (const kind of ['daggers', 'goldDaggers'] as const) {
    const p = protos[kind];
    if (p) out[kind] = crossedPair(p);
  }
  if (protos.greatHeart) out.greatHeart = bonusLook('greatHeart', protos.greatHeart);
  for (const kind of ['snowflake', 'goldIngots', 'bluePotion'] as BonusKind[]) {
    const p = protos[kind];
    if (p) out[kind] = bonusLook(kind, p);
  }
  for (const kind of SCAR_KINDS) out[kind] = scarLook(kind);
  return out;
}
