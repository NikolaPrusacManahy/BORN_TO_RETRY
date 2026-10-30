# Update 0.2.7 — floor 3's newcomers

Status: built (2026-10-30). The designer, for floor 3:
- "Stinger -> the flying orange dragon = make him a dangerous brat"
- "Wraith -> Skulled mask Wraith = same mob but add that he teleports away for the 1st 2 hits, like he is annoying for
  the first two hits (teleport anywhere on the map - avoid structures so they can't get stucked)"
- "Snake -> White rabbit (jumps around and can throw the carrot if at least 10M away from player is player is running
  away)"
- "Spider -> Big Mushnub with spikes on the arms (heavy attacks with knockbacks and splits into 2 mushnub after being
  killed)"
- "Bone King -> can summon another set of skeleton after the massive explosion cast"
- (Then, seeing each room's spawn shares:) "Scrap the spitters from that floor and put the Dragoling in that position",
  "Scrap the wasp"

## The models (Ultimate Monsters)
- The Dragonling: `flying/Dragon_Evolved` (the orange one with arms; the armless flying Dragon was recycled earlier as a
  same-name leftover). The Skull Wraith: `flying/Ghost_Skull` (the Wraith's Ghost with a skull mask). The White Rabbit:
  `big/Bunny` (it holds a carrot). The Big Mushnub: `big/MushroomKing` (blue cap, spiked arms). All moved to
  `used_monster` (flying, flying, blobs, mini_boss).

## Their moves (Claude's, to the designer's words)
- **Dragonling (flier, in the Stinger's place), "a dangerous brat":** it flits about you zig-zagging, 8 m off, never
  still. Every 2.4 s it puffs up (0.45 s, your warning) and spits a burst of **3 fireballs**, 0.12 s apart, each where
  you're running to (7 each). Come within **5 m** and it squeaks, spits one in your face and **darts off** 7 m out of
  reach (not again for 2.5 s). 35 health, flinches easily.
- **Skull Wraith (flier, in the Wraith's place):** the Wraith's numbers and moves (the orb fan), but **your first two
  hits it teleports from**: gone in a puff, back anywhere over open floor in the room (a free cell of the fliers' grid:
  nothing tall there to stick in), at least 8 m from where it was. The third hit lands.
- **White Rabbit (in the Snake's place):** it comes at you **in hops**, zig-zagging a hop at a time, and **bonks you with
  its carrot** up close (9). With you **10 m off or more**, or **running away from it past 6 m**, it stops, draws its
  carrot back (0.5 s) and **throws it** at you (10; it always has another).
- **Big Mushnub (mini boss, in the Spider's place):** 220 health, 2.6 m, lumbering; only a hard hit staggers it. In
  front of it: its spiked arms go up (0.8 s) and **smash down**, 22 and **thrown back hard** (13 m/s). Beside or behind
  it: it winds up (0.5 s) and **spins**, its arms sweeping all round, 14 and thrown off. **Killed, it splits into 2
  Mushnubs.** It carries its room's key.
- **The Bone King:** after its final blast, it **calls up 3 more skeletons** (once), as it did opening its second life.

## No Spitter, no Wasp
- Floor 3 sends neither. The Dragonling has the Spitter's place: in a room with perches (the keep rooms) every wave
  brings 2 Dragonlings, and they come in on the perches and take off from there (fliers: they don't stand on them).
- Floor 3's shares now (400 floor plans; challenge rooms apart): Dragonling 22%, Mushnub 17%, Skeleton 17%, White
  Rabbit 11%, Slime 11%, Frog 10%, Skull Wraith 6%, Ninja 3%, Big Mushnub 3% (the mini bosses capped per room). Room 1
  has the most Dragonlings (29%, perch rooms), room 6 the fewest (20%).

## (placeholders)
- Every number. Executions reuse the same rigs' (the fliers the Wraith's, the Rabbit the Grunt's, the Big Mushnub the
  Yeti's). Sounds made in code. The Stinger, the Wraith, the Snake and the Spider stay on floors 1–2.
