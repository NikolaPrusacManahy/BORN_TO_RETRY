// Update 0.3.0 — the air of each floor (the graphics update's fourth part): motes drifting round you, never far, each
// floor its own: dust in the light (floor 1), pollen (the Venom Garden), bone dust and a few violet sparks (the Bone
// Keep), blown sand (the desert), seeds and spores (the Drowned Temple), bubbles rising (the Sunken Grove). They live
// in a box round the camera and wrap round it as you move. None on Effects: low. Made in code. Update 0.3.11 — snow
// falling (Frozen Depths). Update 0.3.13 — embers and ash rising (The Forge). Update 0.3.14 — sea spray and sand
// blown across (Skull Cove). Update 0.3.17 — moon dust hanging, barely sinking (no air to carry it: the Moon).
// Update 0.3.32 — sakura petals (the Shrine Dimension; the designer: "loads of sakura leaves"): flat, tumbling,
// drifting down on the wind in gusts, far more of them.
import * as THREE from 'three';
import type { StyleId } from '../world/dungeon/styles';
import { effectsShare } from './effectsLevel';

const MOTES = 260;
/** The box round the camera they drift in (m: across, and up from the floor). */
const SPAN = 36;
const HIGH = 11;

interface MoteLook {
  colors: number[];
  /** Size (m), drift (m/s: a wind across, a rise or fall), and a wander. */
  size: number;
  wind: [number, number, number];
  wander: number;
  /** Update 0.3.32 — petals (flat, tumbling, in gusts), this many. */
  petals?: number;
}

const LOOKS: Record<StyleId, MoteLook> = {
  brick: { colors: [0xfff4dc], size: 0.035, wind: [0.15, -0.03, 0.05], wander: 0.25 },
  stone: { colors: [0xf0ecf4], size: 0.035, wind: [0.1, -0.02, 0.08], wander: 0.2 },
  venom: { colors: [0xf2f08a, 0xd8f2a0, 0xffffff], size: 0.045, wind: [0.25, 0.02, 0.1], wander: 0.45 },
  bone: { colors: [0xf4efe6, 0xf4efe6, 0xc49cff], size: 0.035, wind: [0.08, -0.04, 0.05], wander: 0.2 },
  sand: { colors: [0xf2d49a, 0xe6c27e], size: 0.03, wind: [2.2, 0, 0.6], wander: 0.6 },
  drowned: { colors: [0xe8f0d8, 0xc8e0b0], size: 0.04, wind: [0.2, 0.05, 0.1], wander: 0.35 },
  sunken: { colors: [0xe0fbff, 0xbff0ff], size: 0.06, wind: [0.05, 0.7, 0.03], wander: 0.3 },
  frozen: { colors: [0xffffff, 0xf2f8ff, 0xe4f1ff], size: 0.06, wind: [0.35, -1.1, 0.15], wander: 0.35 },
  forge: { colors: [0xffb24a, 0xff7a24, 0xffd890, 0x9a8f88], size: 0.04, wind: [0.2, 0.8, 0.1], wander: 0.5 },
  cove: { colors: [0xffffff, 0xf4ecd6, 0xe0f4ff], size: 0.035, wind: [0.9, 0.05, 0.4], wander: 0.4 },
  moon: { colors: [0xe6e8ee, 0xcfd3dc], size: 0.03, wind: [0.02, -0.06, 0.02], wander: 0.08 },
  shrine: { colors: [0xffc3d6, 0xffd9e4, 0xf7a8c2, 0xffeef3], size: 0.075, wind: [0.8, -0.55, 0.35], wander: 0.7, petals: 900 },
};

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();
const turn = new THREE.Euler();

const wrap = (v: number, mid: number, span: number) => mid + ((((v - mid + span / 2) % span) + span) % span) - span / 2;

export class MotesView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly count: number;
  private readonly mesh: THREE.InstancedMesh;
  private readonly at: THREE.Vector3[] = [];
  private readonly phase: number[] = [];
  private readonly look: MoteLook;
  private time = 0;

  constructor(style: StyleId) {
    this.look = LOOKS[style];
    const petals = this.look.petals;
    this.count = petals ?? MOTES;
    // (A petal: a little oval, both sides.)
    this.geo = petals ? new THREE.CircleGeometry(1, 6).scale(1, 0.62, 1) : new THREE.OctahedronGeometry(1, 0);
    this.mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: petals ? 0.92 : 0.75, depthWrite: false, side: petals ? THREE.DoubleSide : THREE.FrontSide });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.count);
    for (let i = 0; i < this.count; i++) {
      this.at.push(new THREE.Vector3((Math.random() - 0.5) * SPAN, Math.random() * HIGH, (Math.random() - 0.5) * SPAN));
      this.phase.push(Math.random() * Math.PI * 2);
      this.mesh.setColorAt(i, color.setHex(this.look.colors[i % this.look.colors.length]));
    }
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  /** `at`: the camera. */
  update(dt: number, at: THREE.Vector3) {
    this.time += dt;
    const k = this.look;
    const shown = Math.round(this.count * effectsShare(0));
    // (Petals come in gusts.)
    const gust = k.petals ? 0.55 + 0.45 * Math.max(0, Math.sin(this.time * 0.35)) + 0.25 * Math.sin(this.time * 1.3) : 1;
    for (let i = 0; i < this.count; i++) {
      if (i >= shown) {
        this.mesh.setMatrixAt(i, m.makeScale(0, 0, 0));
        continue;
      }
      const p = this.at[i];
      const w = this.phase[i];
      p.x += (k.wind[0] * gust + Math.sin(this.time * 0.7 + w) * k.wander) * dt;
      p.y += (k.wind[1] + Math.sin(this.time * 0.9 + w * 2) * k.wander * 0.3) * dt;
      p.z += (k.wind[2] * gust + Math.cos(this.time * 0.6 + w) * k.wander) * dt;
      // Round you, wrapping.
      p.x = wrap(p.x, at.x, SPAN);
      p.z = wrap(p.z, at.z, SPAN);
      p.y = ((p.y % HIGH) + HIGH) % HIGH;
      const twinkle = 0.75 + 0.25 * Math.sin(this.time * 3 + w * 5);
      if (k.petals) q.setFromEuler(turn.set(this.time * (1.3 + (w % 1)) + w, this.time * 0.9 + w * 2, this.time * 0.6 + w * 3));
      this.mesh.setMatrixAt(i, m.compose(pos.copy(p), q, scale.setScalar(k.size * (k.petals ? 1 : twinkle))));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Motes showing (for tests). */
  shown() {
    return Math.round(this.count * effectsShare(0));
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
