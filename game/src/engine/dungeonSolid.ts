// Update 0.2.23 (out of dungeonView.ts, which had reached its size) — what's solid under a floor's kit pieces: the walls'
// and ledges' dark cores (Update 0.0.13: the kit's brick faces have jagged edges, and the sky showed through the notches)
// and the dark slab under every floor box (not the pits: their lava shows; Update 0.0.20).
import * as THREE from 'three';
import type { DungeonLevel } from '../world/dungeon/assemble';
import type { Dressing } from '../world/dungeon/dressing';

/** The under-floor slab's colour (the floor's, darker) and how far under the floor it is (m). (The cores' colour is the
 *  floor's look's: Update 0.0.20.) */
const UNDER = new THREE.Color().setRGB(0.045, 0.043, 0.062);
const UNDER_Y = -0.45;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();

/** The cores and the slab, added to `group`; their materials and geometries go into `mats` and `geos`. Returns the unit
 *  box (the boss room's sliding walls are made of it too). */
export function solidOf(group: THREE.Group, dressing: Dressing, level: DungeonLevel, mats: THREE.Material[], geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const cores = dressing.cores;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const coreMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...dressing.style.core), roughness: 1 });
  const inst = new THREE.InstancedMesh(box, coreMat, cores.length);
  cores.forEach((b, i) => {
    pos.set(b.x, b.y, b.z);
    scale.set(b.w, b.h, b.d);
    inst.setMatrixAt(i, m.compose(pos, q.identity(), scale));
  });
  inst.computeBoundingSphere();
  inst.receiveShadow = true;
  // Under every floor box (not the pits: their lava shows).
  const floors = level.arena.boxes.filter((b) => b.kind === 'floor');
  const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const underMat = new THREE.MeshStandardMaterial({ color: UNDER, roughness: 1 });
  const under = new THREE.InstancedMesh(plane, underMat, floors.length);
  floors.forEach((b, i) => under.setMatrixAt(i, m.compose(pos.set(b.x, 0, b.z), q.identity(), scale.set(b.w, 1, b.d))));
  under.computeBoundingSphere();
  under.position.y = UNDER_Y;
  group.add(inst, under);
  mats.push(coreMat, underMat);
  geos.push(box, plane);
  return box;
}
