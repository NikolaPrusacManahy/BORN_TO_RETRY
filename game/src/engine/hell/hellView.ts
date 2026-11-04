// Update 0.3.43 — what floor 10, Hell, draws of its own (depthsView.ts holds it): its sky (hellSky.ts); its chains on
// the walls (world/dungeon/hell.ts lays them out), iron links one through the next, a ring in the wall at each hook;
// its braziers' iron, a bowl on three legs (the fire in each is the kit's), a glow round each fire; and the clock the
// lava in its stone breathes by (cracks.ts). Made in code; each room's chains one mesh, so a room out of view isn't
// drawn.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { BRAZIER, Chain } from '../../world/dungeon/hell';
import { styleOf } from '../../world/dungeon/styles';
import { HELL } from '../../tuning/hell';
import { HALOS } from '../halos';
import { crackGlow, crackTime } from './cracks';
import { HellSky } from './hellSky';

/** A link: its ring's radius and the iron's thickness (m), stretched this much along the chain; links this far apart
 *  (m); a wall ring this much bigger. */
const LINK_R = 0.11;
const LINK_T = 0.03;
const LINK_LONG = 1.5;
const STEP = 0.245;
const RING = 1.5;
const IRON = 0x1e1a18;
/** The glow round a brazier's fire: its height, size (m), colour. */
const FIRE_Y = 1.85;
const FIRE_GLOW = 3.2;
const FIRE_HEX = 0xff8a3a;

const m = new THREE.Matrix4();
const X = new THREE.Vector3();
const Y = new THREE.Vector3();
const Z = new THREE.Vector3();
const p = new THREE.Vector3();
const out = new THREE.Vector3();

/** Where along chain `c` it is at `t` (0: its first hook, 1: its last), into `to`: a sag the shape a hung chain
 *  takes (near enough). */
export function chainAt(c: Chain, t: number, to: THREE.Vector3): THREE.Vector3 {
  to.set(c.ax + (c.bx - c.ax) * t, c.ay + (c.by - c.ay) * t, c.az + (c.bz - c.az) * t);
  to.y -= c.sag * 4 * t * (1 - t);
  return to;
}

/** Every link of chain `c`: its middle, the way along it, whether it's a wall ring (its ends). (Its own vectors: what
 *  `each` does with the module's doesn't move the links.) */
const la = new THREE.Vector3();
const lb = new THREE.Vector3();
const lend = new THREE.Vector3();
const lway = new THREE.Vector3();
export function linksOf(c: Chain, each: (at: THREE.Vector3, along: THREE.Vector3, ring: boolean, i: number) => void) {
  // Walk the curve finely, a link every STEP of its length (placed between the samples it falls between).
  const N = 96;
  let since = 0;
  let i = 0;
  chainAt(c, 0, la);
  chainAt(c, 1, lend);
  each(la, lway.copy(chainAt(c, 0.01, lb)).sub(la).normalize(), true, i++);
  let done = false;
  for (let k = 1; k <= N && !done; k++) {
    chainAt(c, k / N, lb);
    let d = lb.distanceTo(la);
    while (d > 0 && since + d >= STEP) {
      la.lerp(lb, (STEP - since) / d);
      since = 0;
      d = lb.distanceTo(la);
      if (la.distanceTo(lend) < STEP * 0.6) {
        done = true;
        break;
      }
      each(la, lway.copy(lb).sub(la).normalize(), false, i++);
    }
    since += d;
    la.copy(lb);
  }
  // (A straight chain ends in a bigger link, hanging; a swag in the wall's other ring.)
  each(lend, lway.copy(lend).sub(chainAt(c, 0.99, lb)).normalize(), true, i++);
}

/** A brazier's iron: a bowl on three legs splayed out to a ring on the floor (`S`: its bowl's size, 1 at 1 m across). */
const S = 1.3;
function brazierGeometry(): THREE.BufferGeometry {
  const top = BRAZIER.bowl;
  const bowl = new THREE.LatheGeometry(
    [
      [0.08, -0.34],
      [0.3, -0.3],
      [0.44, -0.16],
      [0.5, 0],
      [0.46, 0.02],
      [0.4, -0.12],
      [0.06, -0.26],
    ].map(([r, y]) => new THREE.Vector2(r * S, top + y * S)),
    10,
  );
  const parts: THREE.BufferGeometry[] = [bowl.toNonIndexed()];
  for (let k = 0; k < 3; k++) {
    const turn = (k / 3) * Math.PI * 2;
    const foot = new THREE.Vector3(Math.cos(turn) * 0.42 * S, 0, Math.sin(turn) * 0.42 * S);
    const head = new THREE.Vector3(Math.cos(turn) * 0.2 * S, top - 0.3 * S, Math.sin(turn) * 0.2 * S);
    const len = foot.distanceTo(head);
    const leg = new THREE.BoxGeometry(0.08, len, 0.08).toNonIndexed();
    leg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), head.clone().sub(foot).normalize()));
    leg.translate((foot.x + head.x) / 2, (foot.y + head.y) / 2, (foot.z + head.z) / 2);
    parts.push(leg);
  }
  const ring = new THREE.TorusGeometry(0.42 * S, 0.03, 4, 12).rotateX(Math.PI / 2).translate(0, 0.03, 0).toNonIndexed();
  parts.push(ring);
  const g = mergeGeometries(parts.map((x) => (x.deleteAttribute('uv'), x)))!;
  g.computeVertexNormals();
  for (const x of parts) x.dispose();
  bowl.dispose();
  return g;
}

export class HellView {
  readonly group = new THREE.Group();
  private readonly sky: HellSky | null;
  private readonly stuff: { dispose(): void }[] = [];
  private readonly braziers: { x: number; z: number; phase: number }[] = [];
  private time = 0;
  private linkCount = 0;

  constructor(level: DungeonLevel) {
    const look = styleOf(level.plan.level);
    this.sky = look.id === 'hell' ? new HellSky(look.haze ?? look.sky ?? 0xf2a46c) : null;
    if (!this.sky) return;
    this.group.add(this.sky.group);
    const iron = new THREE.MeshStandardMaterial({ color: IRON, roughness: 0.55, metalness: 0.25, flatShading: true });
    this.stuff.push(iron);
    // The chains: each room's one mesh.
    const link = new THREE.TorusGeometry(LINK_R, LINK_T, 3, 6);
    this.stuff.push(link);
    const byRoom = new Map<number, Chain[]>();
    for (const c of level.hell.chains) byRoom.set(c.room, [...(byRoom.get(c.room) ?? []), c]);
    let links = 0;
    for (const chains of byRoom.values()) {
      const mats: THREE.Matrix4[] = [];
      for (const c of chains) {
        out.set(c.nx, 0, c.nz);
        linksOf(c, (at, along, ring, i) => {
          // Its long way along the chain; each link turned a quarter from the last, through it.
          Y.copy(along);
          Z.copy(i % 2 ? X.crossVectors(out, Y) : out);
          Z.addScaledVector(Y, -Z.dot(Y)).normalize();
          X.crossVectors(Y, Z);
          const k = ring ? RING : 1;
          m.makeBasis(X.multiplyScalar(k), p.copy(Y).multiplyScalar(k * LINK_LONG), Z.multiplyScalar(k)).setPosition(at);
          mats.push(m.clone());
        });
      }
      const mesh = new THREE.InstancedMesh(link, iron, mats.length);
      mats.forEach((x, i) => mesh.setMatrixAt(i, x));
      mesh.computeBoundingSphere();
      mesh.castShadow = true;
      this.group.add(mesh);
      links += mats.length;
    }
    this.linkCount = links;
    // The braziers' iron.
    if (level.hell.braziers.length) {
      const geo = brazierGeometry();
      this.stuff.push(geo);
      const mesh = new THREE.InstancedMesh(geo, iron, level.hell.braziers.length);
      level.hell.braziers.forEach((br, i) => {
        mesh.setMatrixAt(i, m.makeRotationY((br.x * 3 + br.z) % 6.28).setPosition(br.x, 0, br.z));
        this.braziers.push({ x: br.x, z: br.z, phase: i * 1.7 });
      });
      mesh.computeBoundingSphere();
      mesh.castShadow = mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  /** How many links it drew (for tests). */
  get links() {
    return this.linkCount;
  }

  /** `at`: the view. */
  update(dt: number, at: THREE.Vector3) {
    if (!this.sky) return;
    this.time += dt;
    this.sky.update(dt, at);
    crackTime(this.time);
    crackGlow(HELL.v.cracks);
    const glow = HELL.v.braziers;
    if (glow <= 0) return;
    for (const br of this.braziers) {
      const flicker = 0.85 + 0.1 * Math.sin(this.time * 9 + br.phase) + 0.05 * Math.sin(this.time * 23 + br.phase * 2);
      HALOS.add(br.x, FIRE_Y, br.z, FIRE_GLOW, FIRE_HEX, glow * flicker);
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.sky?.dispose();
    for (const s of this.stuff) s.dispose();
  }
}
