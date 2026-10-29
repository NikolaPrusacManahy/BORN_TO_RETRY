// Update 0.1.9 — the Dual Daggers' volley as you see it (sim/weapons/knives.ts): each thrown dagger is the held dagger's
// model, flying point first along its path, stuck in a wall where it hit one. It leaves from the hand that threw it
// (where the arms hold it) and joins its true path over LAUNCH s. Drawn as one instanced mesh per part of the model, so
// a stream of them costs a few draw calls; nothing made per frame.
// Update 0.1.10 — each in its own pair's model: the Gold Daggers' fly gold.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../sim/combat/state';
import { VOLLEYS, WEAPON_KINDS, WeaponKind } from '../sim/weapons/catalog';
import { KNIFE_POOL } from '../sim/weapons/knives';
import type { Viewmodel } from './viewmodel/viewmodel';
import { WEAPON_URL } from './weaponsView';

/** Seconds a dagger takes to go from the hand to its true path. */
const LAUNCH = 0.08;
const UP = new THREE.Vector3(0, 1, 0);

const m = new THREE.Matrix4();
const handM = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scale = new THREE.Vector3();
const fly = new THREE.Vector3();

/** One model's daggers: an instanced mesh per part, each part's place in the model, and how many are drawn. */
interface Look {
  parts: THREE.InstancedMesh[];
  partM: THREE.Matrix4[];
  n: number;
}

export class KnivesView {
  readonly group = new THREE.Group();
  private readonly looks: Partial<Record<WeaponKind, Look>> = {};
  /** Per knife slot: its life last frame (a throw resets it), seconds since it left the hand (−1: on its own), and
   *  where the hand let it go. */
  private readonly lastLife = new Array<number>(KNIFE_POOL).fill(0);
  private readonly launch = new Array<number>(KNIFE_POOL).fill(-1);
  private readonly fromPos = Array.from({ length: KNIFE_POOL }, () => new THREE.Vector3());
  private readonly fromQuat = Array.from({ length: KNIFE_POOL }, () => new THREE.Quaternion());
  private readonly fromScale = new Array<number>(KNIFE_POOL).fill(1);

  /** `loadModel`: fetch the dagger (tests attach a parsed model instead). */
  constructor(
    scene: THREE.Scene,
    private readonly arms: Viewmodel,
    private readonly camera: THREE.Camera,
    loadModel = true,
  ) {
    scene.add(this.group);
    if (loadModel) {
      const loader = new GLTFLoader();
      for (const kind of WEAPON_KINDS.filter((k) => VOLLEYS[k])) {
        void loader
          .loadAsync(WEAPON_URL[kind])
          .then((gltf) => this.attach(gltf.scene, kind))
          .catch((err) => console.error(`thrown ${kind} failed to load`, err));
      }
    }
  }

  attach(model: THREE.Object3D, kind: WeaponKind = 'daggers') {
    const look: Look = { parts: [], partM: [], n: 0 };
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const part = new THREE.InstancedMesh(o.geometry, o.material, KNIFE_POOL);
      part.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      part.frustumCulled = false;
      part.castShadow = true;
      part.count = 0;
      look.parts.push(part);
      look.partM.push(o.matrixWorld.clone());
      this.group.add(part);
    });
    this.looks[kind] = look;
  }

  update(state: CombatState, dt: number) {
    for (const kind of WEAPON_KINDS) {
      const look = this.looks[kind];
      if (look) look.n = 0;
    }
    for (let i = 0; i < state.knives.length; i++) {
      const k = state.knives[i];
      const thrown = k.alive && !k.stuck && k.life > this.lastLife[i] + 1e-6;
      this.lastLife[i] = k.alive ? k.life : 0;
      if (!k.alive) continue;
      if (thrown) this.letGo(i, k.hand);
      // Point first along its flight.
      fly.copy(k.vel).normalize();
      quat.setFromUnitVectors(UP, fly);
      pos.copy(k.pos);
      let s = 1;
      if (this.launch[i] >= 0) {
        this.launch[i] += dt;
        const t = Math.min(1, this.launch[i] / LAUNCH);
        const e = t * t * (3 - 2 * t);
        pos.lerpVectors(this.fromPos[i], k.pos, e);
        quat.slerpQuaternions(this.fromQuat[i], quat, e);
        s = this.fromScale[i] + (1 - this.fromScale[i]) * e;
        if (t >= 1) this.launch[i] = -1;
      }
      const look = this.looks[k.kind] ?? this.looks.daggers;
      if (!look) continue;
      m.compose(pos, quat, scale.setScalar(s));
      for (let p = 0; p < look.parts.length; p++) look.parts[p].setMatrixAt(look.n, handM.multiplyMatrices(m, look.partM[p]));
      look.n++;
    }
    for (const kind of WEAPON_KINDS) {
      const look = this.looks[kind];
      if (!look) continue;
      for (const part of look.parts) {
        part.count = look.n;
        part.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** A dagger just thrown: it starts where the throwing hand holds its dagger (the arms' camera sits at the eye, so the
   *  world camera's matrix carries it into the world). */
  private letGo(i: number, hand: number) {
    const held = hand === 1 ? this.arms.off.held : this.arms.heldWeapon;
    this.launch[i] = -1;
    if (!held) return;
    this.camera.updateMatrixWorld();
    handM.multiplyMatrices(this.camera.matrixWorld, held.matrixWorld).decompose(this.fromPos[i], this.fromQuat[i], scale);
    this.fromScale[i] = scale.x;
    this.launch[i] = 0;
  }

  clear() {
    this.lastLife.fill(0);
    this.launch.fill(-1);
    for (const kind of WEAPON_KINDS) for (const part of this.looks[kind]?.parts ?? []) part.count = 0;
  }

  dispose() {
    this.group.removeFromParent();
    for (const kind of WEAPON_KINDS) for (const part of this.looks[kind]?.parts ?? []) part.dispose();
  }
}
