// Update 0.1.5 — the Gold Axe's own key poses (the designer's rule: every weapon its own grip and moves), as the arms
// camera sees them (x right, y up, −z ahead; metres from the eye), like swordPoses.ts: where the grip is, the way the
// head points up the haft, the way the blade's edge faces, how far the haft leans in the fist, the elbow's way out.
// Held ready low on the right, head up; a swing hacks down from high on the right through the middle to low on the
// left; charging a throw cocks it behind the shoulder, and the throw comes over and down before you, overhand (Update
// 0.1.6: right click throws it; it was a chop).
import type { SwordPose } from './armsRig';
import { pose } from './swordPoses';

type V = [number, number, number];
/** Elbow out to the right. */
const OUT: V = [1, 0, 0.3];

export const AXE_READY = pose([0.21, -0.2, -0.37], [-0.12, 1, -0.2], [-0.25, -0.15, -0.95], 25, OUT);

/** The throw: the ready grip lifted high on the right, the head cocked back over the shoulder (it charges here), then
 *  over and down before you, the edge leading. */
export const AXE_COCKED = pose([0.24, -0.06, -0.44], [0.15, 0.9, 0.4], [-0.1, -0.3, -0.95], 25, OUT);
export const AXE_THROWN = pose([0.1, -0.16, -0.5], [-0.4, -0.4, -0.82], [-0.3, -0.9, 0.3], 25, OUT);

/** A swing, from ready (0) to the rest on the left (1): up high on the right, down through the middle, low left. */
export const AXE_SLASH: readonly SwordPose[] = [
  AXE_READY,
  pose([0.24, -0.08, -0.42], [0.12, 0.9, 0.4], [-0.3, 0.35, -0.88], 25, OUT),
  pose([0.1, -0.14, -0.48], [-0.5, 0.45, -0.75], [-0.55, -0.8, 0.1], 25, OUT),
  pose([-0.04, -0.22, -0.46], [-0.8, -0.05, -0.6], [-0.15, -0.98, 0.15], 25, OUT),
  pose([-0.12, -0.27, -0.42], [-0.65, -0.35, -0.65], [-0.55, -0.7, 0.45], 25, OUT),
];
