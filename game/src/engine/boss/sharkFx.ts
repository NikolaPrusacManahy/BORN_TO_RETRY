// Update 0.3.62 — what the Big Shark's arena shows besides its body (sim/enemies/sharkArena.ts, sharkAbyss.ts): anchors hanging on their
// chains, swaying, its chain glowing as its Abyss Jaws waits under it; a column of bubbles where it'll breach, and the ring on the seabed;
// the white churn and the funnel of its whirlpool; your blood in the water behind you; its planks' cracks and its holes. Made in code.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CombatState } from '../../sim/combat/state';
import { BREACH, BREAKER, hiddenShark } from '../../sim/enemies/sharkArena';
import { anchorY, ABYSS_WAIT } from '../../sim/enemies/sharkAbyss';
import { isLive } from '../../sim/enemies/enemy';
import { BIG_SHARK } from '../../tuning/bigShark';
import { HALOS } from '../halos';

const ANCHORS = 4;
/** Each anchor's chain links; a link's size (m). */
const LINKS = 3;
/** How much they sway, the water still (rad); how far an anchor drops (m). */
const SWAY = 0.04;
const STILL = 0.12;
/** Bubbles in a column; how wide (m), how fast they rise (m/s). */
const BUBBLES = 40;
const BUBBLE_WIDE = 1.6;
const BUBBLE_UP = 6;
/** Blood: how many puffs, how long each lasts (s). */
const PUFFS = 28;
const PUFF_LIFE = 1.6;
const HOLES = 8;

/** An anchor: its shaft, its crown, its two flukes, its ring: its top at the origin, down −y, about 3 m. */
function anchorGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shaft = new THREE.CylinderGeometry(0.17, 0.2, 3, 8).toNonIndexed();
  shaft.translate(0, -1.5, 0);
  parts.push(shaft);
  const stock = new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6).toNonIndexed();
  stock.rotateZ(Math.PI / 2);
  stock.translate(0, -0.35, 0);
  parts.push(stock);
  const ring = new THREE.TorusGeometry(0.26, 0.07, 6, 12).toNonIndexed();
  ring.translate(0, 0.1, 0);
  parts.push(ring);
  for (const s of [-1, 1]) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -3, 0), new THREE.Vector3(s * 0.85, -3.1, 0), new THREE.Vector3(s * 1.05, -2.05, 0));
    const arm = new THREE.TubeGeometry(curve, 8, 0.11, 6).toNonIndexed();
    parts.push(arm);
    const fluke = new THREE.ConeGeometry(0.28, 0.65, 4).toNonIndexed();
    fluke.translate(s * 1.05, -1.8, 0);
    parts.push(fluke);
  }
  for (const g of parts) g.deleteAttribute('uv');
  const merged = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  merged.computeVertexNormals();
  return merged;
}

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const eul = new THREE.Euler();

export class SharkFx {
  readonly group = new THREE.Group();
  private readonly anchorGeo = anchorGeometry();
  private readonly ironMat = new THREE.MeshStandardMaterial({ color: 0x4a4f54, roughness: 0.75, metalness: 0.6, flatShading: true });
  private readonly anchors = new THREE.InstancedMesh(this.anchorGeo, this.ironMat, ANCHORS);
  private readonly chainGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 6);
  private readonly chains = new THREE.InstancedMesh(this.chainGeo, this.ironMat, ANCHORS * LINKS);
  private readonly glowMat = new THREE.MeshBasicMaterial({ color: 0xffd86a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly glow = new THREE.Mesh(this.chainGeo, this.glowMat);
  private readonly ballGeo = new THREE.IcosahedronGeometry(1, 1);
  private readonly bubbleMat = new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.55, depthWrite: false });
  private readonly bubbles = new THREE.InstancedMesh(this.ballGeo, this.bubbleMat, BUBBLES);
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  private readonly ring = new THREE.Mesh(this.ringGeo, this.ringMat);
  private readonly funnelGeo = new THREE.ConeGeometry(1, 1, 18, 1, true).rotateX(Math.PI).translate(0, 0.5, 0);
  private readonly funnelMat = new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  private readonly funnel = new THREE.Mesh(this.funnelGeo, this.funnelMat);
  private readonly bloodMat = new THREE.MeshBasicMaterial({ color: 0xa81a22, transparent: true, opacity: 0.35, depthWrite: false });
  private readonly blood = new THREE.InstancedMesh(this.ballGeo, this.bloodMat, PUFFS);
  private readonly puffs: { x: number; y: number; z: number; t: number }[] = Array.from({ length: PUFFS }, () => ({ x: 0, y: 0, z: 0, t: PUFF_LIFE }));
  private nextPuff = 0;
  private puffIn = 0;
  private readonly crackMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly crack = new THREE.Mesh(this.ballGeo, this.crackMat);
  private readonly holeMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1, flatShading: true });
  private readonly holes = new THREE.InstancedMesh(this.ballGeo, this.holeMat, HOLES);
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (const o of [this.anchors, this.chains, this.bubbles, this.blood, this.holes]) {
      o.frustumCulled = false;
      o.count = 0;
    }
    this.anchors.castShadow = true;
    for (const o of [this.glow, this.ring, this.funnel, this.crack]) o.visible = false;
    this.group.add(this.anchors, this.chains, this.glow, this.bubbles, this.ring, this.funnel, this.blood, this.crack, this.holes);
  }

  /** `player`: where you are (your blood's left there). */
  update(state: CombatState, dt: number, player: { x: number; y: number; z: number }) {
    this.time += dt;
    const e = state.enemies.find((x) => x.kind === 'bigShark' && isLive(x));
    if (!e || !e.shark) {
      this.clear();
      return;
    }
    const b = e.shark;
    const v = BIG_SHARK.v;
    // (The water still in its ultimate; rocked as it leaps in its show.)
    const still = e.phase === 'blast' || e.phase === 'intro';
    this.drawAnchors(e, still);
    // The bubbles rising where it'll breach.
    const breaching = e.phase === 'windup' && e.move === BREACH;
    this.bubbles.count = breaching ? BUBBLES : 0;
    this.ring.visible = breaching;
    if (breaching) {
      const k = Math.min(1, e.t / Math.max(0.1, v.breachTell));
      for (let i = 0; i < BUBBLES; i++) {
        const c = (this.time * (BUBBLE_UP / Math.max(1, v.floodTop)) + i / BUBBLES) % 1;
        const a = i * 2.4;
        const r = BUBBLE_WIDE * (0.2 + 0.8 * ((i * 0.37) % 1));
        pos.set(e.aim.x + Math.cos(a) * r, c * v.floodTop, e.aim.z + Math.sin(a) * r);
        this.bubbles.setMatrixAt(i, m.compose(pos, q.identity(), scl.setScalar(0.1 + 0.12 * ((i * 0.61) % 1))));
      }
      this.bubbles.instanceMatrix.needsUpdate = true;
      this.ring.position.set(e.aim.x, 0.06, e.aim.z);
      this.ring.scale.setScalar(v.breachReach * (0.4 + 0.6 * k));
      this.ringMat.opacity = 0.3 + 0.6 * k;
    }
    // Its whirlpool: white churn, then its funnel.
    const whirl = b.whirlFor > 0;
    this.funnel.visible = whirl;
    if (whirl) {
      const up = b.whirlTell > 0 ? 0.25 : 1;
      this.funnel.position.set(b.whirlX, 0, b.whirlZ);
      this.funnel.rotation.y = this.time * 6;
      this.funnel.scale.set(v.whirlEye * 2 * up, v.floodTop, v.whirlEye * 2 * up);
      this.funnelMat.opacity = 0.14 + 0.2 * up;
    }
    this.drawBlood(b.bleed > 0, player, dt);
    // Its planks bulging and cracking.
    const bulging = e.phase === 'windup' && e.move === BREAKER;
    this.crack.visible = bulging;
    if (bulging) {
      const k = Math.min(1, e.t / Math.max(0.1, v.breakTell));
      this.crack.position.set(e.aim.x + Math.sin(this.time * 40) * 0.05, e.aim.y, e.aim.z);
      this.crack.scale.setScalar(0.5 + 1.8 * k);
      this.crackMat.opacity = 0.25 + 0.7 * k;
    }
    this.holes.count = Math.min(HOLES, b.holes.length);
    b.holes.slice(-HOLES).forEach((h, i) => {
      pos.set(h.x, h.y, h.z);
      this.holes.setMatrixAt(i, m.compose(pos, q.identity(), scl.set(1.5, 1.1, 1.5)));
    });
    if (this.holes.count > 0) this.holes.instanceMatrix.needsUpdate = true;
    void hiddenShark;
  }

  private drawAnchors(e: CombatState['enemies'][number], still: boolean) {
    const b = e.shark!;
    const v = BIG_SHARK.v;
    const y0 = anchorY();
    let na = 0;
    let nc = 0;
    this.glow.visible = false;
    b.anchors.forEach((a, i) => {
      if (a.gone && a.falling < 0) return;
      if (a.gone) return;
      const sway = (still ? STILL : SWAY) * Math.sin(this.time * (still ? 2.4 : 0.9) + i * 1.7);
      const drop = a.falling >= 0 ? (a.falling / 0.35) ** 2 * (y0 - 0.5) : 0;
      eul.set(0, i * 1.3, sway);
      q.setFromEuler(eul);
      pos.set(a.x + Math.sin(sway) * 1.2, y0 - drop, a.z);
      if (na < ANCHORS) this.anchors.setMatrixAt(na++, m.compose(pos, q, scl.setScalar(1)));
      // Its chain, up to the water's top, while it holds.
      if (a.falling >= 0) return;
      const long = (v.floodTop + 0.6 - y0) / LINKS;
      for (let k = 0; k < LINKS && nc < ANCHORS * LINKS; k++) {
        pos.set(a.x, y0 + long * (k + 0.5), a.z);
        this.chains.setMatrixAt(nc++, m.compose(pos, q.identity(), scl.set(1, long, 1)));
      }
      // Glowing, as its Abyss Jaws waits under it.
      if (i === b.marked && e.phase === 'blast' && e.shots === ABYSS_WAIT) {
        this.glow.visible = true;
        const flare = b.chainOpen ? 1 : 0.45;
        this.glow.position.set(a.x, y0 + (v.floodTop + 0.6 - y0) / 2, a.z);
        this.glow.scale.set(2.6 * flare, v.floodTop + 0.6 - y0, 2.6 * flare);
        this.glowMat.opacity = 0.45 + 0.45 * flare * (0.8 + 0.2 * Math.sin(this.time * 14));
        HALOS.add(a.x, y0, a.z, 4 * flare, 0xffd86a, 0.7 * flare);
      }
    });
    this.anchors.count = na;
    this.chains.count = nc;
    this.anchors.instanceMatrix.needsUpdate = true;
    this.chains.instanceMatrix.needsUpdate = true;
  }

  private drawBlood(on: boolean, player: { x: number; y: number; z: number }, dt: number) {
    this.puffIn -= dt;
    if (on && this.puffIn <= 0) {
      this.puffIn = 0.12;
      const p = this.puffs[this.nextPuff];
      this.nextPuff = (this.nextPuff + 1) % PUFFS;
      p.x = player.x;
      p.y = player.y + 0.6;
      p.z = player.z;
      p.t = 0;
    }
    let n = 0;
    for (const p of this.puffs) {
      if (p.t >= PUFF_LIFE) continue;
      p.t += dt;
      const k = p.t / PUFF_LIFE;
      pos.set(p.x, p.y + k * 0.5, p.z);
      this.blood.setMatrixAt(n++, m.compose(pos, q.identity(), scl.setScalar(0.35 + 0.8 * k)));
    }
    this.blood.count = n;
    if (n > 0) this.blood.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.anchors.count = this.chains.count = this.bubbles.count = this.blood.count = this.holes.count = 0;
    this.glow.visible = this.ring.visible = this.funnel.visible = this.crack.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    for (const o of [this.anchors, this.chains, this.bubbles, this.blood, this.holes]) o.dispose();
    for (const g of [this.anchorGeo, this.chainGeo, this.ballGeo, this.ringGeo, this.funnelGeo]) g.dispose();
    for (const x of [this.ironMat, this.glowMat, this.bubbleMat, this.ringMat, this.funnelMat, this.bloodMat, this.crackMat, this.holeMat]) x.dispose();
  }
}
