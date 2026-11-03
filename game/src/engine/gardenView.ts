// Update 0.2.23 — floor 2's marks on the floor (world/dungeon/gardenDressing.ts lists them): the webs' sheets (threads
// out from a middle and round it, drawn in code on a canvas: a cobweb or two of the kit's stands on some) and the
// Scorched Grove's scorch marks (a soot stain, darkest in its middle). Flat, see-through, just over the floor.
// Update 0.2.24 — floor 3's (world/dungeon/keepDressing.ts): open graves (a dark hole, its earth heaped round it),
// burrows (a round dark hole in a ring of dug earth), and beds of glowing mushrooms (made in code: a pale stalk and a
// cap that glows violet).
// Update 0.3.32 — floor 8's (world/dungeon/shrine.ts): a carpet of fallen sakura petals under each sakura, thickest by
// its trunk, thinning out (made in code: pale and deep pinks, each petal a little oval at its own turn).
import * as THREE from 'three';
import type { Mark } from '../world/dungeon/gardenDressing';
import type { Marks } from '../world/dungeon/ownDressing';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const size = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const TEX = 256;
/** A mushroom's stalk and cap (m, at size 1), and the caps' glow. */
const STALK_H = 0.42;
const CAP_R = 0.24;
const CAP = 0xb98cff;
const CAP_GLOW = 0x7c4dff;

/** A canvas to draw a mark on (none without a page, as in the tests: a blank texture). */
function canvasTexture(draw: (g: CanvasRenderingContext2D) => void): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  draw(c.getContext('2d')!);
  return new THREE.CanvasTexture(c);
}

/** Update 0.3.32 — fallen petals: hundreds of little ovals, thickest in the middle, none at the edge. */
const petalTexture = () =>
  canvasTexture((g) => {
    const mid = TEX / 2;
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    const pinks = ['#ffd3e1', '#f7a9c4', '#ffe6ee', '#f28fb2', '#fbc0d3'];
    for (let i = 0; i < 900; i++) {
      // (More near the middle: the radius's square root skewed in.)
      const r = mid * 0.92 * rnd() ** 0.9;
      if (rnd() > 1 - (r / mid) ** 1.6) continue;
      const a = rnd() * Math.PI * 2;
      g.save();
      g.translate(mid + Math.cos(a) * r, mid + Math.sin(a) * r);
      g.rotate(rnd() * Math.PI);
      g.fillStyle = pinks[Math.floor(rnd() * pinks.length)];
      g.globalAlpha = 0.85;
      g.beginPath();
      g.ellipse(0, 0, 3.2, 2, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  });

/** A web: spokes out from the middle and a spiral round it, pale, on nothing. */
const webTexture = () =>
  canvasTexture((g) => {
    const mid = TEX / 2;
    const spokes = 14;
    g.strokeStyle = 'rgba(240, 242, 232, 0.85)';
    g.lineWidth = 1.6;
    const ends: [number, number][] = [];
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + Math.sin(i * 2.3) * 0.12;
      const r = mid * (0.82 + 0.16 * Math.sin(i * 1.7));
      ends.push([Math.cos(a), Math.sin(a)]);
      g.beginPath();
      g.moveTo(mid, mid);
      g.lineTo(mid + Math.cos(a) * r, mid + Math.sin(a) * r);
      g.stroke();
    }
    g.lineWidth = 1.2;
    for (let ring = 1; ring <= 11; ring++) {
      const r = mid * 0.07 * ring;
      g.beginPath();
      ends.forEach(([x, y], i) => {
        const k = r * (1 + 0.06 * Math.sin(i + ring));
        if (i === 0) g.moveTo(mid + x * k, mid + y * k);
        else g.lineTo(mid + x * k, mid + y * k);
      });
      g.closePath();
      g.stroke();
    }
  });

/** A soot stain: black in its middle, fading out. */
const scorchTexture = () =>
  canvasTexture((g) => {
    const grad = g.createRadialGradient(TEX / 2, TEX / 2, 0, TEX / 2, TEX / 2, TEX / 2);
    grad.addColorStop(0, 'rgba(14, 11, 9, 0.92)');
    grad.addColorStop(0.55, 'rgba(24, 19, 15, 0.6)');
    grad.addColorStop(1, 'rgba(30, 24, 18, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, TEX, TEX);
  });

/** An open grave from above: heaped earth round a dark hole (its long side along z). */
const graveTexture = () =>
  canvasTexture((g) => {
    g.fillStyle = 'rgba(112, 92, 72, 0.95)';
    g.beginPath();
    g.roundRect(TEX * 0.22, TEX * 0.06, TEX * 0.56, TEX * 0.88, 26);
    g.fill();
    g.fillStyle = 'rgba(20, 15, 12, 0.97)';
    g.fillRect(TEX * 0.32, TEX * 0.16, TEX * 0.36, TEX * 0.68);
  });

/** A burrow from above: a ring of dug earth, its hole dark. */
const burrowTexture = () =>
  canvasTexture((g) => {
    const grad = g.createRadialGradient(TEX / 2, TEX / 2, TEX * 0.16, TEX / 2, TEX / 2, TEX / 2);
    grad.addColorStop(0, 'rgba(18, 13, 10, 1)');
    grad.addColorStop(0.3, 'rgba(26, 19, 14, 1)');
    grad.addColorStop(0.42, 'rgba(118, 96, 74, 0.95)');
    grad.addColorStop(1, 'rgba(118, 96, 74, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, TEX, TEX);
  });

export class GardenView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly mats: THREE.Material[] = [];
  private readonly texs: THREE.Texture[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];

  constructor(marks: Marks) {
    this.marks(marks.petals, petalTexture, 0.045);
    this.marks(marks.webs, webTexture, 0.035);
    this.marks(marks.scorch, scorchTexture, 0.025);
    this.marks(marks.graves, graveTexture, 0.03);
    this.marks(marks.burrows, burrowTexture, 0.03);
    this.shrooms(marks.shrooms);
  }

  /** One kind of mark, `y` over the floor. */
  private marks(list: readonly Mark[], texture: () => THREE.Texture, y: number) {
    if (list.length === 0) return;
    const tex = texture();
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1 });
    this.texs.push(tex);
    this.mats.push(mat);
    const inst = new THREE.InstancedMesh(this.geo, mat, list.length);
    list.forEach((k, i) => inst.setMatrixAt(i, m.compose(pos.set(k.x, y, k.z), q.setFromAxisAngle(UP, k.rot), size.set(k.s, 1, k.s))));
    inst.computeBoundingSphere();
    inst.receiveShadow = true;
    this.group.add(inst);
  }

  /** The mushrooms: a stalk and a glowing cap each (`s`: its size). */
  private shrooms(list: readonly Mark[]) {
    if (list.length === 0) return;
    const stalk = new THREE.CylinderGeometry(0.05, 0.08, STALK_H, 7).translate(0, STALK_H / 2, 0);
    const cap = new THREE.SphereGeometry(CAP_R, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.9 });
    const capMat = new THREE.MeshStandardMaterial({ color: CAP, emissive: CAP_GLOW, emissiveIntensity: 0.9, roughness: 0.6 });
    this.geos.push(stalk, cap);
    this.mats.push(stalkMat, capMat);
    const stalks = new THREE.InstancedMesh(stalk, stalkMat, list.length);
    const caps = new THREE.InstancedMesh(cap, capMat, list.length);
    list.forEach((k, i) => {
      q.setFromAxisAngle(UP, k.rot);
      stalks.setMatrixAt(i, m.compose(pos.set(k.x, 0, k.z), q, size.set(k.s, k.s, k.s)));
      caps.setMatrixAt(i, m.compose(pos.set(k.x, STALK_H * k.s * 0.95, k.z), q, size.set(k.s, k.s, k.s)));
    });
    for (const inst of [stalks, caps]) {
      inst.computeBoundingSphere();
      inst.castShadow = inst.receiveShadow = true;
      this.group.add(inst);
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.geos.forEach((x) => x.dispose());
    this.mats.forEach((x) => x.dispose());
    this.texs.forEach((x) => x.dispose());
  }
}
