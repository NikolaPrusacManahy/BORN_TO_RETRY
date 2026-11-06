// Update 0.3.63 — floor 10's boss's combat events (Hellwarden), out of events.ts. One's value is which enemy (unless said); x, y, z where it
// happened.
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
  | 'wardenCrack';
