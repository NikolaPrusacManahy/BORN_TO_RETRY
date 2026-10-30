# Update 0.2.5 — fixes after playing 0.2.4

Status: built (2026-10-30). The designer's list:
- "Pistol bullets remain, looks ugly"
- "the way the player's hand hold the pistol needs a little bit of fixing"
- "The tribal mob is buggy when on a higher spot, they just run on the spot and remain stuck in place, you can make
  shoot from way further so they just don't stand there doing nothing, if the player is out of reach, like behind a
  wall, they jump down or just try to take a better position where they can see them and shoot at them"
- "Make the cactoro in the ground, when they go up, make them stay 0.8 sec longer, they stay up too little, no time to
  hit them"
- "there was a bug where I got a golden aura chest and had no keys in the room, check floor 4 miniboss key drop bug"
- (Then, on a render of the new hold, a circle on the grip panel:) "put the grip here, more accurate"

## The fixes
- **The Pistol's bullet streaks** never went: a streak's tail stopped where its head did, at the bullet's end, so it
  stayed in the air for good. Now each races to where the bullet ended and is gone. Thinner and fainter too.
- **The hand on the Pistol** sat too far forward on the grip. The designer then circled where on the grip panel the
  fingers belong ("put the grip here, more accurate"): the fist now closes **42%** of the way up the grip (was 45%; 60%
  in between, too high) and nearer its back strap: the fingertips on the lower panel, the web of the hand just under
  the slide's rear. Aimed, the sights are still exactly on the crosshair.
- **A Tribal on a perch** throws from **34 m** (was 19 m, as on the ground). With you out of its sight or that range
  for **1.5 s**, it jumps down to the floor out towards you (0.6 s in the air) and hunts you as a ground Tribal does:
  round the walls until it sees you, then keeping its distance and throwing. (F1 → Floor 4 enemies → Tribal perch
  range / patience.)
- **No running on the spot**: any enemy on its feet that stands still in its chase now stands (its idle), not runs.
- **The Cactoro** stays up **2.6 s** (was 1.8 s) after its spines.
- **The missing key**: the keys of a room are now yours when it's won, as a challenge room's always were: the keys
  lying in it, and any its mini boss owed and never dropped. Two ways it went missing: a mini boss killed where the
  chest rises left its key under the chest, out of reach; and with every drop slot in use, a new drop (a kill bonus)
  took the key's slot. A new drop now never takes a key's slot, and a key or bonus from an enemy killed up on
  something lands on top of it (it fell to the floor's height, inside the block).
