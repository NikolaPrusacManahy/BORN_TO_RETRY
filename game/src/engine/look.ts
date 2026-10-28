// M1 — mouse look, applied every rendered frame from the latest mouse movement (never on the sim tick, never
// slowed by slow motion or hit-stop).
// Update 0.0.15 — easing towards a facing (was in run.ts: kneeling at a chest turns the view to it).
import type { Settings } from '../state/settings';

/** Radians per pixel at sensitivity 1 (Last Ward's value). */
export const RAD_PER_PX = 0.0022;
export const PITCH_LIMIT = 1.5;

export class Look {
  yaw = 0;
  pitch = 0;

  apply(dx: number, dy: number, s: Pick<Settings, 'sensitivity' | 'invertY'>) {
    const k = RAD_PER_PX * s.sensitivity;
    this.yaw -= dx * k;
    this.pitch -= dy * k * (s.invertY ? -1 : 1);
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  }

  /** Eases towards (yaw, pitch) at `rate` (1/s), the short way round. */
  turnTo(yaw: number, pitch: number, rate: number, dt: number) {
    const k = 1 - Math.exp(-rate * dt);
    const d = Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
    this.yaw += d * k;
    this.pitch += (pitch - this.pitch) * k;
  }
}
