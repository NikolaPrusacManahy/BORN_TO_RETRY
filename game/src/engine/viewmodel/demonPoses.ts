// Update 0.3.70 — the Playable Demon's blade (design bible: "the sword is always in hand"), its own key poses as the arms
// camera sees them (like swordPoses.ts). Held ready as the designer's reference holds its knife: a hammer grip, the fist
// whole in the lower right with the forearm coming in behind it, the fingers wrapped round the handle towards you. It's a
// massive blade (the designer), 2.5 m above the fist, so it rises past the top of the screen, and it's kept across the
// view rather than pointing away from you, where it would look short: a swing heaves it up over the right shoulder and
// sweeps it across the screen to the left; a charge lifts it, and the blow comes down across the middle.
// It stays a hammer grip, 10 to 25° in every key (leaned to a fencer's, the fingers have to open to clear the handle, and
// it shows in front of them). The arm and the wrist do the swinging, so through a swing the forearm crosses the body to
// lie along the knuckles, and the edge leads the cut with the wrist under about 40°. A fist off to the side shows you its
// fingers, wrapped over the handle: in the middle of the view you see it from the wrist, so only a swing goes there.
import type { SwordPose } from './armsRig';
import { pose } from './swordPoses';

type V = [number, number, number];
/** Elbow out to the right, level (dropped, the forearm rises to the fist, and the blade's too near its line). */
const OUT: V = [1, 0.05, 0.3];
/** A chop's: the elbow lifted, the forearm coming down behind the blow. */
const HIGH: V = [0.85, 0.2, 0.25];
/** How far the blade leans in the fist (degrees), in every key. */
const GRIP = 24;

export const DEMON_READY = pose([0.2, -0.14, -0.38], [0.08, 0.83, -0.55], [-0.74, -0.32, -0.59], 10, OUT);

/** The charge: lifted, the tip high and ahead. */
export const DEMON_UP = pose([0.22, -0.07, -0.38], [-0.08, 0.8, -0.6], [-0.6, -0.05, -0.8], GRIP, OUT);
/** The blow: comes down through the frame and stops on what you're looking at, the fist low in the middle, the blade
 *  reaching away to just left of the crosshair, its edge down (past that, a hammer grip's wrist can't follow). */
export const DEMON_DOWN = pose([0.04, -0.2, -0.46], [-0.5, 0.4, -0.77], [-0.6, -0.7, -0.35], GRIP, HIGH);

/** A swing, from ready (0) to low on the left (1), contact half-way. */
export const DEMON_SLASH: readonly SwordPose[] = [
  DEMON_READY,
  pose([0.25, -0.07, -0.36], [0.32, 0.76, -0.56], [-0.75, 0.1, -0.65], GRIP, OUT),
  pose([-0.05, -0.17, -0.42], [-0.72, 0.55, -0.42], [-0.39, -0.82, -0.42], GRIP, OUT),
  pose([-0.13, -0.15, -0.4], [-0.8, 0.45, -0.4], [-0.33, -0.88, -0.33], GRIP, OUT),
  pose([-0.17, -0.13, -0.36], [-0.7, 0.5, -0.5], [-0.66, -0.74, -0.18], GRIP, OUT),
];
