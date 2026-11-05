// Update 0.3.42 — The Swarm as you see it (the designer's spec MD/the-knot-3d-boss.md; the reel's look): every worm a
// tube drawn through its beads (a Catmull-Rom curve, a ring a bead, six sides (thin worms), capped at both ends, its frame carried
// along it so it never twists), all of them in one mesh rebuilt each frame from the worms' places (between their last two steps); glossy red
// flesh, a pale band behind the head. A worm winding up to lash glows, a struck one flashes white, a dead one shrinks
// away as it lies. In the middle, its eye: pale, its red iris and slit pupil turned to you, pulsing, flashing when
// struck. Gone once its body has burst.
// Update 0.3.51 — the Boss Design Bible's moves on it: its pupil a dot through its Gaze's tell, its iris on where the laser
// points; squinting and wet through its Tears' tell; cracked in three, its iris spinning, for its Split Pupil; red-hot through
// its Stare, a ring round its pupil, shrinking, to aim at. Its lasers (beamView.ts in red), its shield, its big worms
// (wormlingsView.ts). Below half its worms are brighter.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import type { Enemy } from '../../sim/enemies/enemy';
import { DEAD, DEAD_FADE, GONE, LASH, MAX_BEADS, MAX_WORMS, WINDUP, type SwarmBody } from '../../sim/enemies/swarmBody';
import { swarmWindup } from '../../sim/enemies/swarm';
import { eyeOf, FAN_LASERS, fanReach, fanYaw, GAZE, pupilNow, SPLIT, STARE, TEARS } from '../../sim/enemies/swarmMoves';
import { BeamView } from '../boss/beamView';
import { WormlingsView } from './wormlingsView';
import { swarmEyeHeight } from '../../sim/enemies/swarmHits';
import { SWARM } from '../../tuning/swarm';

/** Rings a bead (along the curve: one, for thin worms) and sides a ring. */
const SUB = 1;
const SIDES = 6;
const MAX_RINGS = (MAX_BEADS - 1) * SUB + 1;
/** A worm's vertices: its rings, then the tips that cap its head and its tail. */
const perWorm = (rings: number) => rings * SIDES + 2;
const MAX_VERTS = MAX_WORMS * perWorm(MAX_RINGS);

/** The flesh, its band, a wind-up's glow, a hit's flash, a dead worm's. */
const FLESH = new THREE.Color(0x9a2f3b);
/** Update 0.3.51 — below half. */
const FLESH_HOT = new THREE.Color(0xd8353f);
const BAND = new THREE.Color(0xc75b68);
const GLOW = new THREE.Color(0xffb24a);
const FLASH = new THREE.Color(0xffffff);
const DARK = new THREE.Color(0x3b0d16);

const p = new THREE.Vector3();
const tan = new THREE.Vector3();
const nrm = new THREE.Vector3();
const bin = new THREE.Vector3();
const col = new THREE.Color();
const ring = new Float32Array(MAX_RINGS * 4);
const look = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
/** A laser's thickness (a share of a beam's); its pupil's three in its fan, how far from its middle; a pupil's own radius. */
const LASER = 0.4;
const TRI = 0.3;
const PUPIL_R = 0.22;

/** The Swarm in play (its slot in use), if any. */
export function swarmIn(state: CombatState): Enemy | null {
  for (const e of state.enemies) if (e.alive && e.kind === 'swarm' && e.swarm?.seeded) return e;
  return null;
}

export class SwarmView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.BufferGeometry();
  private readonly pos = new Float32Array(MAX_VERTS * 3);
  private readonly nor = new Float32Array(MAX_VERTS * 3);
  private readonly rgb = new Float32Array(MAX_VERTS * 3);
  private readonly mesh: THREE.Mesh;
  private readonly eye = new THREE.Group();
  private readonly ball: THREE.Mesh;
  private readonly iris = new THREE.Group();
  private readonly ballMat = new THREE.MeshStandardMaterial({ color: 0xf0e2d2, roughness: 0.25, emissive: 0x000000 });
  private readonly pupil: THREE.Mesh;
  private readonly irisDisc: THREE.Mesh;
  private readonly tri: THREE.Mesh[] = [];
  private readonly aimRing: THREE.Mesh;
  private readonly shield: THREE.Mesh;
  private readonly lasers: BeamView[] = [];
  private readonly big = new WormlingsView();
  private hot = false;
  private shape = '';
  private time = 0;
  private flash = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.rgb, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 }));
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), this.ballMat);
    this.ball.castShadow = true;
    const irisDisc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), new THREE.MeshStandardMaterial({ color: 0xc8341f, roughness: 0.4, emissive: 0x4a0a04 }));
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), new THREE.MeshBasicMaterial({ color: 0x050203 }));
    pupil.scale.set(0.38, 1, 1);
    irisDisc.position.z = 1.0;
    pupil.position.z = 1.01;
    this.pupil = pupil;
    this.irisDisc = irisDisc;
    this.iris.add(irisDisc, pupil);
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(pupil.geometry, pupil.material);
      const a = (i / 3) * Math.PI * 2;
      dot.position.set(Math.cos(a) * TRI, Math.sin(a) * TRI, 1.012);
      dot.scale.setScalar(0.42);
      dot.visible = false;
      this.tri.push(dot);
      this.iris.add(dot);
    }
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
    this.aimRing.position.z = 1.02;
    this.aimRing.visible = false;
    this.iris.add(this.aimRing);
    this.eye.add(this.ball, this.iris);
    this.shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshBasicMaterial({ color: 0xff8aa0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    this.shield.visible = false;
    this.group.add(this.mesh, this.eye, this.shield, this.big.group);
    for (let i = 0; i < FAN_LASERS; i++) {
      const b = new BeamView(0xffe6e0, 0xff2438, 0xff5040);
      this.lasers.push(b);
      this.group.add(b.group);
    }
    this.group.visible = false;
  }

  /** `camera`: your eye (its iris turns to you); `alpha`: between the last two sim ticks. */
  update(state: CombatState, camera: THREE.Vector3, alpha: number, dt: number) {
    const e = swarmIn(state);
    this.group.visible = !!e && !(e.phase === 'dead' && e.struck);
    if (!e || !this.group.visible || !e.swarm) return;
    this.time += dt;
    const s = e.swarm;
    this.index(s);
    // Its worms step every other tick: between their last two steps.
    const k = ((s.tick & 1) + alpha) / 2;
    this.worms(s, k);
    // The eye, where it is now, its iris on you.
    const v = SWARM.v;
    const r = v.eye * (1 + 0.035 * Math.sin(this.time * 3.1));
    this.eye.position.set(e.prev.x + (e.pos.x - e.prev.x) * alpha, e.prev.y + (e.pos.y - e.prev.y) * alpha + swarmEyeHeight(), e.prev.z + (e.pos.z - e.prev.z) * alpha);
    this.eye.scale.setScalar(r);
    this.iris.lookAt(look.copy(camera));
    this.moves(e, state, dt);
    for (let i = 0; i < state.events.length; i++) if (state.events.at(i).kind === 'swarmEye') this.flash = 0.15;
    this.flash = Math.max(0, this.flash - dt);
    const red = e.phase === 'blast' ? 0.5 + 0.4 * Math.sin(this.time * 8) : 0;
    this.ballMat.emissive.setRGB(this.flash * 6 + red, this.flash * 5 + red * 0.04, this.flash * 5 + red * 0.08);
  }

  /** Update 0.3.51 — its eye as its move has it, its lasers, its shield, its big worms. */
  private moves(e: Enemy, state: CombatState, dt: number) {
    const s = e.swarm!;
    const v = SWARM.v;
    const telling = e.phase === 'windup';
    const burning = e.phase === 'breath';
    const staring = e.phase === 'blast' && e.move === STARE;
    this.hot = e.stage > 0;
    // Its pupil.
    const fan = (telling || burning) && e.move === SPLIT;
    this.pupil.visible = !fan;
    for (const d of this.tri) d.visible = fan;
    if (fan) this.iris.rotateZ(this.time * 6);
    if (telling && e.move === GAZE) {
      const k = Math.min(1, e.t / swarmWindup(e, GAZE));
      this.pupil.scale.set(0.38 + (0.2 - 0.38) * k, 1 + (0.2 - 1) * k, 1);
    } else if (burning && e.move === GAZE) this.pupil.scale.set(0.2, 0.2, 1);
    else if (staring) {
      const r = pupilNow(e) / (v.eye * PUPIL_R);
      this.pupil.scale.set(r * 0.5, r * 0.5, 1);
    } else this.pupil.scale.set(0.38, 1, 1);
    // Its aim on the laser, through its gaze.
    if (e.move === GAZE && (telling || burning)) this.iris.lookAt(look.copy(e.aim));
    // Squinting and wet, for its tears.
    if (telling && e.move === TEARS) this.eye.scale.y *= 0.72;
    // Red-hot, for its stare, a ring round its pupil to aim at.
    this.aimRing.visible = staring;
    if (staring) this.aimRing.scale.setScalar(pupilNow(e) / v.eye);
    (this.irisDisc.material as THREE.MeshStandardMaterial).emissiveIntensity = staring ? 3 : 1;
    // Its shield.
    this.shield.visible = s.shield;
    if (s.shield) {
      this.shield.position.copy(this.eye.position);
      this.shield.scale.setScalar(s.extent + 0.4);
    }
    // Its lasers.
    eyeOf(e, from);
    this.lasers.forEach((b, i) => {
      if (e.move === GAZE && i === 0 && telling) b.charge(from, e.aim, Math.min(1, e.t / swarmWindup(e, GAZE)), this.time);
      else if (e.move === GAZE && i === 0 && burning) b.update(from, e.aim, LASER, 1, this.time);
      else if (e.move === SPLIT && burning) {
        const y = fanYaw(e, i);
        const len = fanReach(e, i, state);
        b.update(from, to.set(e.pos.x - Math.sin(y) * len, 0.6, e.pos.z - Math.cos(y) * len), LASER, 1, this.time);
      } else b.update(from, from, 0, 0, this.time);
    });
    this.big.update(state.wormlings, from, dt);
  }

  /** The triangles for this many worms of this many beads (once a fight). */
  private index(s: SwarmBody) {
    const key = `${s.worms}x${s.beads}`;
    if (key === this.shape) return;
    this.shape = key;
    const rings = (s.beads - 1) * SUB + 1;
    const idx: number[] = [];
    for (let w = 0; w < s.worms; w++) {
      const o = w * perWorm(rings);
      for (let r = 0; r < rings - 1; r++)
        for (let a = 0; a < SIDES; a++) {
          const i0 = o + r * SIDES + a;
          const i1 = o + r * SIDES + ((a + 1) % SIDES);
          const i2 = i0 + SIDES;
          const i3 = i1 + SIDES;
          idx.push(i0, i2, i1, i1, i2, i3);
        }
      // Each end shut: a fan from its first ring to the head's tip, from its last to the tail's.
      const head = o + rings * SIDES;
      const last = o + (rings - 1) * SIDES;
      for (let a = 0; a < SIDES; a++) {
        const b = (a + 1) % SIDES;
        idx.push(head, o + a, o + b);
        idx.push(last + a, head + 1, last + b);
      }
    }
    this.geo.setIndex(idx);
  }

  /** Every worm's tube, `k` of the way from its beads' last places to their places now. */
  private worms(s: SwarmBody, k: number) {
    const n = s.beads;
    const rings = (n - 1) * SUB + 1;
    for (let w = 0; w < s.worms; w++) {
      const st = s.state[w];
      const base = w * perWorm(rings);
      if (st === GONE) {
        this.collapse(base, rings, s.cx, s.cy, s.cz);
        continue;
      }
      // The curve's points and radii.
      for (let r = 0; r < rings; r++) {
        const b = Math.min(n - 2, Math.floor(r / SUB));
        const t = r === rings - 1 ? 1 : (r - b * SUB) / SUB;
        catmull(s, w * n, n, b, t, k, p);
        const rad = s.r[w * n + b] + (s.r[w * n + Math.min(n - 1, b + 1)] - s.r[w * n + b]) * t;
        // Rounded ends: the head's tip and the tail's narrowing.
        const end = r === 0 ? 0.55 : r === rings - 1 ? 0.2 : r === rings - 2 ? 0.7 : 1;
        const o = r * 4;
        ring[o] = p.x;
        ring[o + 1] = p.y;
        ring[o + 2] = p.z;
        ring[o + 3] = rad * end;
      }
      // Its colour: flesh, glowing as it winds up and lashes, white as it's struck, darker and shrinking dead.
      let shrink = 1;
      col.copy(this.hot ? FLESH_HOT : FLESH);
      if (st === WINDUP) col.lerp(GLOW, Math.min(1, s.t[w] / SWARM.v.lashWindup) * (0.6 + 0.4 * Math.sin(this.time * 30)));
      else if (st === LASH) col.copy(GLOW);
      else if (st === DEAD) {
        col.lerp(DARK, 0.6);
        shrink = Math.max(0, 1 - s.t[w] / DEAD_FADE);
      }
      if (s.flash[w] > 0) col.lerp(FLASH, Math.min(1, s.flash[w] / 0.12));
      // Rings round the curve, their frame carried along it.
      for (let r = 0; r < rings; r++) {
        const o = r * 4;
        const a = Math.max(0, r - 1) * 4;
        const c = Math.min(rings - 1, r + 1) * 4;
        tan.set(ring[c] - ring[a], ring[c + 1] - ring[a + 1], ring[c + 2] - ring[a + 2]);
        if (tan.lengthSq() < 1e-10) tan.set(0, 1, 0);
        tan.normalize();
        if (r === 0) {
          nrm.set(0, 1, 0);
          if (Math.abs(tan.y) > 0.9) nrm.set(1, 0, 0);
        }
        nrm.addScaledVector(tan, -nrm.dot(tan));
        if (nrm.lengthSq() < 1e-10) nrm.set(tan.z, 0, -tan.x);
        nrm.normalize();
        bin.crossVectors(tan, nrm);
        const rad = ring[o + 3] * shrink;
        // The tips past each end, along the worm, as far out as the end ring is wide.
        if (r === 0) this.tip(base + rings * SIDES, ring[o] - tan.x * rad, ring[o + 1] - tan.y * rad, ring[o + 2] - tan.z * rad, -tan.x, -tan.y, -tan.z, col);
        if (r === rings - 1) this.tip(base + rings * SIDES + 1, ring[o] + tan.x * rad * 1.5, ring[o + 1] + tan.y * rad * 1.5, ring[o + 2] + tan.z * rad * 1.5, tan.x, tan.y, tan.z, col);
        // The pale band a little behind the head.
        const band = r >= SUB * 2 && r <= SUB * 3 && st < DEAD && s.flash[w] <= 0 && st !== WINDUP && st !== LASH;
        for (let a = 0; a < SIDES; a++) {
          const ang = (a / SIDES) * Math.PI * 2;
          const cx = Math.cos(ang);
          const sx = Math.sin(ang);
          const nx = nrm.x * cx + bin.x * sx;
          const ny = nrm.y * cx + bin.y * sx;
          const nz = nrm.z * cx + bin.z * sx;
          const vi = (base + r * SIDES + a) * 3;
          this.pos[vi] = ring[o] + nx * rad;
          this.pos[vi + 1] = ring[o + 1] + ny * rad;
          this.pos[vi + 2] = ring[o + 2] + nz * rad;
          this.nor[vi] = nx;
          this.nor[vi + 1] = ny;
          this.nor[vi + 2] = nz;
          const cc = band ? BAND : col;
          this.rgb[vi] = cc.r;
          this.rgb[vi + 1] = cc.g;
          this.rgb[vi + 2] = cc.b;
        }
      }
    }
    for (const name of ['position', 'normal', 'color'] as const) {
      const attr = this.geo.getAttribute(name) as THREE.BufferAttribute;
      attr.addUpdateRange(0, s.worms * perWorm(rings) * 3);
      attr.needsUpdate = true;
    }
  }

  /** A worm that's gone: all its rings at one point (nothing drawn). */
  private collapse(base: number, rings: number, x: number, y: number, z: number) {
    for (let v = base; v < base + perWorm(rings); v++) {
      this.pos[v * 3] = x;
      this.pos[v * 3 + 1] = y;
      this.pos[v * 3 + 2] = z;
    }
  }

  /** One of a worm's tips: where, the way it faces, its colour. */
  private tip(v: number, x: number, y: number, z: number, nx: number, ny: number, nz: number, c: THREE.Color) {
    this.pos[v * 3] = x;
    this.pos[v * 3 + 1] = y;
    this.pos[v * 3 + 2] = z;
    this.nor[v * 3] = nx;
    this.nor[v * 3 + 1] = ny;
    this.nor[v * 3 + 2] = nz;
    this.rgb[v * 3] = c.r;
    this.rgb[v * 3 + 1] = c.g;
    this.rgb[v * 3 + 2] = c.b;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.ballMat.dispose();
    for (const b of this.lasers) b.dispose();
    this.big.dispose();
    this.shield.geometry.dispose();
    (this.shield.material as THREE.Material).dispose();
    this.ball.geometry.dispose();
    for (const o of this.iris.children) {
      const m = o as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }
}

/** A point `t` of the way from bead b to b + 1 of a worm (its beads from `o`, `n` of them) on the Catmull-Rom curve
 *  through them, each bead `k` of the way from its last place to its place now. */
function catmull(s: SwarmBody, o: number, n: number, b: number, t: number, k: number, out: THREE.Vector3) {
  const i0 = o + Math.max(0, b - 1);
  const i1 = o + b;
  const i2 = o + b + 1;
  const i3 = o + Math.min(n - 1, b + 2);
  const t2 = t * t;
  const t3 = t2 * t;
  const w0 = -0.5 * t3 + t2 - 0.5 * t;
  const w1 = 1.5 * t3 - 2.5 * t2 + 1;
  const w2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
  const w3 = 0.5 * t3 - 0.5 * t2;
  out.set(
    w0 * lerpAt(s.ox, s.x, i0, k) + w1 * lerpAt(s.ox, s.x, i1, k) + w2 * lerpAt(s.ox, s.x, i2, k) + w3 * lerpAt(s.ox, s.x, i3, k),
    w0 * lerpAt(s.oy, s.y, i0, k) + w1 * lerpAt(s.oy, s.y, i1, k) + w2 * lerpAt(s.oy, s.y, i2, k) + w3 * lerpAt(s.oy, s.y, i3, k),
    w0 * lerpAt(s.oz, s.z, i0, k) + w1 * lerpAt(s.oz, s.z, i1, k) + w2 * lerpAt(s.oz, s.z, i2, k) + w3 * lerpAt(s.oz, s.z, i3, k),
  );
}

/** Bead `i`'s coordinate `k` of the way from its last place (`was`) to its place now (`now`). */
const lerpAt = (was: Float32Array, now: Float32Array, i: number, k: number) => was[i] + (now[i] - was[i]) * k;
