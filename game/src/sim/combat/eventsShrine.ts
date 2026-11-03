// Update 0.3.33 — floor 8's martial artists' combat events (the Shrine Dimension), out of events.ts, which had reached
// its size. Each one's value is which enemy (unless said), x, y, z where it happened.
export type ShrineEvent =
  // Any of them: a dash in, a blow thrown (a whoosh: x, y, z its fist or foot), a blow landing on you, a side-step, a
  // block (x, y, z its arms).
  | 'martialDash'
  | 'martialBlow'
  | 'martialHit'
  | 'martialDodge'
  | 'martialBlock'
  // The karate fighters: a punch, a kick or knee, the combo, the counter after a block, the flying knee, the back-flip.
  | 'karateStrike'
  | 'karateKick'
  | 'karateCombo'
  | 'karateCounter'
  | 'karateKnee'
  | 'karateFlip'
  // The Shinobi: his arm back to throw, his shuriken away, his dash cut, a katana cut.
  | 'shurikenWindup'
  | 'shurikenThrow'
  | 'dashCut'
  | 'katanaCut'
  // The Kunoichi: onto a wall, off it into her leap, her leap from the floor, coming down (value: its reach), her kunai.
  | 'wallRun'
  | 'wallLeap'
  | 'ninjaLeap'
  | 'ninjaLand'
  | 'kunaiThrow'
  // The Sand Ninjas: a smoke bomb away and bursting (value: its reach), caltrops scattered and cutting you, a roll.
  | 'smokeThrow'
  | 'smokeBurst'
  | 'caltropsScatter'
  | 'caltropsCut'
  | 'sandRoll'
  // The Archer: drawing (a glint), loosing, a volley.
  | 'bowDraw'
  | 'bowLoose'
  | 'bowVolley'
  // The Sensei: a blow turned on his guard (x, y, z: his staff), his counter, his staff's combos, his slam (value: its
  // reach), his ki palm.
  | 'senseiGuard'
  | 'senseiCounter'
  | 'staffCombo'
  | 'staffSlam'
  | 'kiPalm'
  // The Shadow: his long cut wound up (x, y, z where it starts; its way is his facing), cutting along it, splitting
  // (value: the clones), a clone fading.
  | 'shadowCutWarn'
  | 'shadowCut'
  | 'shadowSplit'
  | 'cloneFade'
  // Update 0.3.34 — Yokai : Okami: its growl as it strikes, each claw's blow (x, y, z its claws); its show (okamiShow.ts):
  // the rooms gone (value: the room; y its half-width), the arena growing (value: its stage), the islands coming in,
  // it coming down out of the sky onto its island, an island crashing in (value: which; y its radius), a temple coming
  // down (value: which), its leap, its landing (value: its ring's reach), its roar (its scream) after it.
  | 'okamiGrowl'
  | 'okamiClaw'
  | 'okamiBlast'
  | 'okamiGrow'
  | 'okamiIsles'
  | 'okamiArrive'
  | 'isleCrash'
  | 'templeFall'
  | 'okamiLeap'
  | 'okamiLand'
  | 'okamiRoar'
  // Update 0.3.35 — its moves: each leap's going up and its landing (value: its shockwave's reach); its blue fireball
  // swelling, thrown, bursting (value: its reach); its fire dash's line (value: its length; x, z its start), its dash,
  // its line bursting into flame (value: its length), it burning you; its roar of fire; its devastation: gone in fire,
  // in the middle, charging (value: the arena's half), broken, its massive fireball hurled, bursting (value: its reach).
  | 'okamiLeapUp'
  | 'okamiLeapLand'
  | 'okamiFireballCharge'
  | 'okamiFireballThrow'
  | 'kitsuneBlast'
  | 'okamiDashWarn'
  | 'okamiDash'
  | 'okamiBurn'
  | 'okamiBurnYou'
  | 'okamiBreath'
  | 'okamiVanish'
  | 'okamiAppear'
  | 'okamiCharge'
  | 'okamiChargeBroken'
  | 'okamiHurl'
  | 'sunBlast';
