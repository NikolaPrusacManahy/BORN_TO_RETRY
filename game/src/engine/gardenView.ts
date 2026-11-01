// Update 0.2.23 — floor 2's marks on the floor (world/dungeon/gardenDressing.ts lists them): the webs' sheets (threads
// out from a middle and round it, drawn in code on a canvas: a cobweb or two of the kit's stands on some) and the
// Scorched Grove's scorch marks (a soot stain, darkest in its middle). Flat, see-through, just over the paving.
import * as THREE from 'three';
import type { Mark } from '../world/dungeon/gardenDressing';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const size = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const TEX = 256;

/** A web: spokes out from the middle and a spiral round it, pale, on nothing. (No page, as in the tests: blank.) */
function webTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d')!;
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
  return new THREE.CanvasTexture(c);
}

/** A soot stain: black in its middle, fading out. */
function scorchTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(TEX / 2, TEX / 2, 0, TEX / 2, TEX / 2, TEX / 2);
  grad.addColorStop(0, 'rgba(14, 11, 9, 0.92)');
  grad.addColorStop(0.55, 'rgba(24, 19, 15, 0.6)');
  grad.addColorStop(1, 'rgba(30, 24, 18, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, TEX, TEX);
  return new THREE.CanvasTexture(c);
}

export class GardenView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly mats: THREE.Material[] = [];
  private readonly texs: THREE.Texture[] = [];

  constructor(webs: readonly Mark[], scorch: readonly Mark[]) {
    this.marks(webs, webTexture, 0.035);
    this.marks(scorch, scorchTexture, 0.025);
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

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.mats.forEach((x) => x.dispose());
    this.texs.forEach((x) => x.dispose());
  }
}
