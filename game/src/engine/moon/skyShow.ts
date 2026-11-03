// Update 0.3.31 — the Moon's sky in Tidebreaker's show (the designer: "All previous rooms explode and all of space … A
// shot of the earth shakes and explode"): bursts flaring all over the sky as the floor's rooms blow, the ringed planet
// bursting among them; then the Earth shaking, harder and harder, glowing hotter, and bursting: a white flash, a ring
// of fire racing out, its pieces flung out burning and cooling into a field of rock where it hung (for the rest of the
// floor). Round the view as the sky is (spaceSky.ts: its places are the sky's); drawn from the show's time.
import * as THREE from 'three';
import { tideBeats } from '../../sim/dungeon/tideShow';
import { auraTexture } from '../keyLooks';

/** This many bursts over the sky as the rooms blow, each this long (s), as wide as these (m, at the sky's distance). */
const BURSTS = 18;
const BURST_LIFE = 1.3;
const BURST_SIZE: readonly [number, number] = [18, 56];
const BURST_COLOURS = [0xfff2d8, 0xffb060, 0xff7a3a, 0xc8a0ff, 0x9ad0ff];
/** The ringed planet bursts this far through the rooms' blowing, into this many pieces. */
const RINGED_AT = 0.55;
const BITS = 24;
/** The Earth: shaking this far at its hardest (m), glowing this hot; bursting into this many pieces, flung out this far
 *  (m), burning this long (s); its flash and its ring of fire (s; m across at their widest). */
const SHAKE = 8;
const HEAT = 1.6;
const SHARDS = 80;
const SPREAD = 120;
const BURN = 5;
const FLASH = 2;
const FLASH_SIZE = 420;
const RING = 2.6;
const RING_SIZE = 280;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

interface Burst {
  at: number;
  size: number;
  sprite: THREE.Sprite;
}
interface Shard {
  dir: THREE.Vector3;
  far: number;
  spin: THREE.Vector3;
  size: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const HEAT_GLOW = new THREE.Color(0xff5a1e);

export class SkyShow {
  readonly group = new THREE.Group();
  private readonly stuff: { dispose(): void }[] = [];
  private readonly bursts: Burst[] = [];
  private readonly earthFlash: THREE.Sprite;
  private readonly ringedFlash: THREE.Sprite;
  private readonly ring: THREE.Mesh;
  private readonly shards: THREE.InstancedMesh;
  private readonly bits: THREE.InstancedMesh;
  private readonly shardMat: THREE.MeshStandardMaterial;
  private readonly flights: Shard[] = [];
  private readonly bitFlights: Shard[] = [];
  /** The Earth's own glow (as spaceSky.ts gave it), to heat it as it shakes. */
  private heats: { mat: THREE.MeshStandardMaterial; was: THREE.Color }[] | null = null;
  private clock = 0;

  /** `earthAt`, `ringedAt`: where they hang (the sky's), and how wide (m). */
  constructor(
    far: number,
    private readonly earthAt: THREE.Vector3,
    earthSize: number,
    private readonly ringedAt: THREE.Vector3,
    ringedSize: number,
  ) {
    let seed = 777;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    const s = tideBeats();
    const span = s.wreckTo - s.wreckFrom + 0.6;
    const glow = (color: number) => {
      const mat = new THREE.SpriteMaterial({ map: auraTexture(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.frustumCulled = false;
      this.stuff.push(mat);
      this.group.add(sprite);
      return sprite;
    };
    for (let i = 0; i < BURSTS; i++) {
      const a = rnd() * Math.PI * 2;
      const y = 0.08 + 0.8 * rnd();
      const r = Math.sqrt(1 - y * y);
      const sprite = glow(BURST_COLOURS[i % BURST_COLOURS.length]);
      sprite.position.set(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(far * 0.85);
      this.bursts.push({ at: s.wreckFrom + span * (i / BURSTS) + rnd() * 0.15, size: BURST_SIZE[0] + (BURST_SIZE[1] - BURST_SIZE[0]) * rnd(), sprite });
    }
    this.earthFlash = glow(0xfff0d0);
    this.earthFlash.position.copy(earthAt);
    this.ringedFlash = glow(0xffd8a0);
    this.ringedFlash.position.copy(ringedAt);
    this.ringedFlash.userData.size = ringedSize * 4;
    // The Earth's ring of fire: flat, facing the view (the sky's middle).
    const ringGeo = new THREE.RingGeometry(0.8, 1, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff9a50, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.position.copy(earthAt);
    this.ring.lookAt(0, 0, 0);
    this.ring.visible = false;
    this.ring.frustumCulled = false;
    this.group.add(this.ring);
    // Their pieces: rock, burning as they fly, cooling after.
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    this.shardMat = new THREE.MeshStandardMaterial({ color: 0x3e3a3a, roughness: 1, flatShading: true, emissive: 0xff6a28, emissiveIntensity: 0, fog: false });
    this.shards = new THREE.InstancedMesh(rockGeo, this.shardMat, SHARDS);
    this.bits = new THREE.InstancedMesh(rockGeo, this.shardMat, BITS);
    this.stuff.push(ringGeo, ringMat, rockGeo, this.shardMat);
    const flight = (list: Shard[], n: number, wide: number) => {
      for (let i = 0; i < n; i++) {
        const dir = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
        // (Never further off than the view draws: out to its sides, or back toward it.)
        const back = dir.dot(earthAt) / earthAt.length();
        if (back > 0) dir.addScaledVector(earthAt, (-2 * back) / earthAt.length());
        list.push({ dir, far: wide * (0.3 + 0.7 * rnd()), spin: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(2), size: 0.5 + rnd() });
      }
    };
    flight(this.flights, SHARDS, SPREAD);
    flight(this.bitFlights, BITS, ringedSize * 2);
    this.flights.forEach((f) => (f.size *= earthSize * 0.05));
    this.bitFlights.forEach((f) => (f.size *= ringedSize * 0.06));
    for (const im of [this.shards, this.bits]) {
      im.visible = false;
      im.frustumCulled = false;
      this.group.add(im);
    }
  }

  /** The show `t` s in (−1: not yet; Infinity: over); `earth`, `ringed`: the planets (once the kit's loaded). */
  update(dt: number, t: number, earth: THREE.Object3D | null, ringed: THREE.Object3D | null) {
    this.clock += dt;
    const s = tideBeats();
    for (const b of this.bursts) this.flare(b.sprite, t - b.at, b.size, BURST_LIFE);
    // The ringed planet among them.
    const ringedAt = s.wreckFrom + (s.wreckTo - s.wreckFrom) * RINGED_AT;
    if (ringed) ringed.visible = t < ringedAt;
    this.flare(this.ringedFlash, t - ringedAt, this.ringedFlash.userData.size, 1.6);
    this.fly(this.bits, this.bitFlights, this.ringedAt, t - ringedAt);
    // The Earth: shaking, hotter and hotter; then gone.
    if (earth) {
      const k = (t - s.earthFrom) / Math.max(0.1, s.earthBurst - s.earthFrom);
      earth.visible = t < s.earthBurst;
      const hard = k > 0 && k < 1 ? SHAKE * k * k : 0;
      earth.position.copy(this.earthAt).add(pos.set(Math.sin(t * 61) + Math.sin(t * 37) * 0.6, Math.sin(t * 53 + 1) + Math.sin(t * 29) * 0.6, Math.sin(t * 47 + 2)).multiplyScalar(hard * 0.6));
      this.heat(earth, k > 0 && k < 1 ? HEAT * k * k : 0);
    }
    const age = t - s.earthBurst;
    this.flare(this.earthFlash, age, FLASH_SIZE, FLASH);
    const ring = age >= 0 && age < RING;
    this.ring.visible = ring;
    if (ring) {
      this.ring.scale.setScalar(RING_SIZE * (0.2 + 0.8 * Math.min(1, age / RING) ** 0.5));
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - age / RING);
    }
    this.fly(this.shards, this.flights, this.earthAt, age);
    // (Burning as they fly, cooling to a glow; the ringed planet's burn as the Earth's do.)
    const burn = age >= 0 ? age : t - ringedAt;
    this.shardMat.emissiveIntensity = burn >= 0 ? 0.12 + 1.9 * (1 - smooth(burn / BURN)) : 0;
  }

  /** A glow `age` s after it flared: swelling, fading. */
  private flare(sprite: THREE.Sprite, age: number, size: number, life: number) {
    const on = age >= 0 && age < life;
    sprite.visible = on;
    if (!on) return;
    sprite.scale.setScalar(size * (0.35 + 0.9 * smooth(age / (life * 0.4))));
    (sprite.material as THREE.SpriteMaterial).opacity = 1 - smooth(age / life);
  }

  /** Pieces `age` s after they burst out of `from`: flung out, slowing, turning; a field of rock after. */
  private fly(im: THREE.InstancedMesh, list: readonly Shard[], from: THREE.Vector3, age: number) {
    im.visible = age >= 0;
    if (age < 0) return;
    const out = 1 - Math.exp(-Math.min(age, 60) / 1.6);
    list.forEach((f, i) => {
      pos.copy(from).addScaledVector(f.dir, f.far * out);
      q.setFromEuler(e.set(f.spin.x * this.clock, f.spin.y * this.clock, f.spin.z * this.clock));
      im.setMatrixAt(i, m.compose(pos, q, scale.setScalar(f.size)));
    });
    im.instanceMatrix.needsUpdate = true;
  }

  /** The Earth glowing hotter (`k`: how much more). */
  private heat(earth: THREE.Object3D, k: number) {
    if (!this.heats) {
      const heats: { mat: THREE.MeshStandardMaterial; was: THREE.Color }[] = [];
      earth.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) heats.push({ mat: o.material, was: o.material.emissive.clone() });
      });
      this.heats = heats;
    }
    for (const h of this.heats) h.mat.emissive.copy(h.was).lerp(HEAT_GLOW, Math.min(1, k / HEAT)).multiplyScalar(1 + k);
  }

  dispose() {
    for (const s of this.stuff) s.dispose();
  }
}
