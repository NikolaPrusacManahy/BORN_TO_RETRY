// Update 0.3.89 — Gravity Sean's sphere in the world (sim/combat/gravityGrab.ts; the designer's three pictures: a great sphere of cracked stone with rubble dropping off its underside, floating in the sky with cloud drawn round it,
// a crater under it). Made in code, placeholders. The plates (plateSphere.ts) over a dark core that lights up violet through the cracks the fuller it is: his gravity, his colour. Rocks rising to it from the ground, rubble falling
// off it, two bands of dust drawn round it. On the floor, where it'll come down. As it lands, a wall of dust, and it flies apart.
import * as THREE from 'three';
import { crashBlast, gatherK } from '../../sim/combat/gravityMeter';
import type { CombatState } from '../../sim/combat/state';
import { PlateSphere } from './plateSphere';
import { rockGeometry } from './piecesView';

const ZONE = 0x9d8fff;
const CORE_GLOW = 0x7a52ff;
const STONE = 0x8a7a66;
/** Rubble dropping off it, rocks rising to it (at the most); how far the rubble falls (m). */
const DROPPING = 46;
const RISING = 54;
const DROP_FAR = 13;
/** The bands of dust: how many pieces round, what they reach to (as shares of the sphere), how strong. */
const BAND_SEGS = 96;
const BAND_FROM = 1.03;
const BAND_MID = 1.13;
const BAND_TO = 1.38;
const BAND_ALPHA = 0.5;
/** How long it takes to break up (s), how long its dust lasts (s), how flat it is, how far it goes (a share of the blast). */
const BREAK_FOR = 0.8;
const DUST_FOR = 1;
const DUST_FLAT = 0.42;
const DUST_FAR = 1.25;
/** Over the floor (m). */
const ZONE_UP = 0.07;

/** A band of dust: a flat ring, wispy round its length, fading at both edges. Its colour and its alpha are its vertices'. */
function dustBand(seed: number): THREE.BufferGeometry {
  const radii = [BAND_FROM, BAND_MID, BAND_TO];
  const profile = [0, 1, 0];
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= BAND_SEGS; i++) {
    const a = (i / BAND_SEGS) * Math.PI * 2;
    // Wisps: strong in places, gone in others, the same each time.
    const wisp = Math.max(0, 0.45 + 0.4 * Math.sin(a * 3 + seed) + 0.3 * Math.sin(a * 7 + seed * 2.1) + 0.2 * Math.sin(a * 13 + seed * 3.3));
    for (let j = 0; j < radii.length; j++) {
      const r = radii[j] * (1 + 0.05 * Math.sin(a * 5 + seed + j));
      pos.push(Math.cos(a) * r, 0.04 * Math.sin(a * 4 + seed), Math.sin(a) * r);
      col.push(0.92, 0.85, 0.72, profile[j] * Math.min(1, wisp));
    }
  }
  for (let i = 0; i < BAND_SEGS; i++) {
    for (let j = 0; j < radii.length - 1; j++) {
      const a = i * radii.length + j;
      const b = a + radii.length;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const at = new THREE.Vector3();
const s = new THREE.Vector3();
const last = new THREE.Vector3();

/** A number in 0 … 1 for `i`, the same each time. */
const chance = (i: number, k: number) => {
  const n = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

export class MassView {
  private readonly plates = new PlateSphere();
  private readonly stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  private readonly sphere = new THREE.Mesh(this.plates.geometry, this.stoneMat);
  private readonly coreGeo = new THREE.IcosahedronGeometry(1, 3);
  private readonly coreMat = new THREE.MeshStandardMaterial({ color: 0x17110d, roughness: 1, flatShading: true, emissive: CORE_GLOW, emissiveIntensity: 0 });
  private readonly core = new THREE.Mesh(this.coreGeo, this.coreMat);
  private readonly rockGeo = rockGeometry();
  private readonly rockMat = new THREE.MeshStandardMaterial({ color: STONE, roughness: 1, flatShading: true });
  private readonly debris = new THREE.InstancedMesh(this.rockGeo, this.rockMat, DROPPING + RISING);
  private readonly bandMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  private readonly bands = [new THREE.Mesh(dustBand(1.3), this.bandMat), new THREE.Mesh(dustBand(4.9), this.bandMat)];
  private readonly zoneGeo = new THREE.RingGeometry(0.95, 1, 72).rotateX(-Math.PI / 2);
  private readonly zoneFillGeo = new THREE.CircleGeometry(0.95, 72).rotateX(-Math.PI / 2);
  private readonly zoneMat = new THREE.MeshBasicMaterial({ color: ZONE, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly zoneFillMat = new THREE.MeshBasicMaterial({ color: ZONE, transparent: true, opacity: 0.03, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly zone = new THREE.Group();
  private readonly dustGeo = new THREE.IcosahedronGeometry(1, 3);
  private readonly dustMat = new THREE.MeshBasicMaterial({ color: 0xc9b89c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  private readonly dust = new THREE.Mesh(this.dustGeo, this.dustMat);
  private time = 0;
  /** Seconds it's been breaking up (−1: it isn't), and how big it was. */
  private breaking = -1;
  private lastR = 1;
  private dustAge = -1;
  private dustFar = 1;

  constructor(private readonly scene: THREE.Scene) {
    this.sphere.visible = this.core.visible = this.debris.visible = this.zone.visible = this.dust.visible = false;
    this.sphere.castShadow = true;
    this.debris.castShadow = true;
    this.debris.count = 0;
    this.zone.add(new THREE.Mesh(this.zoneGeo, this.zoneMat), new THREE.Mesh(this.zoneFillGeo, this.zoneFillMat));
    for (const o of [this.sphere, this.core, this.debris, this.dust]) o.frustumCulled = false;
    this.bands[0].rotation.set(0.26, 0, 0.14);
    this.bands[1].rotation.set(-0.2, 0, -0.1);
    for (const b of this.bands) {
      b.visible = false;
      b.frustumCulled = false;
    }
    this.bands[0].rotation.order = this.bands[1].rotation.order = 'ZXY';
    scene.add(this.sphere, this.core, this.debris, this.zone, this.dust, ...this.bands);
  }

  /** (For the tests.) */
  get showing() {
    return { sphere: this.sphere.visible, plates: this.sphere.visible ? this.plates.home : 0, zone: this.zone.visible, debris: this.debris.visible ? this.debris.count : 0, bands: this.bands[0].visible, dust: this.dust.visible, breaking: this.breaking >= 0 };
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    const g = state.grav;
    const h = g.held && g.held.lifted ? g.held : null;
    const f = g.fall;
    for (let i = 0; i < state.events.length; i++) {
      const ev = state.events.at(i);
      if (ev.kind === 'seanCrash') this.landed(ev.value, ev.x, ev.y, ev.z);
    }
    if (h || f) {
      this.breaking = -1;
      const k = h ? gatherK(h) : f!.k;
      const r = h ? h.r : f!.r;
      const place = h ? h.at : f!.at;
      this.plates.fill(Math.min(1, k ** 0.75 * 1.04));
      this.show(place, r, k);
      this.debrisOf(place, r, k, h ? h.zone.y : f!.to.y, !!h);
      this.zoneOf(h ? h.zone : f!.to, k);
      last.copy(place);
      this.lastR = r;
    } else {
      this.zone.visible = false;
      this.debris.visible = false;
      for (const b of this.bands) b.visible = false;
      this.core.visible = false;
      if (this.sphere.visible && this.breaking < 0) this.breaking = 0;
      this.breakUp(dt);
    }
    this.dustOut(dt);
  }

  /** The sphere and its core, turning, and its bands of dust. */
  private show(place: THREE.Vector3, r: number, k: number) {
    this.sphere.visible = this.core.visible = true;
    this.sphere.position.copy(place);
    this.sphere.scale.setScalar(r);
    this.sphere.rotation.set(0.2, this.time * 0.22, 0.1);
    this.core.position.copy(place);
    this.core.scale.setScalar(r * 0.965);
    this.core.rotation.copy(this.sphere.rotation);
    this.coreMat.emissiveIntensity = (0.1 + 0.8 * k) * (0.8 + 0.2 * Math.sin(this.time * 5));
    this.bandMat.opacity = BAND_ALPHA * Math.min(1, k * 3);
    this.bands.forEach((b, i) => {
      b.visible = k > 0.03;
      b.position.copy(place);
      b.scale.setScalar(r);
      b.rotation.y = this.time * (i === 0 ? 0.5 : -0.34);
    });
  }

  /** Rubble dropping off its underside; rocks rising to it from the ground under it. More of both the fuller it is. */
  private debrisOf(place: THREE.Vector3, r: number, k: number, floor: number, rising: boolean) {
    const under = place.y - r;
    let n = 0;
    const dropping = Math.round(DROPPING * Math.min(1, k * 2 + 0.1));
    for (let i = 0; i < dropping; i++) {
      const p = (this.time * (0.3 + 0.3 * chance(i, 1)) + chance(i, 2)) % 1;
      const a = chance(i, 3) * Math.PI * 2;
      const out = Math.sqrt(chance(i, 4)) * r * 0.82;
      const y = place.y - Math.sqrt(Math.max(0, r * r - out * out)) * 0.96 - p * p * DROP_FAR;
      if (y < floor) continue;
      at.set(place.x + Math.cos(a) * out, y, place.z + Math.sin(a) * out);
      e.set(this.time * 2 + i, i * 1.7, 0);
      this.debris.setMatrixAt(n++, m.compose(at, q.setFromEuler(e), s.setScalar((0.1 + 0.32 * chance(i, 5)) * (1 - 0.4 * p) * (0.5 + r / 12))));
    }
    if (rising) {
      const count = Math.round(RISING * Math.min(1, k * 2 + 0.15));
      for (let i = 0; i < count; i++) {
        const j = i + DROPPING;
        const p = (this.time * (0.14 + 0.14 * chance(j, 1)) + chance(j, 2)) % 1;
        const a = chance(j, 3) * Math.PI * 2;
        const out = (r * 0.5 + 15 * chance(j, 4)) * (1 - 0.8 * p * p);
        at.set(place.x + Math.cos(a) * out, floor + (under - floor) * p, place.z + Math.sin(a) * out);
        e.set(this.time + i, this.time * 1.4 + i, 0);
        this.debris.setMatrixAt(n++, m.compose(at, q.setFromEuler(e), s.setScalar((0.08 + 0.24 * chance(j, 5)) * Math.min(1, p * 8))));
      }
    }
    this.debris.count = n;
    this.debris.visible = n > 0;
    this.debris.instanceMatrix.needsUpdate = true;
  }

  /** On the floor: where it'll come down, as far as it'll reach. */
  private zoneOf(where: THREE.Vector3, k: number) {
    this.zone.visible = true;
    this.zone.position.set(where.x, where.y + ZONE_UP, where.z);
    this.zone.scale.setScalar(crashBlast(k) * (1 + 0.015 * Math.sin(this.time * 9)));
  }

  /** It's landed. */
  private landed(k: number, x: number, y: number, z: number) {
    this.dustAge = 0;
    this.dustFar = crashBlast(k) * DUST_FAR;
    this.dust.position.set(x, y, z);
    this.dust.visible = true;
  }

  private breakUp(dt: number) {
    if (this.breaking < 0) return;
    this.breaking += dt;
    const k = this.breaking / BREAK_FOR;
    if (k >= 1) {
      this.breaking = -1;
      this.sphere.visible = false;
      this.plates.fill(0);
      return;
    }
    this.sphere.position.copy(last);
    this.sphere.scale.setScalar(this.lastR);
    this.plates.shatter(k);
  }

  private dustOut(dt: number) {
    if (this.dustAge < 0) return;
    this.dustAge += dt;
    const k = this.dustAge / DUST_FOR;
    if (k >= 1) {
      this.dustAge = -1;
      this.dust.visible = false;
      return;
    }
    const size = this.dustFar * (1 - (1 - k) * (1 - k));
    this.dust.scale.set(size, size * DUST_FLAT, size);
    this.dustMat.opacity = 0.55 * (1 - k);
  }

  dispose() {
    this.scene.remove(this.sphere, this.core, this.debris, this.zone, this.dust, ...this.bands);
    this.plates.dispose();
    this.stoneMat.dispose();
    this.coreGeo.dispose();
    this.coreMat.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    this.debris.dispose();
    this.bandMat.dispose();
    for (const b of this.bands) b.geometry.dispose();
    this.zoneGeo.dispose();
    this.zoneFillGeo.dispose();
    this.zoneMat.dispose();
    this.zoneFillMat.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
  }
}
