// Update 0.0.18 — the Dragon's fire beam as you see it: a white-hot core inside an orange sheath from its mouth to
// where the beam stops (a wall, the floor), flickering; a blaze where it ends, and light at both ends. It shoots out
// as the beam starts and thins away as it ends.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
/** Its core's and sheath's radius (m) at full. */
const CORE = 0.22;
const SHEATH = 0.6;

const additive = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

export class BeamView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0);
  private readonly ball = new THREE.SphereGeometry(1, 16, 12);
  private readonly core = new THREE.Mesh(this.geo, additive(0xfff4c0, 1));
  private readonly sheath = new THREE.Mesh(this.geo, additive(0xff6a10, 0.55));
  private readonly blaze = new THREE.Mesh(this.ball, additive(0xffa030, 0.8));
  private readonly endLight = new THREE.PointLight(0xff7a20, 0, 16, 1.4);
  private readonly mouthLight = new THREE.PointLight(0xffa040, 0, 12, 1.4);

  constructor() {
    this.group.add(this.core, this.sheath, this.blaze, this.endLight, this.mouthLight);
    this.group.visible = false;
  }

  /** `power`: 0 (none) to 1 (full); `out`: how far it has shot out (0..1); `time`: for the flicker. */
  update(from: THREE.Vector3, to: THREE.Vector3, power: number, out: number, time: number) {
    this.group.visible = power > 0.01;
    if (!this.group.visible) return;
    dir.subVectors(to, from);
    const len = Math.max(0.01, dir.length() * out);
    dir.normalize();
    const flicker = 0.85 + 0.15 * Math.sin(time * 53) * Math.sin(time * 31);
    for (const [m, r] of [
      [this.core, CORE],
      [this.sheath, SHEATH],
    ] as const) {
      m.position.copy(from);
      m.quaternion.setFromUnitVectors(UP, dir);
      m.scale.set(r * power * flicker, len, r * power * flicker);
    }
    this.blaze.visible = out >= 1;
    this.blaze.position.copy(to);
    this.blaze.scale.setScalar(1.1 * power * flicker);
    this.endLight.position.copy(to);
    this.endLight.intensity = out >= 1 ? 60 * power * flicker : 0;
    this.mouthLight.position.copy(from);
    this.mouthLight.intensity = 40 * power * flicker;
  }

  dispose() {
    this.geo.dispose();
    this.ball.dispose();
    for (const m of [this.core, this.sheath, this.blaze]) (m.material as THREE.Material).dispose();
  }
}
