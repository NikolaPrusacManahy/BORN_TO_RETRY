// Update 0.3.30 — Tidebreaker's impacts, its own (the designer: "upgrade the impact when landing, you are using the
// recycled version of every boss"): where it lands (and where its quake comes down) a flash, a crater cracked into the
// moon dust that stays a while, a cloud of dust rising slowly in the low gravity, and rock flung out that falls and
// settles; a smaller one where its smash, its boulder or its pillar hits. Its shockwaves (its quake rings) are walls
// of dust rolling out over the floor, not the bosses' band of light (boss/demonFx.ts leaves them to this). Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { auraTexture } from '../keyLooks';
import { MOON_ROCK } from '../boss/bombView';

/** A crater stays this long (s), fading over the last part; this many at once. Dust rises this long (s), this far (m);
 *  rock flies under this gravity (m/s²: the moon's, for the show) and lies this long (s). */
const CRATER_LIFE = 30;
const CRATER_FADE = 6;
const CRATERS = 6;
const DUST_LIFE = 3.2;
const DUST_RISE = 3.5;
const DUST = 48;
const ROCK_FALL = 5.5;
const ROCK_LIFE = 5;
const ROCKS = 96;
const FLASH = 0.3;
/** Its quake rings' dust wall: as high as this share of what clears it (m) where it starts, and its grey. */
const WALL_UP = 2.2;
const DUST_GREY = 0xc3c5ca;
/** How big each impact is (1: its landing's). */
const SIZE: Partial<Record<string, number>> = { tideLand: 1, tideQuake: 1.15, tideSmash: 0.45, boulderSmash: 0.5, pillarCrash: 0.65, pillarSwing: 0.4, pillarGrab: 0.35, tideRip: 0.3 };

let crackTex: THREE.DataTexture | null = null;
let wallTex: THREE.DataTexture | null = null;

/** A crater: a dark scorched middle and jagged cracks running out of it (made in code). */
function crackTexture(): THREE.DataTexture {
  if (crackTex) return crackTex;
  const n = 256;
  const a = new Float32Array(n * n);
  const put = (x: number, y: number, v: number) => {
    const i = Math.round(y) * n + Math.round(x);
    if (x >= 0 && y >= 0 && x < n && y < n) a[i] = Math.max(a[i], v);
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) a[y * n + x] = Math.max(0, 1 - Math.hypot(x - n / 2, y - n / 2) / (n * 0.2)) ** 1.5;
  // Cracks: jagged walks out from the middle, each forking once.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const crack = (x: number, y: number, ang: number, len: number, w: number) => {
    for (let s = 0; s < len; s++) {
      ang += (rnd() - 0.5) * 0.5;
      x += Math.cos(ang);
      y += Math.sin(ang);
      const k = 1 - s / len;
      for (let dx = -w; dx <= w; dx++) for (let dy = -w; dy <= w; dy++) put(x + dx, y + dy, 0.9 * k);
      if (s === Math.round(len * 0.45)) crack(x, y, ang + (rnd() > 0.5 ? 0.6 : -0.6), len * 0.45, Math.max(0, w - 1));
    }
  };
  for (let c = 0; c < 11; c++) crack(n / 2, n / 2, (c / 11) * Math.PI * 2 + rnd() * 0.4, n * (0.3 + rnd() * 0.18), 1);
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) data.set([26, 27, 30, Math.round(Math.min(1, a[i]) * 235)], i * 4);
  crackTex = new THREE.DataTexture(data, n, n);
  crackTex.needsUpdate = true;
  return crackTex;
}

/** The dust wall's: thick at the floor, thinning up. */
function wallTexture(): THREE.DataTexture {
  if (wallTex) return wallTex;
  const w = 8;
  const h = 64;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([255, 255, 255, Math.round(255 * (1 - y / (h - 1)) ** 1.6)], (y * w + x) * 4);
  wallTex = new THREE.DataTexture(data, w, h);
  wallTex.needsUpdate = true;
  return wallTex;
}

interface Crater {
  mesh: THREE.Mesh;
  t: number;
}
interface Mote {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  t: number;
  size: number;
}
interface Rock {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  turn: THREE.Euler;
  size: number;
  t: number;
}

export class TideImpacts {
  readonly group = new THREE.Group();
  private readonly flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly craterMats: THREE.MeshBasicMaterial[] = [];
  private readonly craters: Crater[] = [];
  private readonly motes: Mote[] = [];
  private readonly rocks: Rock[] = [];
  private readonly rockMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: MOON_ROCK, roughness: 1, flatShading: true }), ROCKS);
  private readonly flashMat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xe8f0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly flash = new THREE.Sprite(this.flashMat);
  private flashT = FLASH;
  private flashSize = 1;
  private readonly wallGeo = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true).translate(0, 0.5, 0);
  private readonly walls: THREE.Mesh[] = [];
  private readonly ringGeo = new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2);
  private readonly rings: THREE.Mesh[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private next = 0;

  constructor() {
    for (let i = 0; i < CRATERS; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      this.craterMats.push(mat);
      const mesh = new THREE.Mesh(this.flatGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 1;
      this.craters.push({ mesh, t: CRATER_LIFE });
      this.group.add(mesh);
    }
    for (let i = 0; i < DUST; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTexture(), color: DUST_GREY, transparent: true, depthWrite: false, opacity: 0 }));
      sprite.visible = false;
      this.motes.push({ sprite, vel: new THREE.Vector3(), t: DUST_LIFE, size: 1 });
      this.group.add(sprite);
    }
    for (let i = 0; i < ROCKS; i++) this.rocks.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), turn: new THREE.Euler(), size: 0, t: ROCK_LIFE });
    this.rockMesh.count = ROCKS;
    this.rockMesh.castShadow = true;
    this.rockMesh.frustumCulled = false;
    this.flash.visible = false;
    this.group.add(this.rockMesh, this.flash);
  }

  /** Its impacts from this frame's events, then everything on. */
  update(state: CombatState, dt: number, rng: () => number = Math.random) {
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events.at(i);
      const size = SIZE[e.kind];
      if (size && !(e.kind === 'tideQuake' && e.value <= 0)) this.hit(e.x, e.z, size, rng);
    }
    this.step(dt);
    this.shockwaves(state);
  }

  /** One impact at (x, z), `size` its landing's. */
  hit(x: number, z: number, size: number, rng: () => number = Math.random) {
    const c = this.craters[this.next++ % CRATERS];
    c.t = 0;
    c.mesh.visible = true;
    c.mesh.position.set(x, 0.03, z);
    c.mesh.rotation.y = rng() * Math.PI * 2;
    c.mesh.scale.setScalar(15 * size);
    this.flashT = 0;
    this.flashSize = 16 * size;
    this.flash.position.set(x, 0.8, z);
    const dust = Math.round(16 * size);
    for (let k = 0, n = 0; k < this.motes.length && n < dust; k++) {
      const d = this.motes[k];
      if (d.t < DUST_LIFE) continue;
      const a = rng() * Math.PI * 2;
      const r = rng() * 4 * size;
      d.t = 0;
      d.size = (2.5 + rng() * 3) * size;
      d.sprite.position.set(x + Math.cos(a) * r, 0.5, z + Math.sin(a) * r);
      d.vel.set(Math.cos(a) * (1.5 + rng() * 3) * size, (DUST_RISE / DUST_LIFE) * (0.6 + rng()), Math.sin(a) * (1.5 + rng() * 3) * size);
      d.sprite.visible = true;
      n++;
    }
    const rocks = Math.round(18 * size);
    for (let k = 0, n = 0; k < this.rocks.length && n < rocks; k++) {
      const r = this.rocks[k];
      if (r.t < ROCK_LIFE) continue;
      const a = rng() * Math.PI * 2;
      const out = (4 + rng() * 8) * Math.sqrt(size);
      r.t = 0;
      r.size = (0.18 + rng() * 0.35) * Math.max(0.6, size);
      r.pos.set(x + Math.cos(a), 0.4, z + Math.sin(a));
      r.vel.set(Math.cos(a) * out, (6 + rng() * 7) * Math.sqrt(size), Math.sin(a) * out);
      r.spin.set(rng() * 8 - 4, rng() * 8 - 4, rng() * 8 - 4);
      n++;
    }
  }

  private step(dt: number) {
    for (const c of this.craters) {
      if (c.t >= CRATER_LIFE) continue;
      c.t += dt;
      (c.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (CRATER_LIFE - c.t) / CRATER_FADE);
      c.mesh.visible = c.t < CRATER_LIFE;
    }
    for (const d of this.motes) {
      if (d.t >= DUST_LIFE) continue;
      d.t += dt;
      const k = d.t / DUST_LIFE;
      d.sprite.position.addScaledVector(d.vel, dt);
      d.vel.multiplyScalar(Math.exp(-1.2 * dt));
      d.sprite.scale.setScalar(d.size * (1 + 1.5 * k));
      d.sprite.material.opacity = 0.55 * Math.min(1, k * 6) * (1 - k);
      d.sprite.visible = d.t < DUST_LIFE;
    }
    this.rocks.forEach((r, i) => {
      if (r.t < ROCK_LIFE) {
        r.t += dt;
        r.vel.y -= ROCK_FALL * dt;
        r.pos.addScaledVector(r.vel, dt);
        if (r.pos.y < r.size * 0.6) {
          r.pos.y = r.size * 0.6;
          r.vel.set(r.vel.x * 0.45, Math.abs(r.vel.y) * 0.25, r.vel.z * 0.45);
          r.spin.multiplyScalar(0.5);
        }
        r.turn.set(r.turn.x + r.spin.x * dt, r.turn.y + r.spin.y * dt, r.turn.z + r.spin.z * dt);
      }
      const shown = r.t < ROCK_LIFE ? r.size * Math.min(1, (ROCK_LIFE - r.t) / 1.2) : 0;
      this.m.compose(r.pos, this.q.setFromEuler(r.turn), this.s.setScalar(shown));
      this.rockMesh.setMatrixAt(i, this.m);
    });
    this.rockMesh.instanceMatrix.needsUpdate = true;
    this.flash.visible = this.flashT < FLASH;
    if (this.flashT < FLASH) {
      this.flashT += dt;
      const k = Math.min(1, this.flashT / FLASH);
      this.flash.scale.setScalar(this.flashSize * (0.4 + 0.6 * k));
      this.flashMat.opacity = 0.9 * (1 - k);
    }
  }

  /** Its quake rings as walls of dust rolling out: high where they start, lower and fainter as they go. */
  private shockwaves(state: CombatState) {
    state.quakes.forEach((q, i) => {
      if (!this.walls[i]) {
        const wall = new THREE.Mesh(this.wallGeo, new THREE.MeshBasicMaterial({ map: wallTexture(), color: DUST_GREY, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
        const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 }));
        this.walls.push(wall);
        this.rings.push(ring);
        this.group.add(wall, ring);
      }
      const wall = this.walls[i];
      const ring = this.rings[i];
      wall.visible = ring.visible = q.alive && q.by === 'tidebreaker' && q.r > 0.1;
      if (!wall.visible) return;
      const fade = 1 - q.r / q.reach;
      wall.position.set(q.x, q.y, q.z);
      wall.scale.set(q.r, q.clear * WALL_UP * (0.4 + 0.6 * fade), q.r);
      (wall.material as THREE.MeshBasicMaterial).opacity = 0.7 * fade;
      ring.position.set(q.x, q.y + 0.05, q.z);
      ring.scale.setScalar(q.r);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * fade;
    });
  }

  /** What's showing now (for tests): craters, dust, rock in the air or lying. */
  get showing() {
    return { craters: this.craters.filter((c) => c.mesh.visible).length, dust: this.motes.filter((d) => d.sprite.visible).length, rocks: this.rocks.filter((r) => r.t < ROCK_LIFE).length, walls: this.walls.filter((w) => w.visible).length };
  }

  dispose() {
    this.group.removeFromParent();
    this.flatGeo.dispose();
    for (const m of this.craterMats) m.dispose();
    for (const d of this.motes) d.sprite.material.dispose();
    this.rockMesh.geometry.dispose();
    (this.rockMesh.material as THREE.Material).dispose();
    this.flashMat.dispose();
    this.wallGeo.dispose();
    this.ringGeo.dispose();
    for (const w of [...this.walls, ...this.rings]) (w.material as THREE.Material).dispose();
  }
}
