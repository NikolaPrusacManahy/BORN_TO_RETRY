// Update 0.3.89 — Gravity Sean's sphere of cracked stone (engine/sean/massView.ts): real plates of rock with real gaps between them, not a picture of cracks, faceted as the rest of the game is. Made in code: a ball cut into
// plates (each triangle goes to the nearest of a set of points), each drawn in a little from its neighbours and domed, darker towards its edges. Each plate flies in as the sphere fills, from below first, as the rocks come up from
// the ground; and they all fly apart as it breaks. The vertices move in plain code, so what's drawn here is what a render shows. Only ever touches a plate that's moving.
import * as THREE from 'three';

/** How many plates; how finely the ball is cut (three.js's detail: faces = 20 × (detail + 1)²). */
const PLATES = 110;
const DETAIL = 13;
/** How far each plate's drawn in from its neighbours (a share of its size): the cracks. How much it's domed and how far it stands out or in (m, at radius 1). */
const INSET = 0.09;
const DOME = 0.04;
const STANDS = 0.022;
/** A plate's flight in: from how far out (at radius 1), and over how much of the fill. */
const FLY_OUT = 0.55;
const FLY_SPAN = 0.08;
/** The fill at which plates start, from the bottom up and at random. */
const BY_HEIGHT = 0.55;
const BY_CHANCE = 0.37;
/** Breaking: how far plates fly (at radius 1) and how far they fall. */
const BREAK_OUT = 1.4;
const BREAK_FALL = 1.6;
/** The stone's colours. */
const LIGHT = new THREE.Color(0xc2a67e);
const DARK = new THREE.Color(0x8f7757);
/** How dark a plate's edge is (the cracks' shadow) and how much plates vary. */
const EDGE_DARK = 0.55;

/** The same every time. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const v = new THREE.Vector3();
const c = new THREE.Vector3();
const col = new THREE.Color();

export class PlateSphere {
  readonly geometry = new THREE.BufferGeometry();
  private readonly rest: Float32Array;
  private readonly pos: Float32Array;
  private readonly centre: Float32Array;
  private readonly appear: Float32Array;
  /** Each plate's first vertex, and one past its last. */
  private readonly first: Uint32Array;
  /** How far each plate's come (0 … 1). */
  private readonly done: Float32Array;
  private broken = false;

  constructor() {
    const random = rng(7);
    const seeds: THREE.Vector3[] = [];
    const TURN = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < PLATES; i++) {
      const y = 1 - ((i + 0.5) / PLATES) * 2;
      const round = Math.sqrt(1 - y * y);
      const a = i * TURN;
      // (Spread evenly, then shaken: no two plates alike.)
      seeds.push(new THREE.Vector3(Math.cos(a) * round + (random() - 0.5) * 0.2, y + (random() - 0.5) * 0.2, Math.sin(a) * round + (random() - 0.5) * 0.2).normalize());
    }
    const ball = new THREE.IcosahedronGeometry(1, DETAIL);
    const from = ball.attributes.position as THREE.BufferAttribute;
    const tris: number[][] = seeds.map(() => []);
    for (let t = 0; t < from.count; t += 3) {
      c.set(from.getX(t) + from.getX(t + 1) + from.getX(t + 2), from.getY(t) + from.getY(t + 1) + from.getY(t + 2), from.getZ(t) + from.getZ(t + 1) + from.getZ(t + 2)).normalize();
      let best = 0;
      let most = -2;
      for (let i = 0; i < PLATES; i++) {
        const d = c.dot(seeds[i]);
        if (d > most) {
          most = d;
          best = i;
        }
      }
      tris[best].push(t);
    }
    ball.dispose();
    const count = from.count;
    this.rest = new Float32Array(count * 3);
    this.pos = new Float32Array(count * 3);
    this.centre = new Float32Array(PLATES * 3);
    this.appear = new Float32Array(PLATES);
    this.first = new Uint32Array(PLATES + 1);
    this.done = new Float32Array(PLATES);
    const colors = new Float32Array(count * 3);
    let n = 0;
    for (let i = 0; i < PLATES; i++) {
      this.first[i] = n;
      // Its middle, and how far its corners are from it.
      c.set(0, 0, 0);
      let wide = 0;
      for (const t of tris[i]) for (let k = 0; k < 3; k++) c.add(v.fromBufferAttribute(from, t + k));
      c.normalize();
      for (const t of tris[i]) for (let k = 0; k < 3; k++) wide = Math.max(wide, v.fromBufferAttribute(from, t + k).distanceTo(c));
      const stands = 1 + (random() - 0.5) * STANDS * 2;
      const tint = random();
      const middle = { x: c.x, y: c.y, z: c.z };
      this.centre.set([middle.x, middle.y, middle.z], i * 3);
      this.appear[i] = BY_HEIGHT * ((middle.y + 1) / 2) + BY_CHANCE * random();
      for (const t of tris[i]) {
        for (let k = 0; k < 3; k++) {
          v.fromBufferAttribute(from, t + k);
          const off = v.distanceTo(c) / Math.max(wide, 1e-3);
          v.lerp(c, INSET).normalize().multiplyScalar(stands + DOME * (1 - off * off));
          this.rest.set([v.x, v.y, v.z], n * 3);
          // Mottled, and dark towards its edge.
          const shade = 1 - EDGE_DARK * off * off * off;
          col.copy(DARK).lerp(LIGHT, tint * 0.7 + 0.3 * Math.abs(Math.sin(v.x * 9 + v.y * 13 + v.z * 7))).multiplyScalar(shade);
          colors.set([col.r, col.g, col.b], n * 3);
          n++;
        }
      }
    }
    this.first[PLATES] = n;
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, n);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    this.place(-1);
  }

  /** How many plates are all the way home (for the tests). */
  get home(): number {
    let n = 0;
    for (let i = 0; i < PLATES; i++) if (this.done[i] >= 1) n++;
    return n;
  }

  /** How many there are. */
  static get plates(): number {
    return PLATES;
  }

  /** As far filled as this (0 … 1): every plate at once, in its place or gone. */
  private place(fill: number) {
    this.broken = false;
    this.done.fill(-1);
    this.fill(fill);
  }

  /** The plates that have come so far: `fill` 0 … 1. */
  fill(fill: number) {
    if (this.broken) this.place(fill);
    let changed = false;
    for (let i = 0; i < PLATES; i++) {
      const raw = (fill * (BY_HEIGHT + BY_CHANCE + FLY_SPAN) - this.appear[i]) / FLY_SPAN;
      const k = raw <= 0 ? 0 : raw >= 1 ? 1 : raw * raw * (3 - 2 * raw);
      if (k === this.done[i]) continue;
      this.done[i] = k;
      changed = true;
      const cx = this.centre[i * 3];
      const cy = this.centre[i * 3 + 1];
      const cz = this.centre[i * 3 + 2];
      const out = 1 + FLY_OUT * (1 - k);
      for (let n = this.first[i]; n < this.first[i + 1]; n++) {
        // Shrunk to nothing at its middle, then growing as it comes home.
        this.pos[n * 3] = cx * out + (this.rest[n * 3] - cx) * k;
        this.pos[n * 3 + 1] = cy * out + (this.rest[n * 3 + 1] - cy) * k;
        this.pos[n * 3 + 2] = cz * out + (this.rest[n * 3 + 2] - cz) * k;
      }
    }
    if (changed) (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Breaking up, `k` of the way (0 … 1): out, down, each plate shrinking. */
  shatter(k: number) {
    this.broken = true;
    const out = BREAK_OUT * k;
    const fall = BREAK_FALL * k * k;
    const left = 1 - k * k;
    for (let i = 0; i < PLATES; i++) {
      // (Only those that had come.)
      const had = Math.max(0, this.done[i]);
      const cx = this.centre[i * 3];
      const cy = this.centre[i * 3 + 1];
      const cz = this.centre[i * 3 + 2];
      for (let n = this.first[i]; n < this.first[i + 1]; n++) {
        const size = left * had;
        this.pos[n * 3] = cx * (1 + out) + (this.rest[n * 3] - cx) * size;
        this.pos[n * 3 + 1] = cy * (1 + out) + (this.rest[n * 3 + 1] - cy) * size - fall;
        this.pos[n * 3 + 2] = cz * (1 + out) + (this.rest[n * 3 + 2] - cz) * size;
      }
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
  }
}
