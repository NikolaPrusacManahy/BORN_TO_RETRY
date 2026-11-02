// Update 0.3.13 — floors 7 and 8's combat events (the world's, not an enemy's), out of events.ts, which had reached its
// size. x, y, z: where it happened. Update 0.3.14 — and floor 6's (Skull Cove's), and any pit's.
export type DepthsEvent =
  // Update 0.3.11 — floor 7's icicles: one shaking (where it hangs), one shattering (where it lands: dungeon/icicles.ts).
  | 'icicleShake'
  | 'icicleShatter'
  // Update 0.3.13 — floor 8's machinery (dungeon/machinery.ts), only near you: a press clanking (its warning) and
  // slamming down (value: its size across, m); a fire vent sputtering (its warning) and jetting.
  | 'pressWarn'
  | 'pressSlam'
  | 'ventWarn'
  | 'ventBurst'
  // Update 0.3.14 — floor 6's (dungeon/powder.ts): a powder keg blowing up (value: which), wherever it is. A body sinking
  // into a pit (value: which enemy; dungeon/lava.ts).
  | 'kegBlast'
  | 'pitSink'
  // Update 0.3.17 — floor 8's meteors (dungeon/meteors.ts): one called down (its warning, where it'll strike), one
  // striking.
  | 'meteorWarn'
  | 'meteorStrike';
