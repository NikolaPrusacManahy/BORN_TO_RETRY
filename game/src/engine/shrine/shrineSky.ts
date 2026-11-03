// Update 0.3.32 — floor 8's sky, the Shrine Dimension's (MD/FLOOR8_SHRINE_PLAN.md: "far off on every side, a pagoda and
// torii stand on floating islands among the clouds"): islands of rock hanging in the sky all round, each with a green
// top and a piece of the shrine on it (a pagoda, a torii, the shrine hall, sakura), drifting up and down; banks of cloud
// under them. Round the view, out where the haze doesn't reach (as the Moon's sky is: moon/spaceSky.ts), high enough
// to be seen over the walls; tinted toward the sky, as far things are. The islands' rock is made in code; what stands
// on them is the kit's, once it's loaded.
import * as THREE from 'three';
import { auraTexture } from '../keyLooks';

/** How far out they hang (m: inside the camera's 400). */
const FAR = 300;
/** Each island: its way (yaw, degrees), how high (degrees up), its size (m across), what stands on it (kit pieces, each
 *  with where on the top: a share of its radius out, its turn) and how big they're drawn. */
const ISLANDS: readonly { yaw: number; up: number; size: number; on: readonly [string, number, number, number][]; scale: number }[] = [
  { yaw: 20, up: 16, size: 46, on: [['kit_js_Pagoda', 0, 0, 0], ['kit_mn_Tree_6', 0.6, 2.2, 0.4], ['kit_mn_Tree_2', 0.55, 4.6, 1.2]], scale: 1.9 },
  { yaw: 75, up: 22, size: 30, on: [['kit_js_Torii', 0, 0, 0.3], ['kit_mn_Tree_9', 0.6, 3.8, 2]], scale: 1.8 },
  { yaw: 135, up: 13, size: 52, on: [['kit_js_ShrineHall', 0, 0, 0.7], ['kit_mn_Tree_3', 0.7, 1.4, 0.2], ['kit_mn_Tree_5', 0.7, 4.9, 2.4], ['kit_mn_Pine_2', 0.65, 3.2, 0]], scale: 1.5 },
  { yaw: 195, up: 25, size: 26, on: [['kit_mn_Tree_10', 0, 0, 0], ['kit_js_StoneLantern', 0.5, 2, 0]], scale: 2.6 },
  { yaw: 240, up: 15, size: 40, on: [['kit_js_Pagoda', 0, 0, 0.8], ['kit_js_Torii', 0.6, 4.2, 1.6]], scale: 1.6 },
  { yaw: 300, up: 20, size: 34, on: [['kit_mn_Tree_4', 0, 0, 0], ['kit_mn_Tree_8', 0.6, 2.4, 1], ['kit_js_Hokora', 0.55, 5, 2.5]], scale: 2 },
  { yaw: 345, up: 11, size: 28, on: [['kit_js_BellTower', 0, 0, 0.4], ['kit_mn_Tree_1', 0.6, 3.3, 0]], scale: 2.2 },
];
/** Far things this much toward the sky's colour; the islands bob this far (m) this fast (rad/s). */
const AIR = 0.32;
const BOB = 3;
const BOB_SPEED = 0.25;
const CLOUDS = 14;

const dirOf = (yawDeg: number, upDeg: number) => {
  const y = THREE.MathUtils.degToRad(yawDeg);
  const u = THREE.MathUtils.degToRad(upDeg);
  return new THREE.Vector3(Math.sin(y) * Math.cos(u), Math.sin(u), -Math.cos(y) * Math.cos(u));
};

export class ShrineSky {
  readonly group = new THREE.Group();
  private readonly islands: { holder: THREE.Group; y: number; phase: number }[] = [];
  private readonly stuff: { dispose(): void }[] = [];
  private readonly sky: THREE.Color;
  private time = 0;

  /** `sky`: the sky's colour (sRGB hex), far things tinted toward it. */
  constructor(sky: number) {
    this.sky = new THREE.Color(sky);
    let seed = 2468;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    const rockMat = new THREE.MeshStandardMaterial({ color: this.far(new THREE.Color(0x8d8478)), roughness: 1, flatShading: true, fog: false });
    const topMat = new THREE.MeshStandardMaterial({ color: this.far(new THREE.Color(0x7f9c55)), roughness: 1, flatShading: true, fog: false });
    this.stuff.push(rockMat, topMat);
    ISLANDS.forEach((isl, i) => {
      // Its rock: a jagged cone hanging point down; its top a disc of grass.
      const rock = new THREE.ConeGeometry(0.5, 0.9, 9, 3).rotateX(Math.PI).translate(0, -0.45, 0);
      const p = rock.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const top = p.getY(k) > -0.01;
        p.setXYZ(k, p.getX(k) * (0.85 + 0.3 * rnd()), p.getY(k) * (top ? 1 : 0.8 + 0.4 * rnd()), p.getZ(k) * (0.85 + 0.3 * rnd()));
      }
      rock.computeVertexNormals();
      const top = new THREE.CylinderGeometry(0.5, 0.48, 0.05, 9).translate(0, 0.02, 0);
      this.stuff.push(rock, top);
      const holder = new THREE.Group();
      holder.add(new THREE.Mesh(rock, rockMat), new THREE.Mesh(top, topMat));
      holder.scale.setScalar(isl.size);
      const at = dirOf(isl.yaw, isl.up).multiplyScalar(FAR);
      holder.position.copy(at);
      holder.rotation.y = rnd() * Math.PI * 2;
      this.group.add(holder);
      this.islands.push({ holder, y: at.y, phase: i * 1.7 });
    });
    // Banks of cloud under them.
    const cloudMat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
    this.stuff.push(cloudMat);
    for (let i = 0; i < CLOUDS; i++) {
      const c = new THREE.Sprite(cloudMat);
      c.position.copy(dirOf(i * (360 / CLOUDS) + rnd() * 20, 6 + rnd() * 8)).multiplyScalar(FAR * 1.05);
      c.scale.set(90 + rnd() * 90, 26 + rnd() * 20, 1);
      this.group.add(c);
    }
    this.group.traverse((o) => (o.frustumCulled = false));
  }

  /** A colour as it looks that far off: toward the sky's. */
  private far(c: THREE.Color): THREE.Color {
    return c.lerp(this.sky, AIR);
  }

  /** The dungeon kit is loaded: what stands on each island, from it (their own materials, tinted far off, no haze;
   *  leaves cut out). */
  build(kit: THREE.Object3D) {
    const mats = new Map<THREE.Material, THREE.Material>();
    const own = (m: THREE.Material) => {
      let c = mats.get(m);
      if (!c) {
        const s = (m as THREE.MeshStandardMaterial).clone();
        s.fog = false;
        s.roughness = 1;
        s.metalness = 0;
        if (s.map) {
          s.transparent = false;
          s.alphaTest = 0.5;
          s.side = THREE.DoubleSide;
          s.color.setRGB(1, 1, 1);
        }
        this.far(s.color);
        mats.set(m, (c = s));
        this.stuff.push(s);
      }
      return c;
    };
    ISLANDS.forEach((isl, i) => {
      const holder = this.islands[i].holder;
      for (const [name, out, turn, yaw] of isl.on) {
        const src = kit.getObjectByName(name);
        if (!src) continue;
        const p = src.clone(true);
        p.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material);
            o.frustumCulled = false;
          }
        });
        // (On its top, in the island's own units: a share of its radius out at a turn; drawn at `scale` m a metre.)
        p.position.set(Math.cos(turn) * out * 0.5, 0.04, Math.sin(turn) * out * 0.5);
        p.rotation.set(0, yaw, 0);
        p.scale.setScalar(isl.scale / isl.size);
        holder.add(p);
      }
    });
  }

  /** `at`: the view (the sky stays round it). */
  update(dt: number, at: THREE.Vector3) {
    this.time += dt;
    this.group.position.copy(at);
    for (const isl of this.islands) isl.holder.position.y = isl.y + Math.sin(this.time * BOB_SPEED + isl.phase) * BOB;
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
