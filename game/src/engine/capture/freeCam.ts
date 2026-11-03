// Update 0.3.37 — the capture kit's free camera (dev builds): flown away from you, where you look (WASD, up and down on
// jump and dash), the wheel its speed. It moves and turns smoothly (eased, as a camera on a rig would), so a shot
// flown by hand looks filmed. Pure (no page, no WebGL).
import { PITCH_LIMIT, RAD_PER_PX } from '../look';
import { CamPose, copyPose, emptyPose } from './dolly';

/** What steers it this frame: the mouse moved (px), the wheel's notches (up +), the keys held. */
export interface CamControls {
  dx: number;
  dy: number;
  wheel: number;
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export const emptyControls = (): CamControls => ({ dx: 0, dy: 0, wheel: 0, forward: false, back: false, left: false, right: false, up: false, down: false });

/** Its speed at first (m/s), a wheel notch's step (×), its slowest and fastest. */
export const FLY_SPEED = 6;
export const FLY_STEP = 1.25;
export const FLY_MIN = 0.5;
export const FLY_MAX = 60;
/** How fast it comes up to speed and turns to where the mouse points (1/s). */
const ACCEL = 5;
const TURN = 10;

export class FreeCam {
  readonly pose: CamPose = emptyPose();
  speed = FLY_SPEED;
  private aimYaw = 0;
  private aimPitch = 0;
  private vx = 0;
  private vy = 0;
  private vz = 0;

  /** Where `pose` is, still. */
  seat(pose: CamPose) {
    copyPose(this.pose, pose);
    this.aimYaw = pose.yaw;
    this.aimPitch = pose.pitch;
    this.vx = this.vy = this.vz = 0;
  }

  /** `dt` (real) seconds of flying. */
  steer(c: CamControls, sensitivity: number, invertY: boolean, dt: number) {
    const k = RAD_PER_PX * sensitivity;
    this.aimYaw -= c.dx * k;
    this.aimPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.aimPitch - c.dy * k * (invertY ? -1 : 1)));
    if (c.wheel !== 0) this.speed = Math.max(FLY_MIN, Math.min(FLY_MAX, this.speed * FLY_STEP ** c.wheel));
    const p = this.pose;
    const turn = 1 - Math.exp(-TURN * dt);
    p.yaw += (this.aimYaw - p.yaw) * turn;
    p.pitch += (this.aimPitch - p.pitch) * turn;
    // Where it looks (forward), its right, and up.
    const f = (c.forward ? 1 : 0) - (c.back ? 1 : 0);
    const r = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    const u = (c.up ? 1 : 0) - (c.down ? 1 : 0);
    const cy = Math.cos(p.yaw);
    const sy = Math.sin(p.yaw);
    const cp = Math.cos(p.pitch);
    let wx = -sy * cp * f + cy * r;
    let wy = Math.sin(p.pitch) * f + u;
    let wz = -cy * cp * f - sy * r;
    const n = Math.hypot(wx, wy, wz);
    const s = n > 1e-6 ? this.speed / n : 0;
    wx *= s;
    wy *= s;
    wz *= s;
    const a = 1 - Math.exp(-ACCEL * dt);
    this.vx += (wx - this.vx) * a;
    this.vy += (wy - this.vy) * a;
    this.vz += (wz - this.vz) * a;
    p.x += this.vx * dt;
    p.y += this.vy * dt;
    p.z += this.vz * dt;
  }
}
