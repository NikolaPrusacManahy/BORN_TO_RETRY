// Update 0.2.4 — the Pistol's shots in the world: each bullet a bright streak racing from the muzzle you see (its spot
// on screen carried from the arms' camera into the world's) to where it ended, a flash of light round you, and a hole
// where it hit a wall, fading after a while. (The sparks, the arms and the sounds are the feedback's.)
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import type { Viewmodel } from './viewmodel/viewmodel';

const TRACERS = 8;
const HOLES = 24;
/** A streak's speed (m/s) and longest length (m); the flash's light and how fast it fades (shares a second). */
const SPEED = 420;
const STREAK = 7;
const FLASH = { intensity: 30, distance: 9, fade: 40 };
/** A hole's size (m) and life (s); the muzzle's distance from your eye in the world (m). */
const HOLE = { size: 0.045, life: 8 };
const MUZZLE_AT = 0.7;

interface Tracer {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  len: number;
}

export class GunView {
  private readonly tracers: Tracer[] = [];
  private readonly holes: { mesh: THREE.Mesh; life: number }[] = [];
  private next = 0;
  private nextHole = 0;
  private readonly light = new THREE.PointLight(0xffb060, 0, FLASH.distance, 2);
  private readonly tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly holeMat = new THREE.MeshBasicMaterial({ color: 0x15100c, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  private readonly eye = new THREE.Vector3();
  private readonly ndc = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly geo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true).rotateX(Math.PI / 2);
  private readonly holeGeo = new THREE.CircleGeometry(1, 12);

  constructor(
    private readonly scene: THREE.Scene,
    private readonly arms: Viewmodel,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    scene.add(this.light);
    for (let i = 0; i < TRACERS; i++) {
      const mesh = new THREE.Mesh(this.geo, this.tracerMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.tracers.push({ mesh, from: new THREE.Vector3(), to: new THREE.Vector3(), t: -1, len: 0 });
    }
    for (let i = 0; i < HOLES; i++) {
      const mesh = new THREE.Mesh(this.holeGeo, this.holeMat.clone());
      mesh.visible = false;
      scene.add(mesh);
      this.holes.push({ mesh, life: 0 });
    }
  }

  /** Reads this frame's shots (before the events are cleared). */
  update(state: CombatState, dt: number) {
    const ev = state.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev.at(i);
      if (e.kind === 'gunShot') {
        this.eye.set(e.x, e.y, e.z);
        this.light.intensity = FLASH.intensity;
      } else if (e.kind === 'gunTrace') this.shot(e.x, e.y, e.z, e.value === 0);
    }
    this.light.intensity = Math.max(0, this.light.intensity - FLASH.intensity * FLASH.fade * dt);
    this.camera.getWorldDirection(this.dir);
    this.light.position.copy(this.camera.position).addScaledVector(this.dir, 0.8);
    for (const t of this.tracers) {
      if (t.t < 0) continue;
      t.t += dt;
      const total = t.from.distanceTo(t.to);
      const head = Math.min(total, t.t * SPEED);
      const tail = Math.max(0, head - t.len);
      t.mesh.visible = tail < total;
      if (!t.mesh.visible) {
        t.t = -1;
        continue;
      }
      this.dir.subVectors(t.to, t.from).divideScalar(Math.max(total, 1e-6));
      this.mid.copy(t.from).addScaledVector(this.dir, (head + tail) / 2);
      t.mesh.position.copy(this.mid);
      t.mesh.lookAt(t.to);
      t.mesh.scale.set(1, 1, Math.max(0.01, head - tail));
    }
    for (const h of this.holes) {
      if (h.life <= 0) continue;
      h.life -= dt;
      (h.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, h.life);
      h.mesh.visible = h.life > 0;
    }
  }

  /** A bullet from the muzzle you see to (x, y, z); a hole there if it hit a wall. */
  private shot(x: number, y: number, z: number, wall: boolean) {
    const t = this.tracers[this.next];
    this.next = (this.next + 1) % TRACERS;
    t.to.set(x, y, z);
    if (this.arms.gun.muzzleNdc(this.arms.camera, this.ndc)) {
      this.ndc.z = 0.5;
      this.ndc.unproject(this.camera);
      t.from.copy(this.camera.position).add(this.ndc.sub(this.camera.position).normalize().multiplyScalar(MUZZLE_AT));
    } else t.from.copy(this.eye);
    t.len = Math.min(STREAK, t.from.distanceTo(t.to) * 0.5);
    t.t = 0;
    if (!wall) return;
    const h = this.holes[this.nextHole];
    this.nextHole = (this.nextHole + 1) % HOLES;
    // Facing back along the shot, a hair off the wall.
    this.dir.subVectors(t.from, t.to).normalize();
    h.mesh.position.copy(t.to).addScaledVector(this.dir, 0.01);
    h.mesh.lookAt(t.from);
    h.mesh.scale.setScalar(HOLE.size * (0.8 + Math.random() * 0.4));
    h.mesh.visible = true;
    h.life = HOLE.life;
  }

  clear() {
    for (const t of this.tracers) {
      t.t = -1;
      t.mesh.visible = false;
    }
    for (const h of this.holes) {
      h.life = 0;
      h.mesh.visible = false;
    }
    this.light.intensity = 0;
  }

  dispose() {
    this.clear();
    for (const t of this.tracers) this.scene.remove(t.mesh);
    for (const h of this.holes) {
      this.scene.remove(h.mesh);
      (h.mesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.light);
    this.geo.dispose();
    this.holeGeo.dispose();
    this.tracerMat.dispose();
    this.holeMat.dispose();
  }
}
