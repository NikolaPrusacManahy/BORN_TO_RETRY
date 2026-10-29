// Update 0.1.5 — the Hammer's own key poses, in both hands, as the arms camera sees them (like swordPoses.ts). The grip
// is the right fist's, the top hand; the left closes on the haft below it, near the butt (twoHand.ts), as a right-handed
// swing holds a sledgehammer. Held ready on the right, the head up beside the view; a swing heaves it from over the
// right shoulder round through the middle to low on the left, slow and heavy; the charged smash raises it over your
// head (it charges there) and brings it down on the floor before you; a throw heaves it the same way.
import type { SwordPose } from './armsRig';
import { pose } from './swordPoses';

type V = [number, number, number];
/** Elbow out to the right, and a little down (both hands on it). */
const OUT: V = [1, -0.4, 0.3];

export const HAMMER_READY = pose([0.16, -0.24, -0.44], [0.26, 0.92, -0.31], [-0.35, 0.2, -0.92], 15, OUT);

/** The smash: raised over your head, then down on the floor before you. */
export const HAMMER_UP = pose([0.06, -0.08, -0.38], [0.05, 0.6, 0.8], [0, 0.8, -0.6], 15, OUT);
export const HAMMER_SMASH = pose([0.05, -0.22, -0.5], [0, -0.35, -0.94], [0, -0.94, 0.35], 15, OUT);

/** A swing, from ready (0) to the rest on the left (1): back over the right shoulder, through the middle, low left. */
export const HAMMER_SLASH: readonly SwordPose[] = [
  HAMMER_READY,
  pose([0.15, -0.25, -0.4], [0.65, 0.5, 0.57], [-0.5, 0.45, -0.75], 15, OUT),
  pose([-0.01, -0.26, -0.42], [-0.8, 0.35, -0.5], [-0.45, -0.85, 0.15], 15, OUT),
  pose([-0.08, -0.28, -0.42], [-0.88, -0.1, -0.45], [-0.25, -0.95, 0.2], 15, OUT),
  pose([-0.12, -0.31, -0.4], [-0.65, -0.55, -0.5], [-0.55, -0.55, 0.6], 15, OUT),
];
