# Update 0.2.4 — floor 4, the desert

Status: built (2026-10-30). The designer's list:
- "Let's go for a dessert theme floor"
- "Boss Dino; Mini boss - Spider & Cactoro; Small - Snake, Tribal, Cactoro, Slime; Flying - Hywirl, Wasp, Wraith"
- "make at least 10 different rooms with their identity"
- (Second list, same update:) "my bad, the dino boss doesn't look like a boss to me, turn him into a Blob monster and give
  him frustrating moves. I will go seek a better Dino model"
- "This floor needs to give a hard time to the players, so the new enemies needs to be frustrating and hard to kill,
  and I don't mean by "Make them tankier", more like "They evade" or "they are smarter than ordinary enemies""
- (Third list, same update:) "Actually, let's remove all the mobs that were present on previous floor like snake, and
  wraith etc." (the Wasp stays): a Flying Tribal (the masked feather creature), the Skull Orc mini boss (the
  skull-masked green goblin), a yellow Lizard and a little Green Blob, the Velociraptor boss; "think of move sets,
  challenging Floor 4 is the goal"

## The look (the Sun Temple mock-up)
- Floor 3's stone pieces recoloured sandstone, a sand-coloured floor, a warm sky and sun.
- Palms and cacti (the Nature pack) stand in beds of loose sand, never on paving.
- Quicksand: darker sand, heaving. In it you move at 45% of your speed; your enemies wade through as normal.

## Eleven rooms, each its own idea
- **Oasis:** a quicksand pool in the middle (24 m), palms on its shore.
- **Sunken market:** rows of stalls, narrow aisles, cover everywhere.
- **Step pyramid:** a stepped pyramid fills the middle; Tribals throw from its top; a step and a pad up.
- **Dune sea:** open dunes with two quicksand rivers crossing in an X.
- **Obelisk field:** pillars, spike patches, a cactus here and there.
- **Canyon:** long walls with cliffs along them, Tribals on the cliffs.
- **Sun pits:** four pits of burning sand round pad islands.
- **Tomb halls:** walled chambers joined by doorways.
- **Cactus garden:** dense cactus beds, winding paths, Cactoros under the sand.
- **Quicksand crossing:** a floor of quicksand with stepping stones.
- **Terraces:** raised corners with Tribals on them, an open middle.

## The enemies (the third list)
- None of the earlier floors' enemies but the Wasp. Small: the Tribal, the Cactoro, the Dino, the Lizard, the Green Blob.
  Flying: the Hywirl, the Wasp, the Flying Tribal. Mini bosses: the big Cactoro and the Skull Orc. Boss: the Velociraptor.
- The models (Ultimate Monsters): big/Tribal, blob/Cactoro, blob/Dino, big/Frog (the yellow Lizard), blob/GreenBlob,
  flying/Hywirl, flying/Tribal (the Flying Tribal), big/Cactoro, big/Orc_Skull (the Skull Orc), boss/Velociraptor.
- They are hard by being smart. Every evasion has a rest before it can happen again, and every attack has a warning:
  - **Tribal:** keeps its distance; throws its spear where you'll be; aimed at for a quarter second, it springs aside;
    rolls away from some of your blows; on high ground it throws from above.
  - **Cactoro:** travels under the sand (nothing reaches it), comes up behind you after the sand bulges (0.5 s), its
    spines burst; up for 1.8 s; ducks back under half the blows aimed at it while up.
  - **Dino** (the blob Dino; the second list's "Blob monster" with "frustrating moves"): hit and run. It circles you out
    of reach, crouches and hisses (0.4 s), pounces and bites, stands open for 0.7 s, then springs back out of reach. Any
    other time it hops away from most of your blows (85%); open, or mid-pounce, it can't.
  - **Lizard:** camouflaged while it creeps (barely seen); keeps 7–14 m off you; shows itself to spit a glob that lands
    as a poison puddle (6 s): standing in one poisons you.
  - **Green Blob:** squashes and hops onto you; killed, it splits into two Bloblings (small, quick, weak; no more splits).
  - **Hywirl:** circles to your back; looked at, it darts out of your sights; strikes only from your blind side, rushing
    through you after gathering its wind; turn to face it and it breaks off.
  - **Flying Tribal:** keeps well off you, behind the ally nearest you; chants (hit it then and the chant breaks) and
    wards that ally: its next two blows are turned (a golden shell). Alone, it throws three feathers.
  - **Big Cactoro (mini boss):** a fan of spines; an ambush (the ground cracks under you for 0.7 s before it bursts up
    there); a ring of spines close by. Three hits within 1.5 s and it shuts itself in its thorns for 1.6 s.
  - **Skull Orc (mini boss):** guards its front (blows from in front are turned on its club); two turned in a row and it
    strikes back at once. A three-swing club combo, each swing a step at you; a leap with a glowing landing, a slam and
    a quake ring. Get to its side or back, or hit it while it swings.

## The Velociraptor
- The designer's model (`boss/Velociraptor.blend`); the moves are Claude's, to the floor's brief.
- 5 m, 1800 health, never flinches:
  - **Charge** that steers after you; while you dash in its warning it holds its charge up to 0.6 s and aims again, so
    a dodge made too early is wasted; a wall or a column stuns it.
  - **Bites:** three snaps, close by. **Tail:** behind it, a sweep all round (jump it). **Stomps:** two quake rings.
  - **At 50%:** a roar; two Dinos of its pack run in (once). From then on it pounces at you from afar (its landing
    glows on the floor) and is quicker in everything.

## (placeholders)
- Every number past the designer's. Every enemy's and the Velociraptor's moves. Floors 5–7 have floor 4's rooms, enemies, look and boss for now.
- Sounds: no new recordings; the Demon's charge, crash, slam and roar for the Velociraptor; the rest code-made.
