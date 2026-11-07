// Update 0.2.14 — a damped spring stepped in short slices. The view's springs (the camera's landing dip, the arms' dip,
// the gun's recoil) were stepped once a frame: on a slow frame (the camera's under ~12 fps) each
// step overshot more than the last, and an alpha tester's view flew up into the sky and down again, over and over.
// Sliced, a frame of any length (up to MAX_FRAME) settles as it does at 120 fps.

export interface Spring {
  /** Where it is (0 at rest) and how fast it's moving. */
  x: number;
  v: number;
}

/** The longest slice a spring is stepped in (s): stable for every stiffness and damping the knobs allow. */
export const SPRING_SLICE = 1 / 120;

/** Steps `s` (stiffness `k`, damping `c`) over `dt` seconds, in slices no longer than SPRING_SLICE. */
export function stepSpring(s: Spring, k: number, c: number, dt: number) {
  const n = Math.ceil(Math.max(0, dt) / SPRING_SLICE - 1e-9);
  const h = n > 0 ? dt / n : 0;
  for (let i = 0; i < n; i++) {
    s.v += (-k * s.x - c * s.v) * h;
    s.x += s.v * h;
  }
}
