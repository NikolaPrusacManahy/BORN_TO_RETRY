// M1 — trauma-based screen shake: events add trauma (0..1), it fades out, and the shake is trauma² so small
// hits stay subtle and big ones punch. Smooth noise (sums of sines), not random jitter.
import { SHAKE } from '../tuning/camera';

const TAU = Math.PI * 2;

/** Smooth noise in about -1..1 for phase `t`; `seed` picks an independent channel. */
export function shakeNoise(t: number, seed: number): number {
  return (Math.sin(t * TAU + seed * 12.9) + 0.5 * Math.sin(t * TAU * 2.17 + seed * 4.1) + 0.25 * Math.sin(t * TAU * 3.71 + seed * 7.3)) / 1.75;
}

export class Shake {
  trauma = 0;
  private t = 0;
  x = 0;
  y = 0;
  z = 0;
  pitch = 0;
  yaw = 0;
  roll = 0;

  add(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number) {
    this.trauma = Math.max(0, this.trauma - SHAKE.v.decay * dt);
    this.t += dt * SHAKE.v.frequency;
    const s = this.trauma * this.trauma;
    const off = SHAKE.v.maxOffset * s;
    const ang = ((SHAKE.v.maxAngle * Math.PI) / 180) * s;
    this.x = off * shakeNoise(this.t, 1);
    this.y = off * shakeNoise(this.t, 2);
    this.z = off * shakeNoise(this.t, 3);
    this.pitch = ang * shakeNoise(this.t, 4);
    this.yaw = ang * shakeNoise(this.t, 5);
    this.roll = ang * shakeNoise(this.t, 6);
  }
}
