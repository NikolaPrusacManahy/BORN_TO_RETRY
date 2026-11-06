// Update 0.3.63 — what Hellwarden shows besides its body (sim/enemies/wardenMoves.ts, wardenVerdict.ts): its blade flaring white, burning in
// phase 2, a second in its left hand; its walls of fire; its Brand's lines glowing and its pillars bursting; the floor cracked through
// once its throne room breaks; its great sword over it through Last Verdict, the flash, the cleave. Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { isLive } from '../../sim/enemies/enemy';
import { RADIUS } from '../../sim/enemies/kinds';
import { ARC, brandSpot, hiddenWarden, VERDICT } from '../../sim/enemies/wardenMoves';
import { wardenWindup } from '../../sim/enemies/hellwarden';
import { VERDICT_CHARGE } from '../../sim/enemies/wardenVerdict';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { HALOS } from '../halos';

const FLAMES = 420;
const SPOKES = 16;
const CRACKS = 10;
/** A fire wall's flames this far apart (m), this high. A pillar's height. */
const WALL_GAP = 1;
const WALL_HIGH = 2.2;
const PILLAR_HIGH = 7;
/** A blade's flames; how long a blade is (m at its 6 m). */
const ON_BLADE = 9;
const BLADE = 4;
/** Its great sword: this many times a blade; how far over it. */
const GREAT = 3.2;
const OVER_IT = 1.2;
/** Its cleave's sheet lasts this long (s). */
const CLEAVE_FOR = 0.35;

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);
const a = new THREE.Vector3();
const tip = new THREE.Vector3();
const spot = { x: 0, z: 0 };

/** A greatsword, along +y from its grip, its cross-guard at the bottom. */
function bladeGeometry(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(0.24, 1, 0.06, 1, 4, 1).toNonIndexed();
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.5;
    // Narrowing to its point.
    const w = y > 0.86 ? 1 - (y - 0.86) / 0.14 : 1;
    p.setXYZ(i, p.getX(i) * w, y, p.getZ(i));
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

export class WardenFx {
  readonly group = new THREE.Group();
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
  private readonly flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames = new THREE.InstancedMesh(this.coneGeo, this.flameMat, FLAMES);
  private readonly flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
  private readonly lineMat = new THREE.MeshBasicMaterial({ color: 0xff5a18, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly lines = new THREE.InstancedMesh(this.flatGeo, this.lineMat, SPOKES);
  private readonly crackMat = new THREE.MeshBasicMaterial({ color: 0xff4a10, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly cracks = new THREE.InstancedMesh(this.flatGeo, this.crackMat, CRACKS);
  private readonly bladeGeo = bladeGeometry();
  private readonly steel = new THREE.MeshStandardMaterial({ color: 0x4d4a4a, roughness: 0.35, metalness: 0.8, emissive: 0xff4a10, emissiveIntensity: 0.6, flatShading: true });
  private readonly second = new THREE.Mesh(this.bladeGeo, this.steel);
  private readonly greatMat = new THREE.MeshBasicMaterial({ color: 0xffe8c8, toneMapped: false });
  private readonly great = new THREE.Mesh(this.bladeGeo, this.greatMat);
  private readonly sheetGeo = new THREE.PlaneGeometry(1, 1);
  private readonly sheetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly sheet = new THREE.Mesh(this.sheetGeo, this.sheetMat);
  private tipLocal: THREE.Vector3 | null = null;
  private cracksAt: { x: number; z: number; yaw: number; long: number }[] = [];
  private cracksFor = '';
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.flames.frustumCulled = this.lines.frustumCulled = this.cracks.frustumCulled = false;
    this.flames.count = this.lines.count = this.cracks.count = 0;
    this.second.castShadow = this.great.castShadow = true;
    this.second.visible = this.great.visible = this.sheet.visible = false;
    this.group.add(this.flames, this.lines, this.cracks, this.second, this.great, this.sheet);
  }

  /** `rootOf`: the body drawn for an enemy slot, its clip applied this frame. */
  update(state: CombatState, dt: number, rootOf: (i: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    const i = state.enemies.findIndex((e) => e.kind === 'hellwarden' && isLive(e));
    const e = i >= 0 ? state.enemies[i] : null;
    if (!e || !e.warden) {
      this.clear();
      return;
    }
    const root = rootOf(i);
    const b = e.warden;
    const v = HELLWARDEN.v;
    let n = 0;
    // Its walls of fire.
    for (const f of b.walls) {
      const long = Math.hypot(f.bx - f.ax, f.bz - f.az);
      const count = Math.floor(long / WALL_GAP);
      const fade = Math.min(1, f.left / 0.5);
      for (let k = 0; k <= count && n < FLAMES; k++) {
        const u = k / Math.max(1, count);
        pos.set(f.ax + (f.bx - f.ax) * u, 0, f.az + (f.bz - f.az) * u);
        const h = WALL_HIGH * fade * (0.8 + 0.25 * Math.sin(this.time * 11 + k * 1.7));
        this.flames.setMatrixAt(n++, mat.compose(pos, q.setFromAxisAngle(Y, k), scl.set(0.75, h, 0.75)));
      }
    }
    // Its Brand: its lines glowing, its pillars bursting out along them.
    let nl = 0;
    if (b.brand) {
      const br = b.brand;
      const steps = Math.round(v.brandSteps);
      const spokes = Math.min(SPOKES, Math.round(v.brandSpokes));
      const r0 = RADIUS.hellwarden + 1;
      const glow = Math.min(1, br.t / Math.max(0.05, v.brandWarn));
      this.lineMat.opacity = 0.2 + 0.6 * glow;
      for (let s = 0; s < spokes; s++) {
        const yaw = br.a + (s / spokes) * Math.PI * 2 + Math.PI;
        pos.set(br.x, 0.07, br.z);
        this.lines.setMatrixAt(nl++, mat.compose(pos, q.setFromAxisAngle(Y, yaw), scl.set(0.8, 1, r0 + steps * v.brandStep)));
        for (let k = 0; k < steps && n < FLAMES; k++) {
          const at = v.brandWarn + k * v.brandStepT;
          const age = br.t - at;
          if (age < 0 || age > 0.45) continue;
          brandSpot(br, s, k, r0, spot);
          pos.set(spot.x, 0, spot.z);
          this.flames.setMatrixAt(n++, mat.compose(pos, q.identity(), scl.set(v.brandRadius * 0.8, PILLAR_HIGH * Math.sin((age / 0.45) * Math.PI), v.brandRadius * 0.8)));
        }
      }
    }
    this.lines.count = nl;
    if (nl > 0) this.lines.instanceMatrix.needsUpdate = true;
    // The floor split through, once its throne room's broken.
    this.drawCracks(e);
    n = this.drawBlades(e, root, n);
    this.flames.count = n;
    if (n > 0) this.flames.instanceMatrix.needsUpdate = true;
    this.drawVerdict(e);
  }

  private drawCracks(e: CombatState['enemies'][number]) {
    if (e.stage === 0) {
      this.cracks.count = 0;
      return;
    }
    const key = `${e.from.x.toFixed(0)}`;
    if (this.cracksFor !== key) {
      this.cracksFor = key;
      this.cracksAt = [];
      for (let k = 0; k < CRACKS; k++) {
        const yaw = (k / CRACKS) * Math.PI * 2 + (k % 3) * 0.3;
        const r = 3 + (k * 7) % 11;
        this.cracksAt.push({ x: e.pos.x - Math.sin(yaw) * r, z: e.pos.z - Math.cos(yaw) * r, yaw, long: 14 + (k * 5) % 12 });
      }
    }
    this.crackMat.opacity = 0.55 + 0.2 * Math.sin(this.time * 2.3);
    this.cracksAt.forEach((c, k) => {
      pos.set(c.x, 0.06, c.z);
      this.cracks.setMatrixAt(k, mat.compose(pos, q.setFromAxisAngle(Y, c.yaw), scl.set(0.5 + (k % 3) * 0.25, 1, c.long)));
    });
    this.cracks.count = CRACKS;
    this.cracks.instanceMatrix.needsUpdate = true;
  }

  /** Its sword hidden while it's out of its hand; a second in its left in phase 2; flames along them; flaring as its Arc comes. */
  private drawBlades(e: CombatState['enemies'][number], root: THREE.Object3D | null, start: number): number {
    const b = e.warden!;
    let n = start;
    const visible = !!root && root.visible && !hiddenWarden(e);
    const sword = root?.getObjectByName('Hellwarden_Sword') as THREE.SkinnedMesh | undefined;
    const verdict = e.phase === 'blast' && e.move === VERDICT;
    const out = b.thrown || b.shattered || verdict;
    if (sword) sword.visible = !out;
    this.second.visible = false;
    if (!visible || !root || !sword) return n;
    const handR = root.getObjectByName('hand_r');
    const handL = root.getObjectByName('hand_l');
    if (!handR || !handL) return n;
    root.updateMatrixWorld(true);
    if (!this.tipLocal) this.tipLocal = this.measureTip(sword, handR);
    const flare = e.phase === 'windup' && e.move === ARC ? Math.min(1, e.t / Math.max(0.05, wardenWindup(ARC, e.stage))) : 0;
    this.steel.emissiveIntensity = 0.6 + 1.6 * flare;
    if (out) return n;
    const burning = e.stage > 0 || e.phase === 'intro' || flare > 0;
    // Its right.
    handR.getWorldPosition(a);
    tip.copy(this.tipLocal);
    handR.localToWorld(tip);
    if (burning) n = this.flameAlong(a, tip, n, flare);
    if (flare > 0) HALOS.add(tip.x, tip.y, tip.z, 4 * flare, 0xfff0d8, 0.8 * flare);
    // Its left, mirrored, once its sword's split, while it's not knocked away.
    if (b.twin && b.weak <= 0) {
      handL.getWorldPosition(a);
      tip.copy(this.tipLocal).multiplyScalar(-1);
      handL.localToWorld(tip);
      this.second.visible = true;
      this.second.position.copy(a);
      q.setFromUnitVectors(Y, pos.subVectors(tip, a).normalize());
      this.second.quaternion.copy(q);
      this.second.scale.set(1.3, a.distanceTo(tip), 1.3);
      n = this.flameAlong(a, tip, n, flare);
    }
    return n;
  }

  private flameAlong(from: THREE.Vector3, to: THREE.Vector3, start: number, flare: number): number {
    let n = start;
    for (let k = 1; k <= ON_BLADE && n < FLAMES; k++) {
      pos.lerpVectors(from, to, k / ON_BLADE);
      const s = 0.2 + 0.1 * Math.sin(this.time * 19 + k * 2.1) + 0.2 * flare;
      this.flames.setMatrixAt(n++, mat.compose(pos, q.setFromAxisAngle(Y, k * 1.3), scl.set(s, s * 3, s)));
    }
    HALOS.add(to.x, to.y, to.z, 3, 0xff7a20, 0.5);
    return n;
  }

  /** Where its sword's tip is in its hand's frame: the furthest of its points, once. */
  private measureTip(sword: THREE.SkinnedMesh, hand: THREE.Object3D): THREE.Vector3 {
    const out = new THREE.Vector3(0, BLADE, 0);
    const p = sword.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    let far = 0;
    for (let i = 0; i < p.count; i += 3) {
      sword.getVertexPosition(i, v);
      v.applyMatrix4(sword.matrixWorld);
      hand.worldToLocal(v);
      const d = v.lengthSq();
      if (d > far) {
        far = d;
        out.copy(v);
      }
    }
    return out;
  }

  /** Its great sword over it through Last Verdict, its flash, its cleave across everything. */
  private drawVerdict(e: CombatState['enemies'][number]) {
    const v = HELLWARDEN.v;
    const on = e.phase === 'blast' && e.move === VERDICT;
    this.great.visible = on;
    const cleaved = e.phase === 'recover' && e.move === VERDICT && e.t < CLEAVE_FOR;
    this.sheet.visible = cleaved;
    if (cleaved) {
      const k = e.t / CLEAVE_FOR;
      this.sheet.position.set(e.pos.x, 4, e.pos.z);
      this.sheet.rotation.set(0, e.facing + (k - 0.5) * 2.6, 0);
      this.sheet.scale.set(150, 12, 1);
      this.sheetMat.opacity = 0.9 * (1 - k);
    }
    if (!on) return;
    const size = v.height / 6;
    const charged = e.shots === VERDICT_CHARGE ? Math.min(1, e.t / v.verdictWindow) : 0;
    const flash = e.shots === VERDICT_CHARGE && e.t >= v.verdictWindow - v.verdictFlash;
    this.great.position.set(e.pos.x, e.pos.y + v.height + OVER_IT * size, e.pos.z);
    this.great.scale.set(GREAT * 2 * (0.5 + 0.5 * charged), GREAT * BLADE * size * (0.4 + 0.6 * charged), GREAT * 2);
    this.greatMat.color.setHex(flash && Math.sin(this.time * 60) > -0.2 ? 0xffffff : 0xff9a50);
    HALOS.add(e.pos.x, e.pos.y + v.height + 6, e.pos.z, flash ? 22 : 10 * (0.4 + charged), flash ? 0xffffff : 0xff7a20, flash ? 1 : 0.6);
  }

  clear() {
    this.flames.count = this.lines.count = this.cracks.count = 0;
    this.second.visible = this.great.visible = this.sheet.visible = false;
    this.tipLocal = null;
    this.cracksFor = '';
  }

  dispose() {
    this.group.removeFromParent();
    this.flames.dispose();
    this.lines.dispose();
    this.cracks.dispose();
    for (const g of [this.coneGeo, this.flatGeo, this.bladeGeo, this.sheetGeo]) g.dispose();
    for (const m of [this.flameMat, this.lineMat, this.crackMat, this.steel, this.greatMat, this.sheetMat]) m.dispose();
  }
}
