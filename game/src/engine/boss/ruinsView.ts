// Update 0.3.60 — the Velociraptor's ruins seen from their sand (world/dungeon/ruins.ts): dunes rising past its walls, where the floor
// leaves room for them, and ruined sandstone towers standing out of them. No collision: you can't reach them. Made in code, one mesh for
// the lot, nothing moves.
// Update 0.3.61 — its show (sim/dungeon/dinoShow.ts): sand blowing as its walls go back, and flung up as it lands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { dinoBeats } from '../../sim/dungeon/dinoShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { cellAt, colAt, rowAt, type FloorPlan } from '../../world/dungeon/floorPlan';
import { ShowDust } from '../shrine/showDust';
import type { KitMaterial } from '../shrine/isleMesh';
import type { ShowView } from './showViews';

/** Its dunes and towers: how many tried, how far from its middle (m). */
const DUNES = 30;
const TOWERS = 14;
const NEAR = 46;
const FAR = 110;
/** Clear of the floor's rooms by this much (m). */
const CLEAR = 7;
/** The sand blowing: how many grains, how far they range round its middle (m), how fast (m/s). */
const GRAINS = 240;
const RANGE = 44;
const FAST = 18;

const SAND = new THREE.Color(0xdcb981);
const SAND_DARK = new THREE.Color(0xc29c66);
const STONE = new THREE.Color(0xb78e5f);
const STONE_DARK = new THREE.Color(0x8d6a45);

function painted(g: THREE.BufferGeometry, colorAt: (y: number) => THREE.Color): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = colorAt(p.getY(i));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

function clearOfRooms(plan: FloorPlan, x: number, z: number, clear: number): boolean {
  for (const dx of [-clear, 0, clear]) {
    for (const dz of [-clear, 0, clear]) {
      if (cellAt(plan, colAt(x + dx), rowAt(z + dz)) !== 'void') return false;
    }
  }
  return true;
}

export class RuinsView implements ShowView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  private readonly dust: ShowDust;
  private readonly sandGeo = new THREE.BufferGeometry();
  private readonly sandMat = new THREE.PointsMaterial({ color: 0xe6c99a, size: 0.22, transparent: true, opacity: 0.6, depthWrite: false });
  private readonly sand: THREE.Points;
  private readonly grains: Float32Array;

  constructor(level: DungeonLevel) {
    let s = 6113;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const parts: THREE.BufferGeometry[] = [];
    const mx = level.boss.portal.x;
    const mz = level.boss.portal.z;
    for (let i = 0; i < DUNES; i++) {
      const a = (i / DUNES) * Math.PI * 2 + rnd() * 0.2;
      const r = NEAR + rnd() * (FAR - NEAR);
      const x = mx + Math.cos(a) * r;
      const z = mz + Math.sin(a) * r;
      const wide = 18 + rnd() * 22;
      if (!clearOfRooms(level.plan, x, z, wide + CLEAR)) continue;
      const high = 8 + rnd() * 14;
      const g = new THREE.IcosahedronGeometry(1, 2).toNonIndexed();
      // (Flat underneath: they sit on the ground.)
      const base = g.getAttribute('position');
      for (let v = 0; v < base.count; v++) base.setY(v, Math.max(0, base.getY(v)));
      g.scale(wide, high, wide * (0.7 + rnd() * 0.5));
      g.rotateY(rnd() * Math.PI);
      g.translate(x, 0, z);
      parts.push(painted(g, (y) => (y > high * 0.55 ? SAND : SAND_DARK)));
    }
    for (let i = 0; i < TOWERS; i++) {
      const a = (i / TOWERS) * Math.PI * 2 + rnd() * 0.4;
      const r = NEAR + rnd() * 16;
      const x = mx + Math.cos(a) * r;
      const z = mz + Math.sin(a) * r;
      const wide = 3 + rnd() * 2.5;
      if (!clearOfRooms(level.plan, x, z, wide + CLEAR)) continue;
      const high = 14 + rnd() * 20;
      const g = new THREE.BoxGeometry(wide * 2, high, wide * 2, 1, 3, 1).toNonIndexed();
      const p = g.getAttribute('position');
      // Its top broken off, unevenly.
      const seen = new Map<string, number>();
      for (let v = 0; v < p.count; v++) {
        if (p.getY(v) <= high * 0.3) continue;
        const key = `${p.getX(v).toFixed(2)},${p.getZ(v).toFixed(2)},${p.getY(v).toFixed(2)}`;
        if (!seen.has(key)) seen.set(key, (rnd() - 0.5) * 3);
        p.setY(v, p.getY(v) + seen.get(key)!);
      }
      g.translate(0, high / 2, 0);
      g.rotateY(rnd() * Math.PI);
      g.translate(x, 0, z);
      parts.push(painted(g, (y) => (y < high * 0.35 ? STONE_DARK : STONE)));
    }
    this.geo = parts.length ? mergeGeometries(parts) : null;
    for (const p of parts) p.dispose();
    if (this.geo) {
      const mesh = new THREE.Mesh(this.geo, this.mat);
      mesh.name = 'dunes';
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    const b0 = dinoBeats();
    this.dust = new ShowDust([{ at: b0.landAt, x: mx, y: 0, z: mz, size: 10 }]);
    this.grains = new Float32Array(GRAINS * 3);
    for (let i = 0; i < GRAINS; i++) {
      this.grains[i * 3] = (rnd() * 2 - 1) * RANGE;
      this.grains[i * 3 + 1] = rnd() * 9;
      this.grains[i * 3 + 2] = (rnd() * 2 - 1) * RANGE;
    }
    this.sandGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GRAINS * 3), 3));
    this.sand = new THREE.Points(this.sandGeo, this.sandMat);
    this.sand.frustumCulled = false;
    this.sand.position.set(mx, 0, mz);
    this.sand.visible = false;
    this.group.add(this.dust.group, this.sand);
  }

  take(_roots: readonly THREE.Object3D[], _kit?: THREE.Object3D, _material?: KitMaterial) {}

  gone(): boolean {
    return false;
  }

  update(b: BossRun, _at: THREE.Vector3) {
    const on = b.kind === 'dino' && b.ownShow && b.beat === 'intro';
    const t = on ? b.t : 1e9;
    this.dust.update(t);
    const s = dinoBeats();
    this.sand.visible = on && t < s.landAt + 1;
    if (!this.sand.visible) return;
    const p = this.sandGeo.getAttribute('position') as THREE.BufferAttribute;
    const span = RANGE * 2;
    for (let i = 0; i < GRAINS; i++) {
      const x = this.grains[i * 3] + FAST * t;
      const z = this.grains[i * 3 + 2] + FAST * 0.35 * t;
      p.setXYZ(i, ((((x + RANGE) % span) + span) % span) - RANGE, this.grains[i * 3 + 1] - Math.sin(t + i) * 0.4, ((((z + RANGE) % span) + span) % span) - RANGE);
    }
    p.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo?.dispose();
    this.mat.dispose();
    this.dust.dispose();
    this.sandGeo.dispose();
    this.sandMat.dispose();
  }
}
