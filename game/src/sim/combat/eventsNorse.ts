// Update 0.3.22 — floor 7's warband's combat events (Frozen Depths), out of events.ts, which had reached its size. Each
// one's value is which enemy (unless said), x, y, z where it happened.
export type NorseEvent =
  // The Raider: crouched (his boots scrape: a slide coming), kicking off, sliding into you, into a wall (dazed); his
  // chop wound up and landing.
  | 'raiderCrouch'
  | 'raiderSlide'
  | 'raiderSlideHit'
  | 'raiderDazed'
  | 'raiderWindup'
  | 'raiderChop'
  // The Axe Thrower: her arm back, her two axes away, rolling clear, her shove.
  | 'throwerWindup'
  | 'throwerThrow'
  | 'throwerRoll'
  | 'throwerShove'
  // The Draugr: rising out of the snow, its grasp wound up and landing; you chilled (value: the chills in you).
  | 'draugrRise'
  | 'draugrWindup'
  | 'draugrGrasp'
  | 'chilled'
  // The Völva: her hand glowing, her rime bolt away, a bolt bursting (value: its reach); her chant over a body (x, y,
  // z: the body), the body risen, her chant broken.
  | 'volvaCast'
  | 'volvaBolt'
  | 'rimeBurst'
  | 'volvaChant'
  | 'volvaRaise'
  | 'volvaBroken'
  // The Berserker: his roar (a spin coming), spinning, his spin catching you, dizzy after; his chop wound up and landing.
  | 'berserkerRoar'
  | 'berserkerSpin'
  | 'berserkerSpinHit'
  | 'berserkerDizzy'
  | 'berserkerWindup'
  | 'berserkerChop'
  // Haugbui: his blow wound up and landing; his foot raised, his stomp (value: its reach); tearing up a block of ice,
  // hurling it, a block shattering (value: its reach).
  | 'haugbuiWindup'
  | 'haugbuiBlow'
  | 'haugbuiLift'
  | 'haugbuiStomp'
  | 'haugbuiTear'
  | 'haugbuiHurl'
  | 'iceBlockShatter';
