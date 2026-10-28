// Update 0.0.13 — draws the shop and the chests (sim/dungeon/treasure.ts) from public/models/items/items.glb
// (tools/blender/export_items.py): each shop tile with its item turning above it and its price over it (red when you
// can't pay), a sold tile left bare; each chest, its lid swinging up on its hinge as you lift it; an item you buy or find
// flying into you. It also says where the opening lid's front edge is, for the hands that lift it.
// Update 0.0.15 — and what the boss leaves you, flying from its burst.
// Update 0.0.16 — the three keys (keyLooks.ts: on end, the white and gold ones in their auras), items on the floor and
// each chest's light by its rarity (treasureFx.ts).
// Update 0.0.18 — each tag shows its own offer's price (red when you can't pay it).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../sim/combat/state';
import type { Treasure } from '../sim/dungeon/treasure';
import { ITEM_KINDS, ItemKind } from '../sim/items/items';
import { DROP_KINDS, DropKind } from '../sim/items/drops';
import { ITEMS } from '../tuning/items';
import { itemLooks } from './keyLooks';
import { ChestGlows, DropsView } from './treasureFx';

export const ITEMS_URL = '/models/items/items.glb';
/** An item turns this high over its tile (m) at this speed (rad/s); its price floats above it. */
const FLOAT = 1.05;
const TURN = 1.2;
const PRICE_Y = 1.75;
/** The lid: shut until this far into the opening, up (this many radians) by that far. */
const LID_START = 0.28;
const LID_UP = 0.6;
export const LID_OPEN = 1.85;
/** The lid's front edge from its hinge (m, the lid's own space), and the hands' spread along it. */
const LIP = new THREE.Vector3(0, 0.02, 0.74);
const HANDS = 0.3;
/** An item flies into you over this long (s). */
const FLY = 0.45;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** How far open a chest's lid is (rad) at `k` (0..1) through its opening. */
export function lidAngle(k: number): number {
  return LID_OPEN * smooth((k - LID_START) / (LID_UP - LID_START));
}

interface ChestBody {
  root: THREE.Object3D;
  lid: THREE.Object3D;
}

interface Flyer {
  obj: THREE.Object3D;
  from: THREE.Vector3;
  t: number;
}

export class TreasureView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  /** The chest being opened: how far through (−1: none) and its lid's front corners (world). */
  readonly reach = { k: -1, left: new THREE.Vector3(), right: new THREE.Vector3() };
  private items: THREE.Object3D[] = [];
  private prices: THREE.Sprite[] = [];
  private chests: ChestBody[] = [];
  private flyers: Partial<Record<ItemKind, Flyer>> = {};
  private protos: Partial<Record<DropKind, THREE.Object3D>> = {};
  private readonly drops = new DropsView(() => this.protos);
  private readonly glows = new ChestGlows();
  /** Price tags by price, as you can pay them and as you can't. */
  private readonly tags = new Map<number, { cheap: THREE.SpriteMaterial; dear: THREE.SpriteMaterial }>();
  private readonly textures: THREE.Texture[] = [];
  private time = 0;
  private readonly to = new THREE.Vector3();

  /** `loadModels`: fetch the models (tests attach parsed ones instead). */
  constructor(
    scene: THREE.Scene,
    private readonly treasure: Treasure,
    loadModels = true,
  ) {
    scene.add(this.group);
    this.group.add(this.drops.group, this.glows.group);
    this.loaded = loadModels
      ? new GLTFLoader()
          .loadAsync(ITEMS_URL)
          .then((gltf) => this.attach(gltf.scene))
          .catch((err) => console.error('items failed to load', err))
      : Promise.resolve();
  }

  /** The tags for `price`, made once. */
  private tag(price: number) {
    let t = this.tags.get(price);
    if (!t) {
      t = {
        cheap: new THREE.SpriteMaterial({ map: this.priceTexture('#ffd76a', price), depthWrite: false, transparent: true }),
        dear: new THREE.SpriteMaterial({ map: this.priceTexture('#ff5a4a', price), depthWrite: false, transparent: true }),
      };
      this.tags.set(price, t);
    }
    return t;
  }

  /** The price tag: a coin and the price (blank where there's no page to draw it on: the rule tests). */
  private priceTexture(colour: string, price: number): THREE.Texture {
    if (typeof document === 'undefined') return new THREE.Texture();
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e8b931';
    g.beginPath();
    g.arc(52, 48, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#9a6d12';
    g.beginPath();
    g.arc(52, 48, 18, 0, Math.PI * 2);
    g.fill();
    g.font = 'bold 64px sans-serif';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillText(String(price), 98, 53);
    g.fillStyle = colour;
    g.fillText(String(price), 94, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(t);
    return t;
  }

  attach(model: THREE.Object3D) {
    const get = (name: string) => model.getObjectByName(name);
    const found: Partial<Record<DropKind, THREE.Object3D>> = {};
    for (const kind of DROP_KINDS) {
      const proto = get(`item_${kind}`);
      if (proto) found[kind] = proto;
    }
    this.protos = itemLooks(found);
    const tile = get('item_tile');
    for (const o of this.treasure.offers) {
      if (tile) {
        const t = tile.clone();
        t.position.set(o.x, 0.005, o.z);
        this.group.add(t);
      }
      const item = this.protos[o.kind]?.clone() ?? new THREE.Object3D();
      item.position.set(o.x, FLOAT, o.z);
      this.group.add(item);
      this.items.push(item);
      const price = new THREE.Sprite(this.tag(o.price).cheap);
      price.position.set(o.x, PRICE_Y, o.z);
      price.scale.set(0.8, 0.3, 1);
      this.group.add(price);
      this.prices.push(price);
    }
    const base = get('item_chestBase');
    const lid = get('item_chestLid');
    for (const c of this.treasure.chests) {
      const root = new THREE.Group();
      root.position.set(c.spot.x, 0, c.spot.z);
      root.rotation.y = c.spot.rot;
      if (base) root.add(base.clone());
      const l = lid ? lid.clone() : new THREE.Object3D();
      root.add(l);
      this.group.add(root);
      this.chests.push({ root, lid: l });
    }
    for (const kind of ITEM_KINDS) {
      const proto = this.protos[kind];
      if (!proto) continue;
      const obj = proto.clone();
      obj.visible = false;
      this.group.add(obj);
      this.flyers[kind] = { obj, from: new THREE.Vector3(), t: -1 };
    }
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }

  /** Reads this frame's combat events (before they're cleared) and animates. `eye`: the camera (items fly to it). */
  update(state: CombatState, eye: THREE.Vector3, dt: number) {
    this.time += dt;
    const t = this.treasure;
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events.at(i);
      if ((e.kind === 'buy' || e.kind === 'chestLoot' || e.kind === 'bossLoot') && e.value >= 0) this.fly(ITEM_KINDS[e.value], e.x, e.y, e.z);
    }
    this.drops.update(state.drops, dt);
    this.glows.update(t.chests, dt);
    for (let i = 0; i < this.items.length; i++) {
      const o = t.offers[i];
      const item = this.items[i];
      item.visible = this.prices[i].visible = !o.sold;
      item.position.y = FLOAT + Math.sin(this.time * 2 + i) * 0.06;
      item.rotation.y = this.time * TURN + i;
      const tag = this.tag(o.price);
      this.prices[i].material = state.money < o.price ? tag.dear : tag.cheap;
    }
    this.reach.k = -1;
    for (let i = 0; i < this.chests.length; i++) {
      const c = t.chests[i];
      const body = this.chests[i];
      const k = c.state === 'shut' ? 0 : c.state === 'open' ? 1 : c.t / ITEMS.v.chestTime;
      body.lid.rotation.x = -lidAngle(k);
      if (c.state === 'opening') this.lip(body, k);
    }
    for (const kind of ITEM_KINDS) {
      const f = this.flyers[kind];
      if (!f || f.t < 0) continue;
      f.t += dt;
      const k = Math.min(1, f.t / FLY);
      f.obj.position.lerpVectors(f.from, this.to.copy(eye).setY(eye.y - 0.3), smooth(k));
      f.obj.position.y += Math.sin(k * Math.PI) * 0.5;
      f.obj.rotation.y += dt * 8;
      f.obj.scale.setScalar(1 - 0.7 * k);
      if (k >= 1) {
        f.t = -1;
        f.obj.visible = false;
      }
    }
  }

  /** The opening lid's front corners in the world, for the hands. */
  private lip(body: ChestBody, k: number) {
    this.reach.k = k;
    body.root.updateMatrixWorld(true);
    this.reach.left.set(LIP.x - HANDS, LIP.y, LIP.z).applyMatrix4(body.lid.matrixWorld);
    this.reach.right.set(LIP.x + HANDS, LIP.y, LIP.z).applyMatrix4(body.lid.matrixWorld);
  }

  private fly(kind: ItemKind, x: number, y: number, z: number) {
    const f = this.flyers[kind];
    if (!f) return;
    f.from.set(x, Math.max(y, FLOAT), z);
    f.t = 0;
    f.obj.visible = true;
    f.obj.position.copy(f.from);
  }

  /** Update 0.0.16 — an item's look (the keys built in code), for the hand that shows it. */
  look(kind: ItemKind): THREE.Object3D | null {
    return this.protos[kind] ?? null;
  }

  dispose() {
    this.group.removeFromParent();
    this.glows.dispose();
    for (const t of this.tags.values()) {
      t.cheap.dispose();
      t.dear.dispose();
    }
    this.textures.forEach((t) => t.dispose());
  }
}
