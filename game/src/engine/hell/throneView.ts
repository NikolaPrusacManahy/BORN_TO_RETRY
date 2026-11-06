// Update 0.3.63 — Hellwarden's throne room seen from inside it (world/dungeon/throne.ts): floating in a void, the great throne standing past
// the far wall, chains as thick as a man running up out of sight from each corner, rock floating round it. No collision. Made in code, one
// mesh for the lot, nothing moves.
// Update 0.3.64 — its show (sim/dungeon/wardenShow.ts): the rift the floor splits along, lava rising in it, and embers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { riftOpen, wardenBeats } from '../../sim/dungeon/wardenShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { cellAt, colAt, rowAt, type FloorPlan } from '../../world/dungeon/floorPlan';
import type { ShowView } from '../boss/showViews';
import type { KitMaterial } from '../shrine/isleMesh';
import { ShowDust } from '../shrine/showDust';

/** Rocks floating: how many tried, how far (m), how high. */
const ROCKS = 34;
const NEAR = 46;
const FAR = 110;
/** Clear of the floor's rooms by this much (m). */
const CLEAR = 6;
/** Its throne: how far past its middle, how big (m). */
const THRONE_OUT = 52;
const THRONE_SIZE = 28;
/** Its chains: links, how far out. */
const CHAIN_LINKS = 14;
const CHAIN_OUT = 40;
const CHAIN_TOP = 60;
/** Its rift: how long (m), how wide at its widest. Embers. */
const RIFT_LONG = 44;
const RIFT_WIDE = 6;
const EMBERS = 200;
const EMBER_RANGE = 30;

const OBSIDIAN = new THREE.Color(0x1a1416);
const BASALT = new THREE.Color(0x2c2022);
const EMBER = new THREE.Color(0x7a2a12);
const IRON = new THREE.Color(0x2a2a30);

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

function box(x: number, y: number, z: number, w: number, h: number, d: number, yaw: number, c: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.rotateY(yaw);
  g.translate(x, y, z);
  return painted(g, () => c);
}

function clearOfRooms(plan: FloorPlan, x: number, z: number, clear: number): boolean {
  for (const dx of [-clear, 0, clear]) {
    for (const dz of [-clear, 0, clear]) {
      if (cellAt(plan, colAt(x + dx), rowAt(z + dz)) !== 'void') return false;
    }
  }
  return true;
}

export class ThroneView implements ShowView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, emissive: 0x200804 });
  private readonly riftGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6a18, toneMapped: false });
  private readonly rift: THREE.Mesh;
  private readonly riftGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4a10, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly riftGlow: THREE.Mesh;
  private readonly dust: ShowDust;
  private readonly emberGeo = new THREE.BufferGeometry();
  private readonly emberMat = new THREE.PointsMaterial({ color: 0xffa040, size: 0.2, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly embers: THREE.Points;
  private readonly seeds: Float32Array;

  constructor(level: DungeonLevel) {
    let s = 7001;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const parts: THREE.BufferGeometry[] = [];
    const mx = level.boss.portal.x;
    const mz = level.boss.portal.z;
    // Rocks floating in the void.
    for (let i = 0; i < ROCKS; i++) {
      const a = (i / ROCKS) * Math.PI * 2 + rnd() * 0.3;
      const r = NEAR + rnd() * (FAR - NEAR);
      const x = mx + Math.cos(a) * r;
      const z = mz + Math.sin(a) * r;
      const size = 3 + rnd() * 9;
      if (!clearOfRooms(level.plan, x, z, size + CLEAR)) continue;
      const g = new THREE.IcosahedronGeometry(size, 1).toNonIndexed();
      g.scale(1, 0.6 + rnd() * 0.5, 1);
      g.rotateY(rnd() * Math.PI);
      g.translate(x, rnd() * 26 - 4, z);
      parts.push(painted(g, () => (rnd() < 0.3 ? EMBER : OBSIDIAN)));
    }
    // Its throne, past the wall on the far side from the way you came in.
    const e = level.boss.entrance;
    const fx = e === 'w' ? 1 : e === 'e' ? -1 : 0;
    const fz = e === 'n' ? 1 : e === 's' ? -1 : 0;
    const yaw = Math.atan2(fx, fz);
    const t = THRONE_SIZE;
    const tx = mx + fx * THRONE_OUT;
    const tz = mz + fz * THRONE_OUT;
    if (clearOfRooms(level.plan, tx, tz, t * 0.6)) {
      const side = (u: number) => [tx - fz * u, tz + fx * u] as const;
      parts.push(box(tx, t * 0.2, tz, t, t * 0.4, t * 0.8, yaw, BASALT));
      parts.push(box(tx + fx * t * 0.3, t * 0.85, tz + fz * t * 0.3, t, t * 1.3, t * 0.2, yaw, OBSIDIAN));
      for (const u of [-0.5, 0.5]) {
        const [ax, az] = side(u * t);
        parts.push(box(ax, t * 0.55, az, t * 0.14, t * 0.4, t * 0.8, yaw, BASALT));
        // Horns on its back.
        const horn = new THREE.ConeGeometry(t * 0.09, t * 0.5, 6).toNonIndexed();
        horn.translate(ax + fx * t * 0.3, t * 1.7, az + fz * t * 0.3);
        parts.push(painted(horn, () => EMBER));
      }
    }
    // Its chains, up out of sight.
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const bx = mx + sx * CHAIN_OUT;
      const bz = mz + sz * CHAIN_OUT;
      if (!clearOfRooms(level.plan, bx, bz, CLEAR)) continue;
      for (let k = 0; k < CHAIN_LINKS; k++) {
        const u = k / CHAIN_LINKS;
        const y = u * CHAIN_TOP + 4;
        const link = new THREE.TorusGeometry(1.5, 0.45, 5, 8).toNonIndexed();
        link.scale(1, 1.5, 1);
        if (k % 2) link.rotateY(Math.PI / 2);
        link.translate(bx + sx * u * 16, y, bz + sz * u * 16);
        parts.push(painted(link, () => IRON));
      }
    }
    this.geo = parts.length ? mergeGeometries(parts) : null;
    for (const p of parts) p.dispose();
    if (this.geo) {
      const mesh = new THREE.Mesh(this.geo, this.mat);
      mesh.name = 'void';
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    // Its show: the rift across its middle, along the way to you.
    this.rift = new THREE.Mesh(this.riftGeo, this.lavaMat);
    this.rift.name = 'rift';
    this.rift.position.set(mx, 0.02, mz);
    this.rift.rotation.y = yaw;
    this.riftGlow = new THREE.Mesh(this.riftGeo, this.riftGlowMat);
    this.riftGlow.position.copy(this.rift.position);
    this.riftGlow.rotation.y = yaw;
    this.rift.visible = this.riftGlow.visible = false;
    const b0 = wardenBeats();
    this.dust = new ShowDust([
      { at: b0.riftFrom + 0.2, x: mx, y: 0, z: mz, size: 8 },
      { at: b0.blowAt, x: mx, y: 0, z: mz, size: 12 },
    ]);
    this.seeds = new Float32Array(EMBERS * 3);
    for (let i = 0; i < EMBERS; i++) {
      this.seeds[i * 3] = (rnd() * 2 - 1) * EMBER_RANGE;
      this.seeds[i * 3 + 1] = rnd();
      this.seeds[i * 3 + 2] = (rnd() * 2 - 1) * EMBER_RANGE;
    }
    this.emberGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EMBERS * 3), 3));
    this.embers = new THREE.Points(this.emberGeo, this.emberMat);
    this.embers.frustumCulled = false;
    this.embers.position.set(mx, 0, mz);
    this.embers.visible = false;
    this.group.add(this.rift, this.riftGlow, this.dust.group, this.embers);
  }

  take(_roots: readonly THREE.Object3D[], _kit?: THREE.Object3D, _material?: KitMaterial) {}

  gone(): boolean {
    return false;
  }

  update(b: BossRun, _at: THREE.Vector3) {
    const on = b.kind === 'hellwarden' && b.ownShow && b.beat === 'intro';
    const t = on ? b.t : 1e9;
    this.dust.update(t);
    const k = on ? riftOpen(t) : 0;
    this.rift.visible = this.riftGlow.visible = k > 0;
    if (k > 0) {
      this.rift.scale.set(RIFT_WIDE * k, 0.05, RIFT_LONG * Math.min(1, k * 1.6));
      this.riftGlow.scale.set(RIFT_WIDE * k * 1.6, 1.4 * k, RIFT_LONG * Math.min(1, k * 1.6));
    }
    this.embers.visible = on;
    if (!on) return;
    const p = this.emberGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < EMBERS; i++) {
      const c = (t * 0.22 + this.seeds[i * 3 + 1]) % 1;
      p.setXYZ(i, this.seeds[i * 3] + Math.sin(t + i) * 0.8, c * 14, this.seeds[i * 3 + 2] + Math.cos(t * 0.7 + i) * 0.8);
    }
    p.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo?.dispose();
    this.mat.dispose();
    this.dust.dispose();
    this.riftGeo.dispose();
    this.lavaMat.dispose();
    this.riftGlowMat.dispose();
    this.emberGeo.dispose();
    this.emberMat.dispose();
  }
}
