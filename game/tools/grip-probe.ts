// Update 0.3.70 — where a rig's fist holds a handle, in numbers: the hole from the wrist (x across, y to the knuckles, z the
// back of the hand), how long its hand and fingers are, and how far round each radius its fingers close.
//   npx tsx tools/grip-probe.ts <arms.glb> [demon]
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { parseUntextured } from '../tests/fakes/glb';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';

const file = process.argv[2];
const arms = await parseUntextured(pathToFileURL(file));
const rig = ArmsRig.fromScene(arms.scene, process.argv[3] === 'demon' ? DEMON_HAND : undefined);
const hold = (rig as unknown as { holds: Record<string, { offset: THREE.Vector3; sign: number }> }).holds.R;
const at = (n: string) => arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
const hand = at('HandR');
const f = (v: THREE.Vector3) => `${v.x.toFixed(3)} ${v.y.toFixed(3)} ${v.z.toFixed(3)}`;
console.log(`hole from the wrist: ${f(hold.offset)} (across, to the knuckles, the back of the hand)  index side ${hold.sign}`);
console.log(`wrist to the middle knuckle ${hand.distanceTo(at('Middle2R')).toFixed(3)}, upper ${rig.arms.R.upperLen.toFixed(3)}, forearm ${rig.arms.R.foreLen.toFixed(3)}`);
// In the hand's own frame (from the wrist: across, to the knuckles, the back of the hand), the fist as baked.
const y = at('Middle2R').sub(hand).normalize();
const z = new THREE.Vector3(0, 1, 0).addScaledVector(y, -y.y).normalize();
const x = new THREE.Vector3().crossVectors(y, z);
const local = (p: THREE.Vector3) => {
  const d = p.clone().sub(hand);
  return `${d.dot(x).toFixed(3).padStart(7)} ${d.dot(y).toFixed(3).padStart(7)} ${d.dot(z).toFixed(3).padStart(7)}`;
};
const bones: string[] = [];
arms.scene.traverse((o) => {
  if (/^(Index|Middle|Ring|Pinky|Thumb)\d+R$/.test(o.name)) bones.push(o.name);
});
for (const b of bones.sort()) console.log(`  ${b.padEnd(10)} ${local(at(b))}`);
// The mesh's palm and back around the hand's middle: how thick it is, where the palm's surface is.
let mesh: THREE.SkinnedMesh | null = null;
arms.scene.traverse((o) => {
  if (o instanceof THREE.SkinnedMesh) mesh = o;
});
const m = mesh as unknown as THREE.SkinnedMesh;
const v = new THREE.Vector3();
for (const yy of [0.03, 0.06, 0.09, 0.12]) {
  let lo = 1;
  let hi = -1;
  for (let i = 0; i < m.geometry.attributes.position.count; i++) {
    v.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld).sub(hand);
    if (Math.abs(v.dot(y) - yy) < 0.01 && Math.abs(v.dot(x)) < 0.03) {
      lo = Math.min(lo, v.dot(z));
      hi = Math.max(hi, v.dot(z));
    }
  }
  console.log(`  ${yy} from the wrist, the mesh runs ${lo.toFixed(3)} (palm side) to ${hi.toFixed(3)} (back)`);
}
const hb = (rig as unknown as { hands: Record<string, { grip(r: number, t: number): { curl: number[] } }> }).hands.R;
for (const r of [0.012, 0.016, 0.019]) {
  const c = hb.grip(r, 0.4).curl;
  console.log(`radius ${r}: index ${c.slice(0, 3).map((n) => n.toFixed(2))}  middle ${c.slice(3, 6).map((n) => n.toFixed(2))}  ring ${c.slice(6, 9).map((n) => n.toFixed(2))}  little ${c.slice(9, 12).map((n) => n.toFixed(2))}`);
}
