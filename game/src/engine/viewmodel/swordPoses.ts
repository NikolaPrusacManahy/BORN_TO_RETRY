// M2 — the sword's key poses as the arms camera sees them (x right, y up, −z ahead; metres from the eye), before
// mouse sway and run bob, which move arm and sword together. Each says where the grip is, the way the blade points,
// the way its edge faces, how far the blade leans in the fist towards the knuckles (a hammer grip ~25°, a fencer's
// ~60°), and the way the elbow bends out. They were picked from tools/view-shots.ts renders with the wrist kept
// nearly straight (a fist only bends so far); the Arms tab nudges them all.
import { Vector3 } from 'three';
import type { SwordPose } from './armsRig';

const rad = (deg: number) => (deg * Math.PI) / 180;

export const emptySword = (): SwordPose => ({ grip: new Vector3(), blade: new Vector3(0, 1, 0), edge: new Vector3(0, 0, -1), tilt: 0, elbow: new Vector3(1, 0, 0) });

const SIDE = new Vector3(1, 0, 0);

/** Turns `edge` into the direction across `blade` nearest to it (any across it, if it ran along the blade). */
function across(blade: Vector3, edge: Vector3) {
  edge.addScaledVector(blade, -edge.dot(blade));
  if (edge.lengthSq() < 1e-8) edge.copy(SIDE).addScaledVector(blade, -SIDE.dot(blade));
  edge.normalize();
}

type V = [number, number, number];

function pose(grip: V, blade: V, edge: V, tiltDeg: number, elbow: V): SwordPose {
  const p: SwordPose = { grip: new Vector3(...grip), blade: new Vector3(...blade).normalize(), edge: new Vector3(...edge), tilt: rad(tiltDeg), elbow: new Vector3(...elbow).normalize() };
  across(p.blade, p.edge);
  return p;
}

/** Elbow out to the right. */
const OUT: V = [1, 0, 0.3];

/** Far ahead on the crosshair: a pierce points the tip here. */
const AIM: V = [0, 0, -3];
const toAim = (g: V): V => [AIM[0] - g[0], AIM[1] - g[1], AIM[2] - g[2]];

/** Held ready: low right, the blade up and leaning ahead, edge forward. */
export const READY = pose([0.22, -0.17, -0.36], [-0.22, 1, -0.3], [-0.08, -0.3, -0.95], 25, OUT);

/** Charging a pierce: drawn back on the right in a fencer's grip, the tip on the crosshair, the edge up. */
const PIERCE_GRIP: V = [0.16, -0.24, -0.32];
export const PIERCE_READY = pose(PIERCE_GRIP, toAim(PIERCE_GRIP), [-0.5, -0.86, 0], 60, OUT);
/** The pierce at full stretch, still on the crosshair. */
const THRUST_GRIP: V = [0.1, -0.17, -0.49];
export const PIERCE_OUT = pose(THRUST_GRIP, toAim(THRUST_GRIP), [-0.8, -0.6, 0], 60, OUT);

// Update 0.0.10 — a slash, from ready (0) to the rest on the left (1): the hand rises a little and cuts down
// through the middle of the view (contact half-way), edge leading, and settles low left in a guard with the blade
// showing. A backhand runs it back on the other edge (the sword has two). The fencer's grip tilt keeps the blade near
// the forearm's line, so arm and blade swing as one.
export const SLASH: readonly SwordPose[] = [
  READY,
  pose([0.216, -0.027, -0.4], [-0.35, 0.75, -0.55], [0.05, -0.57, -0.82], 55, OUT),
  pose([0.135, -0.137, -0.45], [-0.61, 0.35, -0.71], [0.05, -0.88, -0.48], 65, OUT),
  pose([0, -0.204, -0.42], [-0.8, 0, -0.6], [-0.1, -0.99, 0.14], 65, OUT),
  pose([-0.12, -0.248, -0.4], [-0.71, 0.25, -0.66], [-0.58, -0.74, 0.34], 65, OUT),
];

const before = new Vector3();
const after = new Vector3();

/** The sword `k` (0..1) of the way along the slash: the grip on a smooth curve through the keys (Catmull-Rom), the
 *  blade and edge turning from key to key. */
export function slashPose(k: number, out: SwordPose): SwordPose {
  const n = SLASH.length - 1;
  const i = Math.min(n - 1, Math.floor(Math.max(0, k) * n));
  const u = Math.max(0, k) * n - i;
  const p0 = SLASH[Math.max(0, i - 1)].grip;
  const p1 = SLASH[i].grip;
  const p2 = SLASH[i + 1].grip;
  const p3 = SLASH[Math.min(n, i + 2)].grip;
  mixSword(SLASH[i], SLASH[i + 1], u, out);
  // Catmull-Rom: p1 + u·m1-ish terms, written out so nothing is made per frame.
  const u2 = u * u;
  const u3 = u2 * u;
  before.copy(p0).multiplyScalar(-u3 + 2 * u2 - u);
  after.copy(p3).multiplyScalar(u3 - u2);
  out.grip
    .copy(p1)
    .multiplyScalar(3 * u3 - 5 * u2 + 2)
    .addScaledVector(p2, -3 * u3 + 4 * u2 + u)
    .add(before)
    .add(after)
    .multiplyScalar(0.5);
  return out;
}

export function copySword(from: SwordPose, to: SwordPose): SwordPose {
  to.grip.copy(from.grip);
  to.blade.copy(from.blade);
  to.edge.copy(from.edge);
  to.tilt = from.tilt;
  to.elbow.copy(from.elbow);
  return to;
}

/** `a` → `b` by `k` (0..1) into `out` (which may be `a` or `b`). */
export function mixSword(a: SwordPose, b: SwordPose, k: number, out: SwordPose): SwordPose {
  out.grip.lerpVectors(a.grip, b.grip, k);
  out.blade.lerpVectors(a.blade, b.blade, k).normalize();
  out.edge.lerpVectors(a.edge, b.edge, k);
  across(out.blade, out.edge);
  out.tilt = a.tilt + (b.tilt - a.tilt) * k;
  out.elbow.lerpVectors(a.elbow, b.elbow, k).normalize();
  return out;
}
