// Update 0.3.17 — what floor 8, the Moon, draws of its own (depthsView.ts holds it): its sky (spaceSky.ts); its craters,
// each a dish pressed into the dust with a low rim round it (world/dungeon/moon.ts lays them out); its meteors
// (sim/dungeon/meteors.ts): a rock glowing as it comes down out of the sky on a slant, its shadow growing where it'll
// strike, then a scorch mark left on the dust. Made in code (the meteor's rock a lumpy ball, its trail a cone).
import * as THREE from 'three';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { styleOf } from '../../world/dungeon/styles';
import { MARKS, Meteors } from '../../sim/dungeon/meteors';
import { MOON } from '../../tuning/moon';
import { SpaceSky } from './spaceSky';

/** A crater's rim: its profile (share of the half-width out, height in m at a 4 m crater) as a lathe turns it. */
const RIM: readonly [number, number][] = [
  [0.7, -0.02],
  [0.86, 0.12],
  [0.96, 0.22],
  [1.06, 0.12],
  [1.2, -0.02],
];
/** At most this many meteors falling at once; where they come from (the way back up their path, and how far: m); a
 *  meteor's size and its trail's length (m). */
const FALLING = 6;
const FROM = new THREE.Vector3(0.55, 1, -0.35).normalize();
const HIGH = 70;
const ROCK = 0.8;
const TRAIL = 6;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const TRAIL_TURN = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), FROM);

export class MoonView {
  readonly group = new THREE.Group();
  private readonly sky: SpaceSky | null;
  private readonly stuff: { dispose(): void }[] = [];
  private readonly rocks: THREE.InstancedMesh;
  private readonly trails: THREE.InstancedMesh;
  private readonly shadows: THREE.InstancedMesh;
  private readonly marks: THREE.InstancedMesh;

  constructor(level: DungeonLevel) {
    const look = styleOf(level.plan.level);
    this.sky = look.space ? new SpaceSky() : null;
    if (this.sky) this.group.add(this.sky.group);
    // The craters: a dark dish and a rim of dust round it.
    const dust = new THREE.Color(look.sand ?? 0xc7c8cc);
    const rimGeo = new THREE.LatheGeometry(RIM.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    const rimMat = new THREE.MeshStandardMaterial({ color: dust.clone().multiplyScalar(1.04), roughness: 1 });
    const dishGeo = new THREE.CircleGeometry(0.9, 28).rotateX(-Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: dust.clone().multiplyScalar(0.8), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
    this.stuff.push(rimGeo, rimMat, dishGeo, dishMat);
    const craters = level.moon.craters;
    if (craters.length) {
      const rims = new THREE.InstancedMesh(rimGeo, rimMat, craters.length);
      const dishes = new THREE.InstancedMesh(dishGeo, dishMat, craters.length);
      craters.forEach((c, i) => {
        const big = Math.min(c.w, c.d) / 4;
        rims.setMatrixAt(i, m.compose(pos.set(c.x, 0, c.z), q.identity(), scale.set(c.w / 2, Math.min(2, big), c.d / 2)));
        dishes.setMatrixAt(i, m.compose(pos.set(c.x, 0.015, c.z), q.identity(), scale.set(c.w / 2, 1, c.d / 2)));
      });
      rims.receiveShadow = dishes.receiveShadow = true;
      rims.castShadow = true;
      this.group.add(rims, dishes);
    }
    // The meteors: a glowing rock, its trail, its shadow; their marks.
    const rockGeo = new THREE.IcosahedronGeometry(ROCK, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 1, emissive: 0xff7a2a, emissiveIntensity: 1.6 });
    const trailGeo = new THREE.ConeGeometry(ROCK * 0.9, 1, 8, 1, true).translate(0, 0.5, 0);
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xffb46a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const shadowGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1c1e24, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0x3a3b40, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.stuff.push(rockGeo, rockMat, trailGeo, trailMat, shadowGeo, shadowMat, markMat);
    this.rocks = new THREE.InstancedMesh(rockGeo, rockMat, FALLING);
    this.trails = new THREE.InstancedMesh(trailGeo, trailMat, FALLING);
    this.shadows = new THREE.InstancedMesh(shadowGeo, shadowMat, FALLING);
    this.marks = new THREE.InstancedMesh(shadowGeo, markMat, MARKS);
    for (const im of [this.rocks, this.trails, this.shadows, this.marks]) {
      for (let i = 0; i < im.count; i++) im.setMatrixAt(i, HIDDEN);
      im.frustumCulled = false;
    }
    if (level.plan.rooms.some((r) => r.layout.template.meteors)) this.group.add(this.rocks, this.trails, this.shadows, this.marks);
  }

  /** The dungeon kit is loaded. */
  build(kit: THREE.Object3D) {
    this.sky?.build(kit);
  }

  /** `at`: the view. */
  update(dt: number, meteors: Meteors, at: THREE.Vector3) {
    this.sky?.update(dt, at);
    const v = MOON.v;
    for (let i = 0; i < FALLING; i++) {
      const f = meteors.falling[i];
      if (!f) {
        this.rocks.setMatrixAt(i, HIDDEN);
        this.trails.setMatrixAt(i, HIDDEN);
        this.shadows.setMatrixAt(i, HIDDEN);
        continue;
      }
      const k = Math.min(1, f.t / v.meteorWarn);
      // Down its slant, faster as it comes; its shadow darker and wider.
      const up = HIGH * (1 - k * k);
      pos.set(f.x, 0, f.z).addScaledVector(FROM, up);
      this.rocks.setMatrixAt(i, m.compose(pos, q.identity(), scale.setScalar(1)));
      this.trails.setMatrixAt(i, m.compose(pos, TRAIL_TURN, scale.set(1, TRAIL * (0.4 + k), 1)));
      const r = v.meteorReach * (0.3 + 0.7 * k);
      this.shadows.setMatrixAt(i, m.compose(pos.set(f.x, 0.03, f.z), q.identity(), scale.set(r, 1, r)));
    }
    for (let i = 0; i < MARKS; i++) {
      const mk = meteors.marks[i];
      this.marks.setMatrixAt(i, mk ? m.compose(pos.set(mk.x, 0.02, mk.z), q.identity(), scale.set(1.5, 1, 1.5)) : HIDDEN);
    }
    this.rocks.instanceMatrix.needsUpdate = this.trails.instanceMatrix.needsUpdate = this.shadows.instanceMatrix.needsUpdate = this.marks.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.sky?.dispose();
    for (const s of this.stuff) s.dispose();
  }
}
