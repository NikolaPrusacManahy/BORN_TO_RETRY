// Update 0.2.10 — floor 5's combat events (the Drowned Temple), out of events.ts, which had reached its size. What
// each one's value and x, y, z mean is next to it.
export type DrownedEvent =
  // Update 0.2.10 — floor 5's tide (sim/dungeon/tide.ts): the horn as the water starts to rise, and it draining.
  | 'tideRise'
  | 'tideFall'
  // Update 0.2.10 — floor 5's enemies (value = which enemy; x, y, z = where). The Snapper: gathering to lunge, its lunge,
  // its bite, diving under the water, the water ringing where it'll come up. The Urchin: curling (its spikes out), its
  // roll, rolling into you, stopping, its spikes going in, a blow turned by its spikes (its thorns hurt you). The Jelly:
  // glowing, its shock (value: how far it reached). The Glub: puffing up, its bolts; the Big Glub: swelling, a bubble
  // lobbed, a bubble popping (value: its radius). The Squidle: rearing, its dive, its ink in your eyes. The Spawnling:
  // rearing, its bite.
  | 'snapperWindup'
  | 'snapperLunge'
  | 'snapperBite'
  | 'snapperDive'
  | 'snapperRise'
  | 'urchinCurl'
  | 'urchinRoll'
  | 'urchinHit'
  | 'urchinStop'
  | 'urchinOpen'
  | 'urchinThorns'
  | 'jellyGlow'
  | 'jellyShock'
  | 'glubWindup'
  | 'glubSpit'
  | 'bubbleWindup'
  | 'bubbleLob'
  | 'bubblePop'
  | 'squidleWindup'
  | 'squidleDive'
  | 'squidleInk'
  | 'spawnWindup'
  | 'spawnBite'
  // Update 0.2.10 — floor 5's mini bosses. The Deep One: rearing to claw, its claws, its tentacle glowing down its line,
  // its lash missing (x, z: the line's end) or catching you, its slam once it's dragged you in. The Bog Brute: rearing to
  // swipe, its swipe, diving under the water, the water ringing where it'll come up, crouching to leap, its leap, its
  // rise or its landing (a wave rolls out).
  | 'deepClawWindup'
  | 'deepClaw'
  | 'deepLashWindup'
  | 'deepLash'
  | 'deepCatch'
  | 'deepSlam'
  | 'bogSwipeWindup'
  | 'bogSwipe'
  | 'bogDive'
  | 'bogRise'
  | 'bogCrouch'
  | 'bogLeap'
  | 'bogSlam'
  // Update 0.2.10 — floor 5's boss, the Drowned King (drownedKing.ts): its roar as it takes its stance, and as it rises
  // for good; sinking under; the water ringing where it'll come up, and it bursting up; its undertow taking hold (x, z:
  // its ring); coming up for its jet, rearing, its jet; its tidal wall rising, rolling; sinking into a wave, surfing;
  // opening its jaws, its bite; calling its geysers, each one bursting up (bombs.ts).
  | 'drownedRoar'
  | 'drownedRisen'
  | 'drownedDive'
  | 'drownedRiseWarn'
  | 'drownedRise'
  | 'drownedUndertow'
  | 'drownedSurface'
  | 'drownedSpoutWindup'
  | 'drownedSpout'
  | 'drownedTideWindup'
  | 'drownedTide'
  | 'drownedSurfWindup'
  | 'drownedSurf'
  | 'drownedBiteWindup'
  | 'drownedBite'
  | 'drownedGeyserCall'
  | 'geyserBurst';
