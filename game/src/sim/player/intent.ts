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
  /** Update 0.0.12 — the ground slam (Update 0.3.20: Ctrl; the slide is gone). */
  slamPressed: boolean;
  /** Update 0.2.11 — swimming (swim.ts): the look's pitch (rad, up +) and jump held (rising). Update 0.3.20 — the slam
   *  key held (diving). */
  pitch?: number;
  jumpHeld?: boolean;
  slamHeld?: boolean;
}

export function emptyIntent(yaw = 0): PlayerIntent {
  return { moveX: 0, moveZ: 0, yaw, jumpPressed: false, dashPressed: false, slamPressed: false };
}
