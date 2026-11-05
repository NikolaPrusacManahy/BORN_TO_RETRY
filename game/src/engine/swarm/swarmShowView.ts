// Update 0.3.52 — The Swarm's nest drawn on its floor (world/dungeon/nest.ts; the bible: "a round flesh cavern, soft floor"):
// a disc of wet flesh over the paving, veined, slowly pulsing; a wall of flesh standing round it, ribbed and lumped, gaps at
// the doorways; each pillar sheathed in flesh. Made in code. Its show (sim/dungeon/swarmShow.ts): the ground heaving where its
// heap closes. Drawn from the show's time.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { swarmBeats } from '../../sim/dungeon/swarmShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { inNestGap, NEST_RADIUS, nestDoors } from '../../world/dungeon/nest';
import type { KitMaterial } from '../shrine/isleMesh';
import { ShowDust } from '../shrine/showDust';

/** The wall of flesh: how high (m), its columns and rows of faces, how deep its ribs and lumps go (m). */
const WALL_HIGH = 12;
const WALL_SEGS = 260;
const WALL_ROWS = 12;
const RIB = 0.2;
const LUMP = 0.14;
/** Its top leans in from this high (m), this far by its top (m); a rim of flesh out from its top, over the steps, this far (m). */
const LEAN_FROM = 6;
const LEAN = 1.6;
const RIM = 44;
/** Over a doorway the flesh starts this high (m). */
const LINTEL = 5;
/** The floor of flesh: rings and spokes. A sheath: how high, how many round, its rows. */
const FLOOR_RINGS = 40;
const FLOOR_SPOKES = 160;
const SHEATH_HIGH = 5.4;
const SHEATH_ROUND = 12;
const SHEATH_ROWS = 9;

const DARK = new THREE.Color(0x4a0f1a);
const MEAT = new THREE.Color(0x8c2533);
const PALE = new THREE.Color(0xc25665);
const VEIN = new THREE.Color(0x2c0810);
const col = new THREE.Color();

/** A cheap, smooth, seeded lump field. */
const lump = (x: number, y: number) => Math.sin(x * 1.3 + Math.sin(y * 0.7) * 1.4) * Math.cos(y * 1.1 + Math.sin(x * 0.9) * 1.2);

export class SwarmShowView {
  readonly group = new THREE.Group();
  private readonly floorMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.02, emissive: 0x3a0610, emissiveIntensity: 0.3 });
  private readonly wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.02, emissive: 0x2a050c, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  private readonly dust: ShowDust;
  private readonly stuff: { dispose(): void }[] = [];
  private time = 0;

  constructor(private readonly level: DungeonLevel) {
    const p = level.boss.portal;
    const s = swarmBeats();
    this.dust = new ShowDust([
      { at: s.pourFrom, x: p.x, y: 0, z: p.z, size: 12 },
      { at: s.heapFrom, x: p.x, y: 0, z: p.z, size: 9 },
    ]);
    const floor = new THREE.Mesh(this.floorGeo(), this.floorMat);
    floor.position.set(p.x, 0, p.z);
    floor.receiveShadow = true;
    const rim = new THREE.Mesh(this.rimGeo(), this.wallMat);
    rim.position.set(p.x, 0, p.z);
    rim.frustumCulled = false;
    const wall = new THREE.Mesh(this.wallGeo(), this.wallMat);
    wall.position.set(p.x, 0, p.z);
    wall.castShadow = wall.receiveShadow = true;
    wall.frustumCulled = false;
    this.group.add(floor, wall, rim, this.dust.group);
    this.sheaths();
    this.stuff.push(this.floorMat, this.wallMat, this.dust, floor.geometry, wall.geometry, rim.geometry);
  }

  /** The disc of flesh, its veins dark along a lump field's creases. */
  private floorGeo(): THREE.BufferGeometry {
    const pos: number[] = [];
    const rgb: number[] = [];
    const idx: number[] = [];
    const R = NEST_RADIUS + 0.6;
    pos.push(0, 0.012, 0);
    rgb.push(MEAT.r, MEAT.g, MEAT.b);
    for (let r = 1; r <= FLOOR_RINGS; r++) {
      const rr = (r / FLOOR_RINGS) * R;
      for (let a = 0; a < FLOOR_SPOKES; a++) {
        const t = (a / FLOOR_SPOKES) * Math.PI * 2;
        const x = Math.cos(t) * rr;
        const z = Math.sin(t) * rr;
        const f = lump(x * 0.9, z * 0.9);
        // (Barely any height, so nothing sinks into it: its look's in its colour and its normals.)
        pos.push(x, 0.012 + 0.008 * (f + 1), z);
        const vein = Math.abs(lump(x * 0.45 + 3, z * 0.45 - 2));
        col.copy(DARK).lerp(MEAT, 0.5 + 0.5 * f);
        if (vein < 0.09) col.lerp(VEIN, 0.8);
        else if (f > 0.75) col.lerp(PALE, 0.3);
        rgb.push(col.r, col.g, col.b);
      }
    }
    for (let a = 0; a < FLOOR_SPOKES; a++) idx.push(0, 1 + ((a + 1) % FLOOR_SPOKES), 1 + a);
    for (let r = 0; r < FLOOR_RINGS - 1; r++) {
      for (let a = 0; a < FLOOR_SPOKES; a++) {
        const b = (a + 1) % FLOOR_SPOKES;
        const i0 = 1 + r * FLOOR_SPOKES + a;
        const i1 = 1 + r * FLOOR_SPOKES + b;
        const i2 = 1 + (r + 1) * FLOOR_SPOKES + a;
        const i3 = 1 + (r + 1) * FLOOR_SPOKES + b;
        idx.push(i0, i1, i2, i1, i3, i2);
      }
    }
    return this.mesh(pos, rgb, idx);
  }

  /** From the wall's top out over the steps: what's seen of it from above, a pit in a mass of flesh. */
  private rimGeo(): THREE.BufferGeometry {
    const pos: number[] = [];
    const rgb: number[] = [];
    const idx: number[] = [];
    const rings = 7;
    const inner = NEST_RADIUS - LEAN + 0.2;
    for (let a = 0; a <= WALL_SEGS / 2; a++) {
      const t = (a / (WALL_SEGS / 2)) * Math.PI * 2;
      for (let r = 0; r < rings; r++) {
        const u = r / (rings - 1);
        const rr = inner + (RIM - inner) * u;
        const x = Math.cos(t) * rr;
        const z = Math.sin(t) * rr;
        const f = lump(x * 0.3, z * 0.3);
        pos.push(x, WALL_HIGH + 1.2 * Math.sin(u * Math.PI) * (0.5 + 0.5 * f), z);
        col.copy(DARK).lerp(MEAT, 0.5 + 0.5 * f);
        rgb.push(col.r, col.g, col.b);
      }
    }
    for (let a = 0; a < WALL_SEGS / 2; a++) {
      for (let r = 0; r < rings - 1; r++) {
        const i0 = a * rings + r;
        const i1 = i0 + 1;
        const i2 = (a + 1) * rings + r;
        const i3 = i2 + 1;
        idx.push(i0, i1, i2, i1, i3, i2);
      }
    }
    return this.mesh(pos, rgb, idx);
  }

  /** The wall of flesh: a ribbed, lumpy band round the room, open at its doorways. */
  private wallGeo(): THREE.BufferGeometry {
    const doors = nestDoors(this.level.plan);
    const pos: number[] = [];
    const rgb: number[] = [];
    const idx: number[] = [];
    const rows = WALL_ROWS + 1;
    for (let a = 0; a <= WALL_SEGS; a++) {
      const t = (a / WALL_SEGS) * Math.PI * 2;
      const dx = Math.cos(t);
      const dz = Math.sin(t);
      for (let r = 0; r < rows; r++) {
        const u = r / WALL_ROWS;
        const y = WALL_HIGH * u;
        // Ribs rising up it, lumps across them, leaning in as it rises; never in front of where you walk.
        const rib = Math.sin(t * 34 + Math.sin(y * 0.4) * 1.5);
        const f = lump(t * 9, y * 0.35);
        const up = Math.max(0, (y - LEAN_FROM) / (WALL_HIGH - LEAN_FROM));
        const rr = NEST_RADIUS + 0.3 + RIB * rib + LUMP * f - LEAN * up * up;
        pos.push(dx * rr, y, dz * rr);
        col.copy(DARK).lerp(MEAT, 0.5 + 0.5 * rib);
        if (f > 0.5) col.lerp(PALE, 0.35 * (f - 0.5) * 2);
        if (Math.abs(lump(t * 4 + 7, y * 0.2)) < 0.07) col.lerp(VEIN, 0.75);
        rgb.push(col.r, col.g, col.b);
      }
    }
    for (let a = 0; a < WALL_SEGS; a++) {
      const t0 = (a / WALL_SEGS) * Math.PI * 2;
      const t1 = ((a + 1) / WALL_SEGS) * Math.PI * 2;
      // (A doorway's gap: open to above its arch, the flesh closing over it.)
      const gap = inNestGap(doors, Math.cos(t0), Math.sin(t0), NEST_RADIUS) || inNestGap(doors, Math.cos(t1), Math.sin(t1), NEST_RADIUS);
      for (let r = 0; r < WALL_ROWS; r++) {
        if (gap && (WALL_HIGH * r) / WALL_ROWS < LINTEL) continue;
        const i0 = a * rows + r;
        const i1 = i0 + 1;
        const i2 = (a + 1) * rows + r;
        const i3 = i2 + 1;
        idx.push(i0, i2, i1, i1, i2, i3);
      }
    }
    return this.mesh(pos, rgb, idx);
  }

  /** A sheath of flesh round each pillar in the room. */
  private sheaths() {
    const b = this.level.boss.end;
    const pillars = (this.level.arena.pillars ?? []).filter((q) => q.x > b.min.x && q.x < b.max.x && q.z > b.min.z && q.z < b.max.z);
    if (pillars.length === 0) return;
    const pos: number[] = [];
    const rgb: number[] = [];
    const idx: number[] = [];
    const rows = SHEATH_ROWS + 1;
    for (let a = 0; a <= SHEATH_ROUND; a++) {
      const t = (a / SHEATH_ROUND) * Math.PI * 2;
      for (let r = 0; r < rows; r++) {
        const u = r / SHEATH_ROWS;
        // Wide at its foot, in at its waist, out round the pillar's head.
        const rr = 0.95 + 0.75 * (1 - u) ** 3 + 0.22 * u ** 3 + 0.14 * lump(t * 2, u * 6);
        pos.push(Math.cos(t) * rr, u * SHEATH_HIGH, Math.sin(t) * rr);
        col.copy(DARK).lerp(MEAT, 0.5 + 0.5 * Math.sin(t * 5 + u * 4));
        rgb.push(col.r, col.g, col.b);
      }
    }
    for (let a = 0; a < SHEATH_ROUND; a++) {
      for (let r = 0; r < SHEATH_ROWS; r++) {
        const i0 = a * rows + r;
        const i1 = i0 + 1;
        const i2 = (a + 1) * rows + r;
        const i3 = i2 + 1;
        idx.push(i0, i1, i2, i1, i3, i2);
      }
    }
    const geo = this.mesh(pos, rgb, idx);
    const inst = new THREE.InstancedMesh(geo, this.wallMat, pillars.length);
    const m = new THREE.Matrix4();
    pillars.forEach((q, i) => {
      m.makeRotationY(i * 1.7);
      m.setPosition(q.x, 0, q.z);
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = inst.receiveShadow = true;
    inst.frustumCulled = false;
    this.group.add(inst);
    this.stuff.push(geo, { dispose: () => inst.dispose() });
  }

  private mesh(pos: number[], rgb: number[], idx: number[]): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(rgb, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  take(_roots: readonly THREE.Object3D[], _kit?: THREE.Object3D, _material?: KitMaterial) {}

  gone(): boolean {
    return false;
  }

  update(b: BossRun) {
    const t = b.kind !== 'swarm' || b.beat === 'waiting' ? -1 : b.beat === 'intro' ? b.t : Infinity;
    this.dust.update(t);
    // It breathes.
    this.time += 1 / 60;
    const k = 0.3 + 0.16 * Math.sin(this.time * 1.5);
    this.floorMat.emissiveIntensity = k;
    this.wallMat.emissiveIntensity = k;
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
