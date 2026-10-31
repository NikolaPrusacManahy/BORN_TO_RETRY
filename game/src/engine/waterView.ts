// Update 0.2.10 — floor 5's water (the Drowned Temple): the tide over each fight room's low floor (sim/dungeon/tide.ts),
// a sheet of green water at its level, clearer as it drains and gone once it's out; the lily pads riding on it (on the
// floor at low water); a slow shimmer. The Drowned King's room has its own sheet, at its flood's level
// (drownedKingMoves.ts).
import * as THREE from 'three';
import type { ArenaBox } from '../world/arena';
import type { Rect } from '../world/dungeon/assemble';
import type { Placement } from '../world/dungeon/dressing';
import { TIDE } from '../tuning/tide';
import { DROWNED } from '../tuning/drowned';
import { instancePieces } from './kitPieces';

/** How see-through the water is drained to flooded (opacity), and how much its colour shimmers. */
const CLEAR = 0.3;
const DEEP = 0.72;
const SHIMMER = 0.06;
/** Lily pads float this far up on the water (m). */
const FLOAT = 0.015;

export class WaterView {
  readonly group = new THREE.Group();
  private readonly floats = new THREE.Group();
  private readonly sheet = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly flood: THREE.Mesh;
  private readonly floodMat: THREE.MeshStandardMaterial;
  private readonly base: THREE.Color;
  private readonly mats: THREE.Material[] = [];
  private time = 0;

  constructor(rooms: readonly ArenaBox[], colour: number, boss: Rect) {
    this.base = new THREE.Color(colour);
    this.mat = new THREE.MeshStandardMaterial({ color: colour, transparent: true, opacity: DEEP, roughness: 0.15, metalness: 0.05, depthWrite: false });
    this.floodMat = this.mat.clone();
    this.flood = new THREE.Mesh(this.geo, this.floodMat);
    this.flood.position.set((boss.min.x + boss.max.x) / 2, 0, (boss.min.z + boss.max.z) / 2);
    this.flood.scale.set(boss.max.x - boss.min.x, 1, boss.max.z - boss.min.z);
    this.flood.receiveShadow = true;
    this.flood.visible = false;
    for (const r of rooms) {
      const m = new THREE.Mesh(this.geo, this.mat);
      m.position.set(r.x, 0, r.z);
      m.scale.set(r.w, 1, r.d);
      m.receiveShadow = true;
      this.sheet.add(m);
    }
    this.sheet.visible = false;
    this.group.add(this.sheet, this.floats, this.flood);
  }

  /** The lily pads (kit pieces), riding the water. */
  build(kit: THREE.Object3D, floats: readonly Placement[]) {
    instancePieces(this.floats, [kit], floats, this.mats, () => false);
  }

  /** `level`: the tide's top over the low floor (m); `flood`: the Drowned King's water in its room (m). */
  update(level: number, flood: number, dt: number) {
    this.time += dt;
    const k = Math.min(1, level / Math.max(0.01, TIDE.v.depth));
    const shimmer = 1 + SHIMMER * Math.sin(this.time * 1.3);
    this.sheet.visible = level > 0.01;
    this.sheet.position.y = level;
    this.floats.position.y = level + FLOAT;
    this.mat.opacity = CLEAR + (DEEP - CLEAR) * k;
    this.mat.color.copy(this.base).multiplyScalar(shimmer);
    const f = Math.min(1, flood / Math.max(0.01, DROWNED.v.risenDeep));
    this.flood.visible = flood > 0.01;
    this.flood.position.y = flood;
    this.floodMat.opacity = CLEAR + (DEEP - CLEAR) * f;
    this.floodMat.color.copy(this.base).multiplyScalar(shimmer);
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
    this.floodMat.dispose();
    for (const m of this.mats) m.dispose();
  }
}
