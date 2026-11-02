// Update 0.3.8 — executions' keys made in code (moved out of execMoves.ts, which had grown past 300 lines): the snake's
// swing and the frog's whirl. Pure.
import type { BodyKey, V3 } from './execMoves';

/** The snake's (Update 0.1.1): raised in front of you, so you see it come down; swung round on your right (the left
 *  hand holds the tail's end, so a body out to the left would cross your arms), never through your head. */
export const SNAKE: BodyKey[] = [
  { t: 0, grip: null, dir: [0, 1, 0], look: null },
  { t: 0.22, grip: [0.25, 1.35, 0.9], dir: [0, -1, 0.15], look: [0, -12] },
  { t: 0.38, grip: [0.2, 1.8, 0.85], dir: [0.1, 0.95, 0.25], look: [0, 16] },
  { t: 0.5, grip: [0.15, 0.75, 1.0], dir: [0, -0.85, 0.53], look: [0, -32], hit: true },
  { t: 0.68, grip: [0.25, 1.65, 0.8], dir: [0.65, 0.55, 0.5], look: [-10, 4] },
  { t: 0.84, grip: [0.1, 1.8, 0.8], dir: [0.15, 0.95, 0.2], look: [0, 16] },
  { t: 1, grip: [0.35, 0.75, 0.9], dir: [0.61, -0.76, 0.2], look: [-12, -32], hit: true },
  { t: 1.15, grip: [0.35, 1.7, 0.45], dir: [0.75, 0.3, -0.6], look: [-18, 0] },
  { t: 1.3, grip: [0.2, 1.6, 1.15], dir: [0, 0.15, 1], look: [0, -3] },
];

/** The frog's whirl: yanked up in front of you, then twice round overhead on its tongue (a ring tilted down in front, so
 *  you see it pass), its head to your hand; let go in front. */
export function frogKeys(): BodyKey[] {
  const keys: BodyKey[] = [
    { t: 0, grip: null, dir: [0, 0, -1], look: null },
    { t: 0.22, grip: null, dir: [0, 0, -1], look: [0, 4] },
  ];
  const c: V3 = [0, 2.15, 0.7];
  const r = 1.3;
  const tilt = (35 * Math.PI) / 180;
  const at = (a: number): [V3, V3] => {
    const x = Math.cos(a);
    const f = Math.sin(a);
    const out: V3 = [x, -f * Math.sin(tilt), f * Math.cos(tilt)];
    return [[c[0] + r * out[0], c[1] + r * out[1], c[2] + r * out[2]], out];
  };
  const [p0, d0] = at(Math.PI / 2);
  keys.push({ t: 0.45, grip: p0, dir: d0, look: [0, 26] });
  // Two turns, a key every 30°, from in front round by your right.
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const [p, d] = at(Math.PI / 2 - (i * Math.PI * 2 * 2) / steps);
    keys.push({ t: 0.45 + (i * 1.05) / steps, grip: p, dir: d, look: [0, 28], glide: true });
  }
  return keys;
}
