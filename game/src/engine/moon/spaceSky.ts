// Update 0.3.17 — floor 8's sky (the designer: "space sky so we are in the theme with the planet earth that can be seen
// from afar"): black (the look's background), full of stars, the Earth hanging large in it (the Space Kit's Planet_1,
// turning slowly), a ringed planet far off (Planet_7), and the sun, a white disc with a glow where the sun's light comes
// from. All of it round the view, at the edge of what the camera draws, untouched by the haze. The stars are made in
// code; the planets are the kit's, once it's loaded.
import * as THREE from 'three';

/** How far out it all is (m: inside the camera's 400); how many stars. */
const FAR = 360;
const STARS = 1600;
/** Where they hang (the way from you, as yaw and height in degrees) and how wide (m across). The sun's way is
 *  dungeonView.ts's SUN_DIR. */
const EARTH = { yaw: 35, up: 24, size: 96 };
const RINGED = { yaw: 200, up: 42, size: 26 };
const SUN_DIR = new THREE.Vector3(-0.45, 1, 0.35).normalize();
const SUN = { size: 16, glow: 46 };
/** The Earth turns this fast (radians a second). */
const SPIN = 0.01;

const dirOf = (yawDeg: number, upDeg: number) => {
  const y = THREE.MathUtils.degToRad(yawDeg);
  const u = THREE.MathUtils.degToRad(upDeg);
  return new THREE.Vector3(Math.sin(y) * Math.cos(u), Math.sin(u), -Math.cos(y) * Math.cos(u));
};

export class SpaceSky {
  readonly group = new THREE.Group();
  private readonly stuff: { dispose(): void }[] = [];
  private readonly sun = new THREE.Group();
  private earth: THREE.Object3D | null = null;

  constructor() {
    const pos = new Float32Array(STARS * 3);
    const col = new Float32Array(STARS * 3);
    const c = new THREE.Color();
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < STARS; i++) {
      // Even over the sky above the walls' tops, a few lower.
      const y = -0.1 + 1.1 * rnd();
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      pos.set([Math.cos(a) * r * FAR, y * FAR, Math.sin(a) * r * FAR], i * 3);
      const b = 0.45 + 0.55 * rnd() ** 2;
      c.setRGB(b, b, b * (1.05 + 0.15 * rnd()));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false });
    const stars = new THREE.Points(geo, mat);
    stars.frustumCulled = false;
    this.stuff.push(geo, mat);
    // The sun: a white disc and its glow, turned to face you.
    const disc = new THREE.CircleGeometry(1, 40);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffbea, fog: false, depthWrite: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false, transparent: true, opacity: 0.18, depthWrite: false });
    const core = new THREE.Mesh(disc, sunMat);
    core.scale.setScalar(SUN.size / 2);
    const glow = new THREE.Mesh(disc, glowMat);
    glow.scale.setScalar(SUN.glow / 2);
    glow.position.z = -0.5;
    this.sun.add(glow, core);
    this.sun.position.copy(SUN_DIR).multiplyScalar(FAR * 0.95);
    // (The sky only ever moves, never turns: facing its middle, it faces you.)
    this.sun.lookAt(0, 0, 0);
    this.stuff.push(disc, sunMat, glowMat);
    this.group.add(stars, this.sun);
  }

  /** The dungeon kit is loaded: the Earth and the ringed planet from it. */
  build(kit: THREE.Object3D) {
    const earth = this.planet(kit, 'kit_m_Planet_1', EARTH);
    if (earth) this.earth = earth;
    this.planet(kit, 'kit_m_Planet_7', RINGED);
  }

  private planet(kit: THREE.Object3D, name: string, at: { yaw: number; up: number; size: number }): THREE.Object3D | null {
    const src = kit.getObjectByName(name);
    if (!src) return null;
    const p = src.clone(true);
    p.position.set(0, 0, 0);
    p.rotation.set(0, 0, 0);
    p.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = (o.material as THREE.MeshStandardMaterial).clone();
      m.fog = false;
      m.roughness = 1;
      m.metalness = 0;
      // (Lit as the sun lights it, but never black on its dark side: a little of its own light.)
      m.emissive = m.color.clone().multiplyScalar(0.25);
      m.emissiveMap = m.map;
      o.material = m;
      o.frustumCulled = false;
      this.stuff.push(m);
    });
    const box = new THREE.Box3().setFromObject(p);
    const size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) || 1;
    const holder = new THREE.Group();
    p.position.sub(box.getCenter(new THREE.Vector3()));
    holder.add(p);
    holder.scale.setScalar(at.size / size);
    holder.position.copy(dirOf(at.yaw, at.up)).multiplyScalar(FAR * 0.9);
    this.group.add(holder);
    return holder;
  }

  /** `at`: the view (the sky stays round it). */
  update(dt: number, at: THREE.Vector3) {
    this.group.position.copy(at);
    if (this.earth) this.earth.rotation.y += SPIN * dt;
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
