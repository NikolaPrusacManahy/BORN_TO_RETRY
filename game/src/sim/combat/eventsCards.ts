// Update 0.2.15 — the Scars' combat events. Update 0.2.16 — the Fate Cards' (sim/cards/), out of events.ts, which had
// reached its size. x, y, z: where it happened.
export type CardEvent =
  // A chest deals (value: how many cards); a card is taken (value: its index in CARD_KINDS).
  | 'dealStart'
  | 'cardTaken'
  // Shoulder Charge or Bowling throws an enemy back (value: its slot); Pogo bounces you up off a killing slam; Iron
  // Knuckles makes an enemy start its windup over (value: its slot); Ricochet turns a thrown weapon to its next enemy;
  // Bloodbath's execution blast (value: its reach); Killing Spree and Giant Killer come on; Blood Money's coins (value:
  // how many).
  | 'cardBump'
  | 'cardPogo'
  | 'cardStall'
  | 'cardRicochet'
  | 'cardBlast'
  | 'cardSpree'
  | 'cardGiant'
  | 'cardCoins';
