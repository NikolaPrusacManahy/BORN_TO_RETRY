// Update 0.2.3 — what the Bone King shows besides its body (enemiesView.ts draws it): each skeleton it throws, tumbling
// on its arc (bombView.ts marks where it'll land); where each jump will land, a ring as wide as the smash, filling as
// it comes down; and its final blast's reach on the floor (the designer: "the range on the explosion will be displayed
// on the floor, so player can see how far they need to move away"), a ring as wide as the blast with a disc filling it
// as it charges, pulsing quicker near the end. While it holds you, its arm reaches out to you (its hand round you).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { BOMB_POOL } from '../../sim/combat/bombs';
import { heldAt } from '../../sim/combat/grab';
import type { CombatState } from '../../sim/combat/state';
import { isLive } from '../../sim/enemies/enemy';
import { RADIUS } from '../../sim/enemies/kinds';
import { BONE_KING } from '../../tuning/boneKing';
import { boneOf } from '../exec/bones';

const SKELETON_URL = '/models/enemies/skeleton.glb';
/** The arm that holds you (the model's arms are its "001" legs): its upper arm and forearm. */
const ARM = ['RUpperLeg001', 'RDownLeg001'];
/** It holds you at your chest: this far above your feet (m). */
const HOLD_AT = 1.1;
/** A thrown skeleton's height (m), and how fast it tumbles (rad/s). */
const THROWN = 1.3;
const TUMBLE = 9;

const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export class KingView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  /** One thrown skeleton per bomb slot. */
  private readonly thrown: THREE.Object3D[] = [];
  private readonly ringGeo = new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2);
  private readonly landRing = new THREE.Mesh(this.ringGeo, additive(0xff3a20));
  private readonly landFill = new THREE.Mesh(this.discGeo, additive(0xff5a20));
  private readonly blastRing = new THREE.Mesh(this.ringGeo, additive(0xff2a10));
  private readonly blastFill = new THREE.Mesh(this.discGeo, additive(0xff6a20));
  private time = 0;
  private readonly target = new THREE.Vector3();

  /** `loadModels`: fetch the skeleton (tests attach a parsed one instead). */
  constructor(scene: THREE.Scene, loadModels = true) {
    scene.add(this.group);
    for (const m of [this.landRing, this.landFill, this.blastRing, this.blastFill]) {
      m.visible = false;
      this.group.add(m);
    }
    this.loaded = loadModels
      ? new GLTFLoader()
          .loadAsync(SKELETON_URL)
          .then((gltf) => this.attach(gltf.scene, gltf.animations))
          .catch((err) => console.error('thrown skeletons failed to load', err))
      : Promise.resolve();
  }

  /** A thrown skeleton for each bomb slot: the model, curled up in its fall (its death clip, a moment in), held. */
  attach(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    const box = new THREE.Box3().setFromObject(model);
    const size = Math.max(0.01, box.max.y - box.min.y);
    const clip = animations.find((a) => a.name.endsWith('Death'));
    for (let i = 0; i < BOMB_POOL; i++) {
      const body = cloneSkinned(model);
      body.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      if (clip) {
        const mixer = new THREE.AnimationMixer(body);
        mixer.clipAction(clip).play();
        mixer.update(clip.duration * 0.3);
      }
      // About its middle, so it tumbles round it.
      body.position.y = -(box.min.y + size / 2);
      const holder = new THREE.Group();
      holder.add(body);
      holder.scale.setScalar(THROWN / size);
      holder.visible = false;
      this.group.add(holder);
      this.thrown.push(holder);
    }
  }

  /** `rootOf`: the body drawn for an enemy slot (enemiesView.ts), posed this frame. */
  update(state: CombatState, dt: number, rootOf: (i: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    const g = state.grab;
    const root = g.on ? rootOf(g.slot) : null;
    if (root) {
      heldAt(state, g.slot, this.target).y += HOLD_AT;
      root.updateMatrixWorld(true);
      for (const name of ARM) {
        const bone = boneOf(root, name);
        if (bone) aimBone(bone, this.target);
      }
    }
    for (let i = 0; i < this.thrown.length; i++) {
      const b = state.bombs[i];
      const s = this.thrown[i];
      s.visible = b.alive && b.look === 'bones';
      if (!s.visible) continue;
      s.position.copy(b.pos);
      s.rotation.set(b.t * TUMBLE, i * 1.3, b.t * TUMBLE * 0.6);
    }
    const v = BONE_KING.v;
    const king = state.enemies.find((e) => e.kind === 'boneKing' && isLive(e));
    // A jump's landing.
    const landing = !!king && king.phase === 'leap';
    this.landRing.visible = this.landFill.visible = landing;
    if (king && landing) {
      const k = Math.min(1, king.t / v.smashAir);
      const r = v.smashReach + RADIUS.boneKing;
      this.place(this.landRing, king.aim, r, 0.4 + 0.6 * k);
      this.place(this.landFill, king.aim, r * k, 0.15 + 0.35 * k * k);
    }
    // The blast's reach.
    const blast = !!king && king.phase === 'blast';
    this.blastRing.visible = this.blastFill.visible = blast;
    if (king && blast) {
      const k = Math.min(1, king.t / v.blastCharge);
      const pulse = 0.5 + 0.5 * Math.sin(this.time * (6 + 18 * k));
      this.place(this.blastRing, king.pos, king.near, 0.55 + 0.45 * pulse);
      this.place(this.blastFill, king.pos, king.near * k, 0.12 + 0.3 * k + 0.1 * pulse);
    }
  }

  private place(m: THREE.Mesh, at: THREE.Vector3, r: number, opacity: number) {
    m.position.set(at.x, at.y + 0.06, at.z);
    m.scale.setScalar(Math.max(0.01, r));
    (m.material as THREE.MeshBasicMaterial).opacity = opacity;
  }

  /** (For tests: the bone that holds you.) */
  static readonly ARM = ARM;

  clear() {
    for (const s of this.thrown) s.visible = false;
    this.landRing.visible = this.landFill.visible = this.blastRing.visible = this.blastFill.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.ringGeo.dispose();
    this.discGeo.dispose();
    for (const m of [this.landRing, this.landFill, this.blastRing, this.blastFill]) (m.material as THREE.Material).dispose();
  }
}

const at = new THREE.Vector3();
const way = new THREE.Vector3();
const q = new THREE.Quaternion();
const turn = new THREE.Quaternion();

/** Turns `bone` (it runs along its own +y) to point at `target` (world). */
function aimBone(bone: THREE.Object3D, target: THREE.Vector3) {
  bone.getWorldPosition(at);
  bone.getWorldQuaternion(q);
  way.set(0, 1, 0).applyQuaternion(q);
  turn.setFromUnitVectors(way, at.sub(target).negate().normalize());
  q.premultiply(turn);
  // Into its parent's space.
  if (bone.parent) q.premultiply(bone.parent.getWorldQuaternion(turn).invert());
  bone.quaternion.copy(q);
  bone.updateMatrixWorld(true);
}
