// Update 0.3.37 — the capture kit's dolly (the designer: "Might need to make a trailer for this game"; dev builds): the
// camera's points marked one by one, then a smooth glide through them all in a set time, eased in and out, the view
// turning as it goes. Its speed is even along the path (each stretch's share of the time is its share of the length);
// its curve is a Catmull-Rom spline through every point; its turn the short way round. Pure (no page, no WebGL).

/** Where a camera is and how it looks: its place (m), its turn and tilt (rad, as the player's view: yaw 0 looks down
 *  −z), its horizontal field of view (degrees). */
export interface CamPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  fov: number;
}

export const emptyPose = (): CamPose => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, fov: 100 });

export const copyPose = (to: CamPose, from: CamPose): CamPose => {
  to.x = from.x;
  to.y = from.y;
  to.z = from.z;
  to.yaw = from.yaw;
  to.pitch = from.pitch;
  to.fov = from.fov;
  return to;
};

/** At most this many points. */
export const DOLLY_POINTS = 8;
/** Its lengths (s), a key going through them; the first one it starts at. */
export const DOLLY_LENGTHS: readonly number[] = [6, 10, 16, 4];

/** A turn of a radian counts as this far (m), a degree of zoom this far, in a stretch's length. */
const TURN_M = 2;
const ZOOM_M = 0.05;

/** Eased: slow off the first point, slow onto the last. */
const ease = (t: number) => t * t * (3 - 2 * t);

const KEYS = ['x', 'y', 'z', 'yaw', 'pitch', 'fov'] as const;

/** One of a Catmull-Rom spline's coordinates between `b` (u 0) and `c` (u 1), `a` before and `d` after. */
const spline = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);

/** The points as the glide goes through them: each turn the short way from the one before (unwound, no jump at ±π). */
export function unwound(points: readonly CamPose[]): CamPose[] {
  const out: CamPose[] = [];
  for (const p of points) {
    const q = copyPose(emptyPose(), p);
    const prev = out[out.length - 1];
    if (prev) q.yaw = prev.yaw + Math.atan2(Math.sin(p.yaw - prev.yaw), Math.cos(p.yaw - prev.yaw));
    out.push(q);
  }
  return out;
}

/** Where along the glide through `pts` (unwound) a share `t` (0–1) of its time is, eased. */
export function glide(pts: readonly CamPose[], t: number, out: CamPose): CamPose {
  const n = pts.length;
  if (n === 0) return out;
  if (n === 1) return copyPose(out, pts[0]);
  // Each stretch's length (a turn or a zoom counting too, so a turn on the spot takes its time); none at all, each the
  // same share.
  let total = 0;
  const len: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const l = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z, (q.yaw - p.yaw) * TURN_M, (q.pitch - p.pitch) * TURN_M, (q.fov - p.fov) * ZOOM_M);
    len.push(l);
    total += l;
  }
  if (total < 1e-6) for (let i = 0; i < n - 1; i++) len[i] = 1;
  if (total < 1e-6) total = n - 1;
  let s = ease(Math.max(0, Math.min(1, t))) * total;
  let i = 0;
  while (i < n - 2 && s > len[i]) s -= len[i++];
  const u = len[i] > 0 ? Math.max(0, Math.min(1, s / len[i])) : 0;
  const b = pts[i];
  const c = pts[i + 1];
  for (const k of KEYS) {
    // (Past either end, the point mirrored: the glide starts and stops along its first and last stretch.)
    const a = i > 0 ? pts[i - 1][k] : 2 * b[k] - c[k];
    const d = i + 2 < n ? pts[i + 2][k] : 2 * c[k] - b[k];
    out[k] = spline(a, b[k], c[k], d, u);
  }
  return out;
}

export type DollyState = 'off' | 'playing' | 'held';

/** The points, and the glide through them: played in real time (slow motion or a freeze doesn't slow it), then held at
 *  the last point till it's stopped. */
export class Dolly {
  private pts: CamPose[] = [];
  private path: CamPose[] = [];
  state: DollyState = 'off';
  /** Seconds into the glide. */
  t = 0;
  private lengthAt = 0;

  get points(): readonly CamPose[] {
    return this.pts;
  }

  /** Its length (s). */
  get length(): number {
    return DOLLY_LENGTHS[this.lengthAt];
  }

  /** The next length; returns it. */
  nextLength(): number {
    this.lengthAt = (this.lengthAt + 1) % DOLLY_LENGTHS.length;
    return this.length;
  }

  /** A point where `pose` is; false: it has its points. */
  mark(pose: CamPose): boolean {
    if (this.pts.length >= DOLLY_POINTS) return false;
    this.pts.push(copyPose(emptyPose(), pose));
    this.path = unwound(this.pts);
    return true;
  }

  clear() {
    this.pts = [];
    this.path = [];
    this.state = 'off';
  }

  /** From the first point; false: no points. */
  play(): boolean {
    if (this.pts.length === 0) return false;
    this.state = 'playing';
    this.t = 0;
    return true;
  }

  stop() {
    this.state = 'off';
  }

  /** `real` seconds on. */
  step(real: number) {
    if (this.state !== 'playing') return;
    this.t += real;
    if (this.t >= this.length) {
      this.t = this.length;
      this.state = 'held';
    }
  }

  /** Where the camera is now (on its way, or held at the end). */
  pose(out: CamPose): CamPose {
    return glide(this.path, this.length > 0 ? this.t / this.length : 1, out);
  }
}
