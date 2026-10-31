// Update 0.2.11 — floor 6, the Sunken Grove, fully under water (the designer: "full under water … a floor that has been
// fully flooded"): the water's surface overhead seen from below (bright and rippling: the sun through it), shafts of
// sunlight slanting down through the rooms, specks drifting in the water round you, bubbles rising from the silt beds
// and out of your kicks. The caustics and the seaweed's sway are on the kit's own materials (seaShader.ts: `patch`).
// All of it made here in code (no textures from outside).
import * as THREE from 'three';
import { createRng } from '../core/rng';
import { UNDERWATER } from '../tuning/underwater';
import type { DungeonLevel, Rect } from '../world/dungeon/assemble';
import { styleOf } from '../world/dungeon/styles';
import { seaPatch, SeaUniforms } from './seaShader';

/** How many specks drift round you and how far (m, each way); bubbles at once; light shafts a room. */
const SPECKS = 700;
const SPECK_BOX = 14;
const BUBBLES = 320;
const SHAFTS = 3;
/** A kick lets out this many bubbles; a silt bed bubbles this often (s, at most); bubbles rise this fast (m/s). */
const KICK_BUBBLES = 16;
const VENT_GAP = 0.7;
const RISE = 1.4;
/** The surface reaches this far past the outermost floor (m). */
const PAST = 30;

export interface Area {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** A canvas made into a texture, pixel by pixel (`at`: rgba 0–1 for u, v in 0–1). */
function painted(w: number, h: number, at: (u: number, v: number) => [number, number, number, number]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x / w, y / h);
      const i = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) img.data[i + k] = Math.round(Math.max(0, Math.min(1, c[k])) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The surface's ripples: a net of bright lines that tiles (whole waves across the square). */
const ripple = (u: number, v: number): [number, number, number, number] => {
  const T = Math.PI * 2;
  const ridge = (a: number, b: number) => 1 - Math.abs(Math.sin(a + 0.8 * Math.sin(b)));
  const r = Math.max(ridge(u * T * 3, v * T * 2), ridge(v * T * 4 + 1.7, u * T * 3));
  const k = r ** 5;
  return [0.82 + 0.18 * k, 0.95 + 0.05 * k, 1, 0.45 + 0.55 * k];
};

export class Underwater {
  readonly group = new THREE.Group();
  readonly uniforms: SeaUniforms = { uSeaTime: { value: 0 }, uSeaCaustic: { value: 0 }, uSeaSway: { value: 1 } };
  private readonly mats: THREE.Material[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly texs: THREE.Texture[] = [];
  private readonly surfaces: THREE.MeshBasicMaterial[] = [];
  private readonly shafts: { mesh: THREE.Group; mat: THREE.MeshBasicMaterial; phase: number }[] = [];
  private readonly shaftTex = painted(32, 128, (u, v) => [1, 1, 1, Math.sin(Math.PI * u) ** 2 * (1 - v) ** 1.5]);
  private readonly speckPos = new Float32Array(SPECKS * 3);
  private readonly specks: THREE.Points;
  private readonly bubblePos = new Float32Array(BUBBLES * 3);
  private readonly bubbleRise = new Float32Array(BUBBLES);
  private readonly bubbles: THREE.Points;
  private readonly vents: { x: number; z: number; t: number }[];
  private next = 0;
  private time = 0;
  private kicks = -1;
  private readonly patched = new WeakSet<THREE.Material>();
  private readonly rng: () => number;

  /** `top`: the water's top (m); `floor`: everything there is (the surface covers it); `rooms`: where shafts fall;
   *  `vents`: the silt beds that bubble. */
  constructor(private readonly top: number, floor: Area, rooms: readonly Area[], vents: readonly { x: number; z: number }[], seed: number) {
    this.rng = createRng(seed * 7 + 6);
    this.vents = vents.filter(() => this.rng() < 0.25).map((v) => ({ ...v, t: this.rng() * VENT_GAP }));
    this.texs.push(this.shaftTex);
    this.surface(floor);
    for (const r of rooms) for (let i = 0; i < SHAFTS; i++) this.shaft(r);
    this.specks = this.points(this.speckPos, 0.06, 0xe6fff8, 0.55, (u, v) => {
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      return [1, 1, 1, Math.max(0, 1 - d) ** 2];
    });
    for (let i = 0; i < SPECKS * 3; i++) this.speckPos[i] = (this.rng() * 2 - 1) * SPECK_BOX;
    this.bubbles = this.points(this.bubblePos, 0.16, 0xf2ffff, 0.9, (u, v) => {
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const ring = Math.max(0, 1 - Math.abs(d - 0.78) * 6);
      const shine = Math.max(0, 1 - Math.hypot(u - 0.38, v - 0.36) * 9);
      return [1, 1, 1, Math.min(1, ring + shine + (d < 0.8 ? 0.12 : 0))];
    });
    this.bubblePos.fill(-1000);
  }

  /** The surface overhead: two rippling sheets drifting apart (the second adds light). */
  private surface(floor: Area) {
    const geo = new THREE.PlaneGeometry(floor.w, floor.d).rotateX(Math.PI / 2);
    this.geos.push(geo);
    for (let layer = 0; layer < 2; layer++) {
      const tex = painted(256, 256, ripple);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(floor.w / (layer ? 11 : 7), floor.d / (layer ? 11 : 7));
      this.texs.push(tex);
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xd8fbff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
      if (layer) mat.blending = THREE.AdditiveBlending;
      const sheet = new THREE.Mesh(geo, mat);
      sheet.position.set(floor.x, this.top + layer * 0.02, floor.z);
      sheet.renderOrder = -1;
      this.group.add(sheet);
      this.surfaces.push(mat);
      this.mats.push(mat);
    }
  }

  /** A shaft of sunlight somewhere in `r`: two crossed sheets from the surface to the floor, slanting with the sun. */
  private shaft(r: Area) {
    const width = 1.5 + this.rng() * 2;
    const geo = new THREE.PlaneGeometry(width, this.top * 1.1).translate(0, -this.top * 0.55, 0);
    this.geos.push(geo);
    const mat = new THREE.MeshBasicMaterial({ map: this.shaftTex, color: 0xd6fbff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.mats.push(mat);
    const mesh = new THREE.Group();
    for (let k = 0; k < 2; k++) {
      const sheet = new THREE.Mesh(geo, mat);
      sheet.rotation.y = k * (Math.PI / 2) + this.rng();
      mesh.add(sheet);
    }
    mesh.position.set(r.x + (this.rng() - 0.5) * r.w * 0.7, this.top, r.z + (this.rng() - 0.5) * r.d * 0.7);
    // (Slanting a little: the sun is high, a little to the south-west.)
    mesh.rotation.set(0.12, 0, -0.16);
    this.group.add(mesh);
    this.shafts.push({ mesh, mat, phase: this.rng() * Math.PI * 2 });
  }

  /** A cloud of points (positions in `pos`) drawn with a little painted sprite. */
  private points(pos: Float32Array, size: number, colour: number, opacity: number, sprite: (u: number, v: number) => [number, number, number, number]): THREE.Points {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const tex = painted(32, 32, sprite);
    const mat = new THREE.PointsMaterial({ size, map: tex, color: colour, transparent: true, opacity, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.geos.push(geo);
    this.texs.push(tex);
    this.mats.push(mat);
    this.group.add(pts);
    return pts;
  }

  /** The caustics on `mat` (a kit material), and the sway if it's seaweed. */
  patch(mat: THREE.Material, sway = false) {
    if (!(mat instanceof THREE.MeshStandardMaterial) || this.patched.has(mat)) return;
    this.patched.add(mat);
    seaPatch(mat, this.uniforms, sway);
  }

  /** The caustics on every lit material under `root` not given them yet (the cores, the silt, the boss room's walls). */
  patchAll(root: THREE.Object3D) {
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) this.patch(m);
    });
  }

  /** `at`: the camera; `kicks`: how many kicks so far (new ones let out bubbles there). */
  update(dt: number, at: THREE.Vector3, kicks: number) {
    const v = UNDERWATER.v;
    this.time += dt;
    this.uniforms.uSeaTime.value += dt * v.causticSpeed;
    this.uniforms.uSeaCaustic.value = v.caustics;
    this.uniforms.uSeaSway.value = v.sway;
    this.surfaces.forEach((m, i) => {
      m.opacity = v.surface * (i ? 0.5 : 0.85);
      m.map!.offset.set(this.time * (i ? -0.011 : 0.007), this.time * (i ? 0.006 : 0.009));
    });
    for (const s of this.shafts) {
      const d = Math.hypot(s.mesh.position.x - at.x, s.mesh.position.z - at.z);
      // (Faded right by you and far off: never a bright sheet in your face.)
      const near = Math.min(1, Math.max(0, (d - 2) / 4)) * Math.min(1, Math.max(0, (60 - d) / 20));
      s.mat.opacity = v.shafts * near * (0.65 + 0.35 * Math.sin(this.time * 0.35 + s.phase));
    }
    this.drift(dt, at);
    this.bubble(dt, at, kicks);
  }

  /** The specks drift slowly and stay round you (wrapped into the box about you). */
  private drift(dt: number, at: THREE.Vector3) {
    const p = this.speckPos;
    const span = SPECK_BOX * 2;
    for (let i = 0; i < SPECKS; i++) {
      const j = i * 3;
      p[j] += Math.sin(this.time * 0.3 + i) * 0.05 * dt;
      p[j + 1] -= 0.04 * dt;
      p[j + 2] += Math.cos(this.time * 0.25 + i * 1.3) * 0.05 * dt;
      for (let k = 0; k < 3; k++) {
        const c = k === 0 ? at.x : k === 1 ? at.y : at.z;
        p[j + k] = c - SPECK_BOX + ((((p[j + k] - c + SPECK_BOX) % span) + span) % span);
      }
    }
    this.specks.geometry.attributes.position.needsUpdate = true;
  }

  private emit(x: number, y: number, z: number, rise: number) {
    const j = this.next * 3;
    this.bubblePos[j] = x;
    this.bubblePos[j + 1] = y;
    this.bubblePos[j + 2] = z;
    this.bubbleRise[this.next] = rise;
    this.next = (this.next + 1) % BUBBLES;
  }

  /** Bubbles from the silt beds and your kicks, rising and wobbling, gone at the surface. */
  private bubble(dt: number, at: THREE.Vector3, kicks: number) {
    if (this.kicks >= 0) {
      for (let k = this.kicks; k < kicks; k++) {
        for (let i = 0; i < KICK_BUBBLES; i++) this.emit(at.x + (this.rng() - 0.5) * 1.4, at.y - 0.6 + this.rng() * 0.5, at.z + (this.rng() - 0.5) * 1.4, RISE * (1 + this.rng()));
      }
    }
    this.kicks = kicks;
    for (const vent of this.vents) {
      vent.t -= dt;
      if (vent.t > 0) continue;
      vent.t = VENT_GAP * (0.3 + this.rng());
      this.emit(vent.x + (this.rng() - 0.5) * 0.8, 0.1, vent.z + (this.rng() - 0.5) * 0.8, RISE * (0.7 + 0.5 * this.rng()));
    }
    const p = this.bubblePos;
    for (let i = 0; i < BUBBLES; i++) {
      const j = i * 3;
      if (p[j + 1] < -100) continue;
      p[j + 1] += this.bubbleRise[i] * dt;
      p[j] += Math.sin(this.time * 6 + i) * 0.25 * dt;
      p[j + 2] += Math.cos(this.time * 5 + i * 0.7) * 0.25 * dt;
      if (p[j + 1] > this.top) p[j + 1] = -1000;
    }
    this.bubbles.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    for (const t of this.texs) t.dispose();
  }
}

/** The water over floor `level` (null when it isn't under water): its surface over all of it and past its walls, light
 *  shafts in its rooms, bubbles from its silt beds (`beds`). */
export function underwaterOf(level: DungeonLevel, beds: readonly { x: number; z: number }[]): Underwater | null {
  const top = styleOf(level.plan.level).under;
  if (top === undefined) return null;
  const floors = level.arena.boxes.filter((b) => b.kind === 'floor');
  const all: Rect = { min: { x: Infinity, z: Infinity }, max: { x: -Infinity, z: -Infinity } };
  for (const b of floors) {
    all.min.x = Math.min(all.min.x, b.x - b.w / 2 - PAST);
    all.min.z = Math.min(all.min.z, b.z - b.d / 2 - PAST);
    all.max.x = Math.max(all.max.x, b.x + b.w / 2 + PAST);
    all.max.z = Math.max(all.max.z, b.z + b.d / 2 + PAST);
  }
  const area = (r: Rect): Area => ({ x: (r.min.x + r.max.x) / 2, z: (r.min.z + r.max.z) / 2, w: r.max.x - r.min.x, d: r.max.z - r.min.z });
  return new Underwater(top, area(all), level.rooms.map(area), beds, level.plan.seed);
}
