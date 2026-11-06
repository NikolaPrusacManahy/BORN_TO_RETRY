// Update 0.3.58 — the little heads on the Drowned King's body (bone by bone, gnawing, snapping twice for its Jaw Launch, all turning on
// you for its Frenzy Combo), and its Maw of Many: its heads fly to its chest and it splits into one great mouth, which flashes before it
// bites, and stays jammed open once parried. And the glint on its claws as its third comes: that's the one to parry. Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { submerged, FRENZY, JAWS, MAW } from '../../sim/enemies/drownedKingMoves';
import { clawAt } from '../../sim/enemies/drownedJaws';
import { drownedWindup } from '../../sim/enemies/drownedKing';
import { MAW_BITE, MAW_TELL } from '../../sim/enemies/drownedMaw';
import { SHOW_LAND } from '../../sim/dungeon/drownedShow';
import { DROWNED } from '../../tuning/drowned';
import { drownedBonesOf, poseDrowned } from './drownedPose';
import { jawMaterial, lowerJaw, upperJaw } from './headGeometry';

const MOST = 8;
/** Where each sits: a bone, and how far from it along its right, forward and up (m, on a King of 6 m; mirrored). */
const MOUNTS: readonly (readonly [string, number, number, number])[] = [
  ['UpperArmR', 0.25, 0.1, 0.25],
  ['UpperArmL', -0.25, 0.1, 0.25],
  ['Torso', 0.72, 0.75, 0.1],
  ['Torso', -0.72, 0.75, 0.1],
  ['LowerArmR', 0.1, 0.25, 0.15],
  ['LowerArmL', -0.1, 0.25, 0.15],
  ['Abdomen', 0.55, 0.7, -0.2],
  ['Abdomen', -0.55, 0.7, -0.2],
];
/** A head's size (m). Its maw's, and where on its chest (m forward, up: on a King of 6 m), at full. */
const HEAD = 0.85;
const MAW_SIZE = 2.3;
const MAW_FORWARD = 0.5;
const MAW_UP = 2.35;
/** Its jaw's widest (rad); a head's. */
const MAW_OPEN = 0.95;
const HEAD_OPEN = 0.75;
/** A glint's size (m), and how long before its third claw it shows (s). */
const GLINT = 0.8;
const GLINT_FOR = 0.3;

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const dir = new THREE.Vector3();
const up = new THREE.Vector3();
const sideV = new THREE.Vector3();
const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const bone = new THREE.Vector3();
const chest = new THREE.Vector3();
const q = new THREE.Quaternion();
const hinge = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** The basis that runs a jaw's +y along `d`, its +z towards `upHint`. */
function aim(d: THREE.Vector3, upHint: THREE.Vector3, out: THREE.Quaternion) {
  sideV.crossVectors(d, upHint);
  if (sideV.lengthSq() < 1e-5) sideV.set(1, 0, 0);
  sideV.normalize();
  up.crossVectors(sideV, d).normalize();
  m.makeBasis(sideV, d, up);
  out.setFromRotationMatrix(m);
}

export class DrownedHeads {
  readonly group = new THREE.Group();
  private readonly upperGeo = upperJaw();
  private readonly lowerGeo = lowerJaw();
  private readonly mat = jawMaterial();
  private readonly uppers = new THREE.InstancedMesh(this.upperGeo, this.mat, MOST);
  private readonly lowers = new THREE.InstancedMesh(this.lowerGeo, this.mat, MOST);
  private readonly mawU = new THREE.Mesh(this.upperGeo, this.mat);
  private readonly mawL = new THREE.Mesh(this.lowerGeo, this.mat);
  private readonly ball = new THREE.IcosahedronGeometry(1, 2);
  private readonly flashMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flash = new THREE.Mesh(this.ball, this.flashMat);
  private readonly glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly glint = new THREE.Mesh(this.ball, this.glintMat);
  private time = 0;

  constructor(parent: THREE.Object3D) {
    parent.add(this.group);
    this.uppers.frustumCulled = this.lowers.frustumCulled = false;
    this.uppers.castShadow = this.lowers.castShadow = this.mawU.castShadow = this.mawL.castShadow = true;
    this.group.add(this.uppers, this.lowers, this.mawU, this.mawL, this.flash, this.glint);
    this.clear();
  }

  /** `rootOf`: the body drawn for an enemy slot, its clip applied this frame. */
  update(state: CombatState, dt: number, rootOf: (i: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    const i = state.enemies.findIndex((e) => e.alive && e.kind === 'drownedKing' && e.phase !== 'dead');
    const k = i >= 0 ? state.enemies[i] : null;
    const root = rootOf(i);
    if (!k || !k.drowned || !root || !root.visible || submerged(k)) {
      this.clear();
      return;
    }
    const bones = drownedBonesOf(root);
    if (bones) poseDrowned(root, bones, k);
    const b = k.drowned;
    const v = DROWNED.v;
    const size = v.kingHeight / 6;
    fw.set(-Math.sin(k.facing), 0, -Math.cos(k.facing));
    rt.set(Math.cos(k.facing), 0, -Math.sin(k.facing));
    root.updateMatrixWorld(true);
    // Its chest, its maw's.
    chest.copy(k.pos).addScaledVector(fw, MAW_FORWARD * size);
    chest.y = k.pos.y + MAW_UP * size;
    const tell = drownedWindup(k.move, k.stage);
    const u = k.t / Math.max(0.1, tell);
    const maw = k.phase === 'blast' && k.move === MAW;
    const stuck = k.phase === 'stun' && k.move === MAW;
    // In its tell they fly to its chest, screaming; after that, they're the maw.
    const merging = maw && k.shots === MAW_TELL ? Math.min(1, k.t / (v.mawTell * 0.8)) : 0;
    const gone = (maw && k.shots !== MAW_TELL) || stuck;
    const snap = k.phase === 'windup' && k.move === JAWS;
    // (Update 0.3.59 — as its show ends, they snap at you: its tell, shown.)
    const showing = k.phase === 'intro' && k.move === SHOW_LAND;
    const turned = (k.phase === 'windup' && (k.move === FRENZY || k.move === JAWS)) || k.phase === 'dive' || k.phase === 'breath' || maw || showing;
    let n = 0;
    if (!gone) {
      const count = maw ? Math.round(v.headsOn) : Math.min(b.heads, MOST);
      for (let h = 0; h < count; h++) {
        const [name, r, f, top] = MOUNTS[h % MOUNTS.length];
        const o = root.getObjectByName(name);
        if (!o) continue;
        o.getWorldPosition(bone);
        pos.copy(bone).addScaledVector(rt, -r * size).addScaledVector(fw, f * size);
        pos.y += top * size;
        // Out from its middle, or at you.
        dir.copy(rt).multiplyScalar(-Math.sign(r) * (turned ? 0.2 : 0.7)).addScaledVector(fw, 1);
        dir.y = turned ? 0 : -0.1;
        dir.normalize();
        let open = 0.14 + 0.1 * Math.sin(this.time * 7 + h * 1.7);
        // Its heads snap their jaws together, twice.
        if (snap) open = HEAD_OPEN * Math.abs(Math.sin(u * Math.PI * 2));
        if (showing) open = HEAD_OPEN * Math.abs(Math.sin(k.t * 7));
        if (maw) open = HEAD_OPEN;
        let scale = HEAD * size;
        if (merging > 0) {
          const e = merging * merging;
          pos.lerp(chest, e);
          scale *= 1 - 0.6 * e;
        }
        aim(dir, WORLD_UP, q);
        hinge.setFromAxisAngle(X, open * 0.6);
        m.compose(pos, q.clone().multiply(hinge), scl.setScalar(scale));
        this.uppers.setMatrixAt(n, m);
        hinge.setFromAxisAngle(X, -open * 0.4);
        m.compose(pos, q.clone().multiply(hinge), scl.setScalar(scale));
        this.lowers.setMatrixAt(n, m);
        n++;
      }
    }
    this.uppers.count = this.lowers.count = n;
    if (n > 0) {
      this.uppers.instanceMatrix.needsUpdate = true;
      this.lowers.instanceMatrix.needsUpdate = true;
    }
    this.drawMaw(k, maw, stuck, merging, size);
    this.drawGlint(k, root, size);
  }

  /** Its great maw on its chest: opening as its heads arrive, wide through its pull, shutting as it bites; jammed, wide and shaking. */
  private drawMaw(k: CombatState['enemies'][number], maw: boolean, stuck: boolean, merging: number, size: number) {
    const v = DROWNED.v;
    const on = maw || stuck;
    this.mawU.visible = this.mawL.visible = on;
    this.flash.visible = false;
    if (!on) return;
    let open = MAW_OPEN;
    let grown = 1;
    if (maw && k.shots === MAW_TELL) {
      grown = 0.2 + 0.8 * merging;
      open = MAW_OPEN * merging;
    }
    if (maw && k.shots === MAW_BITE) {
      const c = Math.min(1, k.t / v.mawFlash);
      // Wider yet, then down.
      open = MAW_OPEN * (c < 0.7 ? 1 + 0.2 * (c / 0.7) : 1.2 * (1 - (c - 0.7) / 0.3));
      this.flash.visible = true;
      const f = Math.sin(c * Math.PI);
      this.flash.position.copy(chest).addScaledVector(fw, 1.1 * size);
      this.flash.scale.setScalar(1.5 * size * (0.6 + 0.6 * f));
      this.flashMat.opacity = 0.35 + 0.65 * f;
    }
    const shake = stuck ? Math.sin(this.time * 60) * 0.03 : 0;
    const scale = MAW_SIZE * size * grown;
    // Its hinge a little behind its chest's front.
    dir.copy(fw);
    aim(dir, WORLD_UP, q);
    this.mawU.position.copy(chest);
    this.mawL.position.copy(chest);
    hinge.setFromAxisAngle(X, open * 0.62 + shake);
    this.mawU.quaternion.copy(q).multiply(hinge);
    hinge.setFromAxisAngle(X, -open * 0.48 - shake);
    this.mawL.quaternion.copy(q).multiply(hinge);
    this.mawU.scale.setScalar(scale);
    this.mawL.scale.setScalar(scale);
  }

  /** The glint on its claws as its third comes. */
  private drawGlint(k: CombatState['enemies'][number], root: THREE.Object3D, size: number) {
    const on = k.phase === 'dive' && k.move === FRENZY && k.shots === 2 && k.t >= clawAt(k, 2) - GLINT_FOR;
    this.glint.visible = on;
    if (!on) return;
    const hand = root.getObjectByName('LowerArmR');
    if (!hand) return;
    hand.getWorldPosition(this.glint.position);
    const c = 1 - Math.max(0, (clawAt(k, 2) - k.t) / GLINT_FOR);
    this.glint.scale.setScalar(GLINT * size * (0.4 + 0.6 * c));
    this.glintMat.opacity = 0.3 + 0.7 * c;
  }

  clear() {
    this.uppers.count = this.lowers.count = 0;
    this.mawU.visible = this.mawL.visible = this.flash.visible = this.glint.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.uppers.dispose();
    this.lowers.dispose();
    for (const g of [this.upperGeo, this.lowerGeo, this.ball]) g.dispose();
    for (const mat of [this.mat, this.flashMat, this.glintMat]) mat.dispose();
  }
}
