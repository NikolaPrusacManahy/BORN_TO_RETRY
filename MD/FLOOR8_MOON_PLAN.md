# Floor 8 reworked — the Moon (draft, 2026-11-02)

The designer: "BIG REWORK of FLOOR 8": a sci-fi moon floor, a space sky with the planet Earth seen from afar; the mechs
(Bee, Flamingo, Frog and Fox) are mini bosses, each with its own twist; the little spaceships are floating monsters,
tiny, about a wasp's size; moon gravity; moon-themed levels; the boss is the massive alien monster from the Bestiary
pack (`ASSETS/QUATERNIUS/NEW-BOSSES`). The pack is `ASSETS/QUATERNIUS/FLOOR-8` (Quaternius's Ultimate Space Kit: one
atlas a folder). This is Claude's plan for it, to be agreed before building. Built as floor 6 was: **the level, then
its enemies, then its boss**, each its own update with a spec in `MD_UPDATES/`.

## Decided (the designer, 2026-11-02)
- **The Forge leaves the game**: its rooms go; its code (presses, vents, belts) stays for floor 10's echo rooms, as the
  Sunken Grove's did for floor 6.
- **Moon gravity: floaty**: jumps about 1.6 times as high, slow falls, knocked enemies fly further (a knob in F1).
- **A broken mech's pilot jumps out** and fights on foot; kill them to finish it.

## What's in the pack
- **Mechs** (each piloted, one rigged model): Barbara the Bee, Fernando the Flamingo, Finn the Frog, Rae the Red Panda
  (the "Fox"). Their clips: Idle, Walk, Run, Jump, Jump_Landing, Kick, Shoot_Big, Shoot_Small, HitRecieve, Death…
- **Astronauts**: the same four on foot (Idle, Run, Run_Gun_Shoot, Punch, Jump, Death…).
- **Aliens**: Enemy_Small, Enemy_ExtraSmall and Enemy_Flying fly (Flying_Idle, Fast_Flying, Headbutt, Punch);
  Enemy_Large walks and carries a weapon (Run, Punch, Weapon, Jump).
- **Spaceships**: the four pilots' ships (no rig: they fly in code).
- **Rovers** (three), the **moon base** (domes, houses, a geodesic dome, connectors, ramps, stairs, solar panels,
  antennas, radars, metal supports), **rocks**, **planets** (eleven), **alien plants and trees**, and pickups (crate,
  key card, jar…).

**The boss isn't on this PC yet.** `NEW-BOSSES` holds the *free* Bestiary kit, which has only the Imp and the Puglin.
The big monster is in the full (Source) pack from quaternius.com. The level and the enemies don't wait on it.

## The look
- **A space sky**: black, full of stars, with **the Earth hanging large in it** (blue seas, green and brown land,
  white cloud: one of the kit's planets if one reads as the Earth, else drawn in code), a far planet or two, and the
  sun.
- **Bright all the same** (the designer's rule: play spaces bright): a hard white sun on pale grey moon dust, the
  shadows sharp, the ground lit as in the pack's pictures. Black only overhead.
- **The ground**: grey moon dust underfoot, **craters** pressed into it, moon rocks. The dungeon's walls become **crater
  rims of pale grey rock**, the kit's large rocks banked against them.
- **The moon base**: modules, domes and corridors (connectors) along the rooms, solar panels in rows, antennas and
  radar dishes, rovers parked, crates. The doorways as the base's airlocks.
- **Plants only where they'd grow**: the alien plants and trees inside the **geodesic dome greenhouse** and its beds,
  never on bare moon dust (trees grow from earth).
- The kit's pieces keep their own atlas texture; the walls and dust are tinted to sit with it.

## Its mechanics
- **Moon gravity**: everything falls slower. Your jumps go higher and hang longer (about 1.6 times as high), slides
  and dashes carry on in the air; **knocked enemies fly further and slower** (more launches, wall-splats, pins), bodies
  drift down. Shots fly straight as before. A knob (F1 → Moon), so it can be tuned in play.
- **Meteor showers**: in some rooms, now and then, a meteor falls where you stand: its shadow and a glow in the sky warn
  first; the strike leaves a small crater and throws everyone near it (you and them).
- **Launch pads**: the jump pads, as the base's landing pads, throw you much higher in moon gravity: over the rocks and
  onto the base's roofs.
- (Maybe) **a rover** that drives its loop across a room: it knocks aside anything in its way.

## Its rooms (nine)
The Landing Site (a lander, landing pads), Crater Field (craters and rocks), Moon Base (modules along a lane), The
Greenhouse (inside the geodesic dome: plants in beds), Solar Farm (rows of panels to weave through), Rover Depot (rovers
and ramps), Radar Ridge (antennas on raised rock), Earthrise (an open rim with the Earth right over it), Meteor Plain
(open dust, meteor showers).

## Its enemies (new, none like another floor's)
1. **Tiny spaceships** (the four ships, shrunk to a wasp's size): they **fly in pairs and fours**, strafe round you,
   fire small laser bolts, and peel off one at a time to dive at you. Each of the four flies its own way (the Bee's
   darts, the Flamingo's long passes, the Frog's hops, the Red Panda's spins).
2. **The aliens**: Enemy_Small (a flier that headbutts), Enemy_ExtraSmall (a swarm of little ones), Enemy_Flying (a
   tall floater), Enemy_Large (a heavy walker with a weapon). Their twists are written when they're built, each new to
   the game.
3. **Mini bosses: the four mechs**, each with its own twist:
   - **Barbara the Bee**: **hovers** on her jets in the low gravity, out of reach, and rains a spiral of small shots;
     she drops in a stomp when you're under her.
   - **Fernando the Flamingo**: the **sniper**: tall, far off, a charged beam whose sight line tracks you then locks
     before it fires; close in, his kick sends you flying across the room.
   - **Finn the Frog**: **giant moon leaps** across the room; each landing sends a shock ring along the ground you jump
     over.
   - **Rae the Red Panda**: the **brawler**: rushes you firing both guns, then a spinning kick.
   - **Break a mech and its pilot jumps out** (the astronaut model) and fights on foot with a little blaster: kill
     them to finish it. Mech and pilot together never more health than the floors before's mini bosses (never
     tankier).

## The boss: the massive alien (from the full Bestiary pack)
When its model is here: a huge brute in a crater arena, with moves built on moon gravity (leaps that shake the ground,
throwing rocks, grabs), and its own show. Planned with the designer once the model is in.

## Order of work
1. **The level** (Update 0.3.17): the moon look, the space sky with the Earth, moon gravity, meteor showers, launch
   pads, nine rooms; playable from the Lab with stand-in enemies.
2. **The enemies** (0.3.18): the tiny ships, the aliens, the four mechs and their pilots.
3. **The boss** (0.3.19), once its model is in `NEW-BOSSES`.
