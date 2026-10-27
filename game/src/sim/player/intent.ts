// M1 — what the player asked for this tick, already turned from keys into intentions. Built by the engine
// from Input; tests build it by hand.

export interface PlayerIntent {
  /** -1 left .. 1 right. */
  moveX: number;
  /** -1 back .. 1 forward. */
  moveZ: number;
  /** Facing from the mouse (rad). */
  yaw: number;
  jumpPressed: boolean;
  dashPressed: boolean;
  slidePressed: boolean;
  slideHeld: boolean;
  /** Update 0.0.12 — F: the ground slam. */
  slamPressed: boolean;
}

export function emptyIntent(yaw = 0): PlayerIntent {
  return { moveX: 0, moveZ: 0, yaw, jumpPressed: false, dashPressed: false, slidePressed: false, slideHeld: false, slamPressed: false };
}
