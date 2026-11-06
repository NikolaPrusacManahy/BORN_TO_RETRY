// Update 0.3.65 — the first beat of Hellwarden's show (the designer's shot list: "Door slams, torches die"): the small room you walk into lit by braziers;
// behind you an iron door drops behind the bars; the fires go out one after another away from it, each in a puff of smoke, and the room's in the dark.
// The braziers sink away unseen as its walls go back. Made in code.
import * as THREE from 'three';
import { wardenBeats } from '../../sim/dungeon/wardenShow';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { BRAZIER } from '../../world/dungeon/hell';
import { HALOS } from '../halos';
import { auraTexture } from '../keyLooks';
import { brazierGeometry } from './hellView';

/** Its door drops in this long (s). A flame's cones, how high (m). */
const DROP = 0.13;
const CONES = 3;
const FLAME = 1.8;
/** A puff of smoke lasts this long (s), rising this high (m). */
const PUFF = 1;
const PUFF_UP = 3;

const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

interface Fire {
  x: number;
  z: number;
  out: number;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

function doorGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const slab = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const parts: THREE.BufferGeometry[] = [slab];
  const wide = d > w;
  for (const y of [-0.34, 0, 0.34]) {
    const strap = new THREE.BoxGeometry(wide ? w + 0.14 : w * 1.02, 0.34, wide ? d * 1.02 : d + 0.14).toNonIndexed();
    strap.translate(0, y * h, 0);
    parts.push(strap);
  }
  const pos0 = parts.flatMap((g) => Array.from(g.getAttribute('position').array));
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos0, 3));
  out.computeVertexNormals();
  for (const g of parts) g.dispose();
  return out;
}

export class ThroneDoor {
  readonly group = new THREE.Group();
  private readonly door: THREE.Mesh;
  private readonly doorGeo: THREE.BufferGeometry;
  private readonly doorMat = new THREE.MeshStandardMaterial({ color: 0x1d1a1c, roughness: 0.55, flatShading: true });
  private readonly doorY: number;
  private readonly fires: Fire[] = [];
  private readonly iron: THREE.InstancedMesh;
  private readonly ironGeo = brazierGeometry();
  private readonly ironMat = new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 0.55, flatShading: true });
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
  private readonly flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames: THREE.InstancedMesh;
  private readonly puffs: THREE.Sprite[] = [];
  private readonly puffMat: THREE.SpriteMaterial[] = [];
  /** Where it is (for the tests and its shot). */
  readonly at = new THREE.Vector3();

  constructor(level: DungeonLevel) {
    const b = level.boss;
    const room = level.rooms[b.room];
    const fx = b.entrance === 'w' ? 1 : b.entrance === 'e' ? -1 : 0;
    const fz = b.entrance === 'n' ? 1 : b.entrance === 's' ? -1 : 0;
    // The way you came in: its gate on that side.
    const near = (g: number) => {
      const box = level.gates[g];
      return Math.hypot(box.x - (b.portal.x - fx * 100), box.z - (b.portal.z - fz * 100));
    };
    const gate = level.gates[[...room.gates].sort((p, n) => near(p) - near(n))[0]];
    const thin = gate.w < gate.d;
    this.doorGeo = doorGeometry(thin ? 0.3 : gate.w + 0.8, gate.h + 0.8, thin ? gate.d + 0.8 : 0.3);
    this.door = new THREE.Mesh(this.doorGeo, this.doorMat);
    this.doorY = (gate.h + 0.8) / 2;
    this.at.set(gate.x - fx * 0.5, this.doorY, gate.z - fz * 0.5);
    this.door.position.copy(this.at);
    this.door.castShadow = true;
    this.door.visible = false;
    this.group.add(this.door);
    // The fires, down its sides and across its far end.
    const s = b.start;
    const ns = fx === 0;
    const lo = ns ? (fz > 0 ? s.min.z : s.max.z) : fx > 0 ? s.min.x : s.max.x;
    const far = ns ? Math.abs(s.max.z - s.min.z) : Math.abs(s.max.x - s.min.x);
    const side = (ns ? s.max.x - s.min.x : s.max.z - s.min.z) / 2 - 1.8;
    const midSide = ns ? (s.min.x + s.max.x) / 2 : (s.min.z + s.max.z) / 2;
    const spot = (along: number, across: number) => (ns ? { x: midSide + across, z: lo + fz * along } : { x: lo + fx * along, z: midSide + across });
    const lay: [number, number][] = [[1.6, -3.6], [1.6, 3.6], [8, -side], [8, side], [15, -side], [15, side], [22, -side], [22, side], [far - 1.8, -7], [far - 1.8, 7]];
    lay.forEach(([along, across], i) => {
      const p = spot(along, across);
      this.fires.push({ x: p.x, z: p.z, out: i / lay.length });
      const mat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0x3a3634, transparent: true, opacity: 0, depthWrite: false });
      const puff = new THREE.Sprite(mat);
      puff.visible = false;
      this.puffs.push(puff);
      this.puffMat.push(mat);
      this.group.add(puff);
    });
    this.iron = new THREE.InstancedMesh(this.ironGeo, this.ironMat, this.fires.length);
    this.flames = new THREE.InstancedMesh(this.coneGeo, this.flameMat, this.fires.length * CONES);
    this.iron.castShadow = true;
    this.iron.frustumCulled = this.flames.frustumCulled = false;
    this.group.add(this.iron, this.flames);
    this.place(0);
    this.draw(0, 0);
  }

  private place(sink: number) {
    this.fires.forEach((f, i) => {
      this.iron.setMatrixAt(i, m.makeRotationY((f.x * 3 + f.z) % 6.28).setPosition(f.x, -sink, f.z));
    });
    this.iron.instanceMatrix.needsUpdate = true;
  }

  /** Its flames, as they are at `t`; `time`: to flicker. */
  private draw(t: number, time: number) {
    const s = wardenBeats();
    const span = s.torchTo - s.torchFrom;
    let n = 0;
    this.fires.forEach((f, i) => {
      const out = s.torchFrom + f.out * span;
      const age = t - out;
      const k = 1 - smooth(age / 0.1);
      const puff = this.puffs[i];
      const mat = this.puffMat[i];
      const life = age / PUFF;
      puff.visible = life > 0 && life < 1;
      if (puff.visible) {
        puff.position.set(f.x, BRAZIER.bowl + 0.4 + life * PUFF_UP, f.z);
        puff.scale.setScalar(1.2 + life * 2.6);
        mat.opacity = 0.75 * (1 - life);
      }
      if (k <= 0) return;
      for (let c = 0; c < CONES; c++) {
        const a = c * 2.1 + i;
        pos.set(f.x + Math.cos(a) * 0.24, BRAZIER.bowl + 0.05, f.z + Math.sin(a) * 0.24);
        const h = FLAME * k * (0.75 + 0.25 * Math.sin(time * 11 + a * 3));
        this.flames.setMatrixAt(n++, m.compose(pos, q.setFromAxisAngle(Y, a), scl.set(0.42 * k, h, 0.42 * k)));
      }
      HALOS.add(f.x, BRAZIER.bowl + 0.8, f.z, 3.6, 0xff8a3a, 0.6 * k);
    });
    this.flames.count = n;
    if (n > 0) this.flames.instanceMatrix.needsUpdate = true;
  }

  /** `at`: the view (nothing's drawn from far off); `time`: the clock it flickers by. */
  update(b: BossRun, near: boolean, time: number) {
    const s = wardenBeats();
    const on = b.kind === 'hellwarden' && b.ownShow && b.beat === 'intro';
    const t = on ? b.t : b.beat === 'waiting' ? 0 : 1e9;
    // The door: down with a slam, staying till the boss is dead.
    this.door.visible = (on && t >= s.doorAt - DROP) || b.beat === 'fight' || b.beat === 'dying';
    if (this.door.visible) {
      const k = Math.min(1, (t - (s.doorAt - DROP)) / DROP);
      const after = t - s.doorAt;
      this.door.position.y = this.doorY + (1 - k * k) * this.doorY * 2.1 + (after > 0 && after < 0.4 ? Math.abs(Math.sin(after * 24)) * 0.12 * (1 - after / 0.4) : 0);
    }
    const lit = b.beat === 'waiting' || (on && t < s.wallsFrom + 1.6);
    this.iron.visible = this.flames.visible = lit;
    for (const p of this.puffs) if (!on) p.visible = false;
    if (!lit || !near) {
      this.flames.count = 0;
      return;
    }
    if (on) this.place(Math.max(0, (t - s.wallsFrom) * 3));
    this.draw(t, time);
  }

  dispose() {
    this.doorGeo.dispose();
    this.doorMat.dispose();
    this.iron.dispose();
    this.flames.dispose();
    this.ironGeo.dispose();
    this.ironMat.dispose();
    this.coneGeo.dispose();
    this.flameMat.dispose();
    for (const m0 of this.puffMat) m0.dispose();
  }
}
