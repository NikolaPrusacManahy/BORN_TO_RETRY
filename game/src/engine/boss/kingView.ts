// Update 0.3.53 — what the Bone King shows besides its body (enemiesView.ts draws it; kingPose.ts poses it), by the Boss Design
// Bible. The loose bones lying about its pit, every one of them floating up and flying to it as its Colossus grows, and raining
// back as that ends. Its Shatter: the bones along their spokes (the lines on the floor tell you where they'll fly), the core left
// bare. Grave Grasp: hands out of the floor. Rib Cage Trap: its ring of cracks, then the ribs up out of the floor. Arm Slam: the
// strip of floor its arm will land on. Bone Colossus: its club, the vertebra glowing on its back, green fire in its eyes. Rebuilt
// wrong: two more arms out of its ribs. All made in code.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CombatState } from '../../sim/combat/state';
import { BONE_Y, CAGE, COLOSSUS, HANDS_UP, SHATTER, shatterOut, SLAM } from '../../sim/enemies/boneKingMoves';
import { kingTell } from '../../sim/enemies/boneKing';
import { Enemy, isLive } from '../../sim/enemies/enemy';
import { handDownAt, kingTall, shoulderAt, spineAt, spineRadius } from '../../sim/enemies/kingBody';
import { BONE_KING } from '../../tuning/boneKing';
import { handOfLimb, KING_POSE, type KingBones, kingBonesOf, poseKing } from './kingPose';

const BONE = 0xccb899;
const GREEN = 0x62ff8a;
/** Loose bones about its pit; how far from its middle (m); their lengths. */
const LOOSE = 90;
const LOOSE_NEAR = 5;
const LOOSE_FAR = 24;
/** Hands out of the floor, how far out; how fast they burst (s). */
const HANDS = 5;
const HANDS_OUT = 0.75;
const BURST = 0.12;
/** The ribs of its cage. */
const BARS = 12;
const ERUPT = 0.18;
const MAX_SPOKES = 32;
/** The rain of bones as its Colossus ends (s). */
const RAIN = 1.1;

const limb = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number) => {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const g = new THREE.CylinderGeometry(r, r * 1.15, dir.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  return g;
};
const knob = (x: number, y: number, z: number, r: number) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z);

/** A long bone, along +y, a knob at each end, 1 long. */
function boneGeometry(): THREE.BufferGeometry {
  return mergeGeometries([limb(0, -0.5, 0, 0, 0.5, 0, 0.055).toNonIndexed(), knob(0.04, 0.5, 0, 0.1), knob(-0.04, 0.5, 0, 0.09), knob(0.04, -0.5, 0, 0.1), knob(-0.04, -0.5, 0, 0.09)].map(strip))!;
}

/** Only what every piece has, so they merge. */
function strip(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  out.deleteAttribute('uv');
  out.computeVertexNormals();
  return out;
}

/** A hand reaching up out of the floor, its wrist at y 0, about 2 m high. */
function handGeometry(): THREE.BufferGeometry {
  const parts = [limb(0, -1.2, 0, 0, 0.7, 0, 0.09), limb(0.07, -1.2, 0, 0.07, 0.7, 0, 0.07), new THREE.BoxGeometry(0.46, 0.34, 0.2).translate(0, 0.86, 0)];
  for (let f = 0; f < 4; f++) {
    const x = -0.18 + f * 0.12;
    parts.push(limb(x, 1.0, 0, x * 1.25, 1.42, 0.05, 0.035), limb(x * 1.25, 1.42, 0.05, x * 1.3, 1.72, 0.2, 0.03));
  }
  parts.push(limb(0.22, 0.9, 0, 0.42, 1.2, 0.06, 0.04), limb(0.42, 1.2, 0.06, 0.4, 1.46, 0.2, 0.03));
  return mergeGeometries(parts.map(strip))!;
}

/** A rib up out of the floor, its foot at 0, curving in (towards −x) at the top. */
function barGeometry(): THREE.BufferGeometry {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0.55, 3, 0), new THREE.Vector3(-1.5, 4.6, 0));
  return strip(new THREE.TubeGeometry(curve, 12, 0.13, 6));
}

/** Its club: a great thigh bone, thick end up, 1 long from its grip. */
function clubGeometry(): THREE.BufferGeometry {
  const parts = [limb(0, 0, 0, 0, 1, 0, 0.09), knob(0.06, 1, 0, 0.2), knob(-0.08, 1.02, 0.04, 0.17), knob(0, 1.06, -0.1, 0.15), knob(0, 0, 0, 0.1)];
  return mergeGeometries(parts.map(strip))!;
}

const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const eul = new THREE.Euler();
const Y = new THREE.Vector3(0, 1, 0);
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

export class KingView {
  readonly group = new THREE.Group();
  /** (Nothing to fetch: everything's made here.) */
  readonly loaded: Promise<void> = Promise.resolve();
  private readonly boneMat = new THREE.MeshStandardMaterial({ color: BONE, roughness: 0.85 });
  private readonly boneGeo = boneGeometry();
  private readonly handGeo = handGeometry();
  private readonly barGeo = barGeometry();
  private readonly clubGeo = clubGeometry();
  private readonly flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly ringGeo = new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2);
  private readonly ball = new THREE.IcosahedronGeometry(1, 2);
  /** Bones about its pit, seeded once it stands. */
  private readonly loose = new THREE.InstancedMesh(this.boneGeo, this.boneMat, LOOSE);
  private readonly home: { x: number; z: number; yaw: number; tip: number; long: number; lift: number; into: number }[] = [];
  private seeded = false;
  private settled = false;
  private gone = false;
  private rain = RAIN;
  private readonly spokes = new THREE.InstancedMesh(this.boneGeo, this.boneMat, MAX_SPOKES);
  private readonly lines = new THREE.InstancedMesh(this.flat, additive(GREEN), MAX_SPOKES);
  private readonly hands = new THREE.InstancedMesh(this.handGeo, this.boneMat, HANDS);
  private readonly bars = new THREE.InstancedMesh(this.barGeo, this.boneMat, BARS);
  private readonly cracks = new THREE.InstancedMesh(this.flat, additive(0xffd9a0), BARS);
  private readonly ring = new THREE.Mesh(this.ringGeo, additive(0xffd9a0));
  private readonly strip = new THREE.Mesh(this.flat, additive(0xff5a30));
  private readonly core = new THREE.Mesh(this.ball, new THREE.MeshBasicMaterial({ color: 0xdcffe6, toneMapped: false }));
  private readonly coreGlow = new THREE.Mesh(this.ball, additive(GREEN));
  private readonly spine = new THREE.Mesh(this.ball, new THREE.MeshBasicMaterial({ color: 0xc8ffd8, toneMapped: false }));
  private readonly spineGlow = new THREE.Mesh(this.ball, additive(GREEN));
  private readonly club = new THREE.Mesh(this.clubGeo, this.boneMat);
  /** Green fire in its eyes, on its skull; two more arms, on its ribs: one set each body. */
  private readonly eyeMat = additive(GREEN);
  private readonly dressed = new WeakSet<THREE.Object3D>();
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (const o of [this.loose, this.spokes, this.lines, this.hands, this.bars, this.cracks]) {
      o.frustumCulled = false;
      o.count = 0;
      if (o.material === this.boneMat) o.castShadow = true;
      this.group.add(o);
    }
    for (const o of [this.ring, this.strip, this.core, this.coreGlow, this.spine, this.spineGlow, this.club]) {
      o.visible = false;
      this.group.add(o);
    }
    this.club.castShadow = true;
    this.loose.count = LOOSE;
    this.loose.visible = false;
  }

  /** Its loose bones, round where it stands first (seeded, so every run the same). */
  private seed(k: Enemy) {
    let s = 12345;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    this.home.length = 0;
    for (let i = 0; i < LOOSE; i++) {
      const a = rnd() * Math.PI * 2;
      const r = LOOSE_NEAR + Math.sqrt(rnd()) * (LOOSE_FAR - LOOSE_NEAR);
      this.home.push({ x: (k.king?.midX ?? k.pos.x) + Math.cos(a) * r, z: (k.king?.midZ ?? k.pos.z) + Math.sin(a) * r, yaw: rnd() * Math.PI * 2, tip: rnd() * 0.3, long: 0.9 + rnd() * 1.1, lift: 2 + rnd() * 4, into: 0.2 + rnd() * 0.5 });
    }
    this.seeded = true;
    this.settled = false;
  }

  /** `rootOf`: the body drawn for an enemy slot (enemiesView.ts), its clip applied this frame. */
  update(state: CombatState, dt: number, rootOf: (i: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    const i = state.enemies.findIndex((e) => e.kind === 'boneKing' && e.king && e.alive);
    const k = i >= 0 ? state.enemies[i] : null;
    if (!k || !k.king) {
      this.clear();
      return;
    }
    // (Dead, it's done: what it was doing goes, the bones about its pit stay.)
    if (!isLive(k)) {
      this.hideMoves();
      return;
    }
    if (!this.seeded) this.seed(k);
    const root = rootOf(i);
    const bones = root && root.visible ? kingBonesOf(root) : null;
    if (root && bones) {
      this.dress(root, bones);
      poseKing(root, bones, k, this.time);
      this.wearStage(root, k);
    }
    this.drawLoose(k, dt);
    this.drawShatter(k);
    this.drawHands(k);
    this.drawCage(k);
    this.drawStrip(k);
    this.drawColossus(k, root, bones);
  }

  /** Its green eyes, and the two more arms it rebuilds with: once on each body. */
  private dress(root: THREE.Object3D, bones: KingBones) {
    if (this.dressed.has(root)) return;
    this.dressed.add(root);
    const eyes = new THREE.Group();
    eyes.name = 'kingEyes';
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(this.ball, this.eyeMat);
      eye.scale.setScalar(0.13);
      // (A bone's +x is forward, its +z to its right.)
      eye.position.set(0.56, 0.6, side * 0.27);
      eyes.add(eye);
    }
    bones.head.add(eyes);
    const extra = new THREE.Group();
    extra.name = 'kingExtraArms';
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = 'kingArm';
      arm.position.set(0.05, 0.15, side * 0.6);
      arm.userData.side = side;
      const upper = new THREE.Mesh(this.boneGeo, this.boneMat);
      upper.scale.set(1.6, 1.25, 1.6);
      upper.position.y = -0.62;
      const fore = new THREE.Group();
      fore.name = 'kingFore';
      fore.position.y = -1.25;
      const low = new THREE.Mesh(this.boneGeo, this.boneMat);
      low.scale.set(1.4, 1.2, 1.4);
      low.position.y = -0.6;
      const hand = new THREE.Mesh(this.handGeo, this.boneMat);
      hand.scale.setScalar(0.5);
      hand.position.y = -1.25;
      hand.rotation.x = Math.PI;
      fore.add(low, hand);
      arm.add(upper, fore);
      extra.add(arm);
    }
    extra.visible = false;
    bones.torso.add(extra);
  }

  /** What it wears for its second life: more arms, waving wrongly; fire in its eyes once it's its Colossus. */
  private wearStage(root: THREE.Object3D, k: Enemy) {
    const eyes = root.getObjectByName('kingEyes');
    const extra = root.getObjectByName('kingExtraArms');
    const ult = k.phase === 'blast' && k.move === COLOSSUS;
    this.eyeMat.opacity = ult ? 0.95 : k.stage > 0 ? 0.55 : 0;
    if (eyes) eyes.visible = this.eyeMat.opacity > 0;
    if (!extra) return;
    extra.visible = k.stage > 0 && k.phase !== 'leap';
    for (const arm of extra.children) {
      const side = arm.userData.side as number;
      arm.rotation.set(-side * (1 + 0.25 * Math.sin(this.time * 3.1 + side * 2)), 0, 0.5 + 0.3 * Math.sin(this.time * 2.3 + side));
      const fore = arm.getObjectByName('kingFore');
      if (fore) fore.rotation.z = 0.9 + 0.4 * Math.sin(this.time * 2.9 + side);
    }
  }

  /** Lying about; floating up and flying to it; gone; raining back. */
  private drawLoose(k: Enemy, dt: number) {
    const v = BONE_KING.v;
    this.loose.visible = true;
    const growing = k.phase === 'blast' && k.shots === 0;
    const big = k.phase === 'blast' && k.shots !== 0;
    if (growing || big) this.gone = true;
    else if (this.gone) {
      this.gone = false;
      this.rain = 0;
    }
    if (this.rain < RAIN) this.rain += dt;
    const raining = this.rain < RAIN;
    if (!growing && !big && !raining && this.settled) return;
    const h = kingTall(k);
    const p = growing ? Math.min(1, k.t / v.colossusRise) : 0;
    for (let i = 0; i < LOOSE; i++) {
      const b = this.home[i];
      pos.set(b.x, 0.16, b.z);
      let spin = 0;
      let s = b.long;
      if (growing) {
        const delay = (i / LOOSE) * 0.35;
        const u = Math.max(0, Math.min(1, (p - delay) / (1 - delay)));
        if (u < 0.4) {
          pos.y = 0.16 + smooth(u / 0.4) * b.lift;
          spin = u * 3;
        } else {
          const t = smooth((u - 0.4) / 0.6);
          v1.set(k.pos.x, h * b.into, k.pos.z);
          pos.y = 0.16 + b.lift;
          pos.lerp(v1, t);
          spin = u * 9;
          if (u >= 1) s = 0;
        }
      } else if (big) s = 0;
      else if (raining) {
        const t = Math.min(1, this.rain / RAIN);
        v1.set(k.pos.x, h * b.into, k.pos.z);
        pos.lerpVectors(v1, pos, t);
        pos.y += Math.sin(t * Math.PI) * b.lift;
        spin = (1 - t) * 9;
      }
      eul.set(Math.PI / 2 - b.tip + spin * 2.1, b.yaw + spin, spin);
      m.compose(pos, q.setFromEuler(eul), scl.setScalar(s));
      this.loose.setMatrixAt(i, m);
    }
    this.loose.instanceMatrix.needsUpdate = true;
    this.settled = !growing && !big && !raining;
  }

  /** Along their spokes, the lines on the floor telling you where; its core left bare. */
  private drawShatter(k: Enemy) {
    const v = BONE_KING.v;
    const n = Math.min(MAX_SPOKES, Math.round(v.shatterBones));
    const telling = k.phase === 'windup' && k.move === SHATTER;
    const flown = k.phase === 'leap';
    const lines = this.lines.material as THREE.MeshBasicMaterial;
    if (!telling && !flown) {
      this.spokes.count = 0;
      this.lines.count = 0;
      this.core.visible = this.coreGlow.visible = false;
      return;
    }
    const b = k.king!;
    // (The spokes are drawn as the tell starts, so they're the ones it flies along.)
    if (telling) b.spoke = k.facing;
    this.lines.count = n;
    lines.opacity = telling ? 0.12 + 0.3 * Math.min(1, k.t / kingTell(SHATTER, k.stage)) : 0.1;
    for (let i = 0; i < n; i++) {
      const a = b.spoke + (i / n) * Math.PI * 2;
      const dx = -Math.sin(a);
      const dz = -Math.cos(a);
      pos.set(k.pos.x + (dx * v.shatterReach) / 2, 0.05, k.pos.z + (dz * v.shatterReach) / 2);
      m.compose(pos, q.setFromAxisAngle(Y, a), scl.set(0.9, 1, v.shatterReach));
      this.lines.setMatrixAt(i, m);
    }
    this.lines.instanceMatrix.needsUpdate = true;
    this.spokes.count = flown ? n : 0;
    this.core.visible = this.coreGlow.visible = flown;
    if (!flown) return;
    const r = shatterOut(k.t);
    for (let i = 0; i < n; i++) {
      const a = b.spoke + (i / n) * Math.PI * 2;
      pos.set(k.pos.x - Math.sin(a) * r, BONE_Y, k.pos.z - Math.cos(a) * r);
      eul.set(this.time * 11 + i, a, this.time * 7 + i * 2);
      m.compose(pos, q.setFromEuler(eul), scl.setScalar(2.2));
      this.spokes.setMatrixAt(i, m);
    }
    this.spokes.instanceMatrix.needsUpdate = true;
    const h = kingTall(k);
    const pulse = 1 + 0.12 * Math.sin(this.time * 9);
    this.core.position.set(k.pos.x, h * 0.42, k.pos.z);
    this.core.scale.setScalar(h * 0.08 * pulse);
    this.coreGlow.position.copy(this.core.position);
    this.coreGlow.scale.setScalar(h * 0.16 * pulse);
    (this.coreGlow.material as THREE.MeshBasicMaterial).opacity = 0.35;
  }

  /** Out of the floor round where they burst, and sinking back. */
  private drawHands(k: Enemy) {
    const b = k.king!;
    if (b.hands < 0) {
      this.hands.count = 0;
      return;
    }
    this.hands.count = HANDS;
    const up = smooth(b.hands / BURST) * (k.phase === 'grab' ? 1 : smooth((HANDS_UP - b.hands) / 0.3));
    for (let i = 0; i < HANDS; i++) {
      const a = (i / HANDS) * Math.PI * 2 + 0.4;
      pos.set(b.spotX + Math.cos(a) * HANDS_OUT, -2 + 2 * up, b.spotZ + Math.sin(a) * HANDS_OUT);
      // (Each facing in, closed round you.)
      eul.set(0.25 * up, -a + Math.PI / 2, 0, 'YXZ');
      m.compose(pos, q.setFromEuler(eul), scl.setScalar(1 + 0.08 * i));
      this.hands.setMatrixAt(i, m);
    }
    this.hands.instanceMatrix.needsUpdate = true;
  }

  /** Its ring of cracks; then its ribs. */
  private drawCage(k: Enemy) {
    const v = BONE_KING.v;
    const c = k.king!.cage;
    const crackMat = this.cracks.material as THREE.MeshBasicMaterial;
    const ringMat = this.ring.material as THREE.MeshBasicMaterial;
    const telling = k.phase === 'windup' && k.move === CAGE && c.on && !c.closed;
    this.ring.visible = telling;
    this.cracks.count = telling ? BARS : 0;
    if (telling) {
      const t = Math.min(1, k.t / kingTell(CAGE, k.stage));
      this.ring.position.set(c.x, 0.06, c.z);
      this.ring.scale.setScalar(v.cageRadius);
      ringMat.opacity = 0.35 + 0.6 * t;
      crackMat.opacity = 0.2 + 0.6 * t;
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2;
        const long = 0.5 + 0.9 * t;
        pos.set(c.x + Math.cos(a) * (v.cageRadius - long / 2), 0.05, c.z + Math.sin(a) * (v.cageRadius - long / 2));
        m.compose(pos, q.setFromAxisAngle(Y, -a + Math.PI / 2), scl.set(0.1, 1, long));
        this.cracks.setMatrixAt(i, m);
      }
      this.cracks.instanceMatrix.needsUpdate = true;
    }
    if (!c.on || !c.closed) {
      this.bars.count = 0;
      return;
    }
    this.bars.count = BARS;
    const up = smooth(c.t / ERUPT) * (c.trapped ? 1 : smooth((HANDS_UP - c.t) / 0.3));
    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * Math.PI * 2;
      pos.set(c.x + Math.cos(a) * v.cageRadius, 0, c.z + Math.sin(a) * v.cageRadius);
      m.compose(pos, q.setFromAxisAngle(Y, -a), scl.set(1, up, 1));
      this.bars.setMatrixAt(i, m);
    }
    this.bars.instanceMatrix.needsUpdate = true;
  }

  /** The strip of floor its arm's coming down on. */
  private drawStrip(k: Enemy) {
    const telling = k.phase === 'windup' && k.move === SLAM;
    this.strip.visible = telling;
    if (!telling) return;
    const h = kingTall(k);
    const t = Math.min(1, k.t / kingTell(SLAM, k.stage));
    shoulderAt(k, h, v1);
    handDownAt(k, h, v2);
    const long = Math.hypot(v1.x - v2.x, v1.z - v2.z);
    this.strip.position.set((v1.x + v2.x) / 2, 0.06, (v1.z + v2.z) / 2);
    this.strip.rotation.set(0, Math.atan2(v2.x - v1.x, v2.z - v1.z), 0);
    this.strip.scale.set(h * 0.3, 1, long);
    (this.strip.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.45 * t * t;
  }

  /** Its club in its other hand, the vertebra on its back. */
  private drawColossus(k: Enemy, root: THREE.Object3D | null, bones: KingBones | null) {
    const on = k.phase === 'blast' && k.move === COLOSSUS && k.shots !== 0;
    this.club.visible = on && !!root && !!bones;
    if (this.club.visible && root && bones) {
      const scale = kingTall(k) / KING_POSE.MODEL_TALL;
      handOfLimb(bones.armL, scale, pos);
      bones.armL.lower.getWorldQuaternion(q);
      // (Held out along its forearm, its thick end away from its elbow.)
      this.club.position.copy(pos);
      this.club.quaternion.copy(q);
      this.club.scale.setScalar(kingTall(k) * 0.5);
    }
    const open = k.ult.on;
    this.spine.visible = this.spineGlow.visible = open;
    if (!open) return;
    const r = spineRadius(k);
    const pulse = 1 + 0.15 * Math.sin(this.time * 10);
    spineAt(k, this.spine.position);
    this.spine.scale.setScalar(r);
    this.spineGlow.position.copy(this.spine.position);
    this.spineGlow.scale.setScalar(r * 1.9 * pulse);
    (this.spineGlow.material as THREE.MeshBasicMaterial).opacity = 0.45;
  }

  private hideMoves() {
    this.spokes.count = this.lines.count = this.hands.count = this.bars.count = this.cracks.count = 0;
    for (const o of [this.ring, this.strip, this.core, this.coreGlow, this.spine, this.spineGlow, this.club]) o.visible = false;
  }

  clear() {
    this.hideMoves();
    this.loose.visible = false;
    this.seeded = false;
    this.gone = false;
    this.rain = RAIN;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of [this.boneGeo, this.handGeo, this.barGeo, this.clubGeo, this.flat, this.ringGeo, this.ball]) g.dispose();
    for (const o of [this.lines, this.cracks, this.ring, this.strip, this.core, this.coreGlow, this.spine, this.spineGlow]) (o.material as THREE.Material).dispose();
    this.boneMat.dispose();
    this.eyeMat.dispose();
  }
}
