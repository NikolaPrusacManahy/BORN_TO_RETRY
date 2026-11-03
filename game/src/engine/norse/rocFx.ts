// Update 0.3.26 — what the Frost Roc shows on the floor (sim/enemies/frostRoc.ts): where its leap will land (a ring as
// wide as its landing's reach, closing in and brightening as it comes down), its frost breath (a pale-blue fan along
// its sweep, as far as it reaches) and its gust (a white fan, as wide and long as it blows, flickering with its wings).
// Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { BREATH, GUST, LEAP } from '../../sim/enemies/frostRoc';
import { FROST_ROC } from '../../tuning/frostRoc';

/** Its breath's fan, either side of where it faces (rad); its gust's (the sim's arc). */
const BREATH_HALF = 0.28;
const GUST_HALF = 1.1;

const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });

export class RocFx {
  readonly group = new THREE.Group();
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly ringMat = glow(0x9fe4ff);
  private readonly ring = new THREE.Mesh(this.ringGeo, this.ringMat);
  private readonly fanMat = glow(0xbfefff);
  private fanGeo: THREE.CircleGeometry | null = null;
  private fanHalf = 0;
  private readonly fan = new THREE.Mesh(undefined, this.fanMat);
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.ring.visible = this.fan.visible = false;
    this.group.add(this.ring, this.fan);
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    const v = FROST_ROC.v;
    const d = state.enemies.find((e) => e.alive && e.kind === 'frostRoc' && e.phase !== 'dead');
    const leaping = !!d && d.phase === 'leap' && d.move === LEAP;
    const blowing = !!d && d.phase === 'breath' && (d.move === BREATH || d.move === GUST);
    this.ring.visible = leaping;
    this.fan.visible = blowing;
    if (d && leaping) {
      const k = Math.min(1, d.t / v.leapTime);
      this.ring.position.set(d.aim.x, d.aim.y + 0.05, d.aim.z);
      this.ring.scale.setScalar(v.landReach * (1.6 - 0.6 * k));
      this.ringMat.opacity = 0.3 + 0.6 * k;
    }
    if (d && blowing) {
      const breath = d.move === BREATH;
      this.shape(breath ? BREATH_HALF : GUST_HALF);
      this.fan.position.set(d.pos.x, d.pos.y + 0.06, d.pos.z);
      // (The fan's middle along where it faces: −z turned by its facing.)
      this.fan.rotation.set(0, d.facing, 0);
      this.fan.scale.setScalar(breath ? v.breathReach : v.gustReach);
      this.fanMat.color.setHex(breath ? 0x9fe4ff : 0xf2fbff);
      this.fanMat.opacity = (breath ? 0.32 : 0.16) * (0.75 + 0.25 * Math.sin(this.time * (breath ? 18 : 30)));
    }
  }

  /** The fan's shape: a flat sector `half` either side of −z, 1 across (made again only when it changes). */
  private shape(half: number) {
    if (this.fanGeo && this.fanHalf === half) return;
    this.fanGeo?.dispose();
    // (A circle's sector from +x anticlockwise, laid flat: centred on −z.)
    this.fanGeo = new THREE.CircleGeometry(1, 32, Math.PI / 2 - half, 2 * half).rotateX(-Math.PI / 2);
    this.fanHalf = half;
    this.fan.geometry = this.fanGeo;
  }

  clear() {
    this.ring.visible = this.fan.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.fanGeo?.dispose();
    this.fanMat.dispose();
  }
}
