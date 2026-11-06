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
  // Update 0.3.82 — Grab: a piece taken (value: 1 big), a pillar torn out (value: which), thrown (value: 1 big), broken up (value: 1 big), a shot stopped.
  | 'seanGrab'
  | 'seanPillar'
  | 'seanThrow'
  | 'seanShatter'
  | 'seanBlock'
  // Fling: nothing there, caught, thrown (value: which), slammed into something, set down.
  | 'seanMiss'
  | 'seanCatch'
  | 'seanFling'
  | 'seanSlamInto'
  | 'seanLand'
  // Update 0.3.83 — Black Hole: gathering, open, a tick of its damage (value: how much), its end. Meteor: called, on its way, down (value: its radius).
  | 'seanHoleCharge'
  | 'seanHoleOpen'
  | 'seanHoleHit'
  | 'seanHoleBurst'
  | 'seanMeteorCall'
  | 'seanMeteorFall'
  | 'seanMeteorHit'
  // The shared meter's full.
  | 'seanUltReady';
