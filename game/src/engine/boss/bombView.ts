// Update 0.0.21 — the Dragon's fire bombs as you see them (the designer: "the player can see where it will land"): each
// a big fireball on its arc, and on the floor where it will land a red ring as wide as its burst, filling in and
// brightening as it comes, so the last moment reads. Pooled and updated in place.
// Update 0.2.3 — a skeleton the Bone King throws is drawn by kingView.ts: here only its spot.
// Update 0.2.4 — a Lizard's poison glob: a green ball. Update 0.3.15 — the Bomber's powder bomb: a small black ball, its
// fuse spitting sparks; its ring fills over its flight and its fuse together (batted back, over its short flight).
// Update 0.3.18 — floor 8's mine: a small steel ball floating down, its light blinking red, faster as its fuse runs.
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
  spark: THREE.Mesh;
}

/** A powder bomb's size against a fireball's; its fuse's spark sits this high over it (m), this big (m). */
const POWDER = 0.4;
const FUSE = 0.24;
const SPARK = 0.13;

export class BombView {
  readonly group = new THREE.Group();
  private readonly ballGeo = new THREE.SphereGeometry(1, 16, 12);
  private readonly ringGeo = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  private readonly ballMat = new THREE.MeshStandardMaterial({ color: 0x3a0800, emissive: 0xff6a10, emissiveIntensity: 3 });
  private readonly poisonMat = new THREE.MeshStandardMaterial({ color: 0x2a5a10, emissive: 0x6aff30, emissiveIntensity: 1.6 });
  /** Update 0.2.10 — floor 5's Big Glub's bubbles. */
  private readonly bubbleMat = new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x2a9ab8, emissiveIntensity: 0.8, transparent: true, opacity: 0.6, roughness: 0.1 });
  private readonly powderMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.55, metalness: 0.3 });
  private readonly mineMat = new THREE.MeshStandardMaterial({ color: 0x4a5048, roughness: 0.4, metalness: 0.6, emissive: 0xff2010, emissiveIntensity: 0 });
  private readonly sparkMat = new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly shown: Shown[] = [];
  private readonly mats: THREE.Material[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < BOMB_POOL; i++) {
      const ringMat = additive(0xff2a10);
      const fillMat = additive(0xff6a20);
      this.mats.push(ringMat, fillMat);
      const s = { ball: new THREE.Mesh(this.ballGeo, this.ballMat), ring: new THREE.Mesh(this.ringGeo, ringMat), fill: new THREE.Mesh(this.discGeo, fillMat), spark: new THREE.Mesh(this.ballGeo, this.sparkMat) };
      s.ball.visible = s.ring.visible = s.fill.visible = s.spark.visible = false;
      this.group.add(s.ball, s.ring, s.fill, s.spark);
      this.shown.push(s);
    }
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    for (let i = 0; i < this.shown.length; i++) {
      const b = state.bombs[i];
      const s = this.shown[i];
      s.ball.visible = s.ring.visible = s.fill.visible = b.alive;
      s.spark.visible = b.alive && b.look === 'powder';
      if (!b.alive) continue;
      s.ball.visible = b.look !== 'bones' && b.look !== 'geyser';
      s.ball.material = b.look === 'poison' ? this.poisonMat : b.look === 'bubble' ? this.bubbleMat : b.look === 'powder' ? this.powderMat : b.look === 'mine' ? this.mineMat : this.ballMat;
      const powder = b.look === 'powder' || b.look === 'mine';
      // (A mine's light: blinking faster as its fuse runs out.)
      if (b.look === 'mine') this.mineMat.emissiveIntensity = Math.sin(this.time * (8 + 22 * Math.min(1, Math.max(0, (b.t - b.fall) / Math.max(0.1, b.fuse))))) > 0 ? 2.5 : 0;
      const k = Math.min(1, b.t / (b.fall + (powder ? b.fuse : 0)));
      const flicker = 0.85 + 0.15 * Math.sin(this.time * 40 + i);
      s.ball.position.copy(b.pos);
      s.ball.scale.setScalar(powder ? BALL * POWDER : BALL * flicker);
      if (powder) {
        s.spark.position.set(b.pos.x, b.pos.y + FUSE, b.pos.z);
        s.spark.scale.setScalar(SPARK * (0.6 + 0.8 * Math.abs(Math.sin(this.time * 37 + i * 1.3))));
      }
      s.ring.position.set(b.to.x, b.to.y + 0.06, b.to.z);
      s.ring.scale.setScalar(b.radius);
      (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * k;
      s.fill.position.set(b.to.x, b.to.y + 0.05, b.to.z);
      s.fill.scale.setScalar(b.radius * k);
      (s.fill.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.35 * k * k;
    }
  }

  clear() {
    for (const s of this.shown) s.ball.visible = s.ring.visible = s.fill.visible = s.spark.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.ballGeo.dispose();
    this.ringGeo.dispose();
    this.discGeo.dispose();
    this.ballMat.dispose();
    this.mineMat.dispose();
    this.poisonMat.dispose();
    this.bubbleMat.dispose();
    this.powderMat.dispose();
    this.sparkMat.dispose();
    for (const m of this.mats) m.dispose();
  }
}
