// Update 0.3.43 — floor 10's sky, Hell's (MD/FLOOR10_HELL_PLAN.md: "a red-orange furnace sky, lit from below by the
// lava, ash and embers drifting up; the sun a dull red disc"; the designer: keep play spaces bright): a dome round
// the view, bright orange at the walls' tops (the haze's colour, so far walls melt into it) deepening to red overhead;
// the sun a dull red disc where its light comes from; banks of ash cloud drifting slowly round; columns of smoke rising
// beyond the walls, glowing at their feet as if from fires out of sight. All made in code, round the view, out where
// the haze doesn't reach (as the Moon's and the Shrine's skies are).
import * as THREE from 'three';

/** How far out it is (m: inside the camera's 400). */
const FAR = 340;
/** The dome's colours by height (the sine of how high: sRGB hex): just over the horizon, a third of the way up,
 *  overhead. Its foot is the haze's. */
const GLOW = 0xf08650;
const HIGH = 0xc8512e;
const TOP = 0x96301f;
/** The sun's way (dungeonView.ts's SUN_DIR), its disc and glow (m across). */
const SUN_DIR = new THREE.Vector3(-0.45, 1, 0.35).normalize();
const SUN = { size: 20, glow: 70 };
/** Banks of ash: how many, how big (m), how fast they drift round (rad/s). */
const CLOUDS = 16;
const CLOUD_SIZE: readonly [number, number] = [70, 150];
const DRIFT = 0.006;
/** Columns of smoke: their ways (yaw, degrees), how many puffs high, a puff's size (m). */
const PLUMES = [25, 100, 160, 230, 300, 345];
const PUFFS = 6;
const PUFF = 34;

const dirOf = (yawDeg: number, upDeg: number) => {
  const y = THREE.MathUtils.degToRad(yawDeg);
  const u = THREE.MathUtils.degToRad(upDeg);
  return new THREE.Vector3(Math.sin(y) * Math.cos(u), Math.sin(u), -Math.cos(y) * Math.cos(u));
};

/** A soft lumpy puff (white: tinted per sprite), made once. */
function puffTexture(): THREE.DataTexture {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  let seed = 9173;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
  // A few soft lumps make the puff.
  const lumps = Array.from({ length: 7 }, () => ({ x: 0.3 + 0.4 * rnd(), y: 0.3 + 0.4 * rnd(), r: 0.16 + 0.14 * rnd() }));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n;
      const v = (y + 0.5) / n;
      let a = 0;
      for (const l of lumps) a = Math.max(a, 1 - Math.hypot(u - l.x, v - l.y) / l.r);
      const edge = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) / 0.5);
      const k = Math.min(1, Math.max(0, a) * 1.4) * Math.min(1, edge * 3);
      data.set([255, 255, 255, Math.round(255 * k * k)], (y * n + x) * 4);
    }
  const t = new THREE.DataTexture(data, n, n);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export class HellSky {
  readonly group = new THREE.Group();
  private readonly clouds = new THREE.Group();
  private readonly stuff: { dispose(): void }[] = [];

  /** `haze`: the haze's colour (sRGB hex), the dome's foot. */
  constructor(haze: number) {
    // The dome: by height, from the haze's colour up to a deep red.
    const dome = new THREE.SphereGeometry(FAR, 40, 20);
    const pos = dome.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const foot = new THREE.Color(haze);
    const glow = new THREE.Color(GLOW);
    const high = new THREE.Color(HIGH);
    const top = new THREE.Color(TOP);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const up = pos.getY(i) / FAR;
      if (up < 0.04) c.copy(foot);
      else if (up < 0.2) c.copy(foot).lerp(glow, (up - 0.04) / 0.16);
      else if (up < 0.55) c.copy(glow).lerp(high, (up - 0.2) / 0.35);
      else c.copy(high).lerp(top, Math.min(1, (up - 0.55) / 0.45));
      col.set([c.r, c.g, c.b], i * 3);
    }
    dome.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const sky = new THREE.Mesh(dome, domeMat);
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    this.stuff.push(dome, domeMat);
    // The sun: a dull red disc and its glow, turned to face you.
    const disc = new THREE.CircleGeometry(1, 40);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xd8462a, fog: false, depthWrite: false });
    const sunGlow = new THREE.MeshBasicMaterial({ color: 0xff7a40, fog: false, transparent: true, opacity: 0.22, depthWrite: false });
    const sun = new THREE.Group();
    const core = new THREE.Mesh(disc, sunMat);
    core.scale.setScalar(SUN.size / 2);
    const halo = new THREE.Mesh(disc, sunGlow);
    halo.scale.setScalar(SUN.glow / 2);
    halo.position.z = -0.5;
    sun.add(halo, core);
    sun.position.copy(SUN_DIR).multiplyScalar(FAR * 0.95);
    sun.lookAt(0, 0, 0);
    this.stuff.push(disc, sunMat, sunGlow);
    // Banks of ash, dark, some lit warm from under; drifting round.
    const puff = puffTexture();
    this.stuff.push(puff);
    let seed = 4417;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    for (let i = 0; i < CLOUDS; i++) {
      const lit = i % 3 === 0;
      const mat = new THREE.SpriteMaterial({ map: puff, color: lit ? 0x9a4a30 : 0x4a3532, transparent: true, opacity: lit ? 0.5 : 0.62, fog: false, depthWrite: false, rotation: rnd() * Math.PI * 2 });
      this.stuff.push(mat);
      const s = new THREE.Sprite(mat);
      const size = CLOUD_SIZE[0] + (CLOUD_SIZE[1] - CLOUD_SIZE[0]) * rnd();
      s.scale.set(size * (1.4 + 0.6 * rnd()), size, 1);
      s.position.copy(dirOf((i / CLOUDS) * 360 + rnd() * 18, 10 + 30 * rnd())).multiplyScalar(FAR * 0.8);
      this.clouds.add(s);
    }
    // Columns of smoke beyond the walls, their feet glowing.
    PLUMES.forEach((yaw, p) => {
      for (let k = 0; k < PUFFS; k++) {
        const up = 3 + k * 3.2;
        const mat = new THREE.SpriteMaterial({ map: puff, color: k === 0 ? 0xff6a2a : new THREE.Color(0x5a3a30).lerp(new THREE.Color(0x3a2a28), k / PUFFS), transparent: true, opacity: k === 0 ? 0.55 : 0.7 - k * 0.07, fog: false, depthWrite: false, blending: k === 0 ? THREE.AdditiveBlending : THREE.NormalBlending, rotation: rnd() * Math.PI * 2 });
        this.stuff.push(mat);
        const s = new THREE.Sprite(mat);
        const size = PUFF * (0.8 + k * 0.35);
        s.scale.set(size, size, 1);
        s.position.copy(dirOf(yaw + (k + p) * 1.3, up)).multiplyScalar(FAR * 0.9);
        this.group.add(s);
      }
    });
    this.group.add(sky, sun, this.clouds);
  }

  /** `at`: the view (the sky stays round it). */
  update(dt: number, at: THREE.Vector3) {
    this.group.position.copy(at);
    this.clouds.rotation.y += DRIFT * dt;
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
