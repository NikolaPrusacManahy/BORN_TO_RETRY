// Update 0.3.81 — gravity on Gravity Sean's arms (the designer: "gravity effects on his arms for mode 1 and different unstable gravity for mode 2"; his bible: "in
// Unstable mode the arms shake and gravity energy crackles around them"). In the arms' own scene, made in code.
// Normal mode: calm. Pebbles held in slow, steady orbits round each forearm, and a cool ring turning round the wrist and another up the arm.
// Unstable mode: the same pull gone wrong. The pebbles lurch and race, their orbits breaking and reforming; the rings snap to new tilts many times a second, hot; arcs
// crackle over the arm; and the arms shake. All of it wilder the fuller the Instability meter, and whiter.
import * as THREE from 'three';
import { SEAN } from '../../tuning/sean';
import type { ArmPose, ArmsRig } from './armsRig';
import type { Side } from './guard';

const SIDES: readonly Side[] = ['L', 'R'];
/** On each arm. */
const PEBBLES = 9;
const RINGS = 2;
const BOLTS = 7;
const JOINTS = 5;
/** Round the forearm (m): how far out they orbit, at the wrist and up the arm; rings' sizes. */
const ORBIT = 0.09;
const ORBIT_UP = 0.115;
const RING_SIZES = [0.066, 0.092];
/** Where along the forearm, from the wrist (a share of it). */
const RING_ALONG = [-0.08, 0.5];
const COOL = new THREE.Color(0x7f73ff);
const HOT = new THREE.Color(0xff2fd0);
const WHITE = new THREE.Color(0xfff2ff);
/** Times a second an arc's redrawn, and the rings snap. */
const CRACKLE = 26;

const wrist = new THREE.Vector3();
const elbow = new THREE.Vector3();
const axis = new THREE.Vector3();
const u = new THREE.Vector3();
const w = new THREE.Vector3();
const at = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const seg = new THREE.Vector3();
const toEye = new THREE.Vector3();
const across = new THREE.Vector3();
const mat = new THREE.Matrix4();
const q = new THREE.Quaternion();
const scl = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const mix = new THREE.Color();

/** A wandering number in −1 … 1: not random, so it has no frame-to-frame jumps but what's asked for. */
const wander = (t: number, seed: number) => Math.sin(t * 1.9 + seed * 7.3) * 0.6 + Math.sin(t * 4.3 + seed * 2.1) * 0.4;

/** 0: not him; 1: normal mode; 2: Unstable. */
export type GravityMode = 0 | 1 | 2;

export class GravityArms {
  private readonly stoneGeo = new THREE.IcosahedronGeometry(1, 0);
  private readonly stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4658, roughness: 0.85, metalness: 0.1, flatShading: true, emissive: 0x7f73ff, emissiveIntensity: 0.25 });
  readonly stones = new THREE.InstancedMesh(this.stoneGeo, this.stoneMat, PEBBLES * 2);
  private readonly ringGeo = new THREE.TorusGeometry(1, 0.022, 5, 44);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: COOL, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  readonly rings: THREE.Mesh[] = [];
  private readonly arcPos = new Float32Array(BOLTS * 2 * JOINTS * 4 * 3);
  private readonly arcGeo = new THREE.BufferGeometry();
  private readonly arcMat = new THREE.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  readonly arcs = new THREE.Mesh(this.arcGeo, this.arcMat);
  /** Update 0.3.83 — Black Hole gathering, between his palms. */
  private readonly orbGeo = new THREE.SphereGeometry(1, 20, 14);
  private readonly orbMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  private readonly orbRimMat = new THREE.MeshBasicMaterial({ color: COOL, transparent: true, opacity: 0.7, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  readonly orb = new THREE.Mesh(this.orbGeo, this.orbMat);
  private readonly orbRim = new THREE.Mesh(this.orbGeo, this.orbRimMat);
  private time = 0;
  private crackle = 0;
  private mode: GravityMode = 0;
  private instab = 0;
  /** How far between the modes it looks (0: calm, 1: unstable), so a switch isn't a cut. */
  private wild = 0;

  constructor(scene: THREE.Scene) {
    this.stones.frustumCulled = this.arcs.frustumCulled = false;
    this.stones.count = 0;
    for (let i = 0; i < RINGS * 2; i++) {
      const r = new THREE.Mesh(this.ringGeo, this.ringMat);
      r.frustumCulled = false;
      r.visible = false;
      this.rings.push(r);
    }
    this.arcGeo.setAttribute('position', new THREE.BufferAttribute(this.arcPos, 3).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let i = 0; i < BOLTS * 2 * JOINTS; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3);
    this.arcGeo.setIndex(idx);
    this.arcGeo.setDrawRange(0, 0);
    this.arcs.visible = false;
    this.orb.visible = this.orbRim.visible = false;
    this.orb.frustumCulled = this.orbRim.frustumCulled = false;
    scene.add(this.stones, this.arcs, this.orb, this.orbRim, ...this.rings);
  }

  /** The stance, and the meter. */
  set(mode: GravityMode, instab: number) {
    this.mode = mode;
    this.instab = instab;
  }

  /** Unstable: this arm shakes, harder the fuller the meter. */
  shake(side: Side, out: ArmPose) {
    if (this.mode !== 2) return;
    const v = SEAN.v;
    const d = (v.shakeLow + (v.shakeFull - v.shakeLow) * this.instab) * this.wild;
    const s = side === 'L' ? 3.1 : 9.7;
    const t = this.time * 38;
    out.fist.x += d * Math.sin(t * 1.3 + s);
    out.fist.y += d * Math.sin(t * 1.7 + s * 2);
    out.fist.z += d * Math.sin(t * 0.9 + s * 3);
  }

  /** How many arcs are drawn (for the tests). */
  get crackling() {
    return this.arcGeo.drawRange.count;
  }

  /** Each frame, the arms posed; `eye`: the arms camera; `gather`: how far both palms have come in, gathering (0 … 1). */
  update(dt: number, rig: ArmsRig, eye: THREE.Vector3, gather = 0) {
    this.time += dt;
    this.gather(rig, gather);
    const on = this.mode > 0;
    this.wild += ((this.mode === 2 ? 1 : 0) - this.wild) * (1 - Math.exp(-14 * dt));
    if (this.mode === 2 && this.wild > 0.995) this.wild = 1;
    this.stones.visible = on;
    for (const r of this.rings) r.visible = on;
    this.arcs.visible = on && this.mode === 2;
    if (this.mode !== 2) this.arcGeo.setDrawRange(0, 0);
    if (!on) return;
    const hot = this.wild * (0.55 + 0.45 * this.instab);
    mix.copy(COOL).lerp(HOT, hot).lerp(WHITE, this.wild * this.instab * this.instab * 0.75);
    this.ringMat.color.copy(mix);
    this.ringMat.opacity = 0.55 + this.wild * (0.35 * Math.sin(this.time * 61) * Math.sin(this.time * 23));
    this.stoneMat.emissive.copy(mix);
    this.stoneMat.emissiveIntensity = 0.25 + 0.9 * this.wild * (0.4 + 0.6 * this.instab);
    this.crackle += dt * CRACKLE;
    const snap = this.crackle >= 1;
    if (snap) this.crackle %= 1;
    let n = 0;
    SIDES.forEach((side, k) => {
      rig.arms[side].fore.bone.getWorldPosition(elbow);
      rig.arms[side].hand.bone.getWorldPosition(wrist);
      axis.subVectors(elbow, wrist);
      const long = axis.length() || 1;
      axis.multiplyScalar(1 / long);
      u.set(0.3, 1, 0.2).cross(axis).normalize();
      w.crossVectors(axis, u);
      this.place(k, long, snap);
      n = this.pebbles(n, k, long);
    });
    this.stones.count = n;
    this.stones.instanceMatrix.needsUpdate = true;
    if (this.mode === 2 && snap) this.bolts(rig, eye);
  }

  /** The orb between his palms. */
  private gather(rig: ArmsRig, k: number) {
    const on = this.mode > 0 && k > 0.2;
    this.orb.visible = this.orbRim.visible = on;
    if (!on) return;
    rig.knuckle('L', a);
    rig.knuckle('R', b);
    at.addVectors(a, b).multiplyScalar(0.5);
    const s = 0.04 * k * (1 + 0.08 * Math.sin(this.time * 31));
    this.orb.position.copy(at);
    this.orbRim.position.copy(at);
    this.orb.scale.setScalar(s);
    this.orbRim.scale.setScalar(s * 1.3);
  }

  /** This arm's rings: `axis`, `u`, `w` are its forearm's. */
  private place(k: number, long: number, snap: boolean) {
    for (let i = 0; i < RINGS; i++) {
      const r = this.rings[k * RINGS + i];
      const calm = this.wild < 0.5;
      at.copy(wrist).addScaledVector(axis, RING_ALONG[i] * long);
      r.position.copy(at);
      const size = RING_SIZES[i] * (calm ? 1 : 0.85 + 0.5 * Math.random() * (snap ? 1 : 0.2));
      r.scale.setScalar(size);
      if (calm || snap) {
        // Calm, square to the arm and turning; wild, any tilt, a new one at each snap.
        a.copy(axis);
        if (calm) a.addScaledVector(u, 0.22 * Math.sin(this.time * 0.9 + i + k)).addScaledVector(w, 0.22 * Math.cos(this.time * 0.7 + i * 2 + k));
        else a.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(1.1).add(axis);
        r.quaternion.setFromUnitVectors(Z, a.normalize());
      }
    }
  }

  /** This arm's pebbles. */
  private pebbles(n: number, k: number, long: number): number {
    const wild = this.wild;
    const fierce = wild * (0.5 + 0.5 * this.instab);
    for (let i = 0; i < PEBBLES; i++) {
      const seed = i + k * 10;
      const along = -0.05 + (i / (PEBBLES - 1)) * 0.75;
      const speed = (i % 2 === 0 ? 1 : -1) * (0.9 + 0.25 * (i % 3));
      const angle = this.time * speed * (1 + fierce * 7) + seed * 2.4;
      const out = (ORBIT + (ORBIT_UP - ORBIT) * Math.max(0, along)) * (1 + fierce * 0.75 * wander(this.time * 6, seed));
      const drift = fierce * 0.12 * wander(this.time * 9, seed + 5);
      at.copy(wrist)
        .addScaledVector(axis, (along + drift) * long)
        .addScaledVector(u, Math.cos(angle) * out)
        .addScaledVector(w, Math.sin(angle) * out);
      const size = (0.0065 + 0.0035 * (i % 3)) * (1 + 0.5 * fierce);
      q.setFromAxisAngle(axis, this.time * 1.3 + seed);
      this.stones.setMatrixAt(n++, mat.compose(at, q, scl.setScalar(size)));
    }
    return n;
  }

  /** The arcs, drawn anew: from somewhere on an arm to somewhere near it, in jagged ribbons facing you. */
  private bolts(rig: ArmsRig, eye: THREE.Vector3) {
    const count = Math.round(2 + (BOLTS - 2) * this.instab);
    let v = 0;
    let quads = 0;
    for (const side of SIDES) {
      rig.arms[side].fore.bone.getWorldPosition(elbow);
      rig.arms[side].hand.bone.getWorldPosition(wrist);
      for (let i = 0; i < count; i++) {
        a.copy(wrist).lerp(elbow, Math.random() * 0.8);
        a.x += (Math.random() - 0.5) * 0.08;
        a.y += (Math.random() - 0.5) * 0.08;
        a.z += (Math.random() - 0.5) * 0.08;
        const reach = 0.04 + 0.07 * this.instab * Math.random() + 0.03 * Math.random();
        seg.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(reach / JOINTS);
        for (let j = 0; j < JOINTS; j++) {
          b.copy(a).add(seg);
          b.x += (Math.random() - 0.5) * 0.018;
          b.y += (Math.random() - 0.5) * 0.018;
          b.z += (Math.random() - 0.5) * 0.018;
          toEye.subVectors(eye, a);
          across.subVectors(b, a).cross(toEye).normalize().multiplyScalar(0.0022 * (1 - (0.7 * j) / JOINTS));
          for (const [o, sign] of [
            [a, 1],
            [a, -1],
            [b, 1],
            [b, -1],
          ] as const) {
            this.arcPos[v++] = o.x + across.x * sign;
            this.arcPos[v++] = o.y + across.y * sign;
            this.arcPos[v++] = o.z + across.z * sign;
          }
          quads++;
          a.copy(b);
        }
      }
    }
    this.arcGeo.attributes.position.needsUpdate = true;
    this.arcGeo.setDrawRange(0, quads * 6);
  }

  dispose() {
    this.stones.removeFromParent();
    this.arcs.removeFromParent();
    this.orb.removeFromParent();
    this.orbRim.removeFromParent();
    this.orbGeo.dispose();
    this.orbMat.dispose();
    this.orbRimMat.dispose();
    for (const r of this.rings) r.removeFromParent();
    this.stones.dispose();
    this.stoneGeo.dispose();
    this.stoneMat.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.arcGeo.dispose();
    this.arcMat.dispose();
  }
}
