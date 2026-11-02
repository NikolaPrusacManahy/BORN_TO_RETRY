// Update 0.3.13 — floor 8's fire vents (sim/dungeon/machinery.ts): an iron grate on the floor, its slits glowing as it
// sputters (the warning, flickering), then a column of fire roaring up out of it (two layers, licking upward), sinking
// back when it's done. Made in code.
import * as THREE from 'three';
import { VENT_HALF, Vent } from '../../sim/dungeon/machinery';
import { FORGE_KNOBS } from '../../tuning/forge';
import type { VentSpot } from '../../world/dungeon/forge';

/** The fire's radius at its foot and its top (× the grate's half), and how fast its flames climb (repeats/s). */
const FOOT = 0.75;
const CROWN = 1.1;
const CLIMB = 1.6;
/** Seconds it takes to roar up, and to sink at the end. */
const RISE = 0.12;
const SINK = 0.25;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const HOT = new THREE.Color(0xff7a1e);

function canvas(draw: (g: CanvasRenderingContext2D) => void, w = 64, h = 64): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The grate: dark iron with slits (`glow`: only the slits, white, for the glow over them). */
const grate = (glow: boolean) =>
  canvas((g) => {
    g.fillStyle = glow ? '#000000' : '#36312e';
    g.fillRect(0, 0, 64, 64);
    if (!glow) {
      g.fillStyle = '#4b4542';
      g.fillRect(0, 0, 64, 5);
      g.fillRect(0, 59, 64, 5);
      g.fillRect(0, 0, 5, 64);
      g.fillRect(59, 0, 5, 64);
    }
    g.fillStyle = glow ? '#ffffff' : '#120d0b';
    for (let x = 10; x < 56; x += 9) g.fillRect(x, 10, 4, 44);
  });

/** Flames: tongues of fire, repeating up the column (they climb); the fade holds still (bright at the foot, gone at
 *  the top). */
const fade = () =>
  canvas(
    (g) => {
      const f = g.createLinearGradient(0, 0, 0, 64);
      f.addColorStop(0, '#000000');
      f.addColorStop(0.45, '#8c8c8c');
      f.addColorStop(1, '#ffffff');
      g.fillStyle = f;
      g.fillRect(0, 0, 4, 64);
    },
    4,
    64,
  );
const flames = () => {
  const t = canvas(
    (g) => {
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 14; i++) {
        const x = rnd() * 64;
        const w = 6 + rnd() * 10;
        g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * rnd()})`;
        g.beginPath();
        g.moveTo(x - w, 128);
        g.quadraticCurveTo(x - w * 0.3, 40 + rnd() * 40, x + (rnd() - 0.5) * 8, rnd() * 50);
        g.quadraticCurveTo(x + w * 0.3, 40 + rnd() * 40, x + w, 128);
        g.fill();
      }
    },
    64,
    128,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

export class VentView {
  readonly group = new THREE.Group();
  private readonly flat = new THREE.PlaneGeometry(VENT_HALF * 2, VENT_HALF * 2).rotateX(-Math.PI / 2);
  private readonly column = new THREE.CylinderGeometry(CROWN * VENT_HALF, FOOT * VENT_HALF, 1, 14, 1, true).translate(0, 0.5, 0);
  private readonly grateTex = grate(false);
  private readonly slitTex = grate(true);
  private readonly fireTex = flames();
  private readonly fadeTex = fade();
  private readonly grateMat = new THREE.MeshStandardMaterial({ map: this.grateTex, roughness: 0.6, metalness: 0.45, polygonOffset: true, polygonOffsetFactor: -1 });
  private readonly slitMat = new THREE.MeshBasicMaterial({ map: this.slitTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  private readonly outerMat = new THREE.MeshBasicMaterial({ map: this.fireTex, alphaMap: this.fadeTex, color: 0xff6a12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  private readonly innerMat = new THREE.MeshBasicMaterial({ map: this.fireTex, alphaMap: this.fadeTex, color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  private readonly slits: THREE.InstancedMesh;
  private readonly outer: THREE.InstancedMesh;
  private readonly inner: THREE.InstancedMesh;
  private readonly count: number;

  constructor(spots: readonly VentSpot[]) {
    const n = Math.max(1, spots.length);
    this.count = spots.length;
    const grates = new THREE.InstancedMesh(this.flat, this.grateMat, n);
    this.slits = new THREE.InstancedMesh(this.flat, this.slitMat, n);
    this.outer = new THREE.InstancedMesh(this.column, this.outerMat, n);
    this.inner = new THREE.InstancedMesh(this.column, this.innerMat, n);
    for (const mesh of [grates, this.slits, this.outer, this.inner]) {
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, HIDDEN);
      mesh.frustumCulled = false;
    }
    spots.forEach((s, i) => {
      grates.setMatrixAt(i, m.compose(pos.set(s.x, 0.02, s.z), q.identity(), scale.set(1, 1, 1)));
      this.slits.setMatrixAt(i, m.compose(pos.set(s.x, 0.025, s.z), q.identity(), scale.set(1, 1, 1)));
      this.slits.setColorAt(i, color.setRGB(0, 0, 0));
    });
    grates.receiveShadow = true;
    this.group.add(grates, this.slits, this.outer, this.inner);
  }

  /** This frame's vents; `time` for the flicker and the flames' climb. */
  update(vents: readonly Vent[], time: number) {
    const v = FORGE_KNOBS.v;
    const cycle = v.ventIdle + v.ventWarn + v.ventBurn;
    for (let i = 0; i < Math.min(this.count, vents.length); i++) {
      const vent = vents[i];
      const s = vent.spot;
      // Where in its jet it is (s), from the machinery's clock as the sim reads it.
      const into = vent.beat === 'burn' ? (((time + s.beat * v.ventWave) % cycle) + cycle) % cycle - v.ventIdle - v.ventWarn : 0;
      const flicker = 0.6 + 0.4 * Math.sin(time * 37 + i * 2.3) * Math.sin(time * 13 + i);
      const glow = vent.beat === 'warn' ? flicker : vent.beat === 'burn' ? 1 : 0.08;
      this.slits.setColorAt(i, color.copy(HOT).multiplyScalar(glow));
      const up = vent.beat !== 'burn' ? 0 : Math.min(1, into / RISE, (v.ventBurn - into) / SINK);
      const h = v.ventHeight * Math.max(0, up);
      this.outer.setMatrixAt(i, h > 0.05 ? m.compose(pos.set(s.x, 0.02, s.z), q.identity(), scale.set(1, h, 1)) : HIDDEN);
      this.inner.setMatrixAt(i, h > 0.05 ? m.compose(pos.set(s.x, 0.02, s.z), q.identity(), scale.set(0.6, h * 0.75, 0.6)) : HIDDEN);
    }
    this.fireTex.offset.y = -time * CLIMB;
    if (this.slits.instanceColor) this.slits.instanceColor.needsUpdate = true;
    this.outer.instanceMatrix.needsUpdate = true;
    this.inner.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.flat.dispose();
    this.column.dispose();
    for (const t of [this.grateTex, this.slitTex, this.fireTex, this.fadeTex]) t.dispose();
    for (const mat of [this.grateMat, this.slitMat, this.outerMat, this.innerMat]) mat.dispose();
  }
}
