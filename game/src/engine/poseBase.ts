// Update 0.3.69 (out of hell/wardenPose.ts) — a body posed in code, over its clip. The three.js mixer only writes a bone when its clip's value changes. Where a clip holds a bone still, last
// frame's pose is still on it, and a relative turn turns it again, frame after frame, right round; the higher your frame rate, the faster. So each frame starts from the clip's pose:
// `fromClip` before posing, `posedNow` after. A pose that only reaches for a place in the world doesn't need it; one that turns a bone by an amount does. Pure maths on the skeleton.
import * as THREE from 'three';

export interface HeldBone {
  bone: THREE.Object3D;
  clipTurn: THREE.Quaternion;
  clipAt: THREE.Vector3;
  posedTurn: THREE.Quaternion;
  posedAt: THREE.Vector3;
  on: boolean;
}

const heldOf = new WeakMap<THREE.Object3D, HeldBone[]>();

/** Puts `names`' bones back to the clip's pose: what the mixer's just written, or if it hasn't, what it wrote before they were posed. Same `names` every time, for a given `root`. */
export function fromClip(root: THREE.Object3D, names: readonly string[]): HeldBone[] {
  let held = heldOf.get(root);
  if (!held) {
    held = [];
    for (const name of names) {
      const bone = root.getObjectByName(name);
      if (bone) held.push({ bone, clipTurn: new THREE.Quaternion(), clipAt: new THREE.Vector3(), posedTurn: new THREE.Quaternion(), posedAt: new THREE.Vector3(), on: false });
    }
    heldOf.set(root, held);
  }
  for (const h of held) {
    // (Each on its own: a clip may write its turn and leave its place.)
    if (h.on && h.bone.quaternion.equals(h.posedTurn)) h.bone.quaternion.copy(h.clipTurn);
    if (h.on && h.bone.position.equals(h.posedAt)) h.bone.position.copy(h.clipAt);
    h.clipTurn.copy(h.bone.quaternion);
    h.clipAt.copy(h.bone.position);
    h.on = false;
  }
  return held;
}

/** They've been posed: next frame's `fromClip` will know if the mixer's written over them. */
export function posedNow(held: readonly HeldBone[]) {
  for (const h of held) {
    h.posedTurn.copy(h.bone.quaternion);
    h.posedAt.copy(h.bone.position);
    h.on = true;
  }
}
