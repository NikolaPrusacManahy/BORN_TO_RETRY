# Floor 8 reworked — the Moon (draft, 2026-11-02)

> Update 0.3.25 — the Moon is floor 9 now (`MD_UPDATES/U0325_FLOOR_ORDER.md`).

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

~~The boss isn't on this PC yet~~ (the Bestiary monster): dropped by the designer ("forget about it that boss"); the
boss is the three mechs together (below).

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

## Its enemies (the designer, 2026-11-02, replacing the plan's first roster)
The designer: "forget about it that boss: the boss is 3 guys, Frog mech + Fox mech + flamingo mech together; Mini boss -
One spaceship and Bee mech (turn into astronaut bee after mech dies); Normal enemies -> 3 spaceships and the astronaut
Flamingo, frog, fox; Bee mech is able to glide in the air and shoot salvos of missiles and lands with a 1sec cooldown;
The AI of the enemies in rooms should be well splitted with different roles". The aliens and the Bestiary monster
aren't used. ("Fox" is the kit's Rae the Red Panda.)

So each of the three animals comes **on foot**, **in its tiny ship** and, at the end, **in its mech**, and each animal
has its role, the same in all three:
- **Flamingo — range.** It keeps its distance and shoots down lines.
- **Fox — the flank.** Fast, it comes at you from where you aren't looking.
- **Frog — the ground.** It controls the floor: leaps, shock rings, mines.
The Bee is the mini bosses' family.

### Normal enemies (six)
1. **Flamingo astronaut — the Gunner.** Keeps 9–16 m off, finds a clear line to you, plants its feet and fires a burst
   of three slow blaster bolts (a glow at its gun first); between bursts it sidesteps. Comes no closer; cornered, it
   kicks you off and backs away.
2. **Fox astronaut — the Flanker.** Fast; it circles to your side or back (outside your view) and darts in for a
   two-punch combo, then springs away. Two Flankers go round opposite ways.
3. **Frog astronaut — the Leaper.** A huge moon-gravity jump onto where you stand (its shadow grows under you); its
   landing sends a shock ring along the ground (jump it). Between leaps it hops to keep out of punching range.
4. **Flamingo ship (tiny) — the Strafer.** Long straight passes over you, a line of small laser bolts along its path
   (its line shows a moment first); then it climbs and turns for the next.
5. **Fox ship (tiny) — the Diver.** Circles tight and fast, then spins down and rams you; misses, it pulls up.
6. **Frog ship (tiny) — the Mine-layer.** Drifts over the room dropping small mines that float slowly down in the low
   gravity and drift at you; one near you blinks and pops.
The ships are a wasp's size (about 1 m): one punch or a few hits each.

### Mini bosses
- **The Bee's ship** (Barbara's, a few metres long). It circles the room high and strafes with twin lasers; every few
  passes, a **bombing run**: its line marked on the ground first, then bombs down it. Between runs it **drops low to
  cool down** (2 s): that's when you can hit it.
- **The Bee mech** (Barbara). It **jumps and glides** on its jets, out of reach, firing **salvos of missiles** (they
  curve after you; dash through or sidestep); then it **lands and holds there 1 s** (its cooldown: hit it then) and goes
  up again. **When the mech dies, Barbara climbs out as the Bee astronaut** and fights on foot (a blaster, quick
  punches) until she's beaten. Mech and astronaut together no more health than the floors before's mini bosses.

### Rooms: the roles split
A room's waves mix the roles: never all one kind; range, flank and ground each in it when the wave has room; the ships
over the walkers; at most two Gunners shooting at once and the close fighters taking turns (the game's turns, as other
floors'). (The mini bosses as other floors': a room with one has the chest.)

## The boss: the three mechs together (Frog, Fox and Flamingo)
> Update 0.3.29 — its boss is built: Tidebreaker (`MD_UPDATES/U0329_TIDEBREAKER.md`).
> Update 0.3.28 — not built: the designer made the Bestiary pack's Tidebreaker the Moon's boss ("Alien as Moon boss"),
> and the three mechs mini bosses, the Bee mech's in everything but their looks (`MD_UPDATES/U0328_MOON_MECHS.md`).

Fernando the Flamingo's mech (range: a sniper's charged beam, its sight line tracking you, then locking), Rae the Red
Panda's (the flank: rushes you firing both guns, a spinning kick) and Finn the Frog's (the ground: giant leaps, shock
rings) fight you together, each in its role; as one falls, the others change their pattern. Its own show. Built after
the enemies.

## Order of work
1. **The level** (Update 0.3.17, done): the moon look, the space sky with the Earth, moon gravity, meteor showers,
   nine rooms.
2. **The enemies** (0.3.18, done): the six regulars, the two mini bosses (the Bee astronaut after the mech), the
   rooms' roles.
3. **The boss** (0.3.24; 0.3.19 went to the floors' fight music, 0.3.20 to the HUD's controls, 0.3.21–0.3.23 to the
   new lobby): the three mechs together. Update 0.3.28 — the mechs mini bosses instead; the boss Tidebreaker, next.
