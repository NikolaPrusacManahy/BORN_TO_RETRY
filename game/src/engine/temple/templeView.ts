// Update 0.3.58 — the Drowned King's temple seen from its flooded floor (world/dungeon/temple.ts): colossal columns standing round its
// walls, where the floor leaves room for them, some with their lintels still on and some snapped; a wet stain up their feet. No
// collision: you can't reach them. Made in code, one mesh for the lot, nothing moves.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { cellAt, colAt, rowAt, type FloorPlan } from '../../world/dungeon/floorPlan';
import type { ShowView } from '../boss/showViews';
import type { KitMaterial } from '../shrine/isleMesh';

/** Its columns: how many tried, how far from its middle (m), how thick, how high. */
const COLUMNS = 22;
const NEAR = 44;
const FAR = 56;
const THICK = 3.2;
const HIGH = 42;
/** Clear of the floor's rooms by this much (m); the share of them snapped; how far up they're wet. */
const CLEAR = 6;
const SNAPPED = 0.3;
const WET = 0.2;

const STONE = new THREE.Color(0xb9b6a2);
const DARK = new THREE.Color(0x56635a);
const CAP = new THREE.Color(0xc8c5b2);

/** A cylinder coloured by height, standing at (x, z). */
function drum(x: number, z: number, wideLow: number, wideTop: number, y0: number, y1: number, wet: number, tall: number, tilt: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(wideTop, wideLow, y1 - y0, 10, 3).toNonIndexed();
  g.translate(0, (y0 + y1) / 2, 0);
  const p = g.getAttribute('position');
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = p.getY(i) < wet * tall ? DARK : STONE;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (tilt) g.rotateZ(tilt);
  g.translate(x, 0, z);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** A square block (a capital, a lintel). */
function block(x: number, y: number, z: number, w: number, h: number, d: number, yaw: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const p = g.getAttribute('position');
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) colors.set([CAP.r, CAP.g, CAP.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.rotateY(yaw);
  g.translate(x, y, z);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** Nothing of the floor's within `clear` of (x, z). */
function clearOfRooms(plan: FloorPlan, x: number, z: number, clear: number): boolean {
  for (const dx of [-clear, 0, clear]) {
    for (const dz of [-clear, 0, clear]) {
      if (cellAt(plan, colAt(x + dx), rowAt(z + dz)) !== 'void') return false;
    }
  }
  return true;
}

export class TempleView implements ShowView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });

  constructor(level: DungeonLevel) {
    let s = 5519;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const parts: THREE.BufferGeometry[] = [];
    const mx = level.boss.portal.x;
    const mz = level.boss.portal.z;
    let last: { x: number; z: number; top: number } | null = null;
    for (let i = 0; i < COLUMNS; i++) {
      const a = (i / COLUMNS) * Math.PI * 2;
      const r = NEAR + rnd() * (FAR - NEAR);
      const x = mx + Math.cos(a) * r;
      const z = mz + Math.sin(a) * r;
      if (!clearOfRooms(level.plan, x, z, THICK + CLEAR)) {
        last = null;
        continue;
      }
      const snapped = rnd() < SNAPPED;
      const top = snapped ? HIGH * (0.35 + rnd() * 0.3) : HIGH * (0.9 + rnd() * 0.2);
      parts.push(drum(x, z, THICK * 1.15, THICK * 0.9, 0, top, WET, HIGH, snapped ? (rnd() - 0.5) * 0.05 : 0));
      if (!snapped) {
        parts.push(block(x, top + 1, z, THICK * 2.6, 2, THICK * 2.6, a));
        // Its lintel, to the one before, while they stand.
        if (last && last.top > HIGH * 0.8) {
          const dx = x - last.x;
          const dz = z - last.z;
          parts.push(block((x + last.x) / 2, Math.min(top, last.top) + 2.6, (z + last.z) / 2, Math.hypot(dx, dz) + THICK, 2.2, THICK * 1.5, -Math.atan2(dz, dx)));
        }
        last = { x, z, top };
      } else last = null;
    }
    this.geo = parts.length ? mergeGeometries(parts) : null;
    for (const p of parts) p.dispose();
    if (this.geo) {
      const mesh = new THREE.Mesh(this.geo, this.mat);
      mesh.name = 'columns';
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
  }

  take(_roots: readonly THREE.Object3D[], _kit?: THREE.Object3D, _material?: KitMaterial) {}

  gone(): boolean {
    return false;
  }

  update(_b: BossRun, _at: THREE.Vector3) {}

  dispose() {
    this.group.removeFromParent();
    this.geo?.dispose();
    this.mat.dispose();
  }
}
