// Update 0.3.81 — Gravity Sean's gravity in the world (sim/combat/gravity.ts). Made in code, placeholders: a ring rolling out from a blast. Update 0.3.86 — his punches: punchView.ts.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { PiecesView } from './piecesView';
import { PunchView } from './punchView';
import { StopView } from './stopView';
import { UltimatesView } from './ultimatesView';

const RINGS = 18;
/** A ring's life (s), and how far over the floor it's drawn (m). */
const RING_LIFE = 0.42;
const OVER_FLOOR = 0.12;
const COOL = 0x8f83ff;
const HOT = 0xff40d8;
const FIRE = 0xffa040;
/** Update 0.3.85 — Time Stop's ring over the floor (m), and one for a target's blows landing (m). */
const STOP_RING = 45;
const POP_MIN = 1.2;
const POP_MAX = 5;

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  r: number;
}

export class GravityView {
  private readonly ringGeo = new THREE.RingGeometry(0.82, 1, 56).rotateX(-Math.PI / 2);
  private readonly rings: Ring[] = [];
  private nextRing = 0;
  private readonly pieces: PiecesView;
  private readonly ultimates: UltimatesView;
  private readonly stop: StopView;
  private readonly punches: PunchView;

  constructor(
    private readonly scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.punches = new PunchView(scene, camera);
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
      else if (e.kind === 'seanStopStart') this.ring(STOP_RING, e.x, e.y, e.z, COOL);
      else if (e.kind === 'seanStopEnd' && e.value > 0) this.ring(STOP_RING * 0.6, e.x, e.y, e.z, COOL);
      else if (e.kind === 'seanStopPop') this.ring(Math.min(POP_MAX, POP_MIN + Math.sqrt(e.value) * 0.28), e.x, Math.max(0, e.y - 1), e.z, HOT);
    }
    this.pieces.update(state, dt);
    this.ultimates.update(state, dt);
    this.stop.update(state, dt);
    this.punches.update(state, dt);
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

  dispose() {
    this.pieces.dispose();
    this.ultimates.dispose();
    this.stop.dispose();
    this.punches.dispose();
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
    }
    this.ringGeo.dispose();
  }
}
