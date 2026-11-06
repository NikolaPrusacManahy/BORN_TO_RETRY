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
  // Gravity Punch's ripple, out to where it ended (value: 1 the combo's third). Update 0.3.86 — any punch of his meeting something (value: 1 the combo's third; 2 his fists).
  | 'seanRipple'
  | 'seanImpact'
  // Grab, held: a rock tears out of the floor; it's reached the rest (value: how far it's gathered, 0 … 1).
  | 'seanTear'
  | 'seanGathered'
  // Update 0.3.89 — his palms join; the sphere's let go, on its way down; it lands (value for both: how far it had gathered, 0 … 1; where: where it is, where it lands).
  | 'seanJoin'
  | 'seanDrop'
  | 'seanCrash'
  // Update 0.3.82 — Grab: a piece taken (value: 1 big), a pillar torn out (value: which), thrown (value: 1 big), broken up (value: 1 big), a shot stopped.
  | 'seanGrab'
  | 'seanPillar'
  | 'seanThrow'
  | 'seanShatter'
  | 'seanBlock'
  // Update 0.3.84 — Black Hole: in his palm, thrown, open (value: how long it'll run), a tick of its damage (value: how much), its end. Shockwave Punch: drawn back; out (value: 1 on the ground; where: the end of its reach).
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
  // Update 0.3.90 — what it's holding is enough to kill one.
  | 'seanDoomed'
  // Update 0.3.83 — Meteor: called, on its way, down (value: its radius).
  | 'seanMeteorCall'
  | 'seanMeteorFall'
  | 'seanMeteorHit'
  // Update 0.3.88 — health back from a kill.
  | 'seanMend'
  // The shared meter's full. Update 0.3.87 — a long wait's over (value: 0 Black Hole, 1 Shockwave Punch).
  | 'seanUltReady'
  | 'seanReady';
