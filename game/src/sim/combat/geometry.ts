// M1 step 6 — distance tests for punches and orbs: segments against segments (capsules are segments with a
// radius). Scratch vectors only, so no garbage.
import { Vector3 } from 'three';

const d1 = new Vector3();
const d2 = new Vector3();
const r = new Vector3();
const c1 = new Vector3();
const c2 = new Vector3();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Closest distance between segment p1→q1 and segment p2→q2 (Ericson, Real-Time Collision Detection 5.1.9).
 * Writes the closest point on the first segment into `onFirst` when given, and returns s (0..1) along it via
 * `out.s`.
 */
export function segmentDistance(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3, onFirst?: Vector3, out?: { s: number }): number {
  d1.subVectors(q1, p1);
  d2.subVectors(q2, p2);
  r.subVectors(p1, p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  let s: number;
  let t: number;
  if (a <= 1e-12 && e <= 1e-12) {
    s = t = 0;
  } else if (a <= 1e-12) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1.dot(r);
    if (e <= 1e-12) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1.dot(d2);
      const denom = a * e - b * b;
      s = denom > 1e-12 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  c1.copy(p1).addScaledVector(d1, s);
  c2.copy(p2).addScaledVector(d2, t);
  if (onFirst) onFirst.copy(c1);
  if (out) out.s = s;
  return c1.distanceTo(c2);
}
