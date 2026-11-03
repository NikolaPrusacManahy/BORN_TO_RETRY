// Update 0.3.35 — a ball of fire as Yokai : Okami gathers it over its head and as it comes down (okamiMovesFx.ts; the
// designer, of the flat orange ball: "animation?"): a white-hot heart, a lumpy shell of fire and a darker one round it
// turning against each other, its tongues licking up off it all round as it turns, a soft glow; flickering, swelling.
// Drawn over what's behind it (added, the sky would turn it white). Made in code.
import * as THREE from 'three';
import { auraTexture } from '../keyLooks';

/** Its tongues; its shells' sizes against its heart's; how fast they turn (rad/s). */
const TONGUES = 12;
const SHELL = 1.18;
const OUTER = 1.42;
const TURN = 0.9;

/** A ball, its surface pushed in and out (seeded): fire's lumps. */
function lumpy(detail: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
  const v = new THREE.Vector3();
  const bumps = Array.from({ length: 9 }, () => new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize());
  for (let k = 0; k < p.count; k++) {
    v.fromBufferAttribute(p, k).normalize();
    let r = 1;
    for (const b of bumps) r += 0.12 * Math.max(0, v.dot(b)) ** 6;
    p.setXYZ(k, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  return g;
}

export class FireBall {
  readonly group = new THREE.Group();
  private readonly heart: THREE.Mesh;
  private readonly shell: THREE.Mesh;
  private readonly outer: THREE.Mesh;
  private readonly glow: THREE.Sprite;
  private readonly tongues: THREE.Sprite[] = [];
  private readonly ways: THREE.Vector3[] = [];
  private readonly stuff: { dispose(): void }[] = [];

  constructor(seed: number) {
    const heartGeo = new THREE.IcosahedronGeometry(1, 3);
    const shellGeo = lumpy(2, seed);
    const outerGeo = lumpy(2, seed * 7 + 3);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false });
    const shellMat = new THREE.MeshBasicMaterial({ color: 0xff8a24, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false });
    const outerMat = new THREE.MeshBasicMaterial({ color: 0xd8340c, transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false });
    const glowMat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xff7a24, transparent: true, opacity: 0.45, depthWrite: false });
    this.stuff.push(heartGeo, shellGeo, outerGeo, heartMat, shellMat, outerMat, glowMat);
    this.heart = new THREE.Mesh(heartGeo, heartMat);
    this.shell = new THREE.Mesh(shellGeo, shellMat);
    this.outer = new THREE.Mesh(outerGeo, outerMat);
    this.glow = new THREE.Sprite(glowMat);
    this.group.add(this.glow, this.outer, this.shell, this.heart);
    let s = seed * 31 + 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
    for (let i = 0; i < TONGUES; i++) {
      const m = new THREE.SpriteMaterial({ map: auraTexture(), color: i % 3 ? 0xff9a30 : 0xffd060, transparent: true, opacity: 0.85, depthWrite: false });
      this.stuff.push(m);
      const t = new THREE.Sprite(m);
      this.tongues.push(t);
      this.ways.push(new THREE.Vector3(rnd() - 0.5, rnd() * 0.8 - 0.2, rnd() - 0.5).normalize());
      this.group.add(t);
    }
    this.group.traverse((o) => (o.frustumCulled = false));
    this.group.visible = false;
  }

  /** At `at`, `size` m across its heart, `t` s on (its turning and flicker); `fierce`: 0..1 (it brightens, pulses). */
  show(at: THREE.Vector3, size: number, t: number, fierce = 0) {
    const g = this.group;
    g.visible = true;
    g.position.copy(at);
    const flick = 1 + 0.06 * Math.sin(t * 23) + 0.04 * Math.sin(t * 37 + 1) + fierce * 0.1 * Math.sin(t * 12);
    const r = size / 2;
    this.heart.scale.setScalar(r * 0.78 * flick);
    this.shell.scale.setScalar(r * SHELL * flick);
    this.outer.scale.setScalar(r * OUTER * (2 - flick));
    this.shell.rotation.set(t * TURN, t * TURN * 0.7, 0);
    this.outer.rotation.set(-t * TURN * 0.6, 0, t * TURN * 0.8);
    (this.shell.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.2 * fierce;
    this.glow.scale.setScalar(size * (2.6 + fierce));
    // Its tongues: off its surface all round, turning with it, licking up and fading as they go.
    this.tongues.forEach((tg, i) => {
      const life = (t * 1.4 + i / TONGUES) % 1;
      const w = this.ways[i];
      const spin = t * TURN + i;
      const x = w.x * Math.cos(spin) - w.z * Math.sin(spin);
      const z = w.x * Math.sin(spin) + w.z * Math.cos(spin);
      const out = r * (1.05 + 0.5 * life);
      tg.position.set(x * out, w.y * out + r * 0.9 * life, z * out);
      tg.scale.set(r * 0.55 * (1 - life * 0.5), r * (0.8 + 0.9 * life), 1);
      (tg.material as THREE.SpriteMaterial).opacity = 0.85 * (1 - life);
    });
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
