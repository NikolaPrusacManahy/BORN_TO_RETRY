// Update 0.3.34 — what each thing striking floor 8's arena throws up in Yokai : Okami's show (sim/dungeon/okamiShow.ts):
// an island crashing in, a temple coming down, it landing from its leap. A shock ring racing out over the floor, a wall
// of dust billowing out and up, rock flung out and falling back. Each at its time and place (the show's, so the same
// however the frames fall), sized by what struck. Made in code.
import * as THREE from 'three';
import { auraTexture } from '../keyLooks';
import { additive } from '../moon/roomFires';

/** Its dust billows this long (s), this many puffs; this many rocks flung, falling this hard (m/s²); its ring lasts
 *  this long (s), out to this many times its size. */
const DUST = 2.4;
const PUFFS = 12;
const ROCKS = 8;
const GRAVITY = 22;
const RING = 1;
const RING_OUT = 3.2;

export interface Strike {
  at: number;
  x: number;
  y: number;
  z: number;
  size: number;
}

interface Burst extends Strike {
  ring: THREE.Mesh;
  puffs: THREE.Sprite[];
  rocks: THREE.Mesh[];
  /** Each puff's way out and rise; each rock's flight (x, y, z m/s) and spin. */
  ways: Float32Array;
  flights: Float32Array;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

export class ShowDust {
  readonly group = new THREE.Group();
  private readonly bursts: Burst[] = [];
  private readonly stuff: { dispose(): void }[] = [];

  constructor(strikes: readonly Strike[]) {
    const ringGeo = new THREE.RingGeometry(0.8, 1, 56).rotateX(-Math.PI / 2);
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d746a, roughness: 1, flatShading: true });
    this.stuff.push(ringGeo, rockGeo, rockMat);
    let seed = 1357;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    for (const s of strikes) {
      const ring = new THREE.Mesh(ringGeo, additive(0xfff0d8));
      ring.position.set(s.x, s.y + 0.15, s.z);
      ring.visible = false;
      this.stuff.push(ring.material as THREE.Material);
      const puffs: THREE.Sprite[] = [];
      const ways = new Float32Array(PUFFS * 3);
      for (let i = 0; i < PUFFS; i++) {
        const mat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xd8c8b4, transparent: true, opacity: 0, depthWrite: false });
        const p = new THREE.Sprite(mat);
        p.visible = false;
        this.stuff.push(mat);
        puffs.push(p);
        const a = (i / PUFFS) * Math.PI * 2 + rnd() * 0.5;
        ways.set([Math.cos(a), Math.sin(a), 0.4 + rnd() * 0.8], i * 3);
      }
      const rocks: THREE.Mesh[] = [];
      const flights = new Float32Array(ROCKS * 4);
      for (let i = 0; i < ROCKS; i++) {
        const r = new THREE.Mesh(rockGeo, rockMat);
        r.visible = false;
        r.castShadow = true;
        rocks.push(r);
        const a = rnd() * Math.PI * 2;
        const out = (4 + 8 * rnd()) * Math.sqrt(s.size / 6);
        flights.set([Math.cos(a) * out, (8 + 9 * rnd()) * Math.sqrt(s.size / 6), Math.sin(a) * out, 2 + 6 * rnd()], i * 4);
      }
      this.group.add(ring, ...puffs, ...rocks);
      this.bursts.push({ ...s, ring, puffs, rocks, ways, flights });
    }
    this.group.traverse((o) => (o.frustumCulled = false));
  }

  /** The show `t` s in. */
  update(t: number) {
    for (const b of this.bursts) {
      const age = t - b.at;
      const on = age >= 0 && age < DUST;
      b.ring.visible = on && age < RING;
      for (const p of b.puffs) p.visible = on;
      for (const r of b.rocks) r.visible = on;
      if (!on) continue;
      b.ring.scale.setScalar(b.size * (0.6 + RING_OUT * Math.min(1, age / RING) ** 0.6));
      (b.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / RING);
      const k = age / DUST;
      b.puffs.forEach((p, i) => {
        const out = b.size * (0.8 + 1.6 * smooth(age / 0.9));
        p.position.set(b.x + b.ways[i * 3] * out, b.y + 0.5 + b.ways[i * 3 + 2] * b.size * 0.6 * smooth(age / 1.2), b.z + b.ways[i * 3 + 1] * out);
        p.scale.setScalar(b.size * (0.6 + 1.1 * smooth(age / 1.5)));
        (p.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - smooth(k));
      });
      b.rocks.forEach((r, i) => {
        const f = i * 4;
        const y = b.y + 0.5 + b.flights[f + 1] * age - 0.5 * GRAVITY * age * age;
        r.position.set(b.x + b.flights[f] * age, Math.max(b.y - 0.4, y), b.z + b.flights[f + 2] * age);
        r.rotation.set(age * b.flights[f + 3], age * b.flights[f + 3] * 0.7, 0);
        r.scale.setScalar(Math.max(0.2, b.size * 0.06) * (1 - smooth((age - DUST * 0.6) / (DUST * 0.4))));
      });
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
