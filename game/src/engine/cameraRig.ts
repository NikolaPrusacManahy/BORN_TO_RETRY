// M1 — places the first-person camera each frame: the interpolated body position, eye height (lower while
// kneeling; Update 0.3.20 — no slide), a spring dip on landing, smoothed steps, FOV kick with speed and dashes, roll
// tilt, and shake.
// Update 0.2.11 — swimming (floor 6): the view bobs and sways slowly, as if held up by the water.
// Update 0.2.14 — the dip spring is stepped in slices (core/spring.ts): on a slow frame it flew the view into the sky.
import * as THREE from 'three';
import { stepSpring } from '../core/spring';
import { CAMERA } from '../tuning/camera';
import { MOVE } from '../tuning/movement';
import type { PlayerState } from '../sim/player/state';
import { verticalFov } from '../state/settings';
import type { Look } from './look';
import { Shake } from './shake';

const DEG = Math.PI / 180;
/** How fast a step's height jump is eased out of the view (per second). */
const STEP_EASE = 18;
/** How fast a hit's camera kick eases back (per second). */
const KICK_EASE = 14;
/** Update 0.2.11 — swimming: the bob's height (m) and the sway's roll (rad), and how fast each goes (rad/s). */
const SWIM_BOB = 0.06;
const SWIM_ROLL = 0.018;
const SWIM_BOB_RATE = 1.5;
const SWIM_ROLL_RATE = 0.8;

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export class CameraRig {
  readonly shake = new Shake();
  private eye = CAMERA.v.eyeHeight;
  private fovExtra = 0;
  private roll = 0;
  private readonly dip = { x: 0, v: 0 };
  private stepOffset = 0;
  private kickPitch = 0;
  private swimT = 0;
  private readonly at = new THREE.Vector3();
  /** Update 0.3.71 — the view turning with the Demon's swing (rad; x up, y left, z rolled). */
  readonly swing = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  /** A landing at `speed` m/s kicks the dip spring. */
  land(speed: number) {
    const depth = Math.min(CAMERA.v.landDipMax, speed * CAMERA.v.landDip);
    // With this damping a kick of depth × ω × 2.2 peaks at about `depth`.
    this.dip.v -= depth * Math.sqrt(CAMERA.v.springStiffness) * 2.2;
  }

  /** Update 0.3.75 — one of the Demon's heavy steps: the view dips `depth` m and comes back, on the landing's spring. */
  heavyStep(depth: number) {
    this.dip.v -= depth * Math.sqrt(CAMERA.v.springStiffness) * 2.2;
  }

  /** M1 step 6 — a hit nods the view down by `deg`, then it eases back. */
  kick(deg: number) {
    this.kickPitch = Math.max(-0.2, this.kickPitch - (deg * Math.PI) / 180);
  }

  /** Update 0.3.2 — an execution's lunge: the view narrows by `deg` at once, then eases back out. */
  lunge(deg: number) {
    this.fovExtra -= deg;
  }

  /** The feet jumped `dy` in one tick on the ground (a step up or down): hide the jump, then ease it out. */
  step(dy: number) {
    this.stepOffset = Math.max(-0.6, Math.min(0.6, this.stepOffset - dy));
  }

  /** `prev`: feet before the last tick; `alpha`: how far to blend towards the current feet. */
  update(dt: number, alpha: number, prev: THREE.Vector3, p: PlayerState, look: Look, hFov: number, aspect: number) {
    const v = CAMERA.v;
    this.at.lerpVectors(prev, p.pos, alpha);

    const eye = p.kneel > 0 ? v.kneelEyeHeight : v.eyeHeight;
    this.eye += (eye - this.eye) * ease(v.eyeRate, dt);
    this.stepOffset *= 1 - ease(STEP_EASE, dt);
    stepSpring(this.dip, v.springStiffness, v.springDamping, dt);

    const speed = Math.hypot(p.vel.x, p.vel.z);
    const fovTarget = (p.dashTime > 0 ? v.dashFovKick : 0) + Math.min(v.speedFovMax, Math.max(0, speed - MOVE.v.runSpeed) * v.speedFov);
    this.fovExtra += (fovTarget - this.fovExtra) * ease(v.fovRate, dt);

    // Roll: lean into strafes, and away from a wall you slide down.
    const rightX = Math.cos(look.yaw);
    const rightZ = -Math.sin(look.yaw);
    const side = Math.max(-1, Math.min(1, (p.vel.x * rightX + p.vel.z * rightZ) / MOVE.v.runSpeed));
    let rollTarget = -side * v.strafeTilt * DEG;
    // A wall on your left has its normal pointing right (dot > 0): roll clockwise (−), away from it; a wall on your
    // right rolls anticlockwise (+). Update 0.0.3 — stronger while wall running, as the designer specified.
    const wallSide = Math.sign(p.wallNormal.x * rightX + p.wallNormal.z * rightZ);
    if (p.wallRunning) rollTarget = -wallSide * v.wallRunTilt * DEG;
    else if (p.onWall && !p.grounded) rollTarget -= wallSide * v.wallTilt * DEG;
    // (Update 0.2.11 — held up by the water.)
    const swimming = p.swimTop > 0;
    if (swimming) this.swimT += dt;
    if (swimming) rollTarget += Math.sin(this.swimT * SWIM_ROLL_RATE) * SWIM_ROLL;
    this.roll += (rollTarget - this.roll) * ease(v.tiltRate, dt);
    const bob = swimming ? Math.sin(this.swimT * SWIM_BOB_RATE) * SWIM_BOB : 0;

    this.shake.update(dt);
    this.kickPitch *= 1 - ease(KICK_EASE, dt);
    const s = this.shake;
    this.camera.position.set(this.at.x + s.x, this.at.y + this.eye + this.dip.x + this.stepOffset + bob + s.y, this.at.z + s.z);
    this.camera.rotation.set(look.pitch + s.pitch + this.kickPitch + this.swing.x, look.yaw + s.yaw + this.swing.y, this.roll + s.roll + this.swing.z, 'YXZ');
    const fov = verticalFov(hFov + this.fovExtra, aspect);
    if (Math.abs(this.camera.fov - fov) > 0.01 || this.camera.aspect !== aspect) {
      this.camera.fov = fov;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  reset() {
    this.eye = CAMERA.v.eyeHeight;
    this.fovExtra = this.roll = this.dip.x = this.dip.v = this.stepOffset = this.kickPitch = 0;
    this.shake.trauma = 0;
    this.swing.set(0, 0, 0);
  }
}
