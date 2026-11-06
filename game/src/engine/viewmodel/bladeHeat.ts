// Update 0.3.73 — the Playable Demon's heat, on its blade (the bible: "the edge glow gets brighter and longer and drips embers as heat rises"). Flames
// licking off its edges, from the guard up, further the hotter it is; embers dropping off it. In the arms' scene, additive, nothing to sort. Made
// in code. (How bright the blade itself burns: bladeTrail.ts's glow.)
import * as THREE from 'three';

const FLAMES = 16;
const EMBERS = 28;
/** How far off the blade's middle its edge is (its own metres); embers per second at full heat; how long one lasts (s), how fast it drops. */
const EDGE = 0.13;
const DRIP = 34;
const LIFE = 0.8;
const GRAVITY = 2.4;

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

export class BladeHeat {
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);
  private readonly dropGeo = new THREE.OctahedronGeometry(1, 0);
  private readonly material = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly dropMaterial = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames = new THREE.InstancedMesh(this.coneGeo, this.material, FLAMES);
  private readonly drops = new THREE.InstancedMesh(this.dropGeo, this.dropMaterial, EMBERS);
  private readonly at = Array.from({ length: EMBERS }, () => new THREE.Vector3());
  private readonly vel = Array.from({ length: EMBERS }, () => new THREE.Vector3());
  private readonly left = new Array<number>(EMBERS).fill(0);
  private due = 0;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.flames.frustumCulled = this.drops.frustumCulled = false;
    this.flames.count = this.drops.count = 0;
    scene.add(this.flames, this.drops);
  }

  /** How many flames are on it, and embers off it (for the tests). */
  get burning() {
    return this.flames.count;
  }

  get dripping() {
    return this.drops.count;
  }

  /** Each frame. `blade`: its world matrix while it's in the hand (null: it isn't); `heat`: 0 … 1; `root`, `tip`: the guard and the tip along its own y. */
  update(dt: number, blade: THREE.Matrix4 | null, heat: number, root: number, tip: number) {
    this.time += dt;
    const on = blade !== null ? heat : 0;
    const long = tip - root;
    let n = 0;
    for (let k = 0; blade && k < FLAMES && (k + 1) / FLAMES <= on + 1 / FLAMES / 2 && on > 0.02; k++) {
      pos.set(k % 2 === 0 ? EDGE : -EDGE, root + (long * (k + 0.5)) / FLAMES, 0).applyMatrix4(blade);
      const lick = 0.7 + 0.3 * Math.sin(this.time * 17 + k * 2.3);
      const s = (0.035 + 0.05 * on) * lick;
      this.flames.setMatrixAt(n++, mat.compose(pos, q.setFromAxisAngle(Y, k * 1.9), scl.set(s, (0.14 + 0.26 * on) * lick, s)));
    }
    this.flames.count = n;
    if (n > 0) this.flames.instanceMatrix.needsUpdate = true;
    this.drip(dt, blade, on, root, long);
  }

  private drip(dt: number, blade: THREE.Matrix4 | null, on: number, root: number, long: number) {
    this.due += dt * DRIP * on * on;
    let n = 0;
    for (let i = 0; i < EMBERS; i++) {
      if (this.left[i] <= 0 && this.due >= 1 && blade) {
        this.due -= 1;
        this.left[i] = LIFE * (0.6 + 0.4 * Math.random());
        this.at[i].set((Math.random() < 0.5 ? 1 : -1) * EDGE, root + long * on * Math.random(), 0).applyMatrix4(blade);
        this.vel[i].set((Math.random() - 0.5) * 0.3, -0.25 - Math.random() * 0.4, (Math.random() - 0.5) * 0.3);
      }
      if (this.left[i] <= 0) continue;
      this.left[i] -= dt;
      this.vel[i].y -= GRAVITY * dt;
      this.at[i].addScaledVector(this.vel[i], dt);
      this.drops.setMatrixAt(n++, mat.compose(this.at[i], q.identity(), scl.setScalar(0.006 + 0.012 * Math.max(0, this.left[i] / LIFE))));
    }
    // (Nothing to spend them on: they don't save up.)
    this.due = Math.min(this.due, 2);
    this.drops.count = n;
    if (n > 0) this.drops.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.flames.removeFromParent();
    this.drops.removeFromParent();
    this.flames.dispose();
    this.drops.dispose();
    this.coneGeo.dispose();
    this.dropGeo.dispose();
    this.material.dispose();
    this.dropMaterial.dispose();
  }
}
