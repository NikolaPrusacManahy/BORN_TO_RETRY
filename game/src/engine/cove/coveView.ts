// Update 0.3.14 — floor 6's powder kegs (sim/dungeon/powder.ts), drawn with the Pirate Kit's own pieces once the kit
// is loaded: a barrel with a bomb on its lid; it shudders as its fuse burns, and is gone once it has blown up (its
// blast: depthsFeedback.ts).
import * as THREE from 'three';
import type { Powder } from '../../sim/dungeon/powder';
import type { Cove } from '../../world/dungeon/cove';

/** The kit's pieces and their sizes here. */
const BARREL = { piece: 'kit_pf_Prop_Barrel', s: 2 };
const BOMB = { piece: 'kit_pf_Prop_Bomb', s: 1.4, y: 1.3 };
/** How hard a lit keg shudders (m). */
const SHUDDER = 0.05;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

type Material = (src: THREE.MeshStandardMaterial, piece: string) => THREE.Material;

/** A kit piece as instanced meshes (one per mesh of it), each mesh's own placement under the piece kept. */
class Pieces {
  readonly meshes: { inst: THREE.InstancedMesh; local: THREE.Matrix4 }[] = [];

  constructor(kit: THREE.Object3D, name: string, count: number, material: Material, group: THREE.Group) {
    const root = kit.getObjectByName(name);
    if (!root || count === 0) return;
    const inv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const inst = new THREE.InstancedMesh(o.geometry, material(o.material as THREE.MeshStandardMaterial, name), count);
      inst.castShadow = inst.receiveShadow = true;
      inst.frustumCulled = false;
      for (let i = 0; i < count; i++) inst.setMatrixAt(i, HIDDEN);
      this.meshes.push({ inst, local: inv.clone().multiply(o.matrixWorld) });
      group.add(inst);
    });
  }

  set(i: number, at: THREE.Matrix4 | null) {
    for (const { inst, local } of this.meshes) inst.setMatrixAt(i, at ? m.copy(at).multiply(local) : HIDDEN);
  }

  done() {
    for (const { inst } of this.meshes) inst.instanceMatrix.needsUpdate = true;
  }
}

export class CoveView {
  readonly group = new THREE.Group();
  private barrels: Pieces | null = null;
  private bombs: Pieces | null = null;
  private readonly at = new THREE.Matrix4();
  private readonly turns: number[];

  constructor(private readonly cove: Cove) {
    this.turns = cove.kegs.map((k) => (k.x * 7.3 + k.z * 3.1) % (Math.PI * 2));
  }

  /** The kit's loaded: the pieces made. */
  build(kit: THREE.Object3D, material: Material) {
    const n = this.cove.kegs.length;
    if (n === 0) return;
    kit.updateMatrixWorld(true);
    this.barrels = new Pieces(kit, BARREL.piece, n, material, this.group);
    this.bombs = new Pieces(kit, BOMB.piece, n, material, this.group);
  }

  update(b: Powder, time: number) {
    if (!this.barrels || !this.bombs) return;
    b.kegs.forEach((k, i) => {
      if (k.state === 'gone') {
        this.barrels!.set(i, null);
        this.bombs!.set(i, null);
        return;
      }
      const jig = k.state === 'lit' ? Math.sin(time * 80 + i) * SHUDDER : 0;
      q.setFromAxisAngle(UP, this.turns[i]);
      this.barrels!.set(i, this.at.compose(pos.set(k.spot.x + jig, 0, k.spot.z), q, scale.setScalar(BARREL.s)));
      this.bombs!.set(i, this.at.compose(pos.set(k.spot.x, BOMB.y, k.spot.z - jig), q, scale.setScalar(BOMB.s)));
    });
    this.barrels.done();
    this.bombs.done();
  }

  dispose() {
    this.group.removeFromParent();
  }
}
