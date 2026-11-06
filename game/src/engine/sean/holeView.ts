// Update 0.3.89 — Gravity Sean's Black Hole in the world (sim/combat/gravityHole.ts; the designer: "add more visual look to the black hole like an effect that clearly shows it is pulling enemy in, or a premium visual look"). Made in
// code, placeholders: colours in the vertices and meshes that move, no shaders of its own. A black ball with a halo of light hugging it from wherever you stand; a burning disk of matter, tilted towards you, its spiral arms winding in
// as it turns; on the floor, a dark spiral as far as it reaches with a bright edge, so you can see where it's got you; streaks of light spiralling in from out there, faster as they near it; stones whirling round it; a beam from it to
// everything it's got, with beads of light running down it to the hole. What it has stretches and leans in (holePull.ts). It collapses as it ends and bursts in a flash. With time stopped it hangs there.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { isLive } from '../../sim/enemies/enemy';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import { SEAN } from '../../tuning/sean';
import { rockGeometry } from './piecesView';

/** The ball when it's open, and in flight (m); how long it takes to open, and to collapse (s). */
const HOLE_R = 1.15;
const ORB_R = 0.34;
const OPEN_FOR = 0.3;
const CLOSE_FOR = 0.35;
/** How far the disk faces you, from lying flat (0) to square on (1). */
const FACE_YOU = 0.45;
/** Spiral arms; how many, how tightly they wind (negative: they wind in as the disk turns the way the bodies go round). */
const ARMS = 3;
const WIND = -7;
const SPIN = 2.4;
const SPIN_INNER = 4.1;
const FLOOR_SPIN = 0.9;
/** How many of each. */
const STREAKS = 140;
const STONES = 26;
const TETHERS = 24;
const BEADS_EACH = 2;
/** Streaks: how fast they run in (lives a second, at the least), how high out there they start (m). */
const STREAK_RATE = 0.42;
const STREAK_HIGH = 3.4;
/** Over the floor (m). */
const FLOOR_UP = 0.06;
/** The flash as it bursts: how long (s), how far, a share of its blast. */
const FLASH_FOR = 0.28;
const FLASH_FAR = 0.75;

const WHITE = new THREE.Color(0xfff4ff);
const HOT = new THREE.Color(0xff7ad9);
const VIOLET = new THREE.Color(0x7a5cff);
const c = new THREE.Color();
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** A number in 0 … 1 for `i`, the same each time. */
const chance = (i: number, k: number) => {
  const n = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

/** A flat round mesh, lying in the XZ plane, coloured by `paint` (its angle, and how far from inner to outer, 0 … 1): RGBA when `alpha`. */
function polar(inner: number, outer: number, segs: number, rings: number, alpha: boolean, paint: (a: number, t: number, out: number[]) => void): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const rgba = [0, 0, 0, 1];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    for (let j = 0; j <= rings; j++) {
      const t = j / rings;
      const r = inner + (outer - inner) * t;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
      paint(a, t, rgba);
      if (alpha) col.push(rgba[0], rgba[1], rgba[2], rgba[3]);
      else col.push(rgba[0], rgba[1], rgba[2]);
    }
  }
  const row = rings + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < rings; j++) {
      const a = i * row + j;
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, alpha ? 4 : 3));
  g.setIndex(idx);
  return g;
}

/** The burning disk: its arms bright against a dim sheet, white hot in close, violet far out, gone at its edge. */
function diskPaint(arms: number, wind: number) {
  return (a: number, t: number, out: number[]) => {
    const arm = 0.5 + 0.5 * Math.cos(arms * a + wind * t);
    const bright = (1 - t) ** 2.2 * smooth(t / 0.05) * (0.08 + 1.15 * arm * arm * arm);
    c.copy(WHITE).lerp(HOT, smooth(t / 0.3)).lerp(VIOLET, smooth((t - 0.25) / 0.55)).multiplyScalar(bright);
    out[0] = c.r;
    out[1] = c.g;
    out[2] = c.b;
  };
}

const up = new THREE.Vector3(0, 1, 0);
const toYou = new THREE.Vector3();
const normal = new THREE.Vector3();
const here = new THREE.Vector3();
const next = new THREE.Vector3();
const way = new THREE.Vector3();
const middle = new THREE.Vector3();
const size3 = new THREE.Vector3();
const face = new THREE.Quaternion();
const spin = new THREE.Quaternion();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const s = new THREE.Vector3();
const m = new THREE.Matrix4();
const Z = new THREE.Vector3(0, 0, 1);
const flash = new THREE.Vector3();

export class HoleView {
  private readonly group = new THREE.Group();
  private readonly ballGeo = new THREE.SphereGeometry(1, 32, 22);
  private readonly ballMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  private readonly ball = new THREE.Mesh(this.ballGeo, this.ballMat);
  private readonly glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  /** Lies in the XZ plane like the rest, stood up to face you. */
  private readonly haloGeo = polar(0.97, 2.25, 72, 10, false, (_a, t, out) => {
    const k = (1 - t) ** 3.2;
    c.copy(WHITE).lerp(VIOLET, smooth(t / 0.55)).multiplyScalar(k * 1.15);
    out[0] = c.r;
    out[1] = c.g;
    out[2] = c.b;
  });
  private readonly halo = new THREE.Mesh(this.haloGeo, this.glowMat);
  private readonly diskGeo = polar(1.2, 2.7, 128, 12, false, diskPaint(ARMS, WIND));
  private readonly disk = new THREE.Mesh(this.diskGeo, this.glowMat);
  private readonly innerGeo = polar(1.08, 1.8, 96, 8, false, diskPaint(ARMS + 2, WIND * 0.7));
  private readonly inner = new THREE.Mesh(this.innerGeo, this.glowMat);
  /** On the floor: a dark spiral over whatever's there, seen on bright floors and dark. */
  private readonly floorMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  private readonly floorGeo = polar(0.02, 1, 96, 10, true, (a, t, out) => {
    const arm = 0.5 + 0.5 * Math.cos(ARMS * a + WIND * 1.4 * t);
    out[0] = 0.05;
    out[1] = 0.02;
    out[2] = 0.14;
    out[3] = (1 - t) ** 0.7 * smooth((1 - t) / 0.08) * (0.14 + 0.62 * arm * arm);
  });
  private readonly floor = new THREE.Mesh(this.floorGeo, this.floorMat);
  private readonly edgeGeo = new THREE.RingGeometry(0.985, 1, 96).rotateX(-Math.PI / 2);
  private readonly edgeMat = new THREE.MeshBasicMaterial({ color: 0xa79dff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly edge = new THREE.Mesh(this.edgeGeo, this.edgeMat);
  /** Pointed at both ends: a streak of light, not a bar. */
  private readonly streakGeo = new THREE.OctahedronGeometry(0.5, 0);
  private readonly lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly streaks = new THREE.InstancedMesh(this.streakGeo, this.lightMat, STREAKS);
  private readonly beams = new THREE.InstancedMesh(this.streakGeo, this.lightMat, TETHERS);
  private readonly beadGeo = new THREE.SphereGeometry(1, 8, 6);
  private readonly beads = new THREE.InstancedMesh(this.beadGeo, this.lightMat, TETHERS * BEADS_EACH);
  private readonly rockGeo = rockGeometry();
  private readonly rockMat = new THREE.MeshStandardMaterial({ color: 0x4d4658, roughness: 1, flatShading: true, emissive: 0x7a5cff, emissiveIntensity: 0.35 });
  private readonly stones = new THREE.InstancedMesh(this.rockGeo, this.rockMat, STONES);
  private readonly flashMat = new THREE.MeshBasicMaterial({ color: 0xffd9f4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flashBall = new THREE.Mesh(this.ballGeo, this.flashMat);
  private time = 0;
  private flashAge = -1;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.group.add(this.ball, this.halo, this.disk, this.inner);
    this.group.visible = false;
    this.floor.visible = this.edge.visible = this.flashBall.visible = false;
    for (const o of [this.ball, this.halo, this.disk, this.inner, this.floor, this.edge, this.streaks, this.beams, this.beads, this.stones, this.flashBall]) o.frustumCulled = false;
    for (const list of [this.streaks, this.beams, this.beads, this.stones]) {
      list.count = 0;
      list.visible = false;
    }
    this.streaks.setColorAt(0, WHITE);
    this.beams.setColorAt(0, WHITE);
    this.beads.setColorAt(0, WHITE);
    scene.add(this.group, this.floor, this.edge, this.streaks, this.beams, this.beads, this.stones, this.flashBall);
  }

  /** (For the tests.) */
  get showing() {
    return { hole: this.group.visible, floor: this.floor.visible, streaks: this.streaks.visible ? this.streaks.count : 0, beams: this.beams.visible ? this.beams.count : 0, beads: this.beads.visible ? this.beads.count : 0, stones: this.stones.visible ? this.stones.count : 0, flash: this.flashBall.visible };
  }

  update(state: CombatState, realDt: number) {
    // (With time stopped it hangs there, as everything does.)
    const dt = state.grav.stop ? 0 : realDt;
    this.time += dt;
    for (let i = 0; i < state.events.length; i++) {
      const ev = state.events.at(i);
      if (ev.kind === 'seanHoleBurst') {
        this.flashAge = 0;
        flash.set(ev.x, ev.y, ev.z);
      }
    }
    this.flashOut(realDt);
    const h = state.grav.hole;
    this.group.visible = !!h;
    this.floor.visible = this.edge.visible = !!h && !h.flying;
    this.streaks.visible = !!h;
    this.stones.visible = !!h;
    this.beams.visible = this.beads.visible = !!h && !h.flying;
    if (!h) return;
    const v = SEAN.v;
    const open = h.flying ? 0 : smooth(h.t / OPEN_FOR);
    const closing = h.flying ? 0 : smooth((h.t - v.holeTime + CLOSE_FOR) / CLOSE_FOR);
    const size = (ORB_R + (HOLE_R - ORB_R) * open) * (1 - 0.75 * closing) * (1 + 0.025 * Math.sin(this.time * 23));
    this.group.position.set(h.x, h.y, h.z);
    this.ball.scale.setScalar(size);
    this.place(size, h.flying ? 0.5 : 0.5 + 0.5 * open, closing);
    if (h.flying) {
      this.streakAll(h.x, h.y, h.z, h.y, size, 1.6, 0.4, 0, 0.55);
      this.stoneAll(h.x, h.y, h.z, size, 8);
      return;
    }
    const reach = v.holeReach * open;
    this.floor.position.set(h.x, h.floor + FLOOR_UP, h.z);
    this.floor.scale.setScalar(Math.max(0.01, reach));
    this.floor.rotation.y = -this.time * FLOOR_SPIN;
    this.floorMat.opacity = 1 - closing;
    this.edge.position.set(h.x, h.floor + FLOOR_UP + 0.02, h.z);
    this.edge.scale.setScalar(Math.max(0.01, reach));
    this.edgeMat.opacity = 0.6 * (1 - closing);
    this.streakAll(h.x, h.y, h.z, h.floor, size, Math.max(1.6, reach), 1 - closing, STREAK_HIGH, 1);
    this.stoneAll(h.x, h.y, h.z, size, STONES);
    this.tether(state, h.x, h.y, h.z, h.pulled, 1 - closing);
  }

  /** The halo square to you; the disks tilted towards you, turning. */
  private place(size: number, diskSize: number, closing: number) {
    this.camera.getWorldPosition(toYou).sub(this.group.position).normalize();
    this.halo.quaternion.setFromUnitVectors(up, toYou);
    this.halo.scale.setScalar(size);
    normal.copy(up).lerp(toYou, FACE_YOU).normalize();
    face.setFromUnitVectors(up, normal);
    const faster = 1 + 3 * closing;
    this.disk.quaternion.copy(face).multiply(spin.setFromAxisAngle(up, -this.time * SPIN * faster));
    this.inner.quaternion.copy(face).multiply(spin.setFromAxisAngle(up, -this.time * SPIN_INNER * faster));
    this.disk.scale.setScalar(size * diskSize);
    this.inner.scale.setScalar(size * diskSize);
  }

  /** The streaks, spiralling in from `reach`, the way the bodies go round; faster and brighter the nearer they get. */
  private streakAll(x: number, y: number, z: number, floor: number, size: number, reach: number, strength: number, high: number, share: number) {
    const count = Math.round(STREAKS * share);
    const core = size * 1.2;
    const point = (i: number, p: number, out: THREE.Vector3) => {
      const r = core + (reach - core) * (1 - p) ** 1.6;
      const a = chance(i, 1) * Math.PI * 2 + 5.5 * p * p * p + 1.4 * p;
      const from = high > 0 ? floor + 0.15 + high * chance(i, 2) ** 1.5 : y;
      return out.set(x + Math.cos(a) * r, y + (from - y) * (1 - p) ** 1.25, z + Math.sin(a) * r);
    };
    for (let i = 0; i < count; i++) {
      const p = (this.time * (STREAK_RATE + 0.4 * chance(i, 3)) + chance(i, 4)) % 1;
      point(i, p, here);
      point(i, Math.min(1, p + 0.012), next);
      way.subVectors(next, here);
      const long = way.length();
      const length = Math.min(1.25, Math.max(0.16, long * 6));
      q.setFromUnitVectors(Z, way.multiplyScalar(1 / Math.max(long, 1e-5)));
      const thick = 0.012 + 0.024 * chance(i, 5);
      this.streaks.setMatrixAt(i, m.compose(here, q, s.set(thick, thick, length)));
      const fade = smooth(p / 0.14) * smooth((1 - p) / 0.05) * strength;
      c.copy(VIOLET).lerp(HOT, smooth(p / 0.6)).lerp(WHITE, smooth((p - 0.6) / 0.4)).multiplyScalar(fade * (0.5 + 0.5 * p));
      this.streaks.setColorAt(i, c);
    }
    this.streaks.count = count;
    this.streaks.instanceMatrix.needsUpdate = true;
    if (this.streaks.instanceColor) this.streaks.instanceColor.needsUpdate = true;
  }

  /** The stones whirling round it, in the plane of its disk. */
  private stoneAll(x: number, y: number, z: number, size: number, count: number) {
    for (let i = 0; i < count; i++) {
      const r = size * (1.45 + 2.1 * chance(i, 6));
      const a = chance(i, 7) * Math.PI * 2 + (this.time * 3.2) / (1 + 0.5 * (r / size));
      here.set(Math.cos(a) * r, 0.12 * size * Math.sin(i * 2.1 + this.time), Math.sin(a) * r).applyQuaternion(face);
      here.x += x;
      here.y += y;
      here.z += z;
      e.set(this.time * 3 + i, i * 1.7, this.time * 2);
      this.stones.setMatrixAt(i, m.compose(here, q.setFromEuler(e), s.setScalar(size * (0.045 + 0.09 * chance(i, 8)))));
    }
    this.stones.count = count;
    this.stones.instanceMatrix.needsUpdate = true;
  }

  /** A beam from it to each it's got, flickering, and beads of light running down each to the hole. */
  private tether(state: CombatState, x: number, y: number, z: number, pulled: readonly number[], strength: number) {
    let n = 0;
    let b = 0;
    next.set(x, y, z);
    for (const i of pulled) {
      const en = state.enemies[i];
      if (n >= TETHERS || !isLive(en) || en.phase !== 'held') continue;
      here.set(en.pos.x, en.pos.y + ENEMY_STATS[en.kind]().height * 0.5, en.pos.z);
      way.subVectors(next, here);
      const long = way.length();
      if (long < 0.1) continue;
      q.setFromUnitVectors(Z, way.multiplyScalar(1 / long));
      const flick = 0.62 + 0.38 * Math.sin(this.time * 31 + i * 2.7);
      const thick = 0.05 + 0.04 * flick;
      this.beams.setMatrixAt(n, m.compose(middle.lerpVectors(here, next, 0.5), q, size3.set(thick, thick, long)));
      this.beams.setColorAt(n, c.copy(HOT).multiplyScalar(0.55 * flick * strength));
      n++;
      for (let j = 0; j < BEADS_EACH; j++) {
        const along = (this.time * 1.5 + j / BEADS_EACH + i * 0.37) % 1;
        // (In to the hole, gathering speed.)
        middle.lerpVectors(here, next, along * along);
        this.beads.setMatrixAt(b, m.compose(middle, q, size3.setScalar(0.07 + 0.05 * along)));
        this.beads.setColorAt(b, c.copy(WHITE).lerp(HOT, 1 - along).multiplyScalar(strength));
        b++;
      }
    }
    this.beams.count = n;
    this.beads.count = b;
    this.beams.instanceMatrix.needsUpdate = this.beads.instanceMatrix.needsUpdate = true;
    if (this.beams.instanceColor) this.beams.instanceColor.needsUpdate = true;
    if (this.beads.instanceColor) this.beads.instanceColor.needsUpdate = true;
  }

  private flashOut(dt: number) {
    if (this.flashAge < 0) {
      this.flashBall.visible = false;
      return;
    }
    this.flashAge += dt;
    const k = this.flashAge / FLASH_FOR;
    if (k >= 1) {
      this.flashAge = -1;
      this.flashBall.visible = false;
      return;
    }
    this.flashBall.visible = true;
    this.flashBall.position.copy(flash);
    this.flashBall.scale.setScalar(SEAN.v.holeBlast * FLASH_FAR * (1 - (1 - k) * (1 - k)));
    this.flashMat.opacity = 0.75 * (1 - k);
  }

  dispose() {
    this.scene.remove(this.group, this.floor, this.edge, this.streaks, this.beams, this.beads, this.stones, this.flashBall);
    this.ballGeo.dispose();
    this.ballMat.dispose();
    this.glowMat.dispose();
    this.haloGeo.dispose();
    this.diskGeo.dispose();
    this.innerGeo.dispose();
    this.floorMat.dispose();
    this.floorGeo.dispose();
    this.edgeGeo.dispose();
    this.edgeMat.dispose();
    this.streakGeo.dispose();
    this.lightMat.dispose();
    this.streaks.dispose();
    this.beams.dispose();
    this.beadGeo.dispose();
    this.beads.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    this.stones.dispose();
    this.flashMat.dispose();
  }
}
