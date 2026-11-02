// Update 0.3.8 (the designer: "Finishers that interact with environment … the execution is the player facing the
// pinned enemy and they hit the enemy 2 times, one left and right hand, they grab the head and pin the enemy on the
// ground and join fist with a ground smash and they explode") — the wall finisher, for a body pinned to a wall
// (sim/enemies/flight.ts): free, whatever the meter. You're brought up to it, facing it; a left hook to its head, a
// right; its head grabbed in both hands and slammed down across the floor in front of you; your fists clasped and
// smashed down on it, and it bursts. The same for every kind that's pinned (each held by its head). The hands are the
// view's (engine/exec/pinLook.ts), timed to these. Pure.
import type { Execution } from './execution';
import { ExecMove, moveOf } from './execMoves';

/** How far in front of you the body hangs as it starts (m); its head, as a share of its height; how long you take to
 *  be brought up to it (s, at Execution speed 1). */
export const PIN_AHEAD = 1.3;
export const PIN_HEAD = 0.88;
export const PIN_LUNGE = 0.15;

/** Lying across the floor in front of you, its head on your left. */
const DOWN = [-0.75, 0.22, 1.0] as const;
const ACROSS = [1, -0.05, 0] as const;

export const PINNED: ExecMove = {
  held: true,
  keys: [
    { t: 0, grip: null, dir: [0, -1, 0], look: null },
    { t: 0.2, grip: null, dir: [0, -1, 0], look: [0, -4] },
    { t: 0.55, grip: null, dir: [0, -1, 0], look: [0, -4] },
    // Its head in your hands, pulled in…
    { t: 0.72, grip: [0, 1.55, 1.0], dir: [0, -1, 0.15], look: [0, -12] },
    // …and slammed down across the floor in front of you.
    { t: 0.95, grip: DOWN, dir: ACROSS, look: [0, -44], hit: true },
    // Your fists clasped up as you look up, and down on it.
    { t: 1.2, grip: DOWN, dir: ACROSS, look: [0, -16] },
    { t: 1.5, grip: DOWN, dir: ACROSS, look: [0, -46] },
    { t: 1.55, grip: DOWN, dir: ACROSS, look: [0, -46] },
  ],
  beats: [
    { t: 0.25, blow: 'punch', stop: 0.07 },
    { t: 0.5, blow: 'punch', stop: 0.09 },
    { t: 1.5, blow: 'smash', stop: 0.14 },
  ],
  end: 'burst',
  endAt: 1.55,
  half: 0.5,
};

/** The moves an execution plays: the wall finisher's, or its kind's. */
export const moveFor = (ex: Execution): ExecMove => (ex.pinned ? PINNED : moveOf(ex.kind));
