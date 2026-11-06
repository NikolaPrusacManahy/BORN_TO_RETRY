// Update 0.3.63 — Hellwarden's throne room seen from inside it (world/dungeon/throne.ts): floating in a void, the great throne standing past
// the far wall, chains as thick as a man running up out of sight from each corner, rock floating round it. No collision. Made in code, one
// mesh for the lot, nothing moves.
// Update 0.3.64 — its show (sim/dungeon/wardenShow.ts): the rift the floor splits along, lava rising in it, and embers.
// Update 0.3.65 — the designer's shot list: its door and torches (throneDoor.ts), its bones (throneBones.ts), the rocks its armor's in (throneRocks.ts),
// and the rift a river of lava now, flowing, charred at its edges, lighting the floor round it.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { riverOpen, wardenBeats, wardenViewT } from '../../sim/dungeon/wardenShow';
import { loadSave } from '../../state/settings';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { cellAt, colAt, rowAt, type FloorPlan } from '../../world/dungeon/floorPlan';
import type { ShowView } from '../boss/showViews';
import { auraTexture } from '../keyLooks';
import type { KitMaterial } from '../shrine/isleMesh';
import { ShowDust } from '../shrine/showDust';
import { ThroneBones } from './throneBones';
import { ThroneDoor } from './throneDoor';
import { ThroneRocks } from './throneRocks';

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
/** Its river: how long (m), how wide at its widest. Embers. */
export const RIVER_LONG = 48;
export const RIVER_WIDE = 6;
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

/** The river: a jagged crack lying flat, along z, 1 long, up to 1 wide, its ends coming to points; seeded, so every run the same. */
function riverGeometry(): THREE.BufferGeometry {
  let s = 4409;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const n = 22;
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const w = Math.sin(u * Math.PI) ** 0.4 * 0.5;
    left.push(new THREE.Vector2(-w * (0.68 + rnd() * 0.32), u - 0.5));
    right.push(new THREE.Vector2(w * (0.68 + rnd() * 0.32), u - 0.5));
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape([...left, ...right.reverse()]));
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Lava: dark crust, seams of orange and yellow, seeded. It wraps, so it can flow. */
function lavaTexture(): THREE.DataTexture {
  const n = 128;
  let s = 7717;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const dots = Array.from({ length: 34 }, () => [rnd() * n, rnd() * n]);
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // How near the seam between the two nearest blobs.
      let a = 1e9;
      let b = 1e9;
      for (const [dx, dy] of dots) {
        const ox = Math.min(Math.abs(x - dx), n - Math.abs(x - dx));
        const oy = Math.min(Math.abs(y - dy), n - Math.abs(y - dy));
        const d = Math.hypot(ox, oy);
        if (d < a) [a, b] = [d, a];
        else if (d < b) b = d;
      }
      const seam = Math.max(0, 1 - (b - a) / 9);
      const r = 200 + 55 * seam;
      const g = 52 + 170 * seam ** 1.6;
      const bl = 8 + 90 * seam ** 3;
      data.set([r, g, bl, 255], (y * n + x) * 4);
    }
  }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
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
  /** Update 0.3.65 — its show's parts (the tests and the render tool see them). */
  readonly door: ThroneDoor;
  readonly bones: ThroneBones;
  readonly rocks: ThroneRocks;
  private readonly roomArea: { min: { x: number; z: number }; max: { x: number; z: number } };
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, emissive: 0x200804 });
  private readonly riverGeo = riverGeometry();
  private readonly lava = lavaTexture();
  private readonly lavaMat = new THREE.MeshBasicMaterial({ map: this.lava, toneMapped: false, side: THREE.DoubleSide });
  private readonly river: THREE.Mesh;
  private readonly charMat = new THREE.MeshBasicMaterial({ color: 0x0c0606, side: THREE.DoubleSide });
  private readonly char: THREE.Mesh;
  private readonly glowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly glowMat = new THREE.MeshBasicMaterial({ map: auraTexture(), color: 0xff5a18, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly glow: THREE.Mesh;
  private readonly dust: ShowDust;
  private readonly emberGeo = new THREE.BufferGeometry();
  private readonly emberMat = new THREE.PointsMaterial({ color: 0xffa040, size: 0.2, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly embers: THREE.Points;
  private readonly seeds: Float32Array;
  private clock = 0;

  constructor(level: DungeonLevel) {
    let s = 7001;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const parts: THREE.BufferGeometry[] = [];
    const mx = level.boss.portal.x;
    const mz = level.boss.portal.z;
    this.roomArea = level.boss.end;
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
    // Its show: the river across its middle, along the way to you.
    this.lava.repeat.set(2.5, 14);
    this.char = new THREE.Mesh(this.riverGeo, this.charMat);
    this.char.position.set(mx, 0.035, mz);
    this.char.rotation.y = yaw;
    this.river = new THREE.Mesh(this.riverGeo, this.lavaMat);
    this.river.name = 'river';
    this.river.position.set(mx, 0.05, mz);
    this.river.rotation.y = yaw;
    this.glow = new THREE.Mesh(this.glowGeo, this.glowMat);
    this.glow.name = 'glow';
    this.glow.position.set(mx, 0.08, mz);
    this.glow.rotation.y = yaw;
    this.char.visible = this.river.visible = this.glow.visible = false;
    this.door = new ThroneDoor(level);
    // (The more you've fallen, the more bones.)
    this.bones = new ThroneBones(level.plan, mx, mz, -fx, -fz, RIVER_WIDE / 2, RIVER_LONG / 2, loadSave().deaths);
    this.rocks = new ThroneRocks(mx, mz);
    const b0 = wardenBeats();
    this.dust = new ShowDust([
      { at: b0.doorAt, x: this.door.at.x, y: 0, z: this.door.at.z, size: 3.5 },
      { at: b0.riverFrom + 0.2, x: mx, y: 0, z: mz, size: 8 },
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
    this.group.add(this.char, this.river, this.glow, this.door.group, this.bones.group, this.rocks.group, this.dust.group, this.embers);
  }

  take(_roots: readonly THREE.Object3D[], kit?: THREE.Object3D, material?: KitMaterial) {
    if (kit) this.bones.take(kit, material);
  }

  gone(): boolean {
    return false;
  }

  update(b: BossRun, at: THREE.Vector3) {
    const on = b.kind === 'hellwarden' && b.ownShow && b.beat === 'intro';
    const t = on ? b.t : 1e9;
    this.clock += 1 / 60;
    const vt = on ? wardenViewT(t) : 1e9;
    this.dust.update(t);
    // Its door and fires; only near enough to be seen is anything lit.
    const a = this.roomArea;
    const near = at.x > a.min.x - 4 && at.x < a.max.x + 4 && at.z > a.min.z - 4 && at.z < a.max.z + 4;
    this.door.update(b, near || on, this.clock);
    this.bones.update(b.beat === 'waiting' ? 'waiting' : on ? 'show' : 'gone', vt);
    const ux = -Math.sin(b.eyeYaw);
    const uz = -Math.cos(b.eyeYaw);
    this.rocks.update(on, vt, ux, uz);
    // The river.
    const k = on ? riverOpen(vt) : 0;
    this.char.visible = this.river.visible = this.glow.visible = k > 0;
    if (k > 0) {
      const long = RIVER_LONG * Math.min(1, k * 1.6 + 0.05);
      this.river.scale.set(RIVER_WIDE * k, 1, long);
      this.char.scale.set(RIVER_WIDE * k * 1.16 + 0.15, 1, long * 1.02);
      this.glow.scale.set(RIVER_WIDE * k * 4.2 + 3, 1, long * 1.5);
      this.glowMat.opacity = 0.62 * Math.min(1, k * 1.5);
      this.lava.offset.y = -vt * 0.09;
    }
    this.embers.visible = on && t >= wardenBeats().riverFrom;
    if (!this.embers.visible) return;
    const p = this.emberGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < EMBERS; i++) {
      const c = (vt * 0.22 + this.seeds[i * 3 + 1]) % 1;
      p.setXYZ(i, this.seeds[i * 3] + Math.sin(vt + i) * 0.8, c * 14, this.seeds[i * 3 + 2] + Math.cos(vt * 0.7 + i) * 0.8);
    }
    p.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo?.dispose();
    this.mat.dispose();
    this.dust.dispose();
    this.door.dispose();
    this.bones.dispose();
    this.rocks.dispose();
    this.riverGeo.dispose();
    this.lavaMat.dispose();
    this.lava.dispose();
    this.charMat.dispose();
    this.glowGeo.dispose();
    this.glowMat.dispose();
    this.emberGeo.dispose();
    this.emberMat.dispose();
  }
}
