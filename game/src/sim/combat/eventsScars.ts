// Update 0.2.15 — the Scars' combat events (sim/scars/), out of events.ts, which had reached its size. x, y, z: where it
// happened.
export type ScarEvent =
  // A Scar bounces out of a chest, lands on the floor, one is taken, the rest of its offer fades (value: its index in
  // SCAR_KINDS).
  | 'scarOffer'
  | 'scarLand'
  | 'scar'
  | 'scarGone'
  // Shoulder Charge or Bowling throws an enemy back (value: its slot); Pogo bounces you up off a killing slam; Iron
  // Knuckles makes an enemy start its windup over (value: its slot); Ricochet turns a thrown weapon to its next enemy;
  // Bloodbath's execution blast (value: its reach).
  | 'scarBump'
  | 'scarPogo'
  | 'scarStall'
  | 'scarRicochet'
  | 'scarBlast';
