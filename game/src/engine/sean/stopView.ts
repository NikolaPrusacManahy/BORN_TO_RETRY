// Update 0.3.85 — Gravity Sean's Time Stop in the world (sim/combat/gravityStop.ts). Made in code, placeholders. A shell of gravity rolls out over the room from him, and comes rushing back as it ends; dust hangs dead still
// in the air while it runs, for you to walk through; and on what you've hit, a spark that grows with the blows it's holding (the enemy itself doesn't react: the designer, "they looks unfazed").
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';

const COOL = 0x8f83ff;
const SPARK = new THREE.Color(0xd9d2ff);
const DOOMED = new THREE.Color(0xff2a1a);
/** The shell: how far it rolls out (m), how long it takes (s), how long it takes to come back (s). */
const SHELL_R = 70;
const OUT_FOR = 0.7;
const BACK_FOR = 0.3;
/** The dust: how many motes, over how much room (m); how long it takes to show (s). */
const MOTES = 420;
const DUST_W = 44;
const DUST_H = 9;
const DUST_IN = 0.3;
/** A spark: at most this many, this big for no damage, and how fast it grows with it, as high as this (m). */
const SPARKS = 32;
const SPARK_MIN = 0.09;
const SPARK_GROW = 0.022;
const SPARK_MAX = 0.75;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const scl = new THREE.Vector3();

export class StopView {
  private readonly shellGeo = new THREE.SphereGeometry(1, 40, 24);
  private readonly shellMat = new THREE.MeshBasicMaterial({ color: COOL, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly shell = new THREE.Mesh(this.shellGeo, this.shellMat);
  private readonly dustGeo = new THREE.BufferGeometry();
  private readonly dustMat = new THREE.PointsMaterial({ color: 0xcfc8ff, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly dust = new THREE.Points(this.dustGeo, this.dustMat);
  private readonly sparkGeo = new THREE.IcosahedronGeometry(1, 0);
  private readonly sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly sparks = new THREE.InstancedMesh(this.sparkGeo, this.sparkMat, SPARKS);
  private readonly at = new THREE.Vector3();
  private was = false;
  /** Seconds since it ended (for the shell coming back), or −1. */
  private ended = -1;
  private time = 0;

  constructor(private readonly scene: THREE.Scene) {
    // The same dust each time: only ever where he cast it.
    const pos = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) {
      const r = (k: number) => {
        const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };
      pos[i * 3] = (r(1) - 0.5) * DUST_W;
      pos[i * 3 + 1] = r(2) * DUST_H;
      pos[i * 3 + 2] = (r(3) - 0.5) * DUST_W;
    }
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.shell.visible = this.dust.visible = this.sparks.visible = false;
    this.shell.frustumCulled = this.dust.frustumCulled = this.sparks.frustumCulled = false;
    this.sparks.count = 0;
    this.sparks.setColorAt(0, SPARK);
    scene.add(this.shell, this.dust, this.sparks);
  }

  /** (For the tests.) */
  get showing() {
    return { shell: this.shell.visible, dust: this.dust.visible, sparks: this.sparks.visible ? this.sparks.count : 0 };
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events.at(i);
      if (e.kind === 'seanStopStart' || e.kind === 'seanStopEnd') this.at.set(e.x, e.y, e.z);
    }
    const s = state.grav.stop;
    if (s && !this.was) this.dust.position.copy(this.at);
    if (!s && this.was) this.ended = 0;
    this.was = !!s;
    this.dust.visible = !!s;
    if (s) {
      this.ended = -1;
      this.dustMat.opacity = 0.75 * Math.min(1, s.t / DUST_IN);
      this.shellOut(s.t);
    } else this.shellBack(dt);
    this.mark(state);
  }

  /** As it starts: out over the room. */
  private shellOut(t: number) {
    const k = t / OUT_FOR;
    this.shell.visible = k < 1;
    if (k >= 1) return;
    this.shell.position.copy(this.at);
    this.shell.scale.setScalar(Math.max(0.5, SHELL_R * (1 - (1 - k) * (1 - k))));
    this.shellMat.opacity = 0.42 * (1 - k);
  }

  /** As it ends: back in, to him. */
  private shellBack(dt: number) {
    if (this.ended < 0) {
      this.shell.visible = false;
      return;
    }
    this.ended += dt;
    const k = this.ended / BACK_FOR;
    this.shell.visible = k < 1;
    if (k >= 1) {
      this.ended = -1;
      return;
    }
    this.shell.position.copy(this.at);
    this.shell.scale.setScalar(Math.max(0.5, SHELL_R * 0.6 * (1 - k * k)));
    this.shellMat.opacity = 0.2 + 0.5 * k;
  }

  /** The sparks on what's been hit. */
  private mark(state: CombatState) {
    const stored = state.grav.stop?.stored;
    const n = stored ? Math.min(SPARKS, stored.length) : 0;
    this.sparks.visible = n > 0;
    this.sparks.count = n;
    if (!stored || n === 0) return;
    for (let i = 0; i < n; i++) {
      const h = stored[i];
      const size = Math.min(SPARK_MAX, SPARK_MIN + SPARK_GROW * Math.sqrt(h.damage) * 2) * (1 + 0.12 * Math.sin(this.time * 17 + i));
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, this.time * 3 + i);
      this.sparks.setMatrixAt(i, m.compose(h.point, q, scl.setScalar(size)));
      // (Update 0.3.90 — red once it's enough to kill it.)
      this.sparks.setColorAt(i, h.doomed ? DOOMED : SPARK);
    }
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.shell, this.dust, this.sparks);
    this.shellGeo.dispose();
    this.shellMat.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    this.sparkGeo.dispose();
    this.sparkMat.dispose();
    this.sparks.dispose();
  }
}
