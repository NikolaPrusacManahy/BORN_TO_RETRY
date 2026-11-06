// Update 0.3.65 — the rocks hanging over Hellwarden's throne room in its show, each chained to the floor, its armor inside (the designer's shot list;
// sim/dungeon/wardenShow.ts): the chains snap, each rock cracks in two as its piece flies out, and the halves fall away into the dark. Made in code.
import * as THREE from 'three';
import { FLIGHT, wardenBeats } from '../../sim/dungeon/wardenShow';
import { HALOS } from '../halos';

/** Each rock, the same order as its armor (wardenForge.ts): degrees off the way to you (+: to the right as you look at it), how far (m), how high. */
const SPOTS: readonly (readonly [number, number, number])[] = [
  [-112, 15, 8.5],
  [112, 15, 8.5],
  [-70, 17, 13],
  [70, 17, 13],
  [-165, 19, 11],
  [165, 19, 16],
  [-140, 21, 20],
  [140, 21, 20],
];
/** Which clamp each rock's piece is (wardenShow.ts CLAMPS), and which lands a moment later. */
const CLAMP_OF = [0, 0, 1, 1, 2, 3, 4, 4];
const LATE = [0, 0.07, 0, 0.07, 0, 0, 0, 0.07];
const R = 2.4;
/** Its chain: links this far apart (m); where along it (from the floor) it snaps; how hard what's loose falls (m/s²). */
const STEP = 1.15;
const BREAK = 0.52;
const GRAVITY = 24;
const FALL = 2.2;

/** Rock `i`'s middle, for the middle at (mx, mz) and (ux, uz) the way to you. */
export function rockSpot(i: number, mx: number, mz: number, ux: number, uz: number, out: THREE.Vector3): THREE.Vector3 {
  const [deg, r, y] = SPOTS[i];
  const a = THREE.MathUtils.degToRad(deg);
  const f = Math.cos(a) * r;
  const s = Math.sin(a) * r;
  // (The right as you look at it: (uz, −ux).)
  return out.set(mx + ux * f + uz * s, y, mz + uz * f - ux * s);
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const axis = new THREE.Vector3();
const way = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

/** Half a rock (x ≥ 0), flat-shaded, a lit face where it split. */
function halfGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(R, 1);
  g.scale(1, 0.82, 1.08);
  const p = g.getAttribute('position');
  const keep: number[] = [];
  const colors: number[] = [];
  let s = 3301;
  const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
  for (let i = 0; i < p.count; i += 3) {
    if (p.getX(i) + p.getX(i + 1) + p.getX(i + 2) < 0) continue;
    const c = rnd() < 0.28 ? [0.32, 0.09, 0.04] : [0.07, 0.055, 0.06];
    for (let k = 0; k < 3; k++) {
      keep.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
      colors.push(c[0], c[1], c[2]);
    }
  }
  g.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.computeVertexNormals();
  return out;
}

interface Chain {
  /** Its links' resting matrices. */
  at: THREE.Vector3[];
  turn: THREE.Quaternion[];
  rock: number;
}

export class ThroneRocks {
  readonly group = new THREE.Group();
  private readonly halfGeo = halfGeometry();
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, emissive: 0xff4a10, emissiveIntensity: 0 });
  private readonly halves = new THREE.InstancedMesh(this.halfGeo, this.mat, SPOTS.length * 2);
  private readonly capGeo = new THREE.CircleGeometry(R * 0.86, 10).rotateY(-Math.PI / 2);
  private readonly capMat = new THREE.MeshBasicMaterial({ color: 0xff8a30, toneMapped: false, side: THREE.DoubleSide });
  private readonly caps = new THREE.InstancedMesh(this.capGeo, this.capMat, SPOTS.length * 2);
  private readonly linkGeo = new THREE.TorusGeometry(0.46, 0.15, 5, 8);
  private readonly linkMat = new THREE.MeshStandardMaterial({ color: 0x38343a, roughness: 0.5, flatShading: true });
  private links: THREE.InstancedMesh | null = null;
  private readonly chains: Chain[] = [];
  private readonly spots = SPOTS.map(() => new THREE.Vector3());
  private built = false;

  constructor(private readonly mx: number, private readonly mz: number) {
    this.halves.frustumCulled = this.caps.frustumCulled = false;
    this.group.add(this.halves, this.caps);
    this.group.visible = false;
  }

  /** The rocks and chains, once it's known which way you are. */
  private build(ux: number, uz: number) {
    this.built = true;
    let count = 0;
    SPOTS.forEach((_, i) => {
      rockSpot(i, this.mx, this.mz, ux, uz, this.spots[i]);
      const top = this.spots[i].clone().setY(this.spots[i].y - R * 0.7);
      // Its anchor on the floor, a little in from under it.
      const foot = new THREE.Vector3(this.mx + (top.x - this.mx) * 0.8, 0.2, this.mz + (top.z - this.mz) * 0.8);
      const long = top.distanceTo(foot);
      const n = Math.max(3, Math.round(long / STEP));
      const along = way.copy(top).sub(foot).normalize().clone();
      const c: Chain = { at: [], turn: [], rock: i };
      for (let k = 0; k < n; k++) {
        c.at.push(foot.clone().lerp(top, (k + 0.5) / n));
        // Its long way along the chain, each a quarter turn from the last.
        const t = new THREE.Quaternion().setFromUnitVectors(UP, along);
        t.multiply(q2.setFromAxisAngle(UP, (k % 2) * (Math.PI / 2)));
        c.turn.push(t);
      }
      count += n;
      this.chains.push(c);
    });
    this.links = new THREE.InstancedMesh(this.linkGeo, this.linkMat, count);
    this.links.frustumCulled = false;
    this.links.castShadow = true;
    this.group.add(this.links);
  }

  /** `t`: the show's time, stopped through its freeze frame. */
  update(on: boolean, t: number, ux: number, uz: number) {
    const s = wardenBeats();
    // (From the shot it first rises in: they'd only block the high one.)
    this.group.visible = on && t >= s.riseFrom;
    if (!this.group.visible) return;
    if (!this.built) this.build(ux, uz);
    // Something burning in them, more as the chains go.
    this.mat.emissiveIntensity = 0.05 + 0.5 * smooth((t - s.riseFrom) / (s.snapAt - s.riseFrom));
    let n = 0;
    for (let i = 0; i < SPOTS.length; i++) {
      const crack = s.clamps[CLAMP_OF[i]] + LATE[i] - FLIGHT;
      const age = Math.max(0, t - crack);
      axis.set(Math.cos(i * 1.3), 0.25 * Math.sin(i * 2.1), Math.sin(i * 1.3)).normalize();
      const sep = smooth(age / 0.25) * 2.4 + age * 1.8;
      for (const side of [-1, 1]) {
        pos.copy(this.spots[i]).addScaledVector(axis, side * sep);
        pos.y += Math.sin(t * 0.6 + i) * 0.25 - 0.5 * GRAVITY * 0.4 * age * age;
        // Half + (x ≥ 0) faces out along +axis; half − turned round.
        q.setFromUnitVectors(X, way.copy(axis).multiplyScalar(side));
        q.premultiply(q2.setFromAxisAngle(axis, side * age * 2.2));
        const gone = age > FALL;
        m.compose(pos, q, scl.setScalar(gone ? 0 : 1));
        this.halves.setMatrixAt(n, m);
        this.caps.setMatrixAt(n, m);
        n++;
      }
      if (age > 0 && age < 0.2) HALOS.add(this.spots[i].x, this.spots[i].y, this.spots[i].z, 9 * (1 - age / 0.2), 0xffb060, 0.9);
    }
    this.halves.instanceMatrix.needsUpdate = true;
    this.caps.instanceMatrix.needsUpdate = true;
    this.updateChains(t);
  }

  private updateChains(t: number) {
    if (!this.links) return;
    const s = wardenBeats();
    let n = 0;
    for (const c of this.chains) {
      const snap = s.snapAt + c.rock * 0.035;
      const age = t - snap;
      const crack = s.clamps[CLAMP_OF[c.rock]] + LATE[c.rock] - FLIGHT;
      const last = c.at.length - 1;
      for (let k = 0; k <= last; k++) {
        const share = k / Math.max(1, last);
        pos.copy(c.at[k]);
        if (age > 0) {
          if (share < BREAK) {
            // The lower part drops in a heap on its anchor.
            pos.y = Math.max(0.25 + (k % 3) * 0.14, pos.y - 0.5 * GRAVITY * age * age);
          } else {
            // The upper part hangs off its rock, swinging, till that goes.
            const hang = (1 - share) * 2.2 * Math.min(1, age * 2);
            pos.x += Math.sin(age * 5 + k) * hang;
            pos.z += Math.cos(age * 4 + k) * hang;
            const loose = Math.max(0, t - crack);
            pos.y -= 0.5 * GRAVITY * loose * loose;
          }
        }
        const under = pos.y < -1;
        m.compose(pos, c.turn[k], scl.set(under ? 0 : 1, under ? 0 : 1.5, under ? 0 : 1));
        this.links.setMatrixAt(n++, m);
      }
      if (age > 0 && age < 0.22) {
        const mid = c.at[Math.round(last * BREAK)];
        HALOS.add(mid.x, mid.y, mid.z, 3.4 * (1 - age / 0.22), 0xffe0b0, 1);
      }
    }
    this.links.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.links?.dispose();
    this.halves.dispose();
    this.caps.dispose();
    for (const g of [this.halfGeo, this.capGeo, this.linkGeo]) g.dispose();
    for (const x of [this.mat, this.capMat, this.linkMat]) x.dispose();
  }
}

export const ROCKS = SPOTS.length;
