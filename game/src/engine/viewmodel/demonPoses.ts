// Update 0.3.70 — the Playable Demon's blade (design bible: "the sword is always in hand"), its own key poses as the arms
// camera sees them (like swordPoses.ts). Held ready as the designer's reference holds its knife: a hammer grip, the fist
// whole in the lower right with the forearm coming in behind it, the fingers wrapped round the handle towards you. It's a
// massive blade (the designer), 2.5 m above the fist, so it rises past the top of the screen, and it's kept across the
// view rather than pointing away from you, where it would look short.
// It stays a hammer grip, 10 to 25° in every key (leaned to a fencer's, the fingers have to open to clear the handle, and
// it shows in front of them). The arm and the wrist do the swinging, so through a swing the forearm crosses the body to
// lie along the knuckles, with the wrist under about 40°. A fist off to the side shows you its fingers, wrapped over the
// handle: in the middle of the view you see it from the wrist, so only a swing goes there.
// Update 0.3.71 — Blazing Arc (the designer: "swing animation needs premium treatment"; the bible: "slash, backslash,
// overhead"): three swings that flow into each other, each cocked first (bladeArcs.ts plays them). The slash cuts down from
// over the right shoulder to low on the left; the backslash rises back across from there, and ends high on the right,
// where the overhead goes up and over your head from, and comes down the middle.
import { Vector3 } from 'three';
import type { SwordPose } from './armsRig';
import { solveElbow } from './armsMath';
import type { BladeArc } from './bladeArcs';
import { pose } from './swordPoses';

type V = [number, number, number];
/** Elbow out to the right, level (dropped, the forearm rises to the fist, and the blade's too near its line). */
const OUT: V = [1, 0.05, 0.3];
/** A chop's: the elbow lifted, the forearm coming down behind the blow. */
const HIGH: V = [0.85, 0.2, 0.25];
/** Thrown up over your head: the elbow high. */
const OVER: V = [0.8, 1, 0.1];
/** How far the blade leans in the fist (degrees), in every key. */
const GRIP = 24;

export const DEMON_READY = pose([0.2, -0.14, -0.38], [0.08, 0.83, -0.55], [-0.74, -0.32, -0.59], 10, OUT);

/** The charge: lifted, the tip high and ahead. */
export const DEMON_UP = pose([0.22, -0.07, -0.38], [-0.08, 0.8, -0.6], [-0.6, -0.05, -0.8], GRIP, OUT);
/** The blow: comes down through the frame and stops on what you're looking at, the fist low in the middle, the blade
 *  reaching away to just left of the crosshair, its edge down (past that, a hammer grip's wrist can't follow). */
export const DEMON_DOWN = pose([0.04, -0.2, -0.46], [-0.5, 0.4, -0.77], [-0.6, -0.7, -0.35], GRIP, HIGH);

/** A plain swing, from ready (0) to low on the left (1), contact half-way (a grab's mashed blows; Blazing Arc is below). */
export const DEMON_SLASH: readonly SwordPose[] = [
  DEMON_READY,
  pose([0.25, -0.07, -0.36], [0.32, 0.76, -0.56], [-0.75, 0.1, -0.65], GRIP, OUT),
  pose([-0.05, -0.17, -0.42], [-0.72, 0.55, -0.42], [-0.39, -0.82, -0.42], GRIP, OUT),
  pose([-0.13, -0.15, -0.4], [-0.8, 0.45, -0.4], [-0.33, -0.88, -0.33], GRIP, OUT),
  pose([-0.17, -0.13, -0.36], [-0.7, 0.5, -0.5], [-0.66, -0.74, -0.18], GRIP, OUT),
];

// The arm as the arms camera sees it, measured (tools/weapon-shots.ts prints it): where the shoulder is, how long upper arm
// and forearm are, and how far the wrist sits behind the grip.
const SHOULDER = new Vector3(0.18, -0.18, -0.11);
const UPPER = 0.211;
const FORE = 0.239;
const WRIST_BACK = 0.105;

/** A key from where the fist is and which way the blade points: its edge turned to where the forearm comes from, for the
 *  straightest wrist that holds it there. */
function key(grip: V, blade: V, elbow: V = OUT, tilt = GRIP): SwordPose {
  const g = new Vector3(...grip);
  const b = new Vector3(...blade).normalize();
  const pole = new Vector3(...elbow);
  const along = new Vector3(-0.5, 0, -0.85).normalize();
  for (let i = 0; i < 3; i++) {
    const wrist = g.clone().addScaledVector(along, -WRIST_BACK);
    const e = solveElbow(SHOULDER, wrist, UPPER, FORE, pole, new Vector3());
    along.subVectors(wrist, e).normalize();
  }
  const edge = along.clone().addScaledVector(b, -along.dot(b));
  return pose(grip, [b.x, b.y, b.z], [edge.x, edge.y, edge.z], tilt, elbow);
}

/** Down from over the right shoulder, across the middle, away low on the left. */
const ARC_SLASH: BladeArc = {
  step: 0,
  keys: [
    key([0.25, 0, -0.36], [0.5, 0.82, -0.05]),
    key([0.2, -0.05, -0.42], [0.12, 0.95, -0.28]),
    key([0.08, -0.11, -0.45], [-0.35, 0.82, -0.45]),
    key([-0.03, -0.16, -0.44], [-0.6, 0.62, -0.5]),
    key([-0.1, -0.19, -0.41], [-0.68, 0.5, -0.54], HIGH),
    key([-0.13, -0.22, -0.38], [-0.7, 0.38, -0.6], HIGH),
  ],
  hit: 0.6,
  cocked: new Vector3(0.04, -0.07, -0.05),
  through: new Vector3(-0.04, 0.12, 0.08),
};

/** From low on the left, the arm wound across you, rising back up to high on the right. */
const ARC_BACK: BladeArc = {
  step: 1,
  keys: [
    key([-0.12, -0.17, -0.38], [-0.74, 0.52, -0.42], HIGH),
    key([-0.06, -0.16, -0.42], [-0.6, 0.64, -0.48]),
    key([0.04, -0.14, -0.45], [-0.32, 0.76, -0.56]),
    key([0.12, -0.1, -0.45], [0.02, 0.86, -0.5]),
    key([0.18, -0.07, -0.42], [0.26, 0.86, -0.44]),
    key([0.2, -0.05, -0.4], [0.36, 0.84, -0.4]),
  ],
  hit: 0.6,
  cocked: new Vector3(-0.03, 0.12, 0.07),
  through: new Vector3(0.04, -0.08, -0.05),
};

/** Up and over your head, the blade all but out of view; down the middle with all you have. */
const ARC_OVER: BladeArc = {
  step: 2,
  keys: [
    key([0.14, 0.02, -0.3], [0.06, 0.97, 0.2], OVER),
    key([0.12, 0, -0.4], [0.05, 0.99, -0.1], OVER),
    key([0.09, -0.07, -0.47], [-0.02, 0.86, -0.5], HIGH),
    key([0.06, -0.15, -0.5], [-0.08, 0.6, -0.8], HIGH),
    key([0.05, -0.21, -0.5], [-0.12, 0.38, -0.92], HIGH),
    key([0.04, -0.24, -0.47], [-0.15, 0.28, -0.95], HIGH),
  ],
  hit: 0.6,
  cocked: new Vector3(0.1, 0, 0),
  through: new Vector3(-0.1, 0.01, 0),
};

/** Update 0.3.72 — Ember Wave: from the charge, held high, cut down across the view; the crescent leaves as it passes the middle. */
const ARC_EMBER: BladeArc = {
  step: 3,
  keys: [
    key([0.22, -0.05, -0.38], [0.1, 0.94, -0.33]),
    key([0.14, -0.1, -0.44], [-0.2, 0.88, -0.42]),
    key([0.02, -0.15, -0.46], [-0.55, 0.66, -0.5]),
    key([-0.08, -0.2, -0.42], [-0.68, 0.46, -0.56], HIGH),
    key([-0.12, -0.23, -0.38], [-0.7, 0.36, -0.6], HIGH),
  ],
  hit: 0.5,
  cocked: new Vector3(0.06, -0.08, -0.05),
  through: new Vector3(-0.05, 0.14, 0.09),
};

/** Update 0.3.72 — Verdict Parry's counter-slash: from the block, straight back across. */
const ARC_COUNTER: BladeArc = {
  step: 4,
  keys: [
    key([0.14, -0.13, -0.44], [-0.52, 0.76, -0.38]),
    key([0.08, -0.14, -0.46], [-0.42, 0.72, -0.52]),
    key([0.13, -0.11, -0.46], [0, 0.86, -0.5]),
    key([0.2, -0.07, -0.42], [0.3, 0.86, -0.42]),
    key([0.22, -0.05, -0.4], [0.38, 0.84, -0.38]),
  ],
  hit: 0.5,
  cocked: new Vector3(-0.02, 0.08, 0.05),
  through: new Vector3(0.05, -0.12, -0.07),
};

export const DEMON_ARCS: readonly BladeArc[] = [ARC_SLASH, ARC_BACK, ARC_OVER, ARC_EMBER, ARC_COUNTER];

/** Update 0.3.72 — the block: the blade up across you, over the crosshair: you still have to see. */
export const DEMON_GUARD = key([0.2, -0.14, -0.42], [-0.52, 0.78, -0.34]);
/** Hellfire Lunge: the arm straight out, the blade on what you're looking at (a thrust's a fencer's, this once: the wrist couldn't do it). */
export const DEMON_THRUST = key([0.1, -0.17, -0.54], [-0.1, 0.12, -0.99], OUT, 48);
/** The sword going into the floor. */
export const DEMON_PLANT = key([0.13, -0.1, -0.54], [-0.12, -0.6, -0.79]);
