// Update 0.3.15 — floor 6's crew's combat events (Skull Cove), out of events.ts, which had reached its size. Each one's
// value is which enemy (unless said), x, y, z where it happened.
export type CoveEvent =
  // The Corsair: her axe going up, its blow; her hook whirling overhead (its warning), thrown, catching you (value:
  // which), missing; dragging you in.
  | 'corsairWindup'
  | 'corsairStrike'
  | 'hookTwirl'
  | 'hookThrow'
  | 'hookCatch'
  | 'hookMiss'
  // The Shanty Man: a note of his song (the crew round him quickened); his lute swung, cornered.
  | 'shantyNote'
  | 'shantyStrike'
  // The Bomber: his throw wound up, the bomb thrown; his cleaver up close; a bomb you punched back (value: the bomb's
  // slot); a powder bomb blowing up (value: its radius, m).
  | 'bomberWindup'
  | 'bomberThrow'
  | 'bomberStrike'
  | 'bombBatted'
  | 'powderBlast'
  // The Cursed Crewman: its cutlass up, its blow; brought down, its skull flying off (it goes on headless); the headless
  // body's wild swing up, its blow.
  | 'crewmanWindup'
  | 'crewmanStrike'
  | 'skullOff'
  | 'headlessWindup'
  | 'headlessStrike'
  // The Thieving Gull: swooping, snatching your coins (value: how many), dropping them killed (value: how many), gone
  // with them.
  | 'gullDive'
  | 'gullSteal'
  | 'gullDrop'
  | 'gullEscape'
  // The Cave Bat: diving at you, its bite.
  | 'batDive'
  | 'batBite'
  // The Kraken Tentacle: rising out of the sea, its slam's shadow across the ground (value: which; x, z: where the slam
  // ends), the slam, its poke, sinking back.
  | 'tentacleRise'
  | 'tentacleWindup'
  | 'tentacleSlam'
  | 'tentacleSink'
  | 'tentacleGrab'
  | 'tentacleQteHit'
  | 'tentacleFree'
  // (Update 0.3.16 — the Big Shark: its show, its moves, your escapes, its jaws.)
  | 'bigSharkFlood'
  | 'bigSharkBreach'
  | 'bigSharkSplash'
  | 'bigSharkDrain'
  | 'bigSharkLunge'
  | 'bigSharkPass'
  | 'bigSharkSnapWindup'
  | 'bigSharkSnap'
  | 'bigSharkBite'
  | 'bigSharkEscape'
  | 'bigSharkFumble'
  | 'bigSharkJaws'
  | 'bigSharkCharge'
  | 'bigSharkCatch'
  | 'bigSharkPry'
  | 'bigSharkThroat'
  | 'bigSharkGulp'
  | 'bigSharkStuck'
  | 'bigSharkTailWindup'
  | 'bigSharkTail'
  | 'bigSharkFrenzy'
  // Mako: diving into the sand, the sand churning where it'll erupt (x, z: the spot), erupting with its bite, its
  // charge on boards, its cleaver up, its blow.
  | 'makoDive'
  | 'makoRise'
  | 'makoBite'
  | 'makoCharge'
  | 'makoWindup'
  | 'makoStrike'
  // Captain Barbarossa: his aim (the red line), his shot (x, y, z: where it ends), his hook back, its sweep.
  | 'captainAim'
  | 'captainShot'
  | 'captainWindup'
  | 'captainSweep';
