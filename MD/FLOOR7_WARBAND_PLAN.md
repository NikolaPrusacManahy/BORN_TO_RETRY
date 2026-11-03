# Floor 7's enemies — the Frozen Warband (2026-11-03; built as 0.3.22: `MD_UPDATES/U0322_FROZEN_WARBAND.md`)

The designer: "I have more enemies models in More enemies folder; let's sort things out for Floor 7; look in folder and
find enemies that would go together and if you can't match them with floor 7, we change floor 7 design with something
that would match, no hesitation, if it does not fit we change". Claude's plan; the designer: "Go with it". Changed as
built (below): the Raider slides to where you stood, the Thrower's V reads the other way round, the dead come up
through the ice where a room has no snow, Haugbui hurls a block torn out of the floor.

## The folder
`ASSETS/QUATERNIUS/More-enemies`: 52 people from one Quaternius pack. All share **one rig** (23 bones; the right hand
is `Fist.R`) and the **same 17 clips**: Idle, Walk, Run, Punch, SwordSlash, Shoot_OneHanded, Roll, Jump, RecieveHit,
Death, Defeat, Victory, PickUp, SitDown, StandUp, Run_Carry, Walk_Carry. Flat colours (no textures), no shape keys,
2.1k–9.8k triangles. Every one has the pack's **dark face with white eyes**; their weapons aren't in the pack (the RPG
pack has axes, swords, daggers, hammers, bows; no shields).

The groups in it:

| Group | Models | Fits |
| --- | --- | --- |
| **Norse** | Viking_Male, Viking_Female, VikingHelmet | **floor 7** |
| **Undead** | Zombie_Male, Zombie_Female | **floor 7** (as draugr, the Norse walking dead) |
| Magic | Witch, Wizard, Elf | the Witch on floor 7 (a seeress) |
| Japan | five Ninjas, two in Kimonos | a later floor (The Rift: rollers and jumpers that shove) |
| Knights | Knight_Male, two Golden Knights | a later floor (the last floor's guard) |
| Goblins | Goblin_Male, Goblin_Female | a later floor |
| Soldiers, Wild West, Pirates | four soldiers, three cowboys, two pirates | not floor 7 (the pirates could join Skull Cove) |
| Townsfolk, mascots | casual, suits, chefs, doctors, workers, the Cow, the Pug | not enemies |

## Floor 7 stays Frozen Depths
**The Vikings fit it**: the sea froze over (floor 6 was its cove), and under the ice lies a Viking warband that froze
there and won't stay dead. Its level stays as it is (ice you slide on, icicles, snowy trees in beds of snow, nine
rooms). The warband's **eyes burn ice-blue** (the pack's white eyes, lit), the dead are **frost-blue**, recoloured in
code. Lineups: `Floor 7 lineup` and `More-enemies lineup` renders (sent in chat).

## Its enemies (none like another floor's)
1. **Raider** (Viking_Male, a small axe). The floor's fighter. From 6–12 m he crouches (0.5 s, his boots scrape), kicks
   off and **slides at where you stood**, axe-first, in a straight line. On stone he stops just past it; on ice he
   can't stop or turn and carries far past: step aside and he slides by; into a wall and he's dazed (1.5 s). Up close,
   his chop (16).
2. **Axe Thrower** (Viking_Female, small axes). Keeps 6–16 m off and throws **two axes at once in a V**, spinning flat
   and fast: one at where you are, one at where you're going (she leads you). Stand still and the first finds you, run
   straight and the second does; change your way and both miss. Come close and she **rolls away** to a random side. Up
   close, a shove (8).
3. **Draugr** (Zombie_Male and Zombie_Female, frost-blue). **Buried in the beds of snow** (under the ice where a room
   has none), unseen: as you pass, they **rise** (0.9 s, snow bursting off them), a few in a room. Slow; their touch is
   **frostbite** (10, and you're chilled: 10% slower for 3 s, up to three times). Weak alone, bad in a crowd on ice.
4. **Völva** (the Witch, her robe pale, her eyes and hat-band lit). The seeress. Stands off and casts a **rime bolt**
   (slow, curving a little after you) that **freezes the floor where it lands** (an ice patch, 2.5 m, 8 s): she spreads
   the ice. Her chant **raises a fallen Draugr** (3 s, a ring of frost on the body: punch the body or her to stop it).
   At most 2 a room.

### Mini bosses
- **Berserker** (VikingHelmet, 1.3× big, a double axe, his eyes red). He goes **berserk**: spins with his axe out
  (2.5 s), drifting at you; on ice he skids faster and wider. Then he's **dizzy** (1.6 s) and your hits do more. Below
  half health he spins twice in a row. Only a hard hit staggers him.
- **Haugbui, the barrow-dweller** (Zombie_Male, 1.6× big, frost-dark). Slow. His **stomp** turns a ring round him to
  ice and throws you back; he **tears a block of ice out of the floor** and hurls it where you're going (it shatters and
  leaves rime). Only a hard hit staggers him.

### Numbers
**Never tankier** (the designer's rule): regulars within the floors before's 12–60 health, the mini bosses within 340;
harder means more AI (the Thrower leads you, the Raider uses the ice). **(placeholder numbers, F1)**

## Its boss: the Frost Roc (as planned)
The giant snow bird (the Ultimate Monsters' Birb, unused): in Norse myth **Hræsvelgr**, the corpse-swallowing eagle
whose wings make the winter wind, so it sits with the warband. Wing gusts that push you across the ice, dives, a
freezing breath that ices the floor under you. (If you'd rather a person: the **Jarl**, a giant VikingHelmet.)

## How they're built
One export for the pack (`tools/blender/export_people.py`): each model a `.glb` with its 17 clips, ~1.85 m tall, its
materials kept by name (so the game recolours them: the dead's frost-blue, the lit eyes), its weapon from the RPG pack
held in `Fist.R`. Every run plays at the pace it goes (the designer's rule); each attack uses the pack's own clip
(SwordSlash for the chop and the throw, Punch for the frostbite, Shoot_OneHanded for the bolt, Roll, StandUp for the
rise, Defeat for dizzy).

## Order of work
1. **0.3.22 — the warband** (done): the four enemies and two mini bosses on floor 7 in place of the stand-ins; the Lab's
   Floor 7 column lists them; renders of each pose.
2. **0.3.23 — the Frost Roc.**
3. Then the manor's statues (were 0.3.22) and paintings.
