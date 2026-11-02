// Update 0.2.4 — floor 4's loose sand on the floor (dressExtras.ts lists it): the beds palms and cacti stand in, and
// quicksand, darker and slowly heaving (so it reads as something to keep out of). Instanced flat tiles; no paving under
// them. Also (out of dungeonView.ts, which had reached its size) the jump pads.
// Update 0.2.23 — floor 2's beds of earth (the look's `sand`), and ash (its `ash`: the Scorched Grove's).
// Update 0.3.14 — each patch a shade of its own (floor 6's cove is sand all over: one flat colour read as a sheet).
import * as THREE from 'three';
import type { SandCell } from '../world/dungeon/dressExtras';
import type { JumpPad } from '../world/arena';

const CELL = 2;
/** How much a patch's shade may differ (a share of its colour). */
const SHADE = 0.08;
/** Quicksand heaves this much (a share of its colour) this fast (rad/s). */
const HEAVE = 0.12;
const HEAVE_RATE = 1.6;

export class SandView {
  readonly group = new THREE.Group();
  private readonly quickMat: THREE.MeshStandardMaterial | null = null;
  private readonly base = new THREE.Color();
  private readonly geo = new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2);
  private readonly mats: THREE.Material[] = [];
  private time = 0;

  constructor(cells: readonly SandCell[], sand = 0xe6c27e, quicksand = 0xb98a4c, ash = 0x3b3631) {
    const m = new THREE.Matrix4();
    for (const [quick, burnt] of [[false, false], [true, false], [false, true]]) {
      const list = cells.filter((c) => c.quick === quick && !!c.ash === burnt);
      if (list.length === 0) continue;
      const mat = new THREE.MeshStandardMaterial({ color: quick ? quicksand : burnt ? ash : sand, roughness: 1 });
      this.mats.push(mat);
      if (quick) {
        this.quickMat = mat;
        this.base.setHex(quicksand);
      }
      const inst = new THREE.InstancedMesh(this.geo, mat, list.length);
      const shade = new THREE.Color();
      list.forEach((c, i) => {
        inst.setMatrixAt(i, m.makeTranslation(c.x, quick ? 0.01 : 0.02, c.z));
        const k = Math.abs(Math.sin(c.x * 12.9898 + c.z * 78.233) * 43758.5453) % 1;
        inst.setColorAt(i, shade.setScalar(1 - SHADE * k));
      });
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      this.group.add(inst);
    }
  }

  update(dt: number) {
    this.time += dt;
    if (this.quickMat) this.quickMat.color.copy(this.base).multiplyScalar(1 - HEAVE * (0.5 + 0.5 * Math.sin(this.time * HEAVE_RATE)));
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.mats.forEach((m) => m.dispose());
  }
}

/** The jump pads: a glowing disc each (Update 0.0.12; moved here from dungeonView.ts). Their material and geometry go
 *  into `mats` and `geos` for the caller to dispose. */
export function padsOf(pads: readonly JumpPad[], mats: THREE.Material[], geos: THREE.BufferGeometry[]): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3ad6ff, emissive: 0x20a8ff, emissiveIntensity: 1.6, roughness: 0.4 });
  const geo = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 28);
  mats.push(mat);
  geos.push(geo);
  for (const p of pads) {
    const pad = new THREE.Mesh(geo, mat);
    pad.position.set(p.x, p.y + 0.04, p.z);
    g.add(pad);
  }
  return g;
}
