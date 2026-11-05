// Update 0.3.26 — what the Frost Roc shows besides its body. Update 0.3.56 — by the Boss Design Bible ("Ground or air?"), one plain
// language: what's on the floor you jump, what's up in the air you stay under. A pale sheet at head height: its clap, or its high
// swing. A warm one at the knee: its low swing. Its frost breath, a fan along the floor. Cracks running out from its feet, the slabs
// that erupt along them, standing a while. Its knees glowing, through Mountain Fall, and the cornice over the plateau. Made in code.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CombatState } from '../../sim/combat/state';
import { rocWindup } from '../../sim/enemies/frostRoc';
import { kneeAt, kneeRadius, kneesOpen, type RocBody } from '../../sim/enemies/rocBody';
import { BREATH, CLAP, CLAP_ARC, FAULT, HIGH_AT, LOW_AT, SWING, SWING_ARC } from '../../sim/enemies/rocMoves';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import { FROST_ROC } from '../../tuning/frostRoc';
import { poseRoc, rocBonesOf } from './rocPose';

/** Its breath's fan, either side of where it faces (rad). */
const BREATH_HALF = 0.28;
const SLABS = 16;
const CRACKS = 3;
/** A slab rises this fast, and sinks, over this long (s). */
const ERUPT = 0.15;
const SINK = 0.3;
/** The cornice: how far out along the way to its cliff it hangs (m), how high; half how wide, thick, deep. */
const CORNICE_OUT = 36;
const CORNICE_UP = 25;
const CORNICE_SIZE: readonly [number, number, number] = [16, 2.6, 7];
/** Its icicles, under it; how far a knee's glow reaches, shares of its reach. */
const ICICLES = 16;
const KNEE_GLOW = 0.55;
/** It lands on the Roc over this long (s). */
const CORNICE_FALL = 0.55;
/** Its clap's shock spreads for this long (s). */
const SHOCK = 0.3;

const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, toneMapped: false });

/** A jagged shelf of ice, icicles under it: seeded, so every run the same. */
function corniceGeometry(): THREE.BufferGeometry {
  let s = 5147;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const shelf = new THREE.IcosahedronGeometry(1, 2).toNonIndexed();
  const p = shelf.getAttribute('position');
  const seen = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.8 + rnd() * 0.45);
    const k = seen.get(key)!;
    p.setXYZ(i, p.getX(i) * CORNICE_SIZE[0] * k, p.getY(i) * CORNICE_SIZE[1] * k, p.getZ(i) * CORNICE_SIZE[2] * k);
  }
  const parts: THREE.BufferGeometry[] = [shelf];
  for (let i = 0; i < ICICLES; i++) {
    const long = 2 + rnd() * 3.5;
    const cone = new THREE.ConeGeometry(0.5 + rnd() * 0.7, long, 5).toNonIndexed().rotateX(Math.PI);
    cone.translate((rnd() * 2 - 1) * CORNICE_SIZE[0] * 0.8, -CORNICE_SIZE[1] * 0.6 - long / 2, -rnd() * CORNICE_SIZE[2] * 0.8);
    parts.push(cone);
  }
  const merged = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  merged.computeVertexNormals();
  return merged;
}

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

export class RocFx {
  readonly group = new THREE.Group();
  private readonly fanMat = glow(0xbfefff);
  private readonly fan = new THREE.Mesh(undefined, this.fanMat);
  private fanGeo: THREE.CircleGeometry | null = null;
  private fanHalf = 0;
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly shockMat = glow(0xf2fbff);
  private readonly shock = new THREE.Mesh(this.ringGeo, this.shockMat);
  private readonly flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly crackMat = glow(0xcff4ff);
  private readonly cracks = new THREE.InstancedMesh(this.flat, this.crackMat, CRACKS);
  private readonly slabGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly slabMat = new THREE.MeshStandardMaterial({ color: 0xbfd9e8, roughness: 0.35, flatShading: true });
  private readonly slabs = new THREE.InstancedMesh(this.slabGeo, this.slabMat, SLABS);
  private readonly ball = new THREE.IcosahedronGeometry(1, 2);
  private readonly kneeMat = new THREE.MeshBasicMaterial({ color: 0xbff4ff, toneMapped: false });
  private readonly knees = [new THREE.Mesh(this.ball, this.kneeMat), new THREE.Mesh(this.ball, this.kneeMat)];
  private readonly auraMat = glow(0x7fdcff);
  private readonly auras = [new THREE.Mesh(this.ball, this.auraMat), new THREE.Mesh(this.ball, this.auraMat)];
  private readonly corniceGeo = corniceGeometry();
  private readonly corniceMat = new THREE.MeshStandardMaterial({ color: 0xdcecf5, roughness: 0.5, flatShading: true });
  private readonly cornice = new THREE.Mesh(this.corniceGeo, this.corniceMat);
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.cracks.frustumCulled = this.slabs.frustumCulled = false;
    this.slabs.castShadow = this.slabs.receiveShadow = true;
    this.cracks.count = this.slabs.count = 0;
    this.cornice.castShadow = true;
    for (const o of [this.fan, this.shock, this.cornice, ...this.knees, ...this.auras]) o.visible = false;
    this.group.add(this.fan, this.shock, this.cracks, this.slabs, this.cornice, ...this.knees, ...this.auras);
  }

  /** `rootOf`: the body drawn for an enemy slot, its clip applied this frame. */
  update(state: CombatState, dt: number, rootOf: (i: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    const i = state.enemies.findIndex((e) => e.alive && e.kind === 'frostRoc' && e.phase !== 'dead');
    const d = i >= 0 ? state.enemies[i] : null;
    if (!d || !d.roc) {
      this.clear();
      return;
    }
    const root = rootOf(i);
    const bones = root && root.visible ? rocBonesOf(root) : null;
    if (root && bones) poseRoc(root, bones, d);
    const r = d.roc;
    this.drawFan(d);
    this.drawShock(d);
    this.drawCracks(d);
    this.drawSlabs(r);
    this.drawKnees(d);
    this.drawCornice(d);
  }

  /** The fan: its breath along the floor, its clap and its swings in the air. */
  private drawFan(d: CombatState['enemies'][number]) {
    const v = FROST_ROC.v;
    const r = d.roc!;
    const k = Math.min(1, d.t / Math.max(0.1, rocWindup(d.move, d.stage)));
    const breathing = d.phase === 'breath' && d.move === BREATH;
    const clapTell = d.phase === 'windup' && d.move === CLAP;
    const swinging = d.phase === 'dive' && d.move === SWING;
    this.fan.visible = breathing || clapTell || swinging;
    if (!this.fan.visible) return;
    this.shape(breathing ? BREATH_HALF : clapTell ? CLAP_ARC : SWING_ARC);
    const y = breathing ? 0.06 : clapTell ? HIGH_AT : r.swingLow ? LOW_AT : HIGH_AT;
    this.fan.position.set(d.pos.x, d.pos.y + y, d.pos.z);
    this.fan.rotation.set(0, d.facing, 0);
    this.fan.scale.setScalar(breathing ? v.breathReach : clapTell ? v.clapReach : v.swingReach + ENEMY_STATS.frostRoc().radius);
    this.fanMat.color.setHex(breathing ? 0x9fe4ff : swinging && r.swingLow ? 0xffa060 : 0xeaf8ff);
    this.fanMat.opacity = breathing ? 0.3 * (0.75 + 0.25 * Math.sin(this.time * 18)) : clapTell ? 0.05 + 0.2 * k : 0.14;
  }

  /** Its clap's shock, in the air in front of it. */
  private drawShock(d: CombatState['enemies'][number]) {
    const on = d.phase === 'recover' && d.move === CLAP && d.t < SHOCK;
    this.shock.visible = on;
    if (!on) return;
    const k = d.t / SHOCK;
    this.shock.position.set(d.pos.x, d.pos.y + HIGH_AT, d.pos.z);
    this.shock.scale.setScalar(FROST_ROC.v.clapReach * k);
    this.shockMat.opacity = 0.5 * (1 - k);
  }

  /** Cracks running out from its feet, its Fault Line told. */
  private drawCracks(d: CombatState['enemies'][number]) {
    const r = d.roc!;
    const on = d.phase === 'windup' && d.move === FAULT && r.cracks.length > 0;
    this.cracks.count = on ? r.cracks.length : 0;
    if (!on) return;
    const k = Math.min(1, d.t / Math.max(0.1, rocWindup(FAULT, d.stage)));
    this.crackMat.opacity = 0.25 + 0.55 * k;
    r.cracks.forEach((c, i) => {
      const long = c.long * k;
      pos.set(c.x - (Math.sin(c.yaw) * long) / 2, 0.05, c.z - (Math.cos(c.yaw) * long) / 2);
      m.compose(pos, q.setFromAxisAngle(Y, c.yaw), scl.set(0.8, 1, Math.max(0.01, long)));
      this.cracks.setMatrixAt(i, m);
    });
    this.cracks.instanceMatrix.needsUpdate = true;
  }

  /** Its slabs, rising and sinking. */
  private drawSlabs(r: RocBody) {
    let n = 0;
    for (const s of r.slabs) {
      if (!s.up || n >= SLABS) continue;
      const rise = Math.min(1, Math.min((r.time - s.at) / ERUPT, (s.until - r.time) / SINK));
      const top = s.h * Math.max(0, rise);
      pos.set(s.x, top - s.h / 2, s.z);
      m.compose(pos, q.setFromAxisAngle(Y, s.yaw), scl.set(s.side, s.h, s.side));
      this.slabs.setMatrixAt(n++, m);
    }
    this.slabs.count = n;
    if (n > 0) this.slabs.instanceMatrix.needsUpdate = true;
  }

  /** Its knees through its window: each glowing till it's broken, smaller with each blow. */
  private drawKnees(d: CombatState['enemies'][number]) {
    const open = kneesOpen(d);
    const r = d.roc!;
    const full = Math.max(1, Math.round(FROST_ROC.v.kneeHits));
    for (let k = 0; k < 2; k++) {
      const on = open && r.knees[k] > 0;
      this.knees[k].visible = this.auras[k].visible = on;
      if (!on) continue;
      kneeAt(d, k, pos);
      const size = kneeRadius() * KNEE_GLOW * (0.5 + 0.5 * (r.knees[k] / full));
      this.knees[k].position.copy(pos);
      this.knees[k].scale.setScalar(size * 0.6);
      this.auras[k].position.copy(pos);
      this.auras[k].scale.setScalar(size * (1.4 + 0.2 * Math.sin(this.time * 12)));
    }
    this.auraMat.opacity = 0.4;
  }

  /** The cornice over the plateau: hung, cracking (shaking), landing on it, or smashed (it's the boulders now). */
  private drawCornice(d: CombatState['enemies'][number]) {
    const r = d.roc!;
    const x = r.midX + r.cliffX * CORNICE_OUT;
    const z = r.midZ + r.cliffZ * CORNICE_OUT;
    this.cornice.visible = r.midSet && r.cornice !== 'smashed';
    if (!this.cornice.visible) return;
    this.cornice.rotation.set(0, Math.atan2(r.cliffX, r.cliffZ), 0);
    this.cornice.position.set(x, CORNICE_UP, z);
    if (r.cornice === 'cracking') {
      const shake = 0.1 + 0.25 * Math.min(1, r.corniceT / 3);
      this.cornice.position.x += Math.sin(this.time * 47) * shake;
      this.cornice.position.y += Math.sin(this.time * 61) * shake;
    } else if (r.cornice === 'onIt') {
      const k = Math.min(1, r.corniceT / CORNICE_FALL);
      this.cornice.position.lerp(pos.set(d.pos.x, FROST_ROC.v.rocHeight * 0.8, d.pos.z), k * k);
      if (k >= 1) this.cornice.visible = false;
    }
  }

  /** The fan's shape: a flat sector `half` either side of −z, 1 across (made again only when it changes). */
  private shape(half: number) {
    if (this.fanGeo && this.fanHalf === half) return;
    this.fanGeo?.dispose();
    // (A circle's sector from +x anticlockwise, laid flat: centred on −z.)
    this.fanGeo = new THREE.CircleGeometry(1, 32, Math.PI / 2 - half, 2 * half).rotateX(-Math.PI / 2);
    this.fanHalf = half;
    this.fan.geometry = this.fanGeo;
  }

  clear() {
    for (const o of [this.fan, this.shock, this.cornice, ...this.knees, ...this.auras]) o.visible = false;
    this.cracks.count = this.slabs.count = 0;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of [this.ringGeo, this.flat, this.slabGeo, this.ball, this.corniceGeo]) g.dispose();
    this.fanGeo?.dispose();
    for (const mat of [this.fanMat, this.shockMat, this.crackMat, this.slabMat, this.kneeMat, this.auraMat, this.corniceMat]) mat.dispose();
  }
}
