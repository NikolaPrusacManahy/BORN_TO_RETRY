// Update 0.3.56 — the Frost Roc's plateau seen from it (world/dungeon/plateau.ts): snowy peaks all round past its walls, where the
// floor leaves room for them, and the cliff on the side with no doorway, its top where the cornice hangs (rocFx.ts). No collision:
// you can't reach them. Made in code, one mesh for the lot, nothing moves.
// Update 0.3.57 — its show (sim/dungeon/rocShow.ts): the glacier in its middle, cracks glowing brighter at each thump, its eyes opening
// in the ice; the ice flung out as it bursts; the snow blowing; dust where it bursts and lands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { rocBeats } from '../../sim/dungeon/rocShow';
import { FROST_ROC } from '../../tuning/frostRoc';
import { ShowDust } from '../shrine/showDust';
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

/** Its glacier: half how wide, how high, its middle up; a shard's flight. */
const ICE_WIDE = 5.6;
const ICE_HIGH = 4.4;
const ICE_UP = 3.4;
const SHARDS = 44;
const SHARD_FAST = 26;
const SHARD_UP = 16;
const SHARD_GRAVITY = 26;
/** The snow blowing: how many flakes, how far they range round its middle (m), how fast (m/s). */
const FLAKES = 260;
const FLAKE_RANGE = 46;
const FLAKE_FAST = 22;
/** Its eyes in the ice: out from its middle, up, apart, how big (shares of its height). */
const EYE_OUT = 0.3;
const EYE_UP = 0.82;
const EYE_APART = 0.1;
const EYE_SIZE = 0.04;

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

const tpos = new THREE.Vector3();
const tscl = new THREE.Vector3();
const tq = new THREE.Quaternion();
const teul = new THREE.Euler();
const tmat = new THREE.Matrix4();

export class PlateauView implements ShowView {
  readonly group = new THREE.Group();
  private readonly geo: THREE.BufferGeometry | null;
  private readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  private readonly mid: THREE.Vector3;
  private readonly iceGeo: THREE.BufferGeometry;
  private readonly iceMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ee, emissive: 0x2a7aa0, emissiveIntensity: 0.25, roughness: 0.12, transparent: true, opacity: 0.62, flatShading: true, depthWrite: false, side: THREE.DoubleSide });
  private readonly glacier: THREE.Mesh;
  private readonly cracksGeo: THREE.BufferGeometry;
  private readonly cracksMat = new THREE.LineBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly cracks: THREE.LineSegments;
  private readonly shardGeo = new THREE.IcosahedronGeometry(1, 0);
  private readonly shards: THREE.InstancedMesh;
  private readonly shardWays: { x: number; z: number; up: number; size: number; spin: number }[] = [];
  private readonly eyeGeo = new THREE.IcosahedronGeometry(1, 1);
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0xbff4ff, toneMapped: false });
  private readonly eyes: THREE.Mesh[];
  private readonly snowGeo = new THREE.BufferGeometry();
  private readonly snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.75, depthWrite: false });
  private readonly snow: THREE.Points;
  private readonly flakes: Float32Array;
  private readonly windX: number;
  private readonly windZ: number;
  private readonly dust: ShowDust;

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
      mesh.name = 'peaks';
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    // Its show.
    this.mid = new THREE.Vector3(mx, 0, mz);
    const s0 = rocBeats();
    this.dust = new ShowDust([
      { at: s0.burstAt, x: mx, y: 0, z: mz, size: 11 },
      { at: s0.landAt, x: mx, y: 0, z: mz, size: 13 },
    ]);
    const ice = new THREE.IcosahedronGeometry(1, 2).toNonIndexed();
    const ip = ice.getAttribute('position');
    const jag = new Map<string, number>();
    for (let i = 0; i < ip.count; i++) {
      const key = `${ip.getX(i).toFixed(3)},${ip.getY(i).toFixed(3)},${ip.getZ(i).toFixed(3)}`;
      if (!jag.has(key)) jag.set(key, 0.82 + rnd() * 0.36);
      const k = jag.get(key)!;
      ip.setXYZ(i, ip.getX(i) * ICE_WIDE * k, ip.getY(i) * ICE_HIGH * k, ip.getZ(i) * ICE_WIDE * k);
    }
    ice.computeVertexNormals();
    this.iceGeo = ice;
    this.glacier = new THREE.Mesh(this.iceGeo, this.iceMat);
    this.glacier.name = 'glacier';
    this.glacier.position.set(mx, ICE_UP, mz);
    this.glacier.renderOrder = 2;
    this.cracksGeo = new THREE.EdgesGeometry(this.iceGeo, 12);
    this.cracks = new THREE.LineSegments(this.cracksGeo, this.cracksMat);
    this.cracks.position.copy(this.glacier.position);
    this.shards = new THREE.InstancedMesh(this.shardGeo, this.iceMat, SHARDS);
    this.shards.frustumCulled = false;
    this.shards.count = 0;
    for (let i = 0; i < SHARDS; i++) {
      const a = rnd() * Math.PI * 2;
      const fast = SHARD_FAST * (0.35 + rnd() * 0.65);
      this.shardWays.push({ x: Math.cos(a) * fast, z: Math.sin(a) * fast, up: SHARD_UP * (0.3 + rnd() * 0.9), size: 0.4 + rnd() * 1.3, spin: 2 + rnd() * 8 });
    }
    this.eyes = [new THREE.Mesh(this.eyeGeo, this.eyeMat), new THREE.Mesh(this.eyeGeo, this.eyeMat)];
    this.eyes.forEach((e) => (e.visible = false));
    // The snow blowing, across the way you came in.
    this.flakes = new Float32Array(FLAKES * 3);
    for (let i = 0; i < FLAKES; i++) {
      this.flakes[i * 3] = (rnd() * 2 - 1) * FLAKE_RANGE;
      this.flakes[i * 3 + 1] = rnd() * 14;
      this.flakes[i * 3 + 2] = (rnd() * 2 - 1) * FLAKE_RANGE;
    }
    this.snowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLAKES * 3), 3));
    this.snow = new THREE.Points(this.snowGeo, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.position.copy(this.mid);
    this.windX = c.z || 1;
    this.windZ = c.x;
    this.glacier.visible = this.cracks.visible = this.snow.visible = false;
    this.group.add(this.glacier, this.cracks, this.shards, ...this.eyes, this.snow, this.dust.group);
  }

  take(_roots: readonly THREE.Object3D[], _kit?: THREE.Object3D, _material?: KitMaterial) {}

  gone(): boolean {
    return false;
  }

  update(b: BossRun, _at: THREE.Vector3) {
    const on = b.kind === 'frostRoc' && b.ownShow && b.beat === 'intro';
    const t = on ? b.t : 1e9;
    const s = rocBeats();
    const whole = t < s.burstAt;
    // (Before it's stepped in too: the ice waits behind its walls.)
    const waiting = b.kind === 'frostRoc' && b.ownShow && b.beat === 'waiting';
    this.glacier.visible = whole || waiting;
    const thumped = on ? s.thumps.filter((x) => t >= x).length : 0;
    this.cracks.visible = on && whole && thumped > 0;
    if (this.cracks.visible) {
      const since = t - s.thumps[thumped - 1];
      this.cracksMat.opacity = Math.min(1, 0.25 * thumped + 0.5 * Math.max(0, 1 - since / 0.5));
      this.iceMat.emissiveIntensity = 0.25 + 0.3 * thumped + 0.6 * Math.max(0, 1 - since / 0.4);
    } else this.iceMat.emissiveIntensity = 0.25;
    this.drawEyes(on && whole && thumped >= 3, t - s.thumps[2], b);
    this.drawShards(on ? t - s.burstAt : -1);
    this.drawSnow(on && t < s.landAt + 1 ? t : -1);
    this.dust.update(t);
  }

  /** Opening in the ice, looking at you (at the middle's way toward your start: it faces you). */
  private drawEyes(open: boolean, since: number, b: BossRun) {
    for (const e of this.eyes) e.visible = open;
    if (!open) return;
    const h = FROST_ROC.v.rocHeight;
    const k = Math.min(1, since / 0.4);
    const yaw = b.eyeYaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    this.eyes.forEach((e, i) => {
      const side = (i === 0 ? -1 : 1) * EYE_APART * h;
      e.position.set(this.mid.x + fx * EYE_OUT * h - fz * side, EYE_UP * h, this.mid.z + fz * EYE_OUT * h + fx * side);
      e.scale.set(EYE_SIZE * h, EYE_SIZE * h * Math.max(0.15, k), EYE_SIZE * h);
    });
  }

  /** The ice flung out from where it burst, falling and gone. */
  private drawShards(since: number) {
    if (since < 0 || since > 2.2) {
      this.shards.count = 0;
      return;
    }
    let n = 0;
    for (const w of this.shardWays) {
      const y = ICE_UP + w.up * since - 0.5 * SHARD_GRAVITY * since * since;
      if (y < 0) continue;
      tpos.set(this.mid.x + w.x * since, y, this.mid.z + w.z * since);
      teul.set(w.spin * since, w.spin * 0.7 * since, 0);
      tmat.compose(tpos, tq.setFromEuler(teul), tscl.setScalar(w.size));
      this.shards.setMatrixAt(n++, tmat);
    }
    this.shards.count = n;
    this.shards.instanceMatrix.needsUpdate = true;
  }

  /** The snow, blowing across the plateau; `t`: the show's time (−1: none). */
  private drawSnow(t: number) {
    this.snow.visible = t >= 0;
    if (t < 0) return;
    const p = this.snowGeo.getAttribute('position') as THREE.BufferAttribute;
    const span = FLAKE_RANGE * 2;
    for (let i = 0; i < FLAKES; i++) {
      const x = this.flakes[i * 3] + this.windX * FLAKE_FAST * t;
      const z = this.flakes[i * 3 + 2] + this.windZ * FLAKE_FAST * t;
      p.setXYZ(i, ((((x + FLAKE_RANGE) % span) + span) % span) - FLAKE_RANGE, this.flakes[i * 3 + 1] - Math.sin(t + i) * 0.5, ((((z + FLAKE_RANGE) % span) + span) % span) - FLAKE_RANGE);
    }
    p.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo?.dispose();
    this.mat.dispose();
    for (const g of [this.iceGeo, this.cracksGeo, this.shardGeo, this.eyeGeo, this.snowGeo]) g.dispose();
    for (const m of [this.iceMat, this.cracksMat, this.eyeMat, this.snowMat]) m.dispose();
    this.dust.dispose();
  }
}
