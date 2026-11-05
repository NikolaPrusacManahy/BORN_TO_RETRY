// Update 0.3.56 — the Frost Roc's plateau seen from it (world/dungeon/plateau.ts): snowy peaks all round past its walls, where the
// floor leaves room for them, and the cliff on the side with no doorway, its top where the cornice hangs (rocFx.ts). No collision:
// you can't reach them. Made in code, one mesh for the lot, nothing moves.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { cellAt, colAt, rowAt, type FloorPlan } from '../../world/dungeon/floorPlan';
import { cliffWay } from '../../world/dungeon/plateau';
import type { KitMaterial } from '../shrine/isleMesh';
import type { ShowView } from '../boss/showViews';

/** Peaks: how many tried, how far from its middle (m), how wide and high; a peak's snowline, a share up. */
const PEAKS = 46;
const NEAR = 48;
const FAR = 120;
const SNOW_LINE = 0.5;
/** The cliff: how far out along its way it stands (m), how wide it runs (m, in pieces this far apart), how high. */
const CLIFF_OUT = 50;
const CLIFF_RUN = 70;
const CLIFF_STEP = 11;
const CLIFF_UP = 40;
const CLIFF_WIDE = 17;
/** Clear of the floor's rooms by this much round a peak, at least (m). */
const CLEAR = 8;

const ROCK = new THREE.Color(0x6f7b88);
const SNOW = new THREE.Color(0xf2f6fa);

/** A jagged peak, flat-shaded, snow above its snowline. */
function peak(x: number, z: number, wide: number, high: number, snow: number, rnd: () => number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(wide, high, 7, 4).toNonIndexed();
  const p = g.getAttribute('position');
  const seen = new Map<string, [number, number]>();
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let jit = seen.get(key);
    if (!jit) {
      jit = [(rnd() - 0.5) * wide * 0.28, (rnd() - 0.5) * wide * 0.28];
      seen.set(key, jit);
    }
    const y = p.getY(i) + high / 2;
    // (The bottom stays put; the tip stays a tip.)
    const k = y / high;
    p.setXYZ(i, p.getX(i) + jit[0] * (1 - k), y, p.getZ(i) + jit[1] * (1 - k));
    c.copy(k > snow ? SNOW : ROCK);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  g.translate(x, 0, z);
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

export class PlateauView implements ShowView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });

  constructor(level: DungeonLevel) {
    let s = 7741;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const parts: THREE.BufferGeometry[] = [];
    const mx = level.boss.portal.x;
    const mz = level.boss.portal.z;
    for (let i = 0; i < PEAKS; i++) {
      const a = (i / PEAKS) * Math.PI * 2 + rnd() * 0.2;
      const r = NEAR + rnd() * (FAR - NEAR);
      const x = mx + Math.cos(a) * r;
      const z = mz + Math.sin(a) * r;
      const wide = 14 + rnd() * 18;
      if (!clearOfRooms(level.plan, x, z, wide * 0.8 + CLEAR)) continue;
      parts.push(peak(x, z, wide, 26 + rnd() * 34, SNOW_LINE + rnd() * 0.15, rnd));
    }
    // The cliff, along the side with no doorway.
    const c = cliffWay(level.plan);
    for (let along = -CLIFF_RUN / 2; along <= CLIFF_RUN / 2; along += CLIFF_STEP) {
      const x = mx + c.x * (CLIFF_OUT + rnd() * 3) + c.z * along;
      const z = mz + c.z * (CLIFF_OUT + rnd() * 3) + c.x * along;
      if (clearOfRooms(level.plan, x, z, CLIFF_WIDE * 0.6)) parts.push(peak(x, z, CLIFF_WIDE, CLIFF_UP + rnd() * 10, 0.72, rnd));
    }
    this.geo = parts.length ? mergeGeometries(parts) : null;
    for (const p of parts) p.dispose();
    if (this.geo) {
      const mesh = new THREE.Mesh(this.geo, this.mat);
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
