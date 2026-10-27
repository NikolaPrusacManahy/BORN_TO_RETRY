// M2 — draws weapons: the ones lying in reach (turning slowly above the floor, a soft ring under them), the lab's stands
// (a plain gray-box post), the ones in flight (spinning end over end along their path), and the one in your hand
// (handed to the arms). The sword is the Ultimate RPG Pack's (public/models/weapons/sword.glb, export_weapon.py).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../sim/combat/state';
import { PICKUP_POOL, THROWN_POOL } from '../sim/weapons/weapons';
import type { Viewmodel } from './viewmodel/viewmodel';

export const SWORD_URL = '/models/weapons/sword.glb';
/** A weapon lying in reach floats this high above the floor (m) and turns this fast (rad/s). */
const FLOAT = 0.9;
const TURN = 1.4;
const UP = new THREE.Vector3(0, 1, 0);

export class WeaponsView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private pickups: THREE.Object3D[] = [];
  private rings: THREE.Mesh[] = [];
  private thrown: THREE.Object3D[] = [];
  private held: THREE.Object3D | null = null;
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
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(SWORD_URL)
          .then((gltf) => this.attach(gltf.scene))
          .catch((err) => console.error('sword model failed to load', err))
      : Promise.resolve();
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T {
    this.geos.push(g);
    return g;
  }

  attach(model: THREE.Object3D) {
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        const m = o.material as THREE.MeshStandardMaterial;
        m.roughness = 0.5;
      }
    });
    const ring = this.geo(new THREE.RingGeometry(0.35, 0.55, 28).rotateX(-Math.PI / 2));
    for (let i = 0; i < PICKUP_POOL; i++) {
      const p = model.clone();
      p.visible = false;
      this.group.add(p);
      this.pickups.push(p);
      const r = new THREE.Mesh(ring, this.ringMat);
      r.visible = false;
      this.group.add(r);
      this.rings.push(r);
    }
    for (let i = 0; i < THROWN_POOL; i++) {
      const t = model.clone();
      t.visible = false;
      this.group.add(t);
      this.thrown.push(t);
    }
    this.held = model.clone();
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = state.pickups[i];
      const m = this.pickups[i];
      const r = this.rings[i];
      m.visible = r.visible = p.alive;
      if (!p.alive) continue;
      m.position.set(p.pos.x, p.pos.y + FLOAT + Math.sin(this.time * 2 + i) * 0.06, p.pos.z);
      m.rotation.set(0, this.time * TURN + i, 0.35);
      r.position.set(p.pos.x, p.pos.y + 0.02, p.pos.z);
    }
    for (let i = 0; i < this.thrown.length; i++) {
      const t = state.thrown[i];
      const m = this.thrown[i];
      m.visible = t.alive;
      if (!t.alive) continue;
      m.position.copy(t.pos);
      // End over end: the blade turns about the axis across the flight, starting forward.
      this.fly.copy(t.vel).normalize();
      this.side.crossVectors(this.fly, UP).normalize();
      this.q.setFromUnitVectors(UP, this.fly);
      m.quaternion.setFromAxisAngle(this.side, -t.spin).multiply(this.q);
    }
    this.arms.setWeapon(state.weapon && this.held ? this.held : null);
  }

  dispose() {
    this.group.removeFromParent();
    this.arms.setWeapon(null);
    this.geos.forEach((g) => g.dispose());
    this.ringMat.dispose();
    this.standMat.dispose();
  }
}
