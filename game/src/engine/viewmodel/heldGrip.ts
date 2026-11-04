// Update 0.1.1 — both hands round something held in the world (an execution's tail: the designer, "make it grab the
// snake's tail"), the way you'd hold a rope: it runs through each fist, in at the little finger and out at the thumb
// towards its end, the right a fist's width further down it. Each fist points the way its arm reaches; the rope crosses
// it, leaning in the grip as a sword's blade does for a pierce when it runs along the reach (`ArmsRig.gripPose`).
// Update 0.1.2 — every execution's hands (exec/hands.ts): each hand on its own target, as a rope's grip, a fist, half of
// the clasped hammer (thumbs up, backs out), an open palm pressing, or an open hand's edge chopping, eased from one to
// the next; a hand left in its guard stays there. A point and a way are carried from the world camera into the arms
// camera so the hand is on the same spot on screen whatever the two FOVs are, nearer or further as the point is.
// Update 0.1.8 — the clasped hammer is gone: a smash is the ground slam's clasp (slamArms.ts), raised in your view,
// then its down pose brought onto the spot, the fists side by side there as the slam's.
import * as THREE from 'three';
import type { ArmPose, ArmsRig } from './armsRig';
import type { Side } from './guard';
import { mixArm, pose } from './armsMath';
import { emptySword } from './swordPoses';
import type { HandSub, HandTarget } from '../exec/hands';
import { handTargets } from '../exec/hands';
import { SLAM_APART, SLAM_DEPTH, slamClasp, slamFist } from './slamArms';

/** A point this far (m) from your eye is this far in front of the arms camera (m); nearer and further scale it, within
 *  these shares. */
const REF = 1;
const DEPTH = 0.42;
const NEAR = 0.6;
const FAR = 1.25;
/** The most a rope leans in a fist (rad), as a pierce's blade does. */
const MAX_LEAN = 1;
/** An open palm's middle is this far back from its knuckles (m). */
const PALM = 0.05;
const UP = new THREE.Vector3(0, 1, 0);
/** How open each hand is (1: flat; Update 0.3.40 — a claw half-way: its fingers curled over what it holds). */
const OPEN: Record<HandSub['mode'], number> = { guard: 0, rope: 0, fist: 0, palm: 1, chop: 1, slamUp: 0, slamDown: 0, claw: 0.55 };
/** Update 0.1.6 — a tail, a leg or an arm held: the fingers wrap something this thick (radius, m). */
export const ROPE = 0.012;

const ndc = new THREE.Vector3();
const p = new THREE.Vector3();
const k = new THREE.Vector3();
const r = new THREE.Vector3();
const side2 = new THREE.Vector3();
const way = new THREE.Vector3();
const turn = new THREE.Vector3();
const q = new THREE.Quaternion();
const held = emptySword();
const poseA = pose();
const poseB = pose();
const o = new THREE.Vector3();
const dir = new THREE.Vector3();
const reachPose = pose();

/** Update 0.1.8 — how far out along the arms camera's ray (rx, ry, −1) a smash lands: as far from between the shoulders
 *  as the slam's own (slamArms.ts), so it's within reach wherever it is on screen and the fists don't part. */
function slamDepth(rig: ArmsRig, holder: THREE.Object3D, camera: THREE.Camera, rx: number, ry: number): number {
  const reach = slamClasp(rig, 'L', true, reachPose).fist.distanceTo(rig.between);
  holder.worldToLocal(camera.localToWorld(o.set(0, 0, 0)));
  holder.worldToLocal(camera.localToWorld(dir.set(rx, ry, -1))).sub(o);
  o.sub(rig.between);
  const a = dir.lengthSq();
  const b = 2 * dir.dot(o);
  const disc = b * b - 4 * a * (o.lengthSq() - reach * reach);
  return disc < 0 ? SLAM_DEPTH : (-b + Math.sqrt(disc)) / (2 * a);
}

export class HeldGrip {
  /** 0 … 1: how far the arms have given way to the execution's hands (0: nothing held). */
  weight = 0;
  /** Each hand's target this frame (world), and the world camera they're seen through. */
  readonly hand: Record<Side, HandTarget> = handTargets();
  world: THREE.PerspectiveCamera | null = null;
  /** The way the left hand's rope runs (the arms camera's view), for tests and tools. */
  readonly along = new THREE.Vector3();

  /** How far a hand is bent to its grip (1: exactly; 0: in its guard), and how open it is. */
  bend(side: Side): number {
    if (this.weight <= 0) return 0;
    const h = this.hand[side];
    return ((h.a.mode !== 'guard' ? 1 - h.u : 0) + (h.b.mode !== 'guard' ? h.u : 0)) * this.weight;
  }

  open(side: Side): number {
    if (this.weight <= 0) return 0;
    const h = this.hand[side];
    return (OPEN[h.a.mode] * (1 - h.u) + OPEN[h.b.mode] * h.u) * this.weight;
  }

  /** Update 0.1.6 — how far a hand is round something held (a rope grip: its fingers wrap it, handPose.ts). */
  rope(side: Side): number {
    if (this.weight <= 0) return 0;
    const h = this.hand[side];
    return ((h.a.mode === 'rope' ? 1 - h.u : 0) + (h.b.mode === 'rope' ? h.u : 0)) * this.weight;
  }

  /** One arm's pose (model space; `holder`: the model's parent under the arms `camera`, both up to date; `base`: its
   *  pose without the execution). */
  pose(rig: ArmsRig, side: Side, holder: THREE.Object3D, camera: THREE.PerspectiveCamera, base: ArmPose, out: ArmPose): ArmPose {
    const h = this.hand[side];
    this.sub(rig, side, h.a, holder, camera, base, poseA);
    this.sub(rig, side, h.b, holder, camera, base, poseB);
    mixArm(poseA, poseB, h.u, out);
    return out;
  }

  private sub(rig: ArmsRig, side: Side, s: HandSub, holder: THREE.Object3D, camera: THREE.PerspectiveCamera, base: ArmPose, out: ArmPose) {
    const world = this.world;
    if (s.mode === 'slamUp') {
      slamClasp(rig, side, false, out);
      return;
    }
    if (s.mode === 'guard' || !world) {
      out.fist.copy(base.fist);
      out.knuckles.copy(base.knuckles);
      out.back.copy(base.back);
      return;
    }
    // The point: the same spot on screen, at a depth like its own.
    world.updateMatrixWorld();
    ndc.copy(s.at).project(world);
    const t = Math.tan((camera.fov * Math.PI) / 360);
    // (A smash within the slam's reach: further, the arms can't reach and the fists part.)
    const depth = s.mode === 'slamDown' ? slamDepth(rig, holder, camera, ndc.x * t * camera.aspect, ndc.y * t) : DEPTH * Math.max(NEAR, Math.min(FAR, s.at.distanceTo(world.position) / REF));
    p.set(ndc.x * depth * t * camera.aspect, ndc.y * depth * t, -depth);
    // The way: across the screen by the FOVs' ratio, depth as it is.
    const scale = t / Math.tan((world.fov * Math.PI) / 360);
    way.copy(s.way).transformDirection(world.matrixWorldInverse);
    way.x *= scale;
    way.y *= scale;
    way.normalize();
    if (s.mode === 'rope') {
      p.addScaledVector(way, s.slide);
      if (side === 'L') this.along.copy(way);
    }
    if (s.mode === 'slamDown') p.x += ((side === 'L' ? -1 : 1) * SLAM_APART) / 2;
    // Into the model.
    held.grip.copy(holder.worldToLocal(camera.localToWorld(p)));
    holder.getWorldQuaternion(q).invert();
    way.transformDirection(camera.matrixWorld).applyQuaternion(q);
    // (Update 0.3.40 — a key's own turn of the hand, carried as the way is.)
    if (s.turned) {
      turn.copy(s.turn).transformDirection(world.matrixWorldInverse);
      turn.x *= scale;
      turn.y *= scale;
      turn.normalize().transformDirection(camera.matrixWorld).applyQuaternion(q);
    }
    switch (s.mode) {
      case 'rope': {
        // Out of the thumb side towards its end; the fist points the way the arm reaches and leans in the grip to let it.
        held.blade.copy(way).negate();
        r.subVectors(held.grip, rig.between).normalize();
        const along = r.dot(held.blade);
        k.copy(r).addScaledVector(held.blade, -along);
        if (k.lengthSq() < 1e-4) k.copy(UP).addScaledVector(held.blade, -held.blade.y);
        held.edge.copy(k.normalize());
        held.tilt = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, Math.asin(Math.max(-1, Math.min(1, along)))));
        rig.gripPose(held, out, side);
        return;
      }
      case 'fist': {
        // Knuckles the way it punches, the back of the hand up (Update 0.3.40 — or the key's way for it).
        out.fist.copy(held.grip);
        out.knuckles.copy(way);
        const back = s.turned ? turn : UP;
        out.back.copy(back).addScaledVector(way, -back.dot(way));
        if (out.back.lengthSq() < 1e-4) out.back.set(0, 0, -1);
        out.back.normalize();
        return;
      }
      case 'slamDown':
        // The slam's own fist, on the spot.
        out.fist.copy(held.grip);
        slamFist(rig, side, out);
        return;
      case 'chop':
        // Fingers the way it strikes, the back of the hand out to its side, thumb up: the little finger's edge leads.
        // (The model's +x is the screen's left.)
        out.fist.copy(held.grip);
        out.knuckles.copy(way);
        side2.set(side === 'L' ? 1 : -1, 0, 0);
        out.back.copy(side2).addScaledVector(way, -side2.dot(way));
        if (out.back.lengthSq() < 1e-4) out.back.copy(UP);
        out.back.normalize();
        return;
      case 'palm':
      case 'claw': {
        // The palm faces the way; fingers up (Update 0.3.40 — or the key's way for them, square to the palm's).
        out.back.copy(way).negate();
        const along = s.turned ? turn : UP;
        out.knuckles.copy(along).addScaledVector(way, -along.dot(way));
        if (out.knuckles.lengthSq() < 1e-4) out.knuckles.set(0, 0, 1);
        out.knuckles.normalize();
        out.fist.copy(held.grip).addScaledVector(out.knuckles, PALM);
        return;
      }
    }
  }
}
