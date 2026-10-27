// M1 — the player's physical size. Not a feel number: it decides what fits through which gap.

export const BODY = {
  radius: 0.4,
  /** Standing height (m). */
  height: 1.8,
  /** Height while sliding (m): fits under the Feel Lab's 1.3 m tunnel. */
  crouchHeight: 1.2,
  /** Steps up to this high are walked (and slid) up. The collision capsule floats this far above the feet;
   *  a ground probe puts the feet on the ground. */
  stepHeight: 0.4,
} as const;
