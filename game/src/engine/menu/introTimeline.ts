// Main menu — what Start plays, as pure timing: the portcullis grinds up, then the screen fades to black and the
// lab starts. (Update 0.0.4 first walked you in through the gate; the designer cut it to the gate and the fade.)

export const INTRO = {
  /** When the portcullis starts rising, and how long it takes (s). */
  gateStart: 0.1,
  gateRise: 1.2,
  /** How high it rises (m): the wall above the arch hides at most ~3 m of bars, so they never poke out of its top. */
  gateLift: 2.6,
  /** The fade to black starts here (s), once the gate is nearly up, and lasts `fade` (s); the lab starts after. */
  fadeAt: 0.8,
  fade: 0.6,
} as const;

export const INTRO_LENGTH = INTRO.fadeAt + INTRO.fade;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

/** How far the portcullis has risen at time `t` (m). */
export function gateLift(t: number): number {
  return easeOutCubic(clamp01((t - INTRO.gateStart) / INTRO.gateRise)) * INTRO.gateLift;
}
