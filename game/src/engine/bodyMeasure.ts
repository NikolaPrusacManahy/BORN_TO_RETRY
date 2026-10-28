// Update 0.0.19 — a model's body as it's drawn: every skinned vertex where its bones put it, in the model's space (the
// designer: the snake and the slime were far too big). Ultimate Monsters' newer models store their meshes turned on
// their side, so their raw mesh box measured the wrong way up (the slime 0.6 tall, not 1.95; the snake 0.3, not 3) and
// they were scaled up 3 to 10 times. Done once per model when it loads.
import * as THREE from 'three';

const v = new THREE.Vector3();

/** The box round `model`'s skinned bodies as posed now, in its own space (call before it's placed or scaled). */
export function skinnedBounds(model: THREE.Object3D, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty();
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof THREE.SkinnedMesh)) return;
    o.skeleton.update();
    const n = o.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) out.expandByPoint(o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld));
  });
  return out;
}

/** The box round `model`'s body in the first frame of `clip` (its idle: how it's mostly seen; the wasp's rest pose is
 *  a third taller than its flight). Measured before the clip stops (stopping puts the rest pose back). */
export function posedBounds(model: THREE.Object3D, clip: THREE.AnimationClip | undefined, out: THREE.Box3): THREE.Box3 {
  if (!clip) return skinnedBounds(model, out);
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.update(0);
  skinnedBounds(model, out);
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  return out;
}
