// Update 0.3.63 — floor 10's boss's combat events (Hellwarden), out of events.ts. One's value is which enemy (unless said); x, y, z where it
// happened. Update 0.5.4 — and its own fighters' (the Imp, the Puglin, the two skeletons).
export type HellEvent =
  // Its blade flaring, its Arc.
  | 'wardenFlare'
  | 'wardenArc'
  // Embers, gone; the whoosh from the side it'll arrive on; its thrust; parried.
  | 'wardenEmbers'
  | 'wardenVanish'
  | 'wardenWhoosh'
  | 'wardenThrust'
  | 'wardenParried'
  // Its sword raised, in the floor; a step of its pillars (value: which).
  | 'wardenRaise'
  | 'wardenBrand'
  | 'wardenErupt'
  // Calling its echoes; one (value: which), its blow.
  | 'wardenCall'
  | 'wardenEcho'
  | 'wardenEchoHit'
  // Its arms crossed, its blades thrown; one knocked away, fetched.
  | 'wardenCross'
  | 'wardenThrow'
  | 'wardenDisarmed'
  | 'wardenFetched'
  // Its throne room breaking.
  | 'wardenRoar'
  // Last Verdict: the silence, its charge, its flash, its sword shattered, its cleave.
  | 'wardenVerdict'
  | 'wardenCharge'
  | 'wardenFlash'
  | 'wardenShatter'
  | 'wardenCleave'
  // Update 0.3.64 — its show: the floor splitting.
  | 'wardenRift'
  // Update 0.3.65 — the designer's shot list: the door, the torches, the bones dragged in, the lava surging, the chains, each piece of armor (value:
  // which), its sword rising and heating, its skull, the mask on, the eye, the silence, its leap, the freeze frame and out of it, its landing;
  // and at half health, the mask cracking and the second eye lit.
  | 'wardenDoor'
  | 'wardenTorches'
  | 'wardenBones'
  | 'wardenSurge'
  | 'wardenSnap'
  | 'wardenClamp'
  | 'wardenSwordRise'
  | 'wardenHeat'
  | 'wardenSkull'
  | 'wardenMaskOn'
  | 'wardenEye'
  | 'wardenHush'
  | 'wardenLeap'
  | 'wardenFreeze'
  | 'wardenThaw'
  | 'wardenLand'
  | 'wardenCrack'
  // Update 0.5.4 — the Imp's swing, its combo, its fireball wound up and thrown; the Puglin's club, its rush; the Bone Axeman's chop, its leap
  // for the floor split (its line shown), the split (value: its length; x, y, z its start), you burned on it (value: 1 its burst), its spin; the
  // Bone Guard's cut, its combo, a blow turned on its guard (x, y, z its sword), its guard broken, its riposte.
  | 'impSwing'
  | 'impCombo'
  | 'impFireWindup'
  | 'impFire'
  | 'puglinClub'
  | 'puglinRush'
  | 'axeChop'
  | 'axeSplitWarn'
  | 'axeSplit'
  | 'splitBurn'
  | 'axeSpin'
  | 'guardCut'
  | 'guardCombo'
  | 'guardTurn'
  | 'guardBreak'
  | 'guardRiposte'
  // Update 0.5.5 — the Cinder Chicken's squawk, its fuse burning (it stopped close), lit by a blow, its burst (value: its reach); the Brimstone
  // Bee rearing back, its bomb dropped; the Pit Fiend's warning (value: its move), its leap, its landing (value: its ring's reach), its fan of
  // fire, its roar; the Spore Lord's warning (value: its move), its puff, its slam (value: its ring's reach), its bite; a spore cloud blowing
  // (value: its reach), burning you.
  | 'chickenSquawk'
  | 'chickenFuse'
  | 'chickenLit'
  | 'chickenBurst'
  | 'beeWindup'
  | 'beeBomb'
  | 'fiendWindup'
  | 'fiendLeap'
  | 'fiendSlam'
  | 'fiendVolley'
  | 'fiendRoar'
  | 'sporeWindup'
  | 'sporePuff'
  | 'sporeSlam'
  | 'sporeBite'
  | 'sporeBlast'
  | 'sporeBurn';
