// Update 0.3.73 — the Playable Demon's blade growing for Last Verdict (the bible: "the sword grows huge"). Only what's above the guard: the hilt stays
// as it is, so the fist still fits it. Scaling the whole model would swell the handle out of the hand. On the CPU, for the moment it's growing: a
// couple of thousand points, and no new shader to compile the first time you use it.
import * as THREE from 'three';

/** Where the guard ends, and how far above it the blade takes to reach its full width (its own metres). */
const GUARD = 0.3;
const WIDEN = 0.25;

export class BladeGrow {
  private readonly parts: { p: THREE.BufferAttribute; base: Float32Array }[] = [];
  private long = 1;
  private wide = 1;

  constructor(model: THREE.Object3D) {
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const p = o.geometry.getAttribute('position') as THREE.BufferAttribute;
      p.setUsage(THREE.DynamicDrawUsage);
      this.parts.push({ p, base: Float32Array.from(p.array as ArrayLike<number>) });
    });
  }

  /** `long`, `wide`: how many times its length and width. */
  set(long: number, wide: number) {
    if (long === this.long && wide === this.wide) return;
    this.long = long;
    this.wide = wide;
    for (const { p, base } of this.parts) {
      const a = p.array as Float32Array;
      for (let i = 0; i < base.length; i += 3) {
        const y = base[i + 1];
        const up = y - GUARD;
        const k = up <= 0 ? 0 : Math.min(1, up / WIDEN);
        const across = 1 + (wide - 1) * k;
        a[i] = base[i] * across;
        a[i + 1] = up <= 0 ? y : GUARD + up * long;
        a[i + 2] = base[i + 2] * across;
      }
      p.needsUpdate = true;
    }
  }
}
