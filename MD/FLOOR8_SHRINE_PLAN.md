# Floor 8 — the Shrine Dimension (agreed, 2026-11-03)

> The designer: "go with that, without the Wolf yet, I will redesign him after". The level, its enemies and its mini
> bosses as planned; **its boss is on hold** (Makami below is a redesign to be agreed; a stand-in meanwhile).
>
> **Built:** the level (0.3.32), its enemies and mini bosses (0.3.33, `MD_UPDATES/U0333_SHRINE_FIGHTERS.md`), its boss's
> model and its show (0.3.34, `MD_UPDATES/U0334_OKAMI.md`), its five moves (0.3.35, `MD_UPDATES/U0335_OKAMI_MOVES.md`). As
> built, the Archers are the perchers; the Kunoichi runs the walls and leaps from the floor instead of waiting in
> trees.

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

## Its boss: Yokai : Okami (agreed 2026-11-03)
The designer, on the look test: "Call it "Yokai : Okami" and yes build it", then its moves (below), and "Keep this,
cause we need to intro done first and the arena shift after intro".

The designer, with two pictures of the white wolf from Capcom's game *Ōkami*: "for the boss, we need to change it's
colour a design a bit to match the real dog in the Japanese mythology, maybe adding flames and that white fur might
help, the red markings".
- **Ours, not Capcom's:** that wolf (Amaterasu) is Capcom's own character. A white wolf, red markings and flames are
  all fine to use. Her particular look is not: the swirl and comma markings on her haunches, the cloud-curl tufts at
  her joints, the flaming disc on her back, the ink-brush look. (Its name is the designer's: *ōkami* is Japanese for
  wolf, and a *yōkai* is a spirit of folklore.)
- **From the mythology:**
  - Ōkuchi-no-Makami, the "great-mouthed true god", is the wolf worshipped at the Mitsumine and Musashi-Mitake
    shrines. Pilgrims call it *Oinu-sama*, the honoured dog, and its charms guard homes **against fire** and thieves.
    So it is the shrine's guardian and master of fire, and its flames are its own.
  - Its markings follow kabuki's *kumadori*: red lines a hero's face is painted with.
- **Who:** the Bestiary's Lycan, about 5 m tall (as Tidebreaker is). It has **no weapon** (the designer: "no sword"):
  it fights with its claws, its fangs and its fire. Its moves are UAL's, baked straight on (it's on the UAL skeleton,
  as Tidebreaker was).
- **Its look:**
  - **White fur:** the Lycan's texture repainted white and pale grey, with the dark mane turned silver-white.
  - **Red markings:**
    - kumadori lines sweeping up from its eyes over its brow and onto its ears;
    - a line from each eye back along its cheek toward its jaw;
    - its inner ears red;
    - red bands on its forearms and thighs;
    - a red line down its spine.
    They glow like embers in its rage.
  - **Flames, made in code:**
    - a mane of fire from its shoulders along its spine;
    - fire at its tail's tip;
    - flames licking from its paws at each step;
    - its eyes burning.
  - **Its shrine:** a *shimenawa* (the sacred straw rope, as on the shrine hall) round its neck, with white paper
    zigzags (*shide*) hanging from it.
- **Its moves** (the designer's three, then two of Claude's; up close, its claws: swipes and a combo):
  1. **Its devastation** (the designer: "teleport in the middle of the arena and he would charge up for 7 seconds -> the
     whole arena will be hit -> if the circle is full -> then he would use his power to throw the massive fireball at the
     arena and deal massive damage"):
     - It vanishes in fire and is in the arena's middle, charging for 7 s.
     - A ring of fire grows out from it across the floor toward the walls. Your hits on it drive the ring back.
     - If the ring reaches the walls (the circle full), it hurls a massive fireball down on the arena: massive damage
       everywhere in it.
  2. **Four leaps** (the designer: "jumps on the map 4 times in a row, doing crater damage like the other boss but
     consecutively"): four leaps one after another, each down where you are. Each has a ring on the floor where it'll
     land, and a crater and shockwave when it does, as Tidebreaker's moon leap.
  3. **The blue fireball** (the designer: "stance and charge a blue fireball and throw it at the enemy, big damage"): it
     takes its stance, a blue fireball (*kitsune-bi*, fox fire) swelling between its claws, then hurls it at you. Big
     damage, and a blast where it strikes.
  4. **The fire dash** (Claude's): it drops low and a line of fire on the floor warns where. Then it's across the arena
     in a flash, clawing through you, and the line bursts into flame behind it for a moment (it burns you there).
  5. **Its roar of fire** (Claude's): it throws back its head and a wave of flame rolls out from its jaws over the
     floor in front of it, a wide cone (side-step out of it, or get behind it).
- **Rage (half health):** a **petal storm** fills the arena (hard to see, its shadow clones in it), and its claws leave
  lines of fire on the floor. **Frenzy:** the torii beams come down, the bell cracks, the four great sakura burn.
- **Its intro** (the designer's, at Tidebreaker's quality; the arena's shift is part of it):
  1. The arena shakes. All the floor's other rooms are destroyed at once, and the arena expands (two camera angles).
  2. The floating islands all move and regroup near the arena (two camera angles).
  3. Okami lands on one island and sends it crashing onto the arena, where it stays embedded.
  4. Three temples fall from the sky and block the exit gate, as a presentation (two camera angles). (Claude's
     reading: the doorway you came in by, the way back to rooms that no longer exist. Only the wooden gate, the way
     down, opens after the fight, as on the Moon.)
  5. The remaining islands shift and merge with the arena. Crashed in, they become walkable ground, so the arena is
     made of bits of island.
  6. Okami jumps into the air: slow motion, and its name.
  7. It lands, and the view goes back to your eyes.

### Its order of work
1. **Its model and its intro, with the arena of islands it leaves** (built, 0.3.34). The model is the look test's (the
   Lycan repainted by `tools/okami_paint.py`, its clips baked on), with its flames, rope and shide made in code. It is
   floor 8's boss in place of the stand-in, fighting with its claws only until its moves come.
2. **Its five moves** (built, 0.3.35), then its rage and frenzy.

## Order of work
1. **The level:** the look, the sakura (code-made blossom cut-outs), the petals, the code-made pieces (torii,
   lanterns, bridges, bamboo, shrine, pagoda), its rooms, its arena. Played with stand-in enemies.
2. **Retarget UAL onto the people's rig** (renders checked), then its six enemies, then the two mini bosses.
3. **Its boss** and its intro, once the designer has redesigned it.
