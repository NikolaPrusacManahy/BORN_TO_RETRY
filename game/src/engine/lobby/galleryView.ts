// Update 0.3.21 — the manor's galleries' exhibits (world/lobby/galleries.ts; the designer: "a gallery of all items"):
// each weapon and each item turning slowly over its pedestal, as the shop's float over their tiles (items.glb through
// itemLooks: the keys in their auras, the daggers crossed, the bonuses lit; the plain Sword is the gold one's shape in
// steel), each brought to one size (a weapon's, a thing's: a ring big enough to see; none grown much past its own, the
// pistol no sword) and turning about its middle; and every card's face (cardFace.ts) on the cards gallery's walls, in a gilt frame. What each is and does
// shows as you come near (sim/lobby/lobby.ts).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DROP_KINDS, DropKind } from '../../sim/items/drops';
import { InfoKind, isWeapon } from '../../sim/items/itemInfo';
import { PEDESTAL } from '../../world/lobby/furniture';
import { CARD_SIZE, cardSlots, ITEM_STANDS, WEAPON_STANDS } from '../../world/lobby/galleries';
import { cardFaceTexture } from '../cardFace';
import { itemLooks } from '../keyLooks';
import { boxInstances } from '../kitPieces';
import { ITEMS_URL } from '../treasureView';

/** An exhibit floats this high over its pedestal (m), turns this fast (rad/s) and bobs this much (m). */
const FLOAT = 0.55;
const TURN = 0.9;
const BOB = 0.05;
/** An exhibit's longest side (m): a weapon's, a thing's; grown at most this many times its own. */
const EXHIBIT_SIZE = { weapon: 0.85, item: 0.5, grow: 1.3 } as const;

/** How much to scale an exhibit whose longest side is `longest` (m). */
export const exhibitScale = (kind: InfoKind, longest: number) => Math.min(EXHIBIT_SIZE.grow, (isWeapon(kind) ? EXHIBIT_SIZE.weapon : EXHIBIT_SIZE.item) / longest);

/** The plain Sword's steel; a card's face painted this many px across; its gilt frame's bars (m). */
const STEEL = 0xc9cdd6;
const FACE_PX = 192;
const FRAME = { bar: 0.07, depth: 0.05, color: 0xc9a14a } as const;

/** `o` sized as an exhibit (by its meshes, not a glow), its middle at its holder's. */
function fitted(o: THREE.Object3D, kind: InfoKind): THREE.Object3D {
  o.position.set(0, 0, 0);
  o.updateMatrixWorld(true);
  const box = new THREE.Box3();
  o.traverse((m) => {
    if (!(m instanceof THREE.Mesh)) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
  });
  const holder = new THREE.Group();
  holder.add(o);
  if (box.isEmpty()) return holder;
  const sides = box.getSize(new THREE.Vector3());
  const k = exhibitScale(kind, Math.max(sides.x, sides.y, sides.z));
  o.scale.multiplyScalar(k);
  o.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-k);
  return holder;
}

export class GalleryView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  readonly exhibits: THREE.Object3D[] = [];
  private readonly stuff: { dispose(): void }[] = [];

  /** `loadModels`: fetch items.glb (tests attach a parsed one instead). */
  constructor(loadModels = true) {
    this.cards();
    this.loaded = loadModels
      ? new GLTFLoader()
          .loadAsync(ITEMS_URL)
          .then((g) => this.attach(g.scene))
          .catch((err) => console.error('gallery models failed to load', err))
      : Promise.resolve();
  }

  /** The weapons and the items, each over its pedestal. */
  attach(model: THREE.Object3D) {
    const found: Partial<Record<DropKind, THREE.Object3D>> = {};
    for (const kind of DROP_KINDS) {
      const p = model.getObjectByName(`item_${kind}`);
      if (p) found[kind] = p;
    }
    const looks = itemLooks(found);
    for (const s of [...WEAPON_STANDS, ...ITEM_STANDS]) {
      const o = this.look(looks, s.kind);
      if (!o) continue;
      const holder = fitted(o, s.kind);
      holder.position.set(s.x, PEDESTAL.top + FLOAT, s.z);
      this.group.add(holder);
      this.exhibits.push(holder);
    }
  }

  private look(looks: Partial<Record<DropKind, THREE.Object3D>>, kind: InfoKind): THREE.Object3D | null {
    if (kind !== 'sword') return looks[kind as DropKind]?.clone() ?? null;
    const gold = looks.goldSword;
    if (!gold) return null;
    const steel = gold.clone();
    steel.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = (o.material as THREE.MeshStandardMaterial).clone();
      m.color.setHex(STEEL);
      m.metalness = 0.6;
      m.roughness = 0.35;
      this.stuff.push(m);
      o.material = m;
    });
    return steel;
  }

  /** Every card's face on its wall, in its frame. */
  private cards() {
    const geo = new THREE.PlaneGeometry(CARD_SIZE.w, CARD_SIZE.h);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const gilt = new THREE.MeshStandardMaterial({ color: FRAME.color, roughness: 0.35, metalness: 0.6 });
    this.stuff.push(geo, box, gilt);
    const bars: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
    const { w, h } = CARD_SIZE;
    const t = FRAME.bar;
    for (const c of cardSlots()) {
      const tex = cardFaceTexture(c.kind, FACE_PX);
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      this.stuff.push(tex, mat);
      const face = new THREE.Mesh(geo, mat);
      face.position.set(c.x, c.y, c.z);
      face.rotation.y = c.rot;
      this.group.add(face);
      // (Along the wall it hangs on: x on a north or south wall, z on a side wall.)
      const alongX = Math.abs(Math.cos(c.rot)) > 0.5;
      const size = (along: number, up: number) => (alongX ? { w: along, h: up, d: FRAME.depth } : { w: FRAME.depth, h: up, d: along });
      const at = (off: number, y: number) => (alongX ? { x: c.x + off, y, z: c.z } : { x: c.x, y, z: c.z + off });
      bars.push({ ...at(0, c.y + h / 2 + t / 2), ...size(w + 2 * t, t) }, { ...at(0, c.y - h / 2 - t / 2), ...size(w + 2 * t, t) });
      for (const s of [-1, 1]) bars.push({ ...at(s * (w / 2 + t / 2), c.y), ...size(t, h) });
    }
    this.group.add(boxInstances(bars, gilt, box));
  }

  /** Each frame: the exhibits turning and bobbing. */
  update(time: number) {
    this.exhibits.forEach((o, i) => {
      o.rotation.y = time * TURN + i;
      o.position.y = PEDESTAL.top + FLOAT + Math.sin(time * 1.6 + i) * BOB;
    });
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
