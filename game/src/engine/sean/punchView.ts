// Update 0.3.86 — Gravity Sean's blows in the world (the designer: "more details on the punches on Lmb, more effects of shockwaves"). Made in code, placeholders.
// Gravity Punch: from the fist that threw it, a tube of pressure out to where it ended, and rings running down it, staggered, growing. The combo's third is bigger in all of it. Where any of his blows lands: a flash, a
// white ring and a slower one spreading from it, facing you. Shockwave Punch: all of that at the size of its cone, many rings, and on the ground more of them rolling out along the floor.
// The rings are one instanced mesh, faded by their colour as they're additive.
import * as THREE from 'three';
import { shockConeOf } from '../../sim/cards/seanPowers';
import type { CombatState } from '../../sim/combat/state';
import { CAMERA } from '../../tuning/camera';
import { SEAN } from '../../tuning/sean';

const WAVES = 96;
const TUBES = 6;
const FLASHES = 8;
const COOL = new THREE.Color(0x8f83ff);
const HOT = new THREE.Color(0xff40d8);
const WHITE = new THREE.Color(0xfff4ff);
/** The fist the blow leaves: from the eye, how far ahead, to the side and down (m). */
const FIST_AHEAD = 0.7;
const FIST_SIDE = 0.28;
const FIST_DOWN = 0.28;
/** Over the floor (m). */
const FLOOR_UP = 0.1;
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);

interface Wave {
  on: boolean;
  t: number;
  life: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  r0: number;
  r1: number;
  /** Lying on the floor rather than facing along its way. */
  flat: boolean;
  color: THREE.Color;
}

interface Tube {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  life: number;
  bright: number;
}

interface Flash {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  life: number;
  size: number;
}

const eye = new THREE.Vector3();
const look = new THREE.Vector3();
const right = new THREE.Vector3();
const fist = new THREE.Vector3();
const at = new THREE.Vector3();
const way = new THREE.Vector3();
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const shade = new THREE.Color();

export class PunchView {
  private readonly ringGeo = new THREE.TorusGeometry(1, 0.045, 5, 36);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly rings = new THREE.InstancedMesh(this.ringGeo, this.ringMat, WAVES);
  private readonly waves: Wave[] = [];
  /** Its point at the origin, opening along +y to radius 1 at 1. */
  private readonly tubeGeo = new THREE.ConeGeometry(1, 1, 24, 1, true).rotateX(Math.PI).translate(0, 0.5, 0);
  private readonly tubes: Tube[] = [];
  private readonly flashGeo = new THREE.SphereGeometry(1, 14, 10);
  private readonly flashes: Flash[] = [];
  private nextWave = 0;
  private nextTube = 0;
  private nextFlash = 0;
  /** Which fist threw the last: −1 left, 1 right. */
  private side = 1;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.rings.frustumCulled = false;
    this.rings.count = 0;
    scene.add(this.rings);
    this.rings.setColorAt(0, WHITE);
    for (let i = 0; i < WAVES; i++) this.waves.push({ on: false, t: 0, life: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), r0: 0, r1: 1, flat: false, color: COOL });
    const add = (geo: THREE.BufferGeometry, side: THREE.Side) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      return { mesh, mat };
    };
    for (let i = 0; i < TUBES; i++) this.tubes.push({ ...add(this.tubeGeo, THREE.DoubleSide), t: 1, life: 1, bright: 0 });
    for (let i = 0; i < FLASHES; i++) this.flashes.push({ ...add(this.flashGeo, THREE.FrontSide), t: 1, life: 1, size: 1 });
  }

  /** (For the tests.) */
  get showing() {
    return { waves: this.waves.filter((w) => w.on).length, tubes: this.tubes.filter((t) => t.mesh.visible).length, flashes: this.flashes.filter((f) => f.mesh.visible).length };
  }

  update(state: CombatState, dt: number) {
    this.camera.getWorldPosition(eye);
    this.camera.getWorldDirection(look);
    right.crossVectors(look, UP).normalize();
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events.at(i);
      if (e.kind === 'jabL') this.side = -1;
      else if (e.kind === 'jabR') this.side = 1;
      else if (e.kind === 'seanRipple') this.ripple(at.set(e.x, e.y, e.z), e.value === 1);
      else if (e.kind === 'seanImpact') this.impact(at.set(e.x, e.y, e.z), (e.value & 1) === 1, (e.value & 2) === 2);
      else if (e.kind === 'seanShock') this.shock(at.set(e.x, e.y, e.z), e.value === 1, shockConeOf(state));
    }
    this.moveWaves(dt);
    for (const t of this.tubes) {
      if (!t.mesh.visible) continue;
      t.t += dt / t.life;
      t.mesh.visible = t.t < 1;
      t.mat.opacity = t.bright * (1 - t.t);
    }
    for (const f of this.flashes) {
      if (!f.mesh.visible) continue;
      f.t += dt / f.life;
      f.mesh.visible = f.t < 1;
      f.mesh.scale.setScalar(f.size * (0.3 + 0.7 * f.t));
      f.mat.opacity = 0.8 * (1 - f.t);
    }
  }

  /** Where a blow leaves your fist. */
  private fromFist(side: number, out: THREE.Vector3) {
    return out.copy(eye).addScaledVector(look, FIST_AHEAD).addScaledVector(right, FIST_SIDE * side).addScaledVector(UP, -FIST_DOWN);
  }

  private wave(from: THREE.Vector3, to: THREE.Vector3, delay: number, life: number, r0: number, r1: number, color: THREE.Color, flat = false) {
    const w = this.waves[this.nextWave++ % WAVES];
    w.on = true;
    w.t = -delay / life;
    w.life = life;
    w.from.copy(from);
    w.to.copy(to);
    w.r0 = r0;
    w.r1 = r1;
    w.flat = flat;
    w.color = color;
  }

  private tube(from: THREE.Vector3, to: THREE.Vector3, r: number, life: number, bright: number, color: THREE.Color) {
    const t = this.tubes[this.nextTube++ % TUBES];
    way.subVectors(to, from);
    const long = way.length();
    t.mesh.position.copy(from);
    t.mesh.quaternion.setFromUnitVectors(UP, way.multiplyScalar(1 / Math.max(long, 1e-3)));
    t.mesh.scale.set(r, long, r);
    t.mat.color.copy(color);
    t.mat.opacity = bright;
    t.t = 0;
    t.life = life;
    t.bright = bright;
    t.mesh.visible = true;
  }

  private flash(where: THREE.Vector3, size: number, life: number, color: THREE.Color) {
    const f = this.flashes[this.nextFlash++ % FLASHES];
    f.mesh.position.copy(where);
    f.mesh.scale.setScalar(size * 0.3);
    f.mat.color.copy(color);
    f.t = 0;
    f.life = life;
    f.size = size;
    f.mesh.visible = true;
  }

  /** Gravity Punch running out to `to`. */
  private ripple(to: THREE.Vector3, last: boolean) {
    const from = this.fromFist(this.side, fist);
    const n = last ? 6 : 3;
    for (let i = 0; i < n; i++) this.wave(from, to, i * 0.028, last ? 0.24 : 0.2, 0.14, last ? 1.5 + 0.28 * i : 0.8 + 0.2 * i, last && i === 0 ? WHITE : COOL);
    this.tube(from, to, last ? 0.75 : 0.42, last ? 0.17 : 0.12, last ? 0.34 : 0.22, COOL);
    this.flash(from, last ? 0.14 : 0.08, 0.09, last ? WHITE : COOL);
  }

  /** A blow of his lands at `where`. */
  private impact(where: THREE.Vector3, last: boolean, unstable: boolean) {
    const color = unstable ? HOT : COOL;
    const size = unstable ? (last ? 1.3 : 0.75) : last ? 2.6 : 1.3;
    this.wave(where, where, 0, 0.13, 0.1, size * 0.6, WHITE);
    this.wave(where, where, 0.02, 0.26, 0.15, size, color);
    if (last) this.wave(where, where, 0.06, 0.32, 0.2, size * 1.35, color);
    this.flash(where, size * 0.42, 0.1, last ? WHITE : color);
  }

  /** Shockwave Punch, out to `to`. */
  private shock(to: THREE.Vector3, grounded: boolean, cone: number) {
    const from = this.fromFist(1, fist);
    const v = SEAN.v;
    const wide = Math.tan((cone * Math.PI) / 180);
    const long = from.distanceTo(to);
    for (let i = 0; i < 9; i++) {
      const k = (i + 1) / 9;
      this.wave(from, to, i * 0.018, 0.3, 0.3, Math.max(v.shockNear, long * wide) * (0.45 + 0.55 * k), i < 2 ? WHITE : HOT);
    }
    this.tube(from, to, long * wide, 0.22, 0.34, HOT);
    this.tube(from, to, long * wide * 0.45, 0.14, 0.4, WHITE);
    this.flash(from, 0.22, 0.12, WHITE);
    if (!grounded) return;
    const floor = eye.y - CAMERA.v.eyeHeight + FLOOR_UP;
    for (let i = 1; i <= 4; i++) {
      const k = i / 4;
      way.lerpVectors(from, to, k);
      way.y = floor;
      this.wave(way, way, k * 0.16, 0.34, 0.3, Math.max(v.shockNear, long * k * wide), HOT, true);
    }
  }

  private moveWaves(dt: number) {
    let n = 0;
    for (const w of this.waves) {
      if (!w.on) continue;
      w.t += dt / w.life;
      if (w.t >= 1) {
        w.on = false;
        continue;
      }
      if (w.t < 0) continue;
      const k = 1 - (1 - w.t) * (1 - w.t);
      at.lerpVectors(w.from, w.to, k);
      if (w.flat) q.setFromUnitVectors(Z, UP);
      else if (w.from.equals(w.to)) q.setFromUnitVectors(Z, way.subVectors(eye, at).normalize());
      else q.setFromUnitVectors(Z, way.subVectors(w.to, w.from).normalize());
      this.rings.setMatrixAt(n, m.compose(at, q, s.setScalar(w.r0 + (w.r1 - w.r0) * k)));
      this.rings.setColorAt(n, shade.copy(w.color).multiplyScalar(1 - w.t * w.t));
      n++;
    }
    this.rings.count = n;
    this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.rings, ...this.tubes.map((t) => t.mesh), ...this.flashes.map((f) => f.mesh));
    this.rings.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.tubeGeo.dispose();
    this.flashGeo.dispose();
    for (const t of this.tubes) t.mat.dispose();
    for (const f of this.flashes) f.mat.dispose();
  }
}
