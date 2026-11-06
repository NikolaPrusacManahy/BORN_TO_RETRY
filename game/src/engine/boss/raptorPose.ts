// Update 0.3.60 — the Velociraptor posed for the bible's moves, over its clips: crouched low for a pounce (a Feint the very same), side-on
// with its tail flicking, reared back to bark, and on its back, blinded. Its whole body tilted about its feet, its tail bent bone by bone.
// Pure maths on the skeleton.
import * as THREE from 'three';
import { SHOW_CROUCH, SHOW_ROAR } from '../../sim/dungeon/dinoShow';
import { AMBUSH, APEX, EMERGE, FEINT, PACK, ROAR, SICKLE, TAIL } from '../../sim/enemies/dinoMoves';
import { dinoWindup } from '../../sim/enemies/dino';
import type { Enemy } from '../../sim/enemies/enemy';
import { DINO } from '../../tuning/dino';

/** Crouched: how far down, how far its nose goes down (shares of its height, rad). Reared to bark. */
const CROUCH = 0.16;
const NOSE_DOWN = 0.32;
const REAR = 0.5;
const STAGGER = 0.1;

const fw = new THREE.Vector3();
const rt = new THREE.Vector3();
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** Poses it for now (its clip has just been applied; `root` scaled and placed). */
export function poseRaptor(root: THREE.Object3D, e: Enemy, time: number) {
  const h = DINO.v.dinoHeight;
  fw.set(-Math.sin(e.facing), 0, -Math.cos(e.facing));
  rt.set(Math.cos(e.facing), 0, -Math.sin(e.facing));
  let down = 0;
  let tilt = 0;
  let roll = 0;
  let flick = 0;
  const k = e.t / Math.max(0.1, dinoWindup(e.move, e.stage, e.struck));
  if (e.phase === 'windup') {
    if (e.move === SICKLE || e.move === FEINT || e.move === EMERGE) {
      down = CROUCH * smooth(k * 3);
      tilt = NOSE_DOWN * smooth(k * 3);
      flick = 0.05;
    } else if (e.move === TAIL) {
      flick = 0.4 * Math.sin(k * Math.PI * 3);
    } else if (e.move === PACK || e.move === ROAR) {
      tilt = -REAR * Math.sin(Math.min(1, k * 1.2) * Math.PI);
    }
  } else if (e.phase === 'stun') {
    if (e.raptor?.flipped) {
      // On its back, its legs kicking.
      roll = Math.PI * smooth(e.t / 0.3);
      root.position.y += h * 0.72 * smooth(e.t / 0.3);
    } else if (e.move === TAIL || e.move === SICKLE || e.move === EMERGE) {
      roll = STAGGER * Math.sin(time * 9);
    }
  } else if (e.phase === 'blast' && e.move === APEX) {
    tilt = NOSE_DOWN * 0.5;
  } else if (e.phase === 'intro') {
    if (e.move === SHOW_CROUCH) {
      down = CROUCH;
      tilt = NOSE_DOWN;
    } else if (e.move === SHOW_ROAR) {
      tilt = -REAR * Math.sin(Math.min(1, e.t / 0.8) * Math.PI);
    }
  } else if (e.phase === 'charge' && e.move === AMBUSH) {
    tilt = NOSE_DOWN * 0.3;
  }
  if (tilt !== 0) root.rotateOnWorldAxis(rt, -tilt);
  if (roll !== 0) root.rotateOnWorldAxis(fw, roll);
  if (down !== 0) root.position.y -= down * h;
  if (flick !== 0) {
    for (const n of ['Tail2', 'Tail3', 'Tail4']) {
      const b = root.getObjectByName(n);
      if (b) b.rotation.z += flick;
    }
  }
  root.updateMatrixWorld(true);
}
