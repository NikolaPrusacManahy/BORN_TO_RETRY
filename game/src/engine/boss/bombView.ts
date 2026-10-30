// Update 0.0.21 — the Dragon's fire bombs as you see them (the designer: "the player can see where it will land"): each
// a big fireball on its arc, and on the floor where it will land a red ring as wide as its burst, filling in and
// brightening as it comes, so the last moment reads. Pooled and updated in place.
// Update 0.2.3 — a skeleton the Bone King throws is drawn by kingView.ts: here only its spot.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { BOMB_POOL } from '../../sim/combat/bombs';

const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** The fireball's size (m). */
const BALL = 0.9;

interface Shown {
  ball: THREE.Mesh;
  ring: THREE.Mesh;
  fill: THREE.Mesh;
}

export class BombView {
  readonly group = new THREE.Group();
  private readonly ballGeo = new THREE.SphereGeometry(1, 16, 12);
  private readonly ringGeo = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  private readonly ballMat = new THREE.MeshStandardMaterial({ color: 0x3a0800, emissive: 0xff6a10, emissiveIntensity: 3 });
  private readonly shown: Shown[] = [];
  private readonly mats: THREE.Material[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < BOMB_POOL; i++) {
      const ringMat = additive(0xff2a10);
      const fillMat = additive(0xff6a20);
      this.mats.push(ringMat, fillMat);
      const s = { ball: new THREE.Mesh(this.ballGeo, this.ballMat), ring: new THREE.Mesh(this.ringGeo, ringMat), fill: new THREE.Mesh(this.discGeo, fillMat) };
      s.ball.visible = s.ring.visible = s.fill.visible = false;
      this.group.add(s.ball, s.ring, s.fill);
      this.shown.push(s);
    }
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    for (let i = 0; i < this.shown.length; i++) {
      const b = state.bombs[i];
      const s = this.shown[i];
      s.ball.visible = s.ring.visible = s.fill.visible = b.alive;
      if (!b.alive) continue;
      s.ball.visible = b.look === 'fire';
      const k = Math.min(1, b.t / b.fall);
      const flicker = 0.85 + 0.15 * Math.sin(this.time * 40 + i);
      s.ball.position.copy(b.pos);
      s.ball.scale.setScalar(BALL * flicker);
      s.ring.position.set(b.to.x, b.to.y + 0.06, b.to.z);
      s.ring.scale.setScalar(b.radius);
      (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * k;
      s.fill.position.set(b.to.x, b.to.y + 0.05, b.to.z);
      s.fill.scale.setScalar(b.radius * k);
      (s.fill.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.35 * k * k;
    }
  }

  clear() {
    for (const s of this.shown) s.ball.visible = s.ring.visible = s.fill.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.ballGeo.dispose();
    this.ringGeo.dispose();
    this.discGeo.dispose();
    this.ballMat.dispose();
    for (const m of this.mats) m.dispose();
  }
}
