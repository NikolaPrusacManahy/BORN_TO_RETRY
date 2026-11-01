// Update 0.3.0 — the glow (the graphics update's fourth part; the designer: "Yes, with a setting", then "remove the
// glow on fire torches, it lags"): a soft halo round what shines (fire shots and their bursts, lava and sludge, floor
// 3's crystals and mushrooms, candles; never the torches), as one batch of quads turned to the camera, adding light,
// hidden behind walls. No second render of the scene, so it costs next to nothing. The Options' Glow: on or off.
// Each frame starts empty (begin, by the combat scene) and what shines adds itself (the shots, the dungeon's view).
import * as THREE from 'three';

const MAX = 400;
/** Halos further than this from the camera aren't drawn (m). */
const FAR = 45;

let on = true;
/** The Options' Glow setting (App.tsx sets it). */
export const setGlowOn = (b: boolean) => {
  on = b;
};

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();

/** A soft round glow, brightest in its middle (white: tinted per halo). */
function haloTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Halos {
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly tex = haloTexture();
  private readonly mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  readonly mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
  private readonly eye = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private n = 0;

  constructor() {
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  /** A new frame: none yet; they'll face `camera`. */
  begin(camera: THREE.Camera) {
    this.n = 0;
    this.mesh.count = 0;
    this.eye.copy(camera.position);
    this.turn.copy(camera.quaternion);
  }

  /** A halo `size` m across at (x, y, z), in `hex` at `strength` (0–1). */
  add(x: number, y: number, z: number, size: number, hex: number, strength = 1) {
    if (!on || this.n >= MAX) return;
    const dx = x - this.eye.x;
    const dz = z - this.eye.z;
    if (dx * dx + dz * dz > FAR * FAR) return;
    const i = this.n++;
    this.mesh.setMatrixAt(i, m.compose(pos.set(x, y, z), this.turn, scale.set(size, size, size)));
    this.mesh.setColorAt(i, color.setHex(hex).multiplyScalar(strength));
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Halos this frame (for tests). */
  get count() {
    return this.n;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}

/** The one the game draws (the combat scene puts it in its scene). */
export const HALOS = new Halos();
