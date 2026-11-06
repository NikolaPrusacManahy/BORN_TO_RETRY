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
  // Update 0.3.84 — Black Hole: in his palm, thrown, open, a tick of its damage (value: how much), its end. Shockwave Punch: drawn back; out (value: 1 on the ground; where: the end of its reach).
  | 'seanHoleCharge'
  | 'seanHoleThrow'
  | 'seanHoleOpen'
  | 'seanHoleHit'
  | 'seanHoleBurst'
  | 'seanShockUp'
  | 'seanShock'
  // Update 0.3.85 — Time Stop: it starts; a hit held back (value: all it's holding on that target); it ends (value: how many it held); a target's blows land (value: their sum).
  | 'seanStopStart'
  | 'seanStopHit'
  | 'seanStopEnd'
  | 'seanStopPop'
  // Update 0.3.83 — Meteor: called, on its way, down (value: its radius).
  | 'seanMeteorCall'
  | 'seanMeteorFall'
  | 'seanMeteorHit'
  // The shared meter's full.
  | 'seanUltReady';
