// Update 0.3.71 — the Playable Demon's blade burning a trail through the air as it swings (the designer: "swing animation needs
// premium treatment"): a ribbon from the real blade's own path, sampled each frame and smoothed between (at 60 fps a strike
// is six frames), brightest out towards the tip, gone a moment later. And the blade itself flares through the strike. It's
// always in the arms' scene (nothing to compile the first time you swing), drawn with no samples till then. Additive, its
// colour fading to nothing: no sorting, no alpha.
import * as THREE from 'three';
import { DEMON } from '../../tuning/demon';

/** Most samples kept; smoothed into so many pieces between each two; rows across the blade. */
const SAMPLES = 24;
const SUB = 3;
const ROWS = 3;
/** How long a piece of it burns (s), and over how many of its oldest samples it fades in. */
const LIFE = 0.17;
const TAIL = 3;
/** Rows, as a share of the way from the guard to the tip, and how bright each. */
const ROW_AT = [0.3, 0.8, 1] as const;
const ROW_GAIN = [0, 0.8, 0.45] as const;
/** The trail's fire: hot, going to a deep orange as it dies (linear: as they'd look, on the screen, 255 170 80 and 255 80 15). */
const HOT = new THREE.Color(1, 0.4, 0.08);
const DYING = new THREE.Color(1, 0.08, 0.005);

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();
const d = new THREE.Vector3();
const p = new THREE.Vector3();
const col = new THREE.Color();

/** Catmull-Rom between `q1` and `q2`, `u` (0 … 1) of the way. */
function curve(q0: THREE.Vector3, q1: THREE.Vector3, q2: THREE.Vector3, q3: THREE.Vector3, u: number, out: THREE.Vector3) {
  const u2 = u * u;
  const u3 = u2 * u;
  out.set(0, 0, 0).addScaledVector(q0, -u3 + 2 * u2 - u).addScaledVector(q1, 3 * u3 - 5 * u2 + 2).addScaledVector(q2, -3 * u3 + 4 * u2 + u).addScaledVector(q3, u3 - u2);
  return out.multiplyScalar(0.5);
}

export class BladeTrail {
  readonly mesh: THREE.Mesh;
  /** From the guard to the tip along the blade's own y (its model's metres). */
  private root = 0.3;
  private tip = 2.5;
  /** Newest first: each sample's points, one per row, and its age (s). */
  private readonly points: THREE.Vector3[][] = Array.from({ length: SAMPLES }, () => ROW_AT.map(() => new THREE.Vector3()));
  private readonly ages = new Array<number>(SAMPLES).fill(LIFE);
  private count = 0;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  /** The blade's own materials, and how bright each burns at rest. */
  private glows: { m: THREE.MeshStandardMaterial; rest: number }[] = [];

  constructor(scene: THREE.Scene) {
    const across = (SAMPLES - 1) * SUB + 1;
    const verts = across * ROWS;
    this.positions = new Float32Array(verts * 3);
    this.colors = new Float32Array(verts * 3);
    const index: number[] = [];
    for (let i = 0; i < across - 1; i++) {
      for (let r = 0; r < ROWS - 1; r++) {
        const v = i * ROWS + r;
        index.push(v, v + ROWS, v + 1, v + 1, v + ROWS, v + ROWS + 1);
      }
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.userData.trail = true;
    scene.add(this.mesh);
  }

  /** The blade it follows: how long it is, and what burns on it. */
  follow(model: THREE.Object3D) {
    let top = 0;
    this.glows = [];
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.computeBoundingBox();
      top = Math.max(top, o.geometry.boundingBox!.max.y);
      const m = o.material as THREE.MeshStandardMaterial;
      if (m.emissive) this.glows.push({ m, rest: m.emissiveIntensity });
    });
    if (top > 0) this.tip = top;
  }

  /** Pieces it's burning (for the tests). */
  get burning() {
    return this.count;
  }

  /** Each frame. `blade`: its world matrix while it's cutting the air (null: it isn't); `glow`: how hot it is (0 … 1). */
  update(dt: number, blade: THREE.Matrix4 | null, glow: number) {
    for (const g of this.glows) g.m.emissiveIntensity = g.rest * (1 + DEMON.v.flare * glow);
    for (let i = 0; i < this.count; i++) this.ages[i] += dt;
    while (this.count > 0 && this.ages[this.count - 1] >= LIFE) this.count--;
    if (blade && dt > 0) {
      const last = this.points[SAMPLES - 1];
      for (let i = SAMPLES - 1; i > 0; i--) {
        this.points[i] = this.points[i - 1];
        this.ages[i] = this.ages[i - 1];
      }
      this.points[0] = last;
      this.ages[0] = 0;
      this.count = Math.min(SAMPLES, this.count + 1);
      for (let r = 0; r < ROWS; r++) last[r].set(0, this.root + (this.tip - this.root) * ROW_AT[r], 0).applyMatrix4(blade);
    }
    this.build();
  }

  private build() {
    if (this.count < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    let v = 0;
    const put = (i: number, u: number) => {
      const age = this.ages[i] + (this.ages[i + 1] - this.ages[i]) * u;
      // (Its tail fades whatever its age: a swing's first frames are only a moment old as it lands, and it'd start with a hard edge.)
      const tail = Math.min(1, (this.count - 1 - (i + u)) / TAIL);
      const life = Math.max(0, 1 - age / LIFE) * tail;
      col.copy(DYING).lerp(HOT, life);
      for (let r = 0; r < ROWS; r++) {
        a.copy(this.points[Math.max(0, i - 1)][r]);
        b.copy(this.points[i][r]);
        c.copy(this.points[i + 1][r]);
        d.copy(this.points[Math.min(this.count - 1, i + 2)][r]);
        curve(a, b, c, d, u, p);
        const k = v * 3;
        this.positions[k] = p.x;
        this.positions[k + 1] = p.y;
        this.positions[k + 2] = p.z;
        const light = life * life * ROW_GAIN[r];
        this.colors[k] = col.r * light;
        this.colors[k + 1] = col.g * light;
        this.colors[k + 2] = col.b * light;
        v++;
      }
    };
    for (let i = 0; i < this.count - 1; i++) for (let s = 0; s < SUB; s++) put(i, s / SUB);
    put(this.count - 2, 1);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, ((this.count - 1) * SUB) * (ROWS - 1) * 6);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
