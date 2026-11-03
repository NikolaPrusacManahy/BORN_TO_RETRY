// Update 0.2.1 (the designer: "an aura around the chests that needs a key, like a gold aura, little bit") — a chest a
// key opens (not a gold chest, not the boss's) glows soft gold while it's shut: a halo round it and a pool of light on
// the floor under it, breathing slowly; it comes up with the chest and fades as the lid lifts.
// Update 0.3.27 (the designer: "challenge room chest have now a Red aura on them"; "Make Gold aura and red aura on chest
// better visually, more visible and impressive") — out of treasureFx.ts, and far bigger: a column of light rising out of
// it in slow-turning shafts, a brighter halo with a hot core, a wider pool on the floor, rings of light running out
// across the floor, and motes drifting up round it. Gold, or red for a challenge room's chest. All made in code.
import * as THREE from 'three';
import { auraTexture } from './keyLooks';

/** The two auras, each its tint and its hot core: the gold key's gold, and a challenge room's red. */
export const AURA_GOLD = 0xffc93a;
export const AURA_RED = 0xff2626;
const CORE_GOLD = 0xfff0b0;
const CORE_RED = 0xff8a6a;
/** Sizes (m): the halo and its core across, the floor pool across, the column's radius and height, the rings' reach. */
const HALO = 3.4;
const CORE = 1.4;
const POOL = 4.4;
const BEAM_R = 0.75;
const BEAM_H = 4.4;
const RING_FROM = 0.5;
const RING_TO = 2.6;
/** How strong each is at full; the rings' beat (s) and how many run at once; the column's turn (rad/s). */
const HALO_GLOW = 0.7;
const CORE_GLOW = 0.85;
const POOL_GLOW = 0.95;
const BEAM_GLOW = 0.6;
const RING_GLOW = 0.9;
const RING_BEAT = 1.8;
const RINGS = 2;
const TURN = 0.35;
/** Motes: how many, how high they rise (m), how long each takes (s), their size (m). */
const MOTES = 20;
const MOTE_UP = 3.4;
const MOTE_LIFE = 2.6;
const MOTE_SIZE = 0.18;

let beamTex: THREE.DataTexture | null = null;
let ringTex: THREE.DataTexture | null = null;

/** The column's light: bright at its foot, gone at its top, in uneven shafts round it (made in code). */
function beamTexture(): THREE.DataTexture {
  if (beamTex) return beamTex;
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    const fade = (1 - y / (n - 1)) ** 1.5;
    for (let x = 0; x < n; x++) {
      const u = (x / n) * Math.PI * 2;
      const shafts = 0.55 + 0.25 * Math.sin(u * 3) + 0.2 * Math.sin(u * 7 + 1.3);
      data.set([255, 255, 255, Math.round(255 * Math.min(1, fade * shafts))], (y * n + x) * 4);
    }
  }
  beamTex = new THREE.DataTexture(data, n, n);
  beamTex.needsUpdate = true;
  return beamTex;
}

/** A thin bright ring, soft at both edges (made in code). */
function ringTexture(): THREE.DataTexture {
  if (ringTex) return ringTex;
  const n = 128;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      const a = Math.exp(-(((r - 0.86) / 0.07) ** 2)) + 0.25 * Math.max(0, 1 - Math.abs(r - 0.7) / 0.2);
      data.set([255, 255, 255, Math.round(255 * Math.min(1, a))], (y * n + x) * 4);
    }
  }
  ringTex = new THREE.DataTexture(data, n, n);
  ringTex.needsUpdate = true;
  return ringTex;
}

const glowOf = (map: THREE.Texture, side: THREE.Side = THREE.FrontSide) =>
  new THREE.MeshBasicMaterial({ map, color: AURA_GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side });

/** A chest's aura (in the chest's own space: it rises with it). */
export class ChestAura {
  readonly group = new THREE.Group();
  private readonly halo = new THREE.SpriteMaterial({ map: auraTexture(), color: AURA_GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly core = new THREE.SpriteMaterial({ map: auraTexture(), color: CORE_GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly pool = glowOf(auraTexture());
  private readonly beam = glowOf(beamTexture(), THREE.DoubleSide);
  private readonly ringMats = Array.from({ length: RINGS }, () => glowOf(ringTexture()));
  private readonly motes = new THREE.PointsMaterial({ map: auraTexture(), color: CORE_GOLD, size: MOTE_SIZE, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly column = new THREE.CylinderGeometry(BEAM_R * 1.3, BEAM_R, BEAM_H, 32, 1, true).translate(0, BEAM_H / 2, 0);
  private readonly dots = new THREE.BufferGeometry();
  private readonly beamMesh: THREE.Mesh;
  private readonly rings: THREE.Mesh[];
  private red: boolean | null = null;

  constructor() {
    const halo = new THREE.Sprite(this.halo);
    halo.position.y = 0.6;
    halo.scale.setScalar(HALO);
    const core = new THREE.Sprite(this.core);
    core.position.y = 0.55;
    core.scale.setScalar(CORE);
    const pool = new THREE.Mesh(this.flat, this.pool);
    pool.position.y = 0.02;
    pool.scale.set(POOL, 1, POOL);
    this.beamMesh = new THREE.Mesh(this.column, this.beam);
    this.rings = this.ringMats.map((m) => {
      const ring = new THREE.Mesh(this.flat, m);
      ring.position.y = 0.04;
      return ring;
    });
    this.dots.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    this.dots.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    // (They move every frame: a fixed bound round where they can be.)
    this.dots.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, MOTE_UP / 2, 0), MOTE_UP);
    const motes = new THREE.Points(this.dots, this.motes);
    // The halo and core last: drawn over the column.
    this.group.add(pool, ...this.rings, this.beamMesh, motes, halo, core);
    // A glow casts no shadow (TreasureView gives every other mesh one).
    this.group.traverse((o) => (o.userData.noShadow = true));
    this.group.visible = false;
  }

  /** `k`: how strong (0: none, 1: full); `time` for its breathing; `red`: a challenge room's. */
  set(k: number, time: number, red = false) {
    this.group.visible = k > 0;
    if (k <= 0) return;
    if (red !== this.red) {
      this.red = red;
      const tint = red ? AURA_RED : AURA_GOLD;
      for (const m of [this.halo, this.pool, this.beam, ...this.ringMats]) m.color.setHex(tint);
      this.core.color.setHex(red ? CORE_RED : CORE_GOLD);
      this.motes.color.setHex(red ? CORE_RED : CORE_GOLD);
    }
    const b = k * (0.85 + 0.15 * Math.sin(time * 2.2));
    this.halo.opacity = HALO_GLOW * b;
    this.core.opacity = CORE_GLOW * k * (0.75 + 0.25 * Math.sin(time * 4.4));
    this.pool.opacity = POOL_GLOW * b;
    this.beam.opacity = BEAM_GLOW * b;
    this.beamMesh.rotation.y = time * TURN;
    // The rings: each runs out from the chest across the floor, fading as it goes; the next follows half a beat on.
    this.rings.forEach((ring, i) => {
      const p = (time / RING_BEAT + i / RINGS) % 1;
      ring.scale.setScalar(2 * (RING_FROM + (RING_TO - RING_FROM) * p));
      this.ringMats[i].opacity = RING_GLOW * k * (1 - p) ** 1.5;
    });
    // The motes: each rises round the chest on its own turn, brightest halfway up.
    const pos = this.dots.attributes.position as THREE.BufferAttribute;
    const col = this.dots.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i++) {
      const life = (time / MOTE_LIFE + i / MOTES) % 1;
      const a = i * 2.39996 + life * 1.6;
      const r = (0.35 + 0.55 * ((i * 0.618) % 1)) * (1 - 0.35 * life);
      pos.setXYZ(i, Math.cos(a) * r, 0.1 + life * MOTE_UP, Math.sin(a) * r);
      const lit = k * Math.sin(life * Math.PI);
      col.setXYZ(i, lit, lit, lit);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  dispose() {
    for (const m of [this.halo, this.core, this.pool, this.beam, this.motes, ...this.ringMats]) m.dispose();
    this.flat.dispose();
    this.column.dispose();
    this.dots.dispose();
  }
}
