// Update 0.1.4 — flames (the Grimoire's: the fire on your palm, a fireball's trail, its burst): a pool of soft glowing
// specks drawn as one instanced mesh of quads turned to the camera, added onto what's behind them. Each rises (or flies
// as it was thrown), slows, swells or shrinks, and cools from white-yellow through orange to a dull red before it's gone.
// Spawning reuses the oldest slot; nothing is made per frame. Its own little random (no Math.random: the same each run).
import * as THREE from 'three';

export interface FlameStyle {
  /** Lifetime range (s). */
  life: readonly [number, number];
  /** Size at birth and at death (m). */
  size: readonly [number, number];
  /** How much its speed drops each second (0..1), and its rise (m/s²). */
  drag: number;
  rise: number;
  /** Its colours as it cools: hot, warm, cool (0..1 each). */
  hot: readonly [number, number, number];
  warm: readonly [number, number, number];
  cool: readonly [number, number, number];
  /** A sideways wobble (m/s). */
  wobble: number;
}

const m = new THREE.Matrix4();
const s = new THREE.Vector3();
const p = new THREE.Vector3();
const q = new THREE.Quaternion();
const c = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
let dot: THREE.DataTexture | null = null;

/** A soft round speck, made once. */
function softDot(): THREE.DataTexture {
  if (dot) return dot;
  const n = 32;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
      const a = Math.max(0, 1 - d);
      const v = Math.round(255 * a * a);
      data.set([v, v, v, 255], (y * n + x) * 4);
    }
  dot = new THREE.DataTexture(data, n, n);
  dot.needsUpdate = true;
  return dot;
}

export class Flames {
  readonly mesh: THREE.InstancedMesh;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly scale: Float32Array;
  private next = 0;
  private seed = 1;

  constructor(
    private readonly count: number,
    private readonly style: FlameStyle,
  ) {
    const mat = new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.age = new Float32Array(count).fill(1);
    this.life = new Float32Array(count).fill(1);
    this.scale = new Float32Array(count).fill(1);
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, c.setRGB(0, 0, 0));
    }
  }

  /** 0 … 1, its own (a run of it is the same every time); and −1 … 1. */
  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  private signed(): number {
    return this.rand() * 2 - 1;
  }

  /** `n` specks at `at`, flying at `vel` give or take `spread` (m/s) every way, `big` times the size. */
  emit(n: number, at: THREE.Vector3, vel: THREE.Vector3 | null, spread: number, big = 1, jitter = 0) {
    const st = this.style;
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      this.pos[i * 3] = at.x + this.signed() * jitter;
      this.pos[i * 3 + 1] = at.y + this.signed() * jitter;
      this.pos[i * 3 + 2] = at.z + this.signed() * jitter;
      this.vel[i * 3] = (vel?.x ?? 0) + this.signed() * spread;
      this.vel[i * 3 + 1] = (vel?.y ?? 0) + this.signed() * spread;
      this.vel[i * 3 + 2] = (vel?.z ?? 0) + this.signed() * spread;
      this.age[i] = 0;
      this.life[i] = st.life[0] + this.rand() * (st.life[1] - st.life[0]);
      this.scale[i] = big * (0.75 + this.rand() * 0.5);
    }
  }

  /** Each frame: they fly, rise, cool and shrink; turned to `camera`. */
  update(dt: number, camera: THREE.Camera) {
    const st = this.style;
    camera.getWorldQuaternion(q);
    const keep = Math.max(0, 1 - st.drag * dt);
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const k = Math.min(1, this.age[i] / this.life[i]);
      if (k >= 1) {
        this.mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      const wob = Math.sin(this.age[i] * 13 + i) * st.wobble;
      this.vel[i * 3] = this.vel[i * 3] * keep + wob * dt;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * keep + st.rise * dt;
      this.vel[i * 3 + 2] = this.vel[i * 3 + 2] * keep - wob * dt * 0.7;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const size = (st.size[0] + (st.size[1] - st.size[0]) * k) * this.scale[i];
      m.compose(p.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]), q, s.set(size, size, size));
      this.mesh.setMatrixAt(i, m);
      // Hot → warm over the first half, warm → cool over the second, fading out at the end.
      const fade = 1 - k * k;
      const t = k < 0.5 ? lerp3(st.hot, st.warm, k * 2) : lerp3(st.warm, st.cool, k * 2 - 1);
      c.setRGB(t[0], t[1], t[2]);
      this.mesh.setColorAt(i, c.multiplyScalar(fade));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear() {
    this.age.fill(1);
    this.life.fill(1);
    for (let i = 0; i < this.count; i++) this.mesh.setMatrixAt(i, HIDDEN);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const out: [number, number, number] = [0, 0, 0];
function lerp3(a: readonly [number, number, number], b: readonly [number, number, number], k: number): [number, number, number] {
  out[0] = a[0] + (b[0] - a[0]) * k;
  out[1] = a[1] + (b[1] - a[1]) * k;
  out[2] = a[2] + (b[2] - a[2]) * k;
  return out;
}

/** The Grimoire's fire, and its embers (small, long-lived, drifting up). */
export const FIRE: FlameStyle = { life: [0.22, 0.42], size: [0.05, 0.012], drag: 2, rise: 0.7, hot: [1, 0.95, 0.7], warm: [1, 0.5, 0.08], cool: [0.55, 0.06, 0.02], wobble: 0.5 };
export const EMBERS: FlameStyle = { life: [0.5, 1], size: [0.012, 0.004], drag: 0.8, rise: 0.4, hot: [1, 0.9, 0.5], warm: [1, 0.55, 0.12], cool: [0.7, 0.15, 0.02], wobble: 1.2 };
