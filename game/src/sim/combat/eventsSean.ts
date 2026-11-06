// Update 0.3.81 — Gravity Sean's combat events, out of events.ts. Each carries where it happened.
export type SeanEvent =
  // E: into Unstable mode; back, vented (value: how full the meter was); the meter at max.
  | 'seanUnstable'
  | 'seanVent'
  | 'seanOverload'
  // Any blast of his (value: its radius); Ground Slam; a dash pulled to an enemy (value: which).
  | 'seanBlast'
  | 'seanSlam'
  | 'seanPull'
  // Gravity Punch's ripple, out to where it ended (value: how far from the eye).
  | 'seanRipple'
  // The shared meter's full.
  | 'seanUltReady';
