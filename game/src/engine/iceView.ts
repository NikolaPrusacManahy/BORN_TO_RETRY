// Update 0.3.11 — floor 7's sheets of ice (DungeonLevel.ice): glassy, pale blue over the stone, catching the light,
// with white streaks and cracks frozen in them (drawn on a canvas, repeating every 4 m). Made in code.
import * as THREE from 'three';
import type { ArenaBox } from '../world/arena';

/** How far over the floor it lies (m), and the streaks' repeat (m). */
const LIFT = 0.012;
const REPEAT = 4;

function iceTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Long pale streaks, and fine cracks.
  g.strokeStyle = 'rgba(200, 228, 245, 0.9)';
  for (let i = 0; i < 18; i++) {
    g.lineWidth = 2 + rnd() * 6;
    const x = rnd() * 256;
    const y = rnd() * 256;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 180, y + (rnd() - 0.5) * 60);
    g.stroke();
  }
  g.strokeStyle = 'rgba(150, 190, 215, 0.8)';
  g.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    let x = rnd() * 256;
    let y = rnd() * 256;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) g.lineTo((x += (rnd() - 0.5) * 50), (y += (rnd() - 0.5) * 50));
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class IceView {
  readonly group = new THREE.Group();
  private readonly tex = iceTexture();
  private readonly mat = new THREE.MeshStandardMaterial({ color: 0x8cc8e6, map: this.tex, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.88, polygonOffset: true, polygonOffsetFactor: -1 });
  private readonly geos: THREE.BufferGeometry[] = [];

  constructor(ice: readonly ArenaBox[]) {
    for (const b of ice) {
      const geo = new THREE.PlaneGeometry(b.w, b.d).rotateX(-Math.PI / 2);
      // (The streaks the same size whatever the sheet's.)
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * b.w) / REPEAT, (uv.getY(i) * b.d) / REPEAT);
      this.geos.push(geo);
      const mesh = new THREE.Mesh(geo, this.mat);
      mesh.position.set(b.x, LIFT, b.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of this.geos) g.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}
