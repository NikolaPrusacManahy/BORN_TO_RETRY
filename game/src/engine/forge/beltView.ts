// Update 0.3.13 — floor 8's belts (world/dungeon/forge.ts): each cell an iron bed with a belt of dark slats on it, the
// slats running the way the belt does (Belt speed), with a bright arrow-like chevron on every few so you can read
// which way it'll take you. Made in code.
import * as THREE from 'three';
import { FORGE_KNOBS } from '../../tuning/forge';
import type { BeltCell } from '../../world/dungeon/forge';
import { CELL } from '../../world/dungeon/floorPlan';

/** The belt's width on its cell (m: its bed is the whole cell). */
const BELT = 1.7;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** Slats across the belt, four to a cell, a chevron pointing along it (up the texture: the way it runs). */
function slatTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2b2725';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) {
    g.fillStyle = '#4d4643';
    g.fillRect(0, y + 3, 128, 24);
    g.fillStyle = '#5d5550';
    g.fillRect(0, y + 3, 128, 3);
  }
  g.strokeStyle = '#c9842e';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(34, 78);
  g.lineTo(64, 50);
  g.lineTo(94, 78);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class BeltView {
  readonly group = new THREE.Group();
  private readonly flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly tex = slatTexture();
  private readonly bedMat = new THREE.MeshStandardMaterial({ color: 0x3e3936, roughness: 0.6, metalness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 });
  private readonly beltMat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.75, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
  private readonly count: number;

  constructor(belts: readonly BeltCell[]) {
    const n = Math.max(1, belts.length);
    this.count = belts.length;
    const beds = new THREE.InstancedMesh(this.flat, this.bedMat, n);
    const runs = new THREE.InstancedMesh(this.flat, this.beltMat, n);
    for (const mesh of [beds, runs]) {
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, HIDDEN);
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
    }
    belts.forEach((b, i) => {
      beds.setMatrixAt(i, m.compose(pos.set(b.x, 0.012, b.z), q.identity(), scale.set(CELL, 1, CELL)));
      // Turned so the texture's up (the plane's −z) runs the belt's way.
      q.setFromAxisAngle(UP, Math.atan2(-b.dx, -b.dz));
      runs.setMatrixAt(i, m.compose(pos.set(b.x, 0.024, b.z), q, scale.set(BELT, 1, CELL)));
    });
    this.group.add(beds, runs);
  }

  /** The slats move on (`time`: the machinery's clock, s). */
  update(time: number) {
    if (this.count === 0) return;
    this.tex.offset.y = -(time * FORGE_KNOBS.v.beltSpeed) / CELL;
  }

  dispose() {
    this.group.removeFromParent();
    this.flat.dispose();
    this.tex.dispose();
    this.bedMat.dispose();
    this.beltMat.dispose();
  }
}
