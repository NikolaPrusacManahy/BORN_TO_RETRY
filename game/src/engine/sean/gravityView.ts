// Update 0.3.81 — Gravity Sean's gravity in the world (sim/combat/gravity.ts). Made in code, placeholders: a ring rolling out from a blast, a ripple running out along a
// Gravity Punch to where it ended.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { PiecesView } from './piecesView';
import { StopView } from './stopView';
import { UltimatesView } from './ultimatesView';

const RINGS = 18;
const RIPPLES = 8;
/** A ring's life (s), and how far over the floor it's drawn (m). */
const RING_LIFE = 0.42;
const OVER_FLOOR = 0.12;
/** A ripple's life (s), its first size and how much it grows, in m. */
const RIPPLE_LIFE = 0.2;
const RIPPLE_FROM = 0.25;
const RIPPLE_GROW = 0.9;
const COOL = 0x8f83ff;
const HOT = 0xff40d8;
const FIRE = 0xffa040;
/** Update 0.3.85 — Time Stop's ring over the floor (m), and one for a target's blows landing (m). */
const STOP_RING = 45;
const POP_MIN = 1.2;
const POP_MAX = 5;
const Z = new THREE.Vector3(0, 0, 1);

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  r: number;
}

interface Ripple {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  to: THREE.Vector3;
}

const from = new THREE.Vector3();

export class GravityView {
  private readonly ringGeo = new THREE.RingGeometry(0.82, 1, 56).rotateX(-Math.PI / 2);
  private readonly rippleGeo = new THREE.TorusGeometry(1, 0.05, 5, 32);
  private readonly rings: Ring[] = [];
  private readonly ripples: Ripple[] = [];
  private nextRing = 0;
  private nextRipple = 0;
  private readonly pieces: PiecesView;
  private readonly ultimates: UltimatesView;
  private readonly stop: StopView;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.pieces = new PiecesView(scene);
    this.ultimates = new UltimatesView(scene);
    this.stop = new StopView(scene);
    const make = (geo: THREE.BufferGeometry, side: THREE.Side) => {
      const mat = new THREE.MeshBasicMaterial({ color: COOL, transparent: true, opacity: 0, side, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      return { mesh, mat };
    };
    for (let i = 0; i < RINGS; i++) this.rings.push({ ...make(this.ringGeo, THREE.DoubleSide), t: 1, r: 1 });
    for (let i = 0; i < RIPPLES; i++) this.ripples.push({ ...make(this.rippleGeo, THREE.FrontSide), t: 1, to: new THREE.Vector3() });
  }

  /** Rings out now (for the tests). */
  get showing() {
    return this.rings.filter((r) => r.mesh.visible).length;
  }

  /** This frame's events (before they're cleared), then the moving. */
  update(state: CombatState, dt: number) {
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events.at(i);
      if (e.kind === 'seanBlast') this.ring(e.value, e.x, e.y, e.z, state.grav.unstable || e.value > 6 ? HOT : COOL);
      else if (e.kind === 'seanMeteorHit') this.ring(e.value * 1.4, e.x, e.y, e.z, FIRE);
      else if (e.kind === 'seanRipple') this.ripple(e.x, e.y, e.z);
      else if (e.kind === 'seanStopStart') this.ring(STOP_RING, e.x, e.y, e.z, COOL);
      else if (e.kind === 'seanStopEnd' && e.value > 0) this.ring(STOP_RING * 0.6, e.x, e.y, e.z, COOL);
      else if (e.kind === 'seanStopPop') this.ring(Math.min(POP_MAX, POP_MIN + Math.sqrt(e.value) * 0.28), e.x, Math.max(0, e.y - 1), e.z, HOT);
    }
    this.pieces.update(state, dt);
    this.ultimates.update(state, dt);
    this.stop.update(state, dt);
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt / RING_LIFE;
      if (r.t >= 1) {
        r.mesh.visible = false;
        continue;
      }
      const k = 1 - (1 - r.t) * (1 - r.t);
      r.mesh.scale.setScalar(Math.max(0.05, r.r * k));
      r.mat.opacity = 0.85 * (1 - r.t);
    }
    this.camera.getWorldPosition(from);
    for (const p of this.ripples) {
      if (!p.mesh.visible) continue;
      p.t += dt / RIPPLE_LIFE;
      if (p.t >= 1) {
        p.mesh.visible = false;
        continue;
      }
      // Out from in front of your eye to where it ended.
      p.mesh.position.lerpVectors(from, p.to, 0.12 + 0.88 * p.t);
      p.mesh.scale.setScalar(RIPPLE_FROM + RIPPLE_GROW * p.t);
      p.mesh.quaternion.setFromUnitVectors(Z, new THREE.Vector3().subVectors(p.to, from).normalize());
      p.mat.opacity = 0.8 * (1 - p.t * p.t);
    }
  }

  private ring(radius: number, x: number, y: number, z: number, color: number) {
    const r = this.rings[this.nextRing++ % RINGS];
    r.r = radius;
    r.t = 0;
    r.mat.color.setHex(color);
    r.mesh.position.set(x, y + OVER_FLOOR, z);
    r.mesh.scale.setScalar(0.05);
    r.mesh.visible = true;
  }

  private ripple(x: number, y: number, z: number) {
    const p = this.ripples[this.nextRipple++ % RIPPLES];
    p.t = 0;
    p.to.set(x, y, z);
    p.mesh.visible = true;
  }

  dispose() {
    this.pieces.dispose();
    this.ultimates.dispose();
    this.stop.dispose();
    for (const r of [...this.rings, ...this.ripples]) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
    }
    this.ringGeo.dispose();
    this.rippleGeo.dispose();
  }
}
