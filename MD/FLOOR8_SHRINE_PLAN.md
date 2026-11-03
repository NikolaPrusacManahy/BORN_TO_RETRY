# Floor 8 — the Shrine Dimension (agreed, 2026-11-03)

> The designer: "go with that, without the Wolf yet, I will redesign him after". The level, its enemies and its mini
> bosses as planned; **its boss is on hold** (the Ōkami below is a first idea only; a stand-in meanwhile).

The designer: "floor 8 - Japan theme … karate or martial art enemies … Sakura trees and a shrine and this kind of
thing, loads of sakura leaves"; More_nature added ("to be used in any floors and maybe if any can be used here"); "I
don't see other assets that can be found on the website for Japan theme". This is Claude's plan, to be agreed before
building. As with floors 6, 7 and 9, it's built in this order: **the level, then its enemies, then its boss (with its
intro)**, each its own update with a spec in `MD_UPDATES/`. Once floor 8 is built, the run goes on past Skull Cove
(7 → 8 → 9, the Moon).

## What there is to build it from
- **More_nature** (`ASSETS/QUATERNIUS/More_nature`: 45 trees; their textures, `Bark.jpg`, `Leaf_High.png` and the
  rest, aren't in the folder, so they'd be flat colours like the kit; their leaves' cut-outs made in code, not
  painted):
  - **Tree_1–10: the sakura.** Umbrella canopies on leaning, forked and twisted trunks (5–8 m). Pink leaves on dark
    bark read as cherry trees (renders: the session's `scratchpad/more_nature/tree.png`). Tree_10's twisted trunk makes
    a bonsai in a pot.
  - **Pine_1–5:** Japanese pines, dark green, round the shrine.
  - **Birch_1–10:** red and orange leaves for maples (momiji) among the sakura; green elsewhere on other floors.
  - **DeadTree / DeadBirch:** for later floors (Hell's burnt woods, floor 3 and 4's).
- **More-enemies** (one 23-bone rig, 17 clips each: Idle, Walk, Run, Punch, SwordSlash, Roll, Jump, RecieveHit,
  Death…):
  - **Kimono_Male, Kimono_Female**: karate fighters in reality (white gi, red belt and headband).
  - **Ninja_Male, Ninja_Female, Ninja_Male_Hair** in black; **Ninja_Sand, Ninja_Sand_Female** in sand
    (`scratchpad/japan_people/sheet.png`).
- **Universal Animation Library** (UAL 1 & 2): a full martial-arts set.
  - Hand to hand: a fighting stance (PunchKick_Enter), jab, cross, kick, hook, knee, uppercut, Melee_Combo.
  - Moving: dodges left and right, roll, back flip, the ninja's double jump, wall runs, slides.
  - Weapons: katana light, heavy and aerial combos, Sword_Dash, Sword_Block; bow aim and shots.
  - It's on another skeleton (65 bones): **step 1 of the enemies is retargeting it onto the people's rig** with
    `tools/ual_bake.py` (rendered and checked first). If it won't sit right, they fight with their own 17 clips.
- **Ultimate RPG Pack:** bows (Bow_Wooden), swords (Sword, Sword_big: katanas recoloured), daggers (kunai).
- **Bestiary:** the **Lycan** (a werewolf, on the UAL skeleton already, three colourings): the boss below.
- **Not in any pack:** torii, lanterns, the shrine, bamboo, bridges. **Made in code** (Blender scripts or three.js
  from simple shapes, flat colours like the kit; nothing AI-made).

## Its look (bright, as every play space is)
- **Spring daylight:** a soft blue sky, warm sun, a pale pink haze. Far off on every side, a pagoda and torii stand on
  floating islands among the clouds (the "dimension"), the way the Moon's sky has the Earth.
- **The kit:** pale grey castle stone (the walls), worn grey paving, dark wood ledges and beams. Earth beds round every
  tree (trees grow from earth); raked white gravel; moss.
- **Sakura everywhere, petals everywhere:**
  - Canopies sway in the wind; petals fall from every tree and drift across every room in gusts. Pink carpets of them
    lie under the trees.
  - A dash, a landing or a body hitting the floor kicks them up, and a tree you knock an enemy into sheds a burst.
- **Made in code:**
  - Gates and paths: **vermilion torii** over every doorway (its gate a wooden lattice that drops shut instead of iron
    bars); red arched bridges over koi ponds (floor 5's water, lily pads); stepping stones.
  - Lights and markers: stone lanterns (tōrō), red paper lanterns glowing (no real lights: they cost frames),
    shimenawa ropes with paper zigzags, small hokora shrines, offering boxes, the shrine's great bell.
  - Plants and buildings: bamboo groves (lanes kept 4 m wide, for the enemies' pathing), a pagoda, dojo halls.

## Its rooms (the start, the shop, a challenge room and its fight rooms come from these)
- **The Torii Path:** a long hall under a row of gates.
- **The Sakura Grove:** big trees, earth beds, petals deepest.
- **The Zen Garden:** raked gravel, rock islands as cover.
- **The Koi Pond:** bridges and stepping stones over water.
- **The Bamboo Forest:** tall groves, wide lanes; Kunoichi run along the walls here.
- **The Dojo:** a wooden hall, training dummies, weapon racks; the Sensei's room.
- **The Lantern Steps:** ledges climbing to a shrine, lanterns up the sides.
- **The Pagoda Court:** a pagoda in the middle, archers on its roofs.
- **The Tea Garden:** low walls, a tea house, maples.
- **The boss's arena, the Great Shrine:** a wide court before the shrine hall, its torii line, the bell, four great
  sakura in its corners.

## Its enemies (none like another floor's; numbers placeholders)
**Never tankier** (the designer's rule): regulars within the floors before's 12–60 health, mini bosses within 340.
Harder means more AI: dodges, counters, ambushes (the designer: hardcore players, random dodges intended).
- **Karateka** (Kimono_Male): fights from a stance with jab-cross-kick combos, the kick knocking you back. Now and
  then he **blocks a blow and counters** at once; hit him from the side or as his combo ends. 40.
- **Karate Girl** (Kimono_Female): quicker and lighter, with spinning kicks and a knee. She **side-steps** your blows
  (UAL dodges), more often the more you swing. 30.
- **Ninja** (Ninja_Male): keeps his distance and throws shuriken in a fan of three. Hit, he **vanishes in smoke and
  reappears behind you** (floor 3's teleport, his own puff). 28.
- **Kunoichi** (Ninja_Female / Ninja_Male_Hair): **runs along the walls** and drops on you from them (the double
  jump), or **waits in the sakura trees** (this floor's perchers) and leaps down. 24.
- **Sand Ninja** (Ninja_Sand and Ninja_Sand_Female): throws **smoke bombs** (a cloud you can't see through) and
  scatters **caltrops** that hurt and slow you. 26.
- **Archer** (Kimono_Female with a bow, in another colour): shoots from the rooftops and the high ledges, warning
  with a glint as she draws. 22.

### Mini bosses
- **The Sensei** (Kimono_Male, 1.6× tall, a bo staff made in code): **his guard turns every hit from the front**
  (sparks; counter-strikes), and his staff flurries in a ring. Hit him from behind, or between flurries when he's open.
  320.
- **The Shadow** (Ninja_Male, 1.5×, a katana): **splits into two shadow clones** (one hit kills a clone, and clones
  hit for half); only he carries the key. His dash slash crosses the room. 300.

## Its boss: on hold (the designer will redesign it). First idea: Ōkami, the Shrine's Wolf (the Bestiary's Lycan)
- **Who:** the shrine's guardian, a wolf god. The Lycan recoloured white with red markings, about 5 m tall (as
  Tidebreaker is), a great katana. Its moves are UAL's, baked straight on (it's on the UAL skeleton, as Tidebreaker
  was).
- **Its moves:**
  - Its katana: light and heavy combos, an aerial combo, a guard that turns your hits and counters.
  - The **iai dash**: it sheathes, crouches, and is across the arena in a flash, slashing; a line on the floor warns
    where.
  - A **double-jump plunge**: its sword down into the floor, a ring of petals and stone thrown out.
  - **Wall runs** round the arena's walls, then a leap at you.
- **Rage (half health):** a **petal storm** fills the arena (hard to see, its shadow clones in it), and its blows leave
  lines of blades. **Frenzy:** the torii beams come down, the bell cracks, the four great sakura burn.
- **Its intro, at Tidebreaker's quality** (the designer's standard):
  1. The shrine's bell tolls three times.
  2. Every sakura on the floor sheds at once, the petals pouring through the rooms toward the arena in rivers (a
     flying shot along them).
  3. The petals whirl into a vortex in the arena's middle as the torii light up one after another.
  4. It steps out of the vortex. In slow motion it draws its katana: one stroke, and the vortex is cut in two.
  5. Its name on the right, as Tidebreaker's and the Big Shark's.

## Order of work
1. **The level:** the look, the sakura (code-made blossom cut-outs), the petals, the code-made pieces (torii,
   lanterns, bridges, bamboo, shrine, pagoda), its rooms, its arena. Played with stand-in enemies.
2. **Retarget UAL onto the people's rig** (renders checked), then its six enemies, then the two mini bosses.
3. **Its boss** and its intro, once the designer has redesigned it.
