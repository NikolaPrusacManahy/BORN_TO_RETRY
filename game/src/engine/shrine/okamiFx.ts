// Update 0.3.34 — what Yokai : Okami carries besides its body (MD/FLOOR8_SHRINE_PLAN.md; the designer: "maybe adding
// flames and that white fur might help, the red markings"; the look test it agreed): a mane of fire from its shoulders
// down its spine, fire at its tail's tip, flames licking round its paws, its eyes burning; a shimenawa (two strands of
// straw, twisted) round its neck on its mane with two shide (paper zigzags) hanging from it in front; its tail swaying
// (the library has no tail: its clips leave it still). Each tongue of fire flickers, stretching and swaying. All of it
// rides its bones (set where it rests in its bind pose: the model's own space), so every clip carries it. Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';

/** A tongue's rings and sides; how fast it flickers (rad/s) and how much (its length's share), how far it sways (rad);
 *  its tail's sway (rad) and speed. */
const RINGS = 9;
const SIDES = 7;
const FLICKER = [7, 11] as const;
const STRETCH = 0.22;
const SWAY = 0.16;
const TAIL_SWAY = 0.16;
const TAIL_SPEED = 1.7;
/** Its fire's colours, root to tip (the tip black: unseen, as its blending adds). */
const RAMP: readonly [number, THREE.Color][] = [
  [0, new THREE.Color(1, 0.72, 0.22)],
  [0.3, new THREE.Color(1, 0.36, 0.04)],
  [0.65, new THREE.Color(0.85, 0.11, 0.02)],
  [1, new THREE.Color(0, 0, 0)],
];

interface Tongue {
  obj: THREE.Mesh;
  base: THREE.Matrix4;
  phase: number;
}

interface Dress {
  tongues: Tongue[];
  tail: { bone: THREE.Bone; rest: THREE.Quaternion }[];
}

/** A tongue of fire along +y (1 long), bending an S toward +z, thinning to its tip; its colours run root to tip. */
function tongueGeo(bend: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const k = RAMP.findIndex(([at]) => at >= t);
    const [a0, c0] = RAMP[Math.max(0, k - 1)];
    const [a1, c1] = RAMP[Math.max(0, k)];
    c.copy(c0).lerp(c1, a1 > a0 ? (t - a0) / (a1 - a0) : 0);
    const w = (1 - t) ** 0.8 * (0.55 + 0.45 * Math.sin(Math.min(1, t * 3) * (Math.PI / 2)));
    const z = bend * Math.sin(t * Math.PI * 1.3);
    for (let s = 0; s < SIDES; s++) {
      const a = (s / SIDES) * Math.PI * 2;
      pos.push(Math.cos(a) * w, t, z + Math.sin(a) * w * 0.55);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let s = 0; s < SIDES; s++) {
      const a = i * SIDES + s;
      const b = i * SIDES + ((s + 1) % SIDES);
      idx.push(a, b, b + SIDES, a, b + SIDES, a + SIDES);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const s3 = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);

export class OkamiFx {
  private readonly dressed = new WeakMap<THREE.Object3D, Dress>();
  private readonly geos = [tongueGeo(0.18), tongueGeo(-0.14), tongueGeo(0.3)];
  private readonly fire = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly straw = new THREE.MeshStandardMaterial({ color: 0xbca064, roughness: 0.9 });
  private readonly paper = new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: 0.8, side: THREE.DoubleSide });
  private readonly stuff: { dispose(): void }[] = [...this.geos, this.fire, this.straw, this.paper];
  private time = 0;

  update(state: CombatState, rootOf: (i: number) => THREE.Object3D | null, dt: number) {
    this.time += dt;
    state.enemies.forEach((e, i) => {
      if (!e.alive || e.kind !== 'okami') return;
      const root = rootOf(i);
      if (!root) return;
      let dress = this.dressed.get(root);
      if (!dress) {
        dress = this.dress(root);
        this.dressed.set(root, dress);
      }
      this.animate(dress);
    });
  }

  /** Its fire, its rope, its shide onto its bones; its tail's bones as they rest. */
  private dress(root: THREE.Object3D): Dress {
    const dress: Dress = { tongues: [], tail: [] };
    let skinned: THREE.SkinnedMesh | null = null;
    root.traverse((o) => {
      if (!skinned && o instanceof THREE.SkinnedMesh) skinned = o;
    });
    if (!skinned) return dress;
    const mesh: THREE.SkinnedMesh = skinned;
    const bones = mesh.skeleton.bones;
    const index = (name: string) => bones.findIndex((b) => b.name === name);
    const toMesh = mesh.bindMatrix.clone().invert();
    /** A joint where it rests (the model's own space). */
    const joint = (name: string) => {
      const i = index(name);
      return i < 0 ? new THREE.Vector3() : new THREE.Vector3().setFromMatrixPosition(m.copy(mesh.skeleton.boneInverses[i]).invert().premultiply(toMesh));
    };
    /** `local` (the model's own space, as it rests) onto bone `name`. */
    const onto = (name: string, obj: THREE.Object3D, local: THREE.Matrix4) => {
      const i = index(name);
      if (i < 0) return;
      obj.matrixAutoUpdate = false;
      obj.matrix.copy(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix).multiply(local);
      obj.frustumCulled = false;
      bones[i].add(obj);
    };
    let n = 0;
    const tongue = (bone: string, at: THREE.Vector3, rise: THREE.Vector3, toward: THREE.Vector3, length: number, width: number) => {
      const y = rise.clone().normalize();
      const zz = toward.clone().sub(v.copy(y).multiplyScalar(toward.dot(y))).normalize();
      const x = new THREE.Vector3().crossVectors(y, zz);
      const base = new THREE.Matrix4().makeBasis(x.multiplyScalar(width), y.multiplyScalar(length), zz.multiplyScalar(width)).setPosition(at);
      const obj = new THREE.Mesh(this.geos[n % this.geos.length], this.fire);
      obj.renderOrder = 3;
      onto(bone, obj, base);
      dress.tongues.push({ obj, base: obj.matrix.clone(), phase: n * 1.37 });
      n++;
    };
    // Its fire mane: from its shoulders down its spine, rising and streaming back (its back: −z as it rests).
    const spine = ['neck_01', 'spine_03', 'spine_02', 'spine_01', 'pelvis'];
    for (let k = 0; k < spine.length - 1; k++) {
      const a = joint(spine[k]);
      const b = joint(spine[k + 1]);
      for (let j = 0; j < 3; j++) {
        const at = a.clone().lerp(b, j / 3).add(new THREE.Vector3(0, 0.05, -0.2));
        const size = 0.55 - 0.035 * (k * 3 + j);
        for (const sd of [-1, 1]) tongue(spine[k], at.clone().add(new THREE.Vector3(sd * 0.06, 0, 0)), new THREE.Vector3(sd * 0.3, 0.8, -0.95), new THREE.Vector3(sd * 0.3, 0.4, -1), size * (0.8 + 0.2 * ((k * 3 + j + sd + 2) % 3)), 0.075);
        tongue(spine[k], at, new THREE.Vector3(0, 0.85, -1), new THREE.Vector3(0, 0.3, -1), size * 1.2, 0.085);
      }
    }
    // Its tail's tip.
    const t5 = joint('Tail_5');
    const t6 = joint('Tail_6');
    const tip = t6.clone().add(t6.clone().sub(t5));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      tongue('Tail_6', tip.clone().add(new THREE.Vector3(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04)), new THREE.Vector3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3 - 0.3), new THREE.Vector3(Math.cos(a), 0.1, Math.sin(a)), 0.42 - 0.04 * k, 0.06);
    }
    // Its paws.
    for (const sd of ['l', 'r']) {
      const f = joint(`ball_${sd}`);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        tongue(`foot_${sd}`, f.clone().add(new THREE.Vector3(Math.cos(a) * 0.1, 0.02, Math.sin(a) * 0.12)), new THREE.Vector3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 0.22 + 0.05 * (k % 2), 0.045);
      }
    }
    // Its eyes burning, a wisp back from each.
    for (const sd of [-1, 1]) tongue('Head', new THREE.Vector3(0.075 * sd, 1.71, 0.72), new THREE.Vector3(sd * 0.25, 0.5, -1), new THREE.Vector3(0, 1, 0), 0.16, 0.025);
    this.rope(mesh, joint, onto);
    // Its tail as it rests, to sway from.
    for (let k = 1; k <= 6; k++) {
      const b = bones[index(`Tail_${k}`)];
      if (b) dress.tail.push({ bone: b, rest: b.quaternion.clone() });
    }
    return dress;
  }

  /** Its shimenawa round its neck (on its mane: as wide as the body there) and its two shide hanging in front. */
  private rope(mesh: THREE.SkinnedMesh, joint: (n: string) => THREE.Vector3, onto: (n: string, o: THREE.Object3D, l: THREE.Matrix4) => void) {
    const neck = joint('neck_01');
    const centre = neck.clone().lerp(joint('spine_03'), 0.5);
    const axis = joint('Head').sub(neck).normalize().add(new THREE.Vector3(0, 1.2, 0)).normalize();
    // (Its body there: the vertices about the rope's ring, the most of them inside it.)
    const p = mesh.geometry.attributes.position;
    const near: number[] = [];
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k).sub(centre);
      const along = v.dot(axis);
      if (Math.abs(along) < 0.06) near.push(v.addScaledVector(axis, -along).length());
    }
    near.sort((a, b) => a - b);
    const radius = (near[Math.floor(near.length * 0.9)] ?? 0.25) + 0.015;
    const u = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0)).normalize();
    const w = new THREE.Vector3().crossVectors(axis, u);
    for (let strand = 0; strand < 2; strand++) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 160; i++) {
        const th = (i / 160) * Math.PI * 2;
        const ph = th * 14 + strand * Math.PI;
        const radial = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(w, Math.sin(th));
        pts.push(centre.clone().addScaledVector(radial, radius + 0.03 * Math.cos(ph)).addScaledVector(axis, 0.03 * Math.sin(ph)));
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.034, 6, true);
      this.stuff.push(geo);
      const o = new THREE.Mesh(geo, this.straw);
      o.castShadow = true;
      onto('spine_03', o, new THREE.Matrix4());
    }
    // Two shide in front (+z as it rests), each a strip folded in four steps, a little lower and to the other side each.
    const front = new THREE.Vector3(0, 0, 1).addScaledVector(axis, -axis.z).normalize();
    const across = new THREE.Vector3().crossVectors(axis, front).normalize();
    for (const off of [-0.55, 0.55]) {
      const at = centre.clone().addScaledVector(front, Math.cos(off * 0.6) * (radius + 0.05)).addScaledVector(across, Math.sin(off * 0.6) * (radius + 0.05)).add(new THREE.Vector3(0, -0.03, 0));
      const side = across.clone().multiplyScalar(Math.cos(off)).addScaledVector(front, -Math.sin(off));
      const pos: number[] = [];
      const wdt = 0.07;
      const step = 0.1;
      for (let z = 0; z < 4; z++) {
        const x = wdt * 0.5 * (z % 2) - wdt * 0.25;
        const y0 = -z * step * 0.92;
        const out = 0.006 + 0.004 * z;
        const c = (dx: number, dy: number) => at.clone().addScaledVector(side, x + dx).add(new THREE.Vector3(0, y0 + dy, 0)).addScaledVector(front, out).toArray();
        pos.push(...c(-wdt / 2, 0), ...c(wdt / 2, 0), ...c(wdt / 2, -step), ...c(-wdt / 2, 0), ...c(wdt / 2, -step), ...c(-wdt / 2, -step));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      this.stuff.push(geo);
      onto('spine_03', new THREE.Mesh(geo, this.paper), new THREE.Matrix4());
    }
  }

  /** Each tongue flickering (stretching, swaying); its tail swaying. */
  private animate(d: Dress) {
    const t = this.time;
    for (const tg of d.tongues) {
      const k = 1 + STRETCH * (0.6 * Math.sin(t * FLICKER[0] + tg.phase) + 0.4 * Math.sin(t * FLICKER[1] + tg.phase * 2.1));
      q.setFromAxisAngle(Z, SWAY * Math.sin(t * 3.1 + tg.phase));
      tg.obj.matrix.copy(tg.base).multiply(m.compose(v.set(0, 0, 0), q, s3.set(1, k, 1)));
    }
    d.tail.forEach((b, k) => {
      q.setFromAxisAngle(Z, TAIL_SWAY * Math.sin(t * TAIL_SPEED - k * 0.5));
      b.bone.quaternion.copy(b.rest).multiply(q);
    });
  }

  dispose() {
    for (const s of this.stuff) s.dispose();
  }
}
