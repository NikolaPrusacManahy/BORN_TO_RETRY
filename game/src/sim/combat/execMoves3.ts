// Update 0.2.2 — floor 3's executions (the designer's list; moved out of execMoves.ts, which would have grown past 300
// lines). The Ninja: "the same leaper execution basically" (the same model, bigger): an arm torn off, the other chopped,
// three punches to its face and away, stood further off (framed as the leaper is) and the view up where its bigger
// body is.
// The Mushnub: the slime's (execMoves.ts). The Skeleton: telekinesis ("the player's right hand is extended as it
// closes their fist and the skeleton explodes into bone pieces, no revive, it is one shot"): pulled in front of you
// and lifted off the floor, shaking in your open hand's hold; your fist closes and it bursts. Pure.
import type { ExecMove } from './execMoves';

/** The Ninja's: as the leaper's, stood further off (1.7 m: its 2.6 m framed as the leaper's 1.9 m at 1.3), the view
 *  and the blows higher. */
export const NINJA: ExecMove = {
  held: false,
  keys: [
    { t: 0, grip: null, look: null },
    { t: 0.2, grip: [0, 0, 1.7], look: [-8, 0] },
    { t: 0.45, grip: [0, 0, 1.8], look: [-8, 0] },
    { t: 0.5, grip: [0, 0, 1.7], look: [6, 6] },
    { t: 0.72, grip: [0, 0, 1.7], look: [8, 6] },
    { t: 0.85, grip: [0, 0, 1.7], look: [0, 14] },
    { t: 1.0, grip: [0, 0, 1.75], look: [0, 14] },
    { t: 1.2, grip: [0, 0, 1.75], look: [0, 16] },
  ],
  beats: [
    { t: 0.45, blow: 'tear', stop: 0.1, at: [0.45, 1.5, 1.0] },
    { t: 0.72, blow: 'chop', stop: 0.09, at: [-0.9, 1.95, 1.5] },
    { t: 0.85, blow: 'punch', stop: 0.06, at: [0, 2.15, 1.5] },
    { t: 1.0, blow: 'punch', stop: 0.06, at: [0, 2.15, 1.55] },
    { t: 1.2, blow: 'punch', stop: 0.16, at: [0, 2.15, 1.55] },
  ],
  end: 'throw',
  endAt: 1.2,
  half: 0.5,
  lob: 0.6,
};

/** The Skeleton's: pulled 2.1 m in front of you as it's lifted (a standing body's `grip` height: off the floor),
 *  held up, crushed. */
export const SKELETON: ExecMove = {
  held: false,
  keys: [
    { t: 0, grip: null, look: null },
    { t: 0.3, grip: [0, 0.15, 2.1], look: [0, 2] },
    { t: 0.8, grip: [0, 0.5, 2.1], look: [0, 6] },
    { t: 0.92, grip: [0, 0.55, 2.1], look: [0, 6] },
  ],
  beats: [{ t: 0.92, blow: 'crush', stop: 0.16 }],
  end: 'burst',
  endAt: 0.92,
  half: 0.5,
};
