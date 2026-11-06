// Update 0.3.58 — the Drowned King's temple seen from its flooded floor (world/dungeon/temple.ts): colossal columns standing round its
// walls, where the floor leaves room for them, some with their lintels still on and some snapped; a wet stain up their feet. No
// collision: you can't reach them. Made in code, one mesh for the lot, nothing moves.
// Update 0.3.59 — its show (sim/dungeon/drownedShow.ts): water running down all four walls, a trickle, then bursting, then spent; spray
// where it bursts up and where it lands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { drownedBeats } from '../../sim/dungeon/drownedShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { cellAt, colAt, rowAt, type FloorPlan } from '../../world/dungeon/floorPlan';
import type { ShowView } from '../boss/showViews';
import type { KitMaterial } from '../shrine/isleMesh';
import { ShowDust } from '../shrine/showDust';

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
/** Its falls: how many sheets a wall, how wide (m), how high they start; streaks falling down them, how fast (m/s), how big (m). */
const SHEETS = 4;
const SHEET_WIDE = 7;
const FALL_TOP = 6.4;
const STREAKS = 240;
const STREAK_FAST = 13;
const STREAK: readonly [number, number, number] = [0.32, 1.7, 0.16];
/** The share of them running as the walls only weep. */
const WEEP_SHARE = 0.12;

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

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();

export class TempleView implements ShowView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  private readonly sheetGeo = new THREE.PlaneGeometry(1, 1);
  private readonly sheetMat = new THREE.MeshBasicMaterial({ color: 0xcdeff5, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  private readonly sheets: THREE.InstancedMesh;
  private readonly streakGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly streakMat = new THREE.MeshBasicMaterial({ color: 0xf4fdff, transparent: true, opacity: 0.85, depthWrite: false });
  private readonly streaks: THREE.InstancedMesh;
  private readonly falling: { x: number; z: number; at: number }[] = [];
  private readonly dust: ShowDust;

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
    // Its falls: down all four walls as they'll stand.
    const e = level.boss.end;
    const inset = 0.5;
    const sides: { x0: number; z0: number; x1: number; z1: number; yaw: number }[] = [
      { x0: e.min.x, z0: e.min.z + inset, x1: e.max.x, z1: e.min.z + inset, yaw: 0 },
      { x0: e.min.x, z0: e.max.z - inset, x1: e.max.x, z1: e.max.z - inset, yaw: 0 },
      { x0: e.min.x + inset, z0: e.min.z, x1: e.min.x + inset, z1: e.max.z, yaw: Math.PI / 2 },
      { x0: e.max.x - inset, z0: e.min.z, x1: e.max.x - inset, z1: e.max.z, yaw: Math.PI / 2 },
    ];
    this.sheets = new THREE.InstancedMesh(this.sheetGeo, this.sheetMat, SHEETS * sides.length);
    this.sheets.frustumCulled = false;
    let n = 0;
    for (const w of sides) {
      for (let i = 0; i < SHEETS; i++) {
        const u = (i + 0.5) / SHEETS + (rnd() - 0.5) * 0.08;
        pos.set(w.x0 + (w.x1 - w.x0) * u, FALL_TOP / 2, w.z0 + (w.z1 - w.z0) * u);
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, w.yaw);
        this.sheets.setMatrixAt(n++, m.compose(pos, q, scl.set(SHEET_WIDE, FALL_TOP, 1)));
      }
    }
    this.sheets.instanceMatrix.needsUpdate = true;
    this.streaks = new THREE.InstancedMesh(this.streakGeo, this.streakMat, STREAKS);
    this.streaks.frustumCulled = false;
    this.streaks.count = 0;
    for (let i = 0; i < STREAKS; i++) {
      const w = sides[i % sides.length];
      const sheet = Math.floor(rnd() * SHEETS);
      const u = (sheet + 0.5) / SHEETS + ((rnd() - 0.5) * SHEET_WIDE) / Math.max(1, Math.hypot(w.x1 - w.x0, w.z1 - w.z0));
      this.falling.push({ x: w.x0 + (w.x1 - w.x0) * u, z: w.z0 + (w.z1 - w.z0) * u, at: rnd() });
    }
    const b0 = drownedBeats();
    this.dust = new ShowDust([
      { at: b0.upAt, x: mx, y: 0.4, z: mz, size: 8 },
      { at: b0.landAt, x: mx, y: 0.4, z: mz, size: 11 },
    ], true);
    this.sheets.visible = false;
    this.group.add(this.sheets, this.streaks, this.dust.group);
  }

  take(_roots: readonly THREE.Object3D[], _kit?: THREE.Object3D, _material?: KitMaterial) {}

  gone(): boolean {
    return false;
  }

  update(b: BossRun, _at: THREE.Vector3) {
    const on = b.kind === 'drownedKing' && b.ownShow && b.beat === 'intro';
    const t = on ? b.t : 1e9;
    this.dust.update(t);
    const s = drownedBeats();
    // A trickle, then all of it, then spent.
    const going = on && t >= s.pull && t < s.finFrom + 0.6;
    this.sheets.visible = going;
    if (!going) {
      this.streaks.count = 0;
      return;
    }
    const burst = t >= s.burstAt ? Math.min(1, (t - s.burstAt) / 0.25) : 0;
    const spent = Math.max(0, Math.min(1, (t - (s.finFrom - 0.2)) / 0.8));
    const share = (WEEP_SHARE + (1 - WEEP_SHARE) * burst) * (1 - spent);
    this.sheetMat.opacity = 0.42 * burst * (1 - spent);
    const count = Math.round(STREAKS * share);
    for (let i = 0; i < count; i++) {
      const f = this.falling[i];
      const c = (t * (STREAK_FAST / FALL_TOP) + f.at) % 1;
      pos.set(f.x, FALL_TOP * (1 - c), f.z);
      this.streaks.setMatrixAt(i, m.compose(pos, q.identity(), scl.set(STREAK[0], STREAK[1], STREAK[2])));
    }
    this.streaks.count = count;
    this.streaks.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo?.dispose();
    this.mat.dispose();
    this.dust.dispose();
    this.sheets.dispose();
    this.streaks.dispose();
    for (const g of [this.sheetGeo, this.streakGeo]) g.dispose();
    for (const x of [this.sheetMat, this.streakMat]) x.dispose();
  }
}
