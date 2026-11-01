// Update 0.3.1 (the designer: "the dashes and sliding to be intense and fast and very adrenaline like") — speed lines:
// thin streaks flowing out past the edges of your view, the faster you go the stronger (a slide some, a dash all of
// them), fading as you slow. They ride with the camera, drawn over the world (under your hands). Made in code. Fewer on
// Effects: low.
import * as THREE from 'three';
import { DASH, MOVE } from '../tuning/movement';
import { effectsShare } from './effectsLevel';

const LINES = 44;
/** How far in front of the eye they're drawn (m), the ring they flow out through (m, at that distance), a streak's size
 *  (m), and how fast they come and go (1/s). */
const OUT = 0.6;
const INNER = 0.32;
const OUTER = 0.75;
const LONG = 0.16;
const THIN = 0.0035;
const RISE = 12;
const FALL = 4;

interface Line {
  mesh: THREE.Mesh;
  angle: number;
  r: number;
  speed: number;
}

export class SpeedLines {
  private readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly lines: Line[] = [];
  /** How strong they are now (0–1). */
  private rush = 0;

  constructor(
    scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    for (let i = 0; i < LINES; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mat);
      mesh.renderOrder = 10;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.lines.push({ mesh, angle: Math.random() * Math.PI * 2, r: INNER + Math.random() * (OUTER - INNER), speed: 0.8 + Math.random() * 0.8 });
    }
    this.group.visible = false;
    scene.add(this.group);
  }

  /** `speed`: how fast you're going across the floor (m/s); `dt`: real time. */
  update(speed: number, dt: number) {
    const from = MOVE.v.runSpeed * 1.15;
    const want = Math.max(0, Math.min(1, (speed - from) / Math.max(1, DASH.v.speed - from)));
    this.rush += (want - this.rush) * Math.min(1, (want > this.rush ? RISE : FALL) * dt);
    this.group.visible = this.rush > 0.02;
    if (!this.group.visible) return;
    this.group.position.copy(this.camera.position);
    this.group.quaternion.copy(this.camera.quaternion);
    this.mat.opacity = 0.55 * this.rush;
    const shown = Math.round(LINES * effectsShare(0.5));
    this.lines.forEach((l, i) => {
      l.mesh.visible = i < shown;
      // Out from the middle, and round again.
      l.r += l.speed * (0.4 + this.rush) * dt;
      if (l.r > OUTER) {
        l.r = INNER;
        l.angle = Math.random() * Math.PI * 2;
      }
      const c = Math.cos(l.angle);
      const s = Math.sin(l.angle);
      l.mesh.position.set(c * l.r, s * l.r, -OUT);
      l.mesh.rotation.set(0, 0, l.angle - Math.PI / 2);
      l.mesh.scale.set(THIN, LONG * (0.5 + this.rush), 1);
    });
  }

  /** How strong they are (for tests). */
  get strength() {
    return this.rush;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
