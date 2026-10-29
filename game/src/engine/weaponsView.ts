// M2 — draws weapons: the ones lying in reach (turning slowly above the floor, a soft ring under them), the lab's stands
// (a plain gray-box post), the ones in flight (tip first, or end over end with Throw spin), and the one in your hand
// (handed to the arms). The sword is the Ultimate RPG Pack's (public/models/weapons/sword.glb, export_weapon.py).
// A thrown weapon starts where the hand let it go and joins its true path (from the eye) over LAUNCH seconds.
// Update 0.0.13 — a model per weapon kind: the Gold Sword is the pack's Sword_Golden (gold_sword.glb), held the same.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../sim/combat/state';
import type { WeaponKind } from '../sim/weapons/catalog';
import { PICKUP_POOL, THROWN_POOL } from '../sim/weapons/weapons';
import type { Viewmodel } from './viewmodel/viewmodel';

export const SWORD_URL = '/models/weapons/sword.glb';
// Update 0.1.4 — the Grimoire: the pack's Book3_Open (grimoire.glb, export_book.py), held open in the right hand.
// Update 0.1.5 — the Gold Axe (Axe_small_Golden) and the Hammer (Hammer_Double), export_weapon.py.
export const WEAPON_URL: Record<WeaponKind, string> = {
  sword: SWORD_URL,
  goldSword: '/models/weapons/gold_sword.glb',
  grimoire: '/models/weapons/grimoire.glb',
  goldAxe: '/models/weapons/gold_axe.glb',
  hammer: '/models/weapons/hammer.glb',
};
const KINDS = Object.keys(WEAPON_URL) as WeaponKind[];
/** A weapon lying in reach floats this high above the floor (m) and turns this fast (rad/s). */
const FLOAT = 0.9;
const TURN = 1.4;
const UP = new THREE.Vector3(0, 1, 0);
/** Seconds a thrown weapon takes to go from the hand to its true path. */
const LAUNCH = 0.12;
const smooth = (x: number) => x * x * (3 - 2 * x);

export class WeaponsView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  /** Per kind, one model per pickup and thrown slot (a slot shows its weapon's kind). */
  private pickups: Partial<Record<WeaponKind, THREE.Object3D[]>> = {};
  private rings: THREE.Mesh[] = [];
  private thrown: Partial<Record<WeaponKind, THREE.Object3D[]>> = {};
  /** Per thrown slot: seconds since it left the hand (−1: flying on its own), and where the hand let it go. */
  private launch: number[] = [];
  private fromPos: THREE.Vector3[] = [];
  private fromQuat: THREE.Quaternion[] = [];
  private fromScale: number[] = [];
  private held: Partial<Record<WeaponKind, THREE.Object3D>> = {};
  private readonly handM = new THREE.Matrix4();
  private readonly scale = new THREE.Vector3();
  private readonly flight = new THREE.Quaternion();
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly standMat = new THREE.MeshStandardMaterial({ color: 0x6a6170, roughness: 0.9 });
  private readonly geos: THREE.BufferGeometry[] = [];
  private time = 0;
  private readonly side = new THREE.Vector3();
  private readonly fly = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();

  /** `loadModel`: fetch the sword (tests attach a parsed model instead). */
  constructor(
    scene: THREE.Scene,
    state: CombatState,
    private readonly arms: Viewmodel,
    private readonly camera: THREE.Camera,
    loadModel = true,
  ) {
    scene.add(this.group);
    const post = this.geo(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 10));
    const base = this.geo(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 16));
    for (const s of state.stands) {
      const stand = new THREE.Group();
      const p = new THREE.Mesh(post, this.standMat);
      p.position.y = 0.4;
      const b = new THREE.Mesh(base, this.standMat);
      b.position.y = 0.05;
      p.castShadow = b.castShadow = true;
      stand.add(p, b);
      stand.position.copy(s.pos);
      this.group.add(stand);
    }
    const ring = this.geo(new THREE.RingGeometry(0.35, 0.55, 28).rotateX(-Math.PI / 2));
    for (let i = 0; i < PICKUP_POOL; i++) {
      const r = new THREE.Mesh(ring, this.ringMat);
      r.visible = false;
      this.group.add(r);
      this.rings.push(r);
    }
    for (let i = 0; i < THROWN_POOL; i++) {
      this.launch.push(-1);
      this.fromPos.push(new THREE.Vector3());
      this.fromQuat.push(new THREE.Quaternion());
      this.fromScale.push(1);
    }
    const loader = new GLTFLoader();
    this.loaded = loadModel
      ? Promise.all(
          KINDS.map((kind) =>
            loader
              .loadAsync(WEAPON_URL[kind])
              .then((gltf) => this.attach(gltf.scene, kind))
              .catch((err) => console.error(`${kind} model failed to load`, err)),
          ),
        ).then(() => undefined)
      : Promise.resolve();
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T {
    this.geos.push(g);
    return g;
  }

  attach(model: THREE.Object3D, kind: WeaponKind = 'sword') {
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        const m = o.material as THREE.MeshStandardMaterial;
        m.roughness = 0.5;
      }
    });
    const copies = (n: number) =>
      Array.from({ length: n }, () => {
        const c = model.clone();
        c.visible = false;
        this.group.add(c);
        return c;
      });
    this.pickups[kind] = copies(PICKUP_POOL);
    this.thrown[kind] = copies(THROWN_POOL);
    this.held[kind] = model.clone();
    // Update 0.1.4 — the Grimoire lies open on the right palm (viewmodel/bookArms.ts).
    if (kind === 'grimoire') this.held[kind]!.userData.hold = 'book';
    // Update 0.1.5 — the arms play this weapon's own moves (viewmodel/weaponMoves.ts).
    this.held[kind]!.userData.kind = kind;
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    for (let i = 0; i < this.rings.length; i++) {
      const p = state.pickups[i];
      const r = this.rings[i];
      r.visible = p.alive;
      for (const kind of KINDS) {
        const list = this.pickups[kind];
        if (list) list[i].visible = p.alive && p.kind === kind;
      }
      const m = this.pickups[p.kind]?.[i];
      if (!p.alive || !m) continue;
      m.position.set(p.pos.x, p.pos.y + FLOAT + Math.sin(this.time * 2 + i) * 0.06, p.pos.z);
      m.rotation.set(0, this.time * TURN + i, 0.35);
      r.position.set(p.pos.x, p.pos.y + 0.02, p.pos.z);
    }
    for (let i = 0; i < this.launch.length; i++) {
      const t = state.thrown[i];
      const m = this.thrown[t.kind]?.[i];
      for (const kind of KINDS) {
        const other = this.thrown[kind]?.[i];
        if (other && other !== m) other.visible = false;
      }
      if (!m) continue;
      if (t.alive && !m.visible) this.letGo(i);
      m.visible = t.alive;
      if (!t.alive) continue;
      m.position.copy(t.pos);
      // Tip first, turning end over end about the axis across the flight if Throw spin says so.
      this.fly.copy(t.vel).normalize();
      this.side.crossVectors(this.fly, UP).normalize();
      this.q.setFromUnitVectors(UP, this.fly);
      m.quaternion.setFromAxisAngle(this.side, -t.spin).multiply(this.q);
      m.scale.setScalar(1);
      if (this.launch[i] >= 0) {
        this.launch[i] += dt;
        const k = smooth(Math.min(1, this.launch[i] / LAUNCH));
        m.position.lerpVectors(this.fromPos[i], t.pos, k);
        this.flight.copy(m.quaternion);
        m.quaternion.copy(this.fromQuat[i]).slerp(this.flight, k);
        m.scale.setScalar(this.fromScale[i] + (1 - this.fromScale[i]) * k);
        if (k >= 1) this.launch[i] = -1;
      }
    }
    this.arms.setWeapon(state.weapon ? this.held[state.weapon.kind] ?? null : null);
  }

  /** A weapon just thrown: it starts from where the sword in the arms is (the arms' camera sits at the eye, so the
   *  world camera's matrix carries it into the world). */
  private letGo(i: number) {
    const held = this.arms.heldWeapon;
    if (!held) return;
    this.camera.updateMatrixWorld();
    this.handM.multiplyMatrices(this.camera.matrixWorld, held.matrixWorld).decompose(this.fromPos[i], this.fromQuat[i], this.scale);
    this.fromScale[i] = this.scale.x;
    this.launch[i] = 0;
  }

  dispose() {
    this.group.removeFromParent();
    this.arms.setWeapon(null);
    this.geos.forEach((g) => g.dispose());
    this.ringMat.dispose();
    this.standMat.dispose();
  }
}
