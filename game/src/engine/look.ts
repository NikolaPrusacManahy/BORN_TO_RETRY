// M1 — mouse look, applied every rendered frame from the latest mouse movement (never on the sim tick, never
// slowed by slow motion or hit-stop).
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
}
