# Floor 6 reworked — Skull Cove, a pirate floor (draft, 2026-11-02)

The designer: "time to rework floor 6 entirely": a new `ASSETS/QUATERNIUS/FLOOR-6` (Quaternius's Pirate Kit, one
texture atlas); the boss is the Big Shark and you fight it under water; the rest of floor 6 isn't under water any more,
it's a pirate floor; its mini boss is the big shark; 1 or 2 flying enemies we haven't used; enemies new and
challenging, nothing duplicated from other floors. This is Claude's plan for it, to be agreed before building.

Reading of "the big shark", twice: the **boss** is the kit's **Shark** (a real shark, 5.6 m, swimming and biting); the
**mini boss** is **Mako**, the kit's big muscular shark-man. (Sharky, the smaller blue one, is a regular.)

The Sunken Grove (floor 6 under water), its fish and the Old Whale leave the game. Their code stays: the swimming and the
underwater look are what the boss room uses.

## The look
A pirate cove under a hot bright sun: **sand** underfoot with **wooden boardwalks** (the kit's docks, on stilts) over
channels of **sea**; palms in beds of sand; the dungeon's walls as weathered sea rock with the kit's **cliffs** banked
against them; pirate **houses**, a **beached ship**, cannons, barrels, chests and gold, skulls and big bones. The kit's
pieces keep their own atlas texture (not recoloured); the walls and paving are tinted to sit with it.

## Its mechanics
- **The sea**: channels and pools of deep water. Fall in: hurt and back to the door, as lava. An enemy knocked in
  sinks and is gone.
- ~~**Cannons**~~: built in 0.3.14, then taken out (the designer: "far far unmanagable on fast gameplay").
- **Powder kegs**: barrels that blow up when hit (a punch, a throw, a cannonball, another keg): a wide blast that
  hurts everyone. Chains of them.
- **The beached wreck**: Ship_Large in a room, its deck a raised platform with ramps up.

## Its rooms (nine)
The Docks (boardwalks over the sea), The Beach (sand, palms, rocks), The Wreck (the beached ship), Pirate Town (houses
along a lane), The Shipyard (boats up on the sand; it was The Battery, of cannons), The Hoard (a cave of chests and gold, its bats), The Powder
Store (kegs everywhere), Bone Reef (giant bones and skulls), The Kraken's Pool (a wide pool its tentacles rise from).

## Its enemies (new, none like another floor's)
1. **Corsair** (Anne): parries your punches from the front with her cutlass and strikes back; get round her, or
   break her guard with a charged punch or a slam.
2. **Shanty Man** (Henry): hangs back playing his lute; while he plays, pirates near him attack faster and harder.
   He keeps away from you. Kill him first.
3. **Bomber** (Sharky): lobs lit bombs that roll and blow up when the fuse is done; punch a bomb and it flies back.
4. **Cursed Crewman** (Skeleton): hit it hard and its skull flies off. Headless and blind (Skeleton_Headless), it
   swings wild and charges where it last heard you: a punch, a dash, a landing. It has to be killed again.
5. **Thieving Gull** (Pigeon, an unused flier): swoops in and snatches coins, then flies off with them; kill it
   before it's gone to get them back. Comes in pairs.
6. **Cave Bats** (Bat, an unused flier): a swarm of 4–6 circling overhead, diving one after another; a punch kills
   one.
7. **Kraken Tentacle** (Tentacle): rises from the sea beside a boardwalk, sways, then slams down across it (its
   shadow first) or pokes; three hits and it sinks back for a while.

Mini bosses:
- **Mako, the big shark** (the designer's): a land shark. It dives into the sand and swims through it, only its fin
  showing as it cuts toward you, then erupts under you with a bite. On boards or a deck it can't dive: it charges and
  grabs.
- **Captain Barbarossa** (proposed as the floor's second, as other floors have two): his pistol (a red aim line, then
  the shot: break the line or dash through), his hook sweep up close.

## The boss: the Big Shark, under water
The boss room is flooded (you swim, as floor 6 did): rocks, a sunken ship, the surface overhead. The Big Shark (the
kit's Shark, about 8 m) circles you, then lunges with a bite: it turns its nose to you and slows (the tell), then bursts
forward. Below half health it's in a frenzy: lunges one after another. If a lunge hits the wreck or a rock, its teeth
stick and it's stunned: free hits. Near the end, kraken tentacles rise from the seabed and sweep.

## Order of work
Each its own update, each shown before the next:
1. **The level** (done, 0.3.14): the look, the nine rooms, the sea, powder kegs, the wreck (no cannons). Stand-in enemies
   and boss. (The boss room's flooding moved to 3: its shape is the Big Shark's fight's, and a land stand-in can't fight
   under water.)
2. **The enemies**: the seven, and the two mini bosses.
3. **The boss**: the Big Shark, and the boss room flooded (swimming only there).

Needed first: the dungeon kit's export takes the pirate pieces with their atlas texture (and no shape keys).
