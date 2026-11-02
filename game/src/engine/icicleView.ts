// Update 0.3.11 — floor 7's icicles (sim/dungeon/icicles.ts): three cones of ice hanging under a wall's cap, shaking
// when you come under them, falling straight down; under one shaking or falling, its shadow grows on the floor (the
// warning). Gone once it has shattered (its shards: combatFeedback.ts). Made in code.
import * as THREE from 'three';
import type { Icicle } from '../sim/dungeon/icicles';
import { FROZEN_KNOBS } from '../tuning/frozen';

/** Each icicle's three cones: off its spot (right, along the wall… m), and how long (m). */
const CONES: readonly [number, number, number][] = [
  [0, 0, 1.0],
  [0.16, 0.05, 0.7],
  [-0.14, -0.04, 0.8],
];
const RADIUS = 0.09;
/** How hard it shakes (m), and the shadow's darkest and widest (× Icicle reach). */
const SHAKE = 0.035;
const SHADOW = 0.55;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const DOWN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export class IcicleView {
  readonly group = new THREE.Group();
  private readonly coneGeo = new THREE.ConeGeometry(RADIUS, 1, 6).translate(0, 0.5, 0);
  private readonly coneMat = new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.88, emissive: 0x3a6a88, emissiveIntensity: 0.25 });
  private readonly shadowGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private readonly shadowMat = new THREE.MeshBasicMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  private readonly cones: THREE.InstancedMesh;
  private readonly shadows: THREE.InstancedMesh;
  private readonly count: number;

  constructor(count: number) {
    this.count = count;
    this.cones = new THREE.InstancedMesh(this.coneGeo, this.coneMat, Math.max(1, count * CONES.length));
    this.shadows = new THREE.InstancedMesh(this.shadowGeo, this.shadowMat, Math.max(1, count));
    for (let i = 0; i < Math.max(1, count); i++) this.shadows.setMatrixAt(i, HIDDEN);
    this.cones.castShadow = true;
    this.cones.frustumCulled = this.shadows.frustumCulled = false;
    this.group.add(this.cones, this.shadows);
  }

  /** This frame's icicles (as many as the view was made for). */
  update(icicles: readonly Icicle[], time: number) {
    const v = FROZEN_KNOBS.v;
    for (let i = 0; i < Math.min(this.count, icicles.length); i++) {
      const ic = icicles[i];
      const gone = ic.state === 'gone';
      const jig = ic.state === 'shake' ? Math.sin(time * 70 + i) * SHAKE : 0;
      const drop = ic.state === 'fall' ? ic.y - v.icicleHeight : 0;
      CONES.forEach(([dx, dz, long], k) => {
        // (Hanging from its top: its tip at Icicle height for the longest.)
        const top = v.icicleHeight + 1.0;
        pos.set(ic.spot.x + dx + jig, top + drop, ic.spot.z + dz);
        this.cones.setMatrixAt(i * CONES.length + k, gone ? HIDDEN : m.compose(pos, q.copy(DOWN), scale.set(1, long, 1)));
      });
      // The warning: its shadow, growing as it shakes and falls.
      const k = ic.state === 'shake' ? 0.4 * Math.min(1, ic.t / v.icicleWarn) : ic.state === 'fall' ? 0.4 + 0.6 * (1 - ic.y / v.icicleHeight) : 0;
      this.shadows.setMatrixAt(i, k > 0 ? m.compose(pos.set(ic.spot.x, 0.02, ic.spot.z), q.identity(), scale.setScalar(v.icicleReach * Math.max(0.3, k))) : HIDDEN);
    }
    this.cones.instanceMatrix.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;
    this.shadowMat.opacity = SHADOW;
  }

  dispose() {
    this.group.removeFromParent();
    this.coneGeo.dispose();
    this.coneMat.dispose();
    this.shadowGeo.dispose();
    this.shadowMat.dispose();
  }
}
