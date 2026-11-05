// Update 0.0.18 — the Dragon's fire beam as you see it: a white-hot core inside an orange sheath from its mouth to
// where the beam stops (a wall, the floor), flickering; a blaze where it ends, and light at both ends. It shoots out
// as the beam starts and thins away as it ends.
// Update 0.0.20 (the designer: the beam needs a 1.5 s charge and a way to warn you) — while it charges, a thin red line
// shows where it will burn, brighter and flickering faster as the moment nears, and fire gathers in its mouth.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
/** Its core's and sheath's radius (m) at full. */
const CORE = 0.22;
const SHEATH = 0.6;
/** The warning line's radius (m), and the gathering fire's size at the end of the charge (m). */
const SIGHT = 0.035;
const GATHER = 0.9;

const additive = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

export class BeamView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0);
  private readonly ball = new THREE.SphereGeometry(1, 16, 12);
  private readonly core: THREE.Mesh;
  private readonly sheath: THREE.Mesh;
  private readonly blaze: THREE.Mesh;
  private readonly endLight = new THREE.PointLight(0xff7a20, 0, 16, 1.4);
  private readonly mouthLight = new THREE.PointLight(0xffa040, 0, 12, 1.4);
  private readonly sight = new THREE.Mesh(this.geo, additive(0xff2a10, 0));
  private readonly gather = new THREE.Mesh(this.ball, additive(0xffb040, 0.9));

  /** (Update 0.3.51 — its colours, for The Swarm's lasers.) */
  constructor(coreColor = 0xfff4c0, sheathColor = 0xff6a10, blazeColor = 0xffa030) {
    this.core = new THREE.Mesh(this.geo, additive(coreColor, 1));
    this.sheath = new THREE.Mesh(this.geo, additive(sheathColor, 0.55));
    this.blaze = new THREE.Mesh(this.ball, additive(blazeColor, 0.8));
    this.group.add(this.core, this.sheath, this.blaze, this.endLight, this.mouthLight, this.sight, this.gather);
    this.group.visible = false;
  }

  /** The charge, `k` of the way through (0..1): the line from `from` to `to`, the fire gathering at `from`. */
  charge(from: THREE.Vector3, to: THREE.Vector3, k: number, time: number) {
    this.group.visible = true;
    this.core.visible = this.sheath.visible = this.blaze.visible = false;
    this.sight.visible = this.gather.visible = true;
    this.endLight.intensity = 0;
    dir.subVectors(to, from);
    const len = Math.max(0.01, dir.length());
    dir.normalize();
    const blink = 0.6 + 0.4 * Math.sin(time * (10 + 30 * k));
    this.sight.position.copy(from);
    this.sight.quaternion.setFromUnitVectors(UP, dir);
    this.sight.scale.set(SIGHT * (1 + k), len, SIGHT * (1 + k));
    (this.sight.material as THREE.MeshBasicMaterial).opacity = (0.25 + 0.75 * k) * blink;
    this.gather.position.copy(from);
    this.gather.scale.setScalar(GATHER * (0.15 + 0.85 * k * k) * (0.9 + 0.1 * blink));
    this.mouthLight.position.copy(from);
    this.mouthLight.intensity = 35 * k;
  }

  /** `power`: 0 (none) to 1 (full); `out`: how far it has shot out (0..1); `time`: for the flicker. */
  update(from: THREE.Vector3, to: THREE.Vector3, power: number, out: number, time: number) {
    this.group.visible = power > 0.01;
    if (!this.group.visible) return;
    this.core.visible = this.sheath.visible = true;
    this.sight.visible = this.gather.visible = false;
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
    for (const m of [this.core, this.sheath, this.blaze, this.sight, this.gather]) (m.material as THREE.Material).dispose();
  }
}
