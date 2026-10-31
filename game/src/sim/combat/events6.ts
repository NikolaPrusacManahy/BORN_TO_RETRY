// Update 0.2.11 — floor 6's combat events (the Sunken Grove's fish), out of events.ts, which had reached its size. Each
// one's value is which enemy (unless said), x, y, z where it happened.
export type FishEvent =
  // The Clownfish: flashing, darting in, a nip. The Tuna: its tail beating fast, its charge, a ram, dazed in a wall.
  // The Angelfish: flashing behind you, its bite. The Dolphin: bubbles rising under you (x, y, z: the spot), ramming up,
  // a ram. The Drowned Prince: rearing for its jet, the jet, calling geysers.
  | 'clownWindup'
  | 'clownDart'
  | 'clownBite'
  | 'tunaWindup'
  | 'tunaCharge'
  | 'tunaRam'
  | 'tunaStun'
  | 'angelWindup'
  | 'angelBite'
  | 'dolphinRise'
  | 'dolphinRam'
  | 'dolphinHit'
  | 'princeWindup'
  | 'princeJet'
  | 'princeGeysers'
  // The Manta Ray: its shadow where it'll drop (value: its radius; x, y, z: the spot), landing, its barb rising, the
  // whip, its wings rising, the gust. The Shark: turning on you, its lunge, a bite, the death roll starting, a shake,
  // you breaking free, stunned (a punch on the nose, or a wall).
  | 'mantaShadow'
  | 'mantaDrop'
  | 'mantaBarbWindup'
  | 'mantaBarb'
  | 'mantaGustWindup'
  | 'mantaGust'
  | 'sharkWindup'
  | 'sharkLunge'
  | 'sharkBite'
  | 'sharkRoll'
  | 'sharkShake'
  | 'sharkFree'
  | 'sharkStun'
  // The Old Whale: its roar as it turns on you; its ram's lane (x, y, z: its middle), the ram, into a wall; drawing
  // breath, its song, its song catching you; inhaling, swallowing you; rising to breach, where it'll crash (value: the
  // shock's reach; x, y, z: the spot), crashing down (value: the shock's reach).
  | 'whaleRoar'
  | 'whaleRamWarn'
  | 'whaleRam'
  | 'whaleCrash'
  | 'whaleSongWindup'
  | 'whaleSong'
  | 'whaleSongHit'
  | 'whaleInhale'
  | 'whaleSwallow'
  | 'whaleBreach'
  | 'whaleBreachWarn'
  | 'whaleCrashDown';
