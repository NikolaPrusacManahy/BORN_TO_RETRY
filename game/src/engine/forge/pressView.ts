// Update 0.3.13 — floor 8's presses (sim/dungeon/machinery.ts): each an iron frame (a post at each corner, beams round
// its top), a piston down from the beams to the hammer, the hammer (a block of dark iron) riding up and down between
// the posts, shuddering as it clanks; under it, an iron plate striped at its edge, and the hammer's shadow spreading
// over it as it comes down (the warning). Made in code.
import * as THREE from 'three';
import type { Press } from '../../sim/dungeon/machinery';
import { HAMMER, HAMMER_IN } from '../../sim/dungeon/machinery';
import { FORGE_KNOBS } from '../../tuning/forge';
import { FRAME_H, POST, POST_IN, PressSpot } from '../../world/dungeon/forge';

/** A beam's thickness (m); the piston's radius for a press 2 m across; how hard the hammer shudders (m). */
const BEAM = 0.36;
const PISTON = 0.2;
const SHUDDER = 0.04;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** The plate's stripes: iron with warning bands round its edge (repeating, so any size shows the same bands). */
function plateTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4a4441';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#d98a2b';
  g.lineWidth = 9;
  for (let i = -128; i < 256; i += 26) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 128, 128);
    g.stroke();
  }
  g.fillStyle = '#4a4441';
  g.fillRect(16, 16, 96, 96);
  g.fillStyle = '#3c3735';
  for (const [x, y] of [[26, 26], [94, 26], [26, 94], [94, 94]]) g.fillRect(x, y, 8, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class PressView {
  readonly group = new THREE.Group();
  private readonly box = new THREE.BoxGeometry(1, 1, 1);
  private readonly rod = new THREE.CylinderGeometry(1, 1, 1, 12);
  private readonly flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly tex = plateTexture();
  private readonly iron = new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: 0.55, metalness: 0.5 });
  private readonly hammerMat = new THREE.MeshStandardMaterial({ color: 0x2e2a28, roughness: 0.4, metalness: 0.65 });
  private readonly steel = new THREE.MeshStandardMaterial({ color: 0x8c8782, roughness: 0.3, metalness: 0.8 });
  private readonly plateMat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.7, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -1 });
  private readonly shadowMat = new THREE.MeshBasicMaterial({ color: 0x120c08, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  private readonly hammers: THREE.InstancedMesh;
  private readonly pistons: THREE.InstancedMesh;
  private readonly shadows: THREE.InstancedMesh;
  private readonly count: number;

  constructor(spots: readonly PressSpot[]) {
    const n = Math.max(1, spots.length);
    this.count = spots.length;
    const frame = new THREE.InstancedMesh(this.box, this.iron, n * 8);
    const plates = new THREE.InstancedMesh(this.flat, this.plateMat, n);
    this.hammers = new THREE.InstancedMesh(this.box, this.hammerMat, n);
    this.pistons = new THREE.InstancedMesh(this.rod, this.steel, n);
    this.shadows = new THREE.InstancedMesh(this.flat, this.shadowMat, n);
    // (Nothing shows till it's placed: a floor without presses has none.)
    for (const mesh of [frame, plates, this.hammers, this.pistons, this.shadows]) for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, HIDDEN);
    spots.forEach((s, i) => {
      // Four posts, then four beams round the top.
      let k = i * 8;
      const px = s.w / 2 - POST_IN;
      const pz = s.d / 2 - POST_IN;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) frame.setMatrixAt(k++, m.compose(pos.set(s.x + sx * px, FRAME_H / 2, s.z + sz * pz), q.identity(), scale.set(POST, FRAME_H, POST)));
      const top = FRAME_H - BEAM / 2;
      for (const sz of [-1, 1]) frame.setMatrixAt(k++, m.compose(pos.set(s.x, top, s.z + sz * pz), q.identity(), scale.set(2 * px + POST, BEAM, BEAM)));
      for (const sx of [-1, 1]) frame.setMatrixAt(k++, m.compose(pos.set(s.x + sx * px, top, s.z), q.identity(), scale.set(BEAM, BEAM, 2 * pz + POST)));
      plates.setMatrixAt(i, m.compose(pos.set(s.x, 0.015, s.z), q.identity(), scale.set(s.w - 0.1, 1, s.d - 0.1)));
    });
    for (const mesh of [frame, this.hammers, this.pistons]) mesh.castShadow = mesh.receiveShadow = true;
    plates.receiveShadow = true;
    for (const mesh of [frame, plates, this.hammers, this.pistons, this.shadows]) mesh.frustumCulled = false;
    this.group.add(frame, plates, this.hammers, this.pistons, this.shadows);
  }

  /** This frame's presses (as many as the view was made for). */
  update(presses: readonly Press[], time: number) {
    const v = FORGE_KNOBS.v;
    for (let i = 0; i < Math.min(this.count, presses.length); i++) {
      const p = presses[i];
      const s = p.spot;
      const jig = p.beat === 'warn' ? Math.sin(time * 90 + i * 1.7) * SHUDDER : 0;
      const hw = s.w - 2 * HAMMER_IN;
      const hd = s.d - 2 * HAMMER_IN;
      this.hammers.setMatrixAt(i, m.compose(pos.set(s.x + jig, p.y + HAMMER / 2, s.z - jig * 0.6), q.identity(), scale.set(hw, HAMMER, hd)));
      const from = p.y + HAMMER;
      const to = FRAME_H - 0.1;
      const r = PISTON * Math.min(s.w, s.d) * 0.5;
      this.pistons.setMatrixAt(i, to - from > 0.05 ? m.compose(pos.set(s.x + jig, (from + to) / 2, s.z), q.identity(), scale.set(r, to - from, r)) : HIDDEN);
      // The warning: its shadow under it, spreading as it shudders and drops.
      const k = p.beat === 'warn' ? 0.55 : p.beat === 'drop' || p.beat === 'rest' ? 1 : p.beat === 'rise' ? Math.max(0, 1 - p.y / v.pressHeight) : 0;
      this.shadows.setMatrixAt(i, k > 0 ? m.compose(pos.set(s.x, 0.03, s.z), q.identity(), scale.set(hw * (0.6 + 0.4 * k), 1, hd * (0.6 + 0.4 * k))) : HIDDEN);
    }
    this.hammers.instanceMatrix.needsUpdate = true;
    this.pistons.instanceMatrix.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of [this.box, this.rod, this.flat]) g.dispose();
    for (const mat of [this.iron, this.hammerMat, this.steel, this.plateMat, this.shadowMat]) mat.dispose();
    this.tex.dispose();
  }
}
