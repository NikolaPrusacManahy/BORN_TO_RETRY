# M3, eighth slice — Update 0.0.20: lava rooms, floor 3's look, Dragon and snake balance

Status: built (2026-10-28), from the designer's list:
- "Fog size is maybe too big, make it x1.5 smaller." Read as the **Frog**: the screenshot showed an oversized frog.
- "Snakes need to be x1.5 faster, deal x2 less damage, but attack right away when they are close."
- "Dragon moves need balancing: the beam needs a 1.5 sec charging, a way to warn the player."
- "Dragon needs better logic: when the player is close, more frequent melee attacks; if they are far, beam and fireballs."
- "Floor 3 needs a new look: use the other type of walls, use the other type of gate; they close and open as you enter or win a room." And: "try to work out the looks of floor 3".
- "New layouts with pits, like some rooms with lava pits in the middle; players lose 50 health and respawn at the starting point of the current floor; if falling in lava with >50 health, then the player loses." Read as: with **50 or less**, you die.
- "Make proper use of wall run in some of the rooms."
- "Add a button to start either floor 1, 2 or 3 in the lab room."

## Frog and snake (Floor 2 enemies tab)
- **Frog size:** 1.1 → **0.75 m** (1.5× smaller, to the slider's step).
- **Snake:**
  - speed 7 → **10.5 m/s**;
  - bite 8 → **4** (the poison is unchanged: 3 a second for 4 s);
  - wind-up 0.35 → **0.1 s**: it bites the moment it's close. The hiss and the flash still play first (the telegraph rule) for that split second; the knob goes down to 0.05.

## The Dragon (Dragon (boss) tab)
- **The beam charges 1.5 s** (Breath charge; was 1). While it charges:
  - a **thin red line** runs from its head to exactly where the beam will burn, brightening and flickering faster as the moment nears;
  - **fire gathers in its mouth**, growing, with a light;
  - the inhale sound lasts the whole charge.

  The line follows you during the charge. Once the beam fires, it follows at its slow sweep (0.7 rad/s) as before.
- **Its choices:**

  | You are | It picks |
  |---|---|
  | Close (within Dragon close, 9 m) | Wing 55%, tail 30%, claw swoop 15%, and the tail always when you're behind it. Its pauses are half as long (Dragon close pauses 0.5). |
  | Between | Claws 45%, beam 30%, fireballs 25% |
  | Far (beyond Dragon far, 18 m) | Beam 50%, fireballs 50% |

  Never the same move three times running. **(placeholders)**

## Lava rooms (from floor 2 on; placeholders)
- **The lava:** L in a room's layout is a pit 1.6 m deep with glowing lava at the bottom.
  - The pit's sides are brick faces down to the lava; walls standing in it are faced down to it.
  - A warm light glows over a pit every few cells.
  - Walkers go round it; fliers cross it.
- **Falling in:**
  - You lose **50 health** (Lava burn knob, Health tab), straight off your health, with a jolt and a hiss of steam.
  - You're **back at the floor's start**.
  - The fight you were in stops: its enemies, shots and quakes are gone and its gates open. It starts again when you walk back in, and its key with it.
  - With **50 or less**, you die.
  - God mode (Lab) takes no health but still sends you back.
- **Three new rooms**, mirrored and turned like the others. Each has a walkway round its lava that joins every door, so no fight needs a jump:
  - **Lava lake:** a 4-cell (8 m) lava moat round a 16 m island in the middle.
    - A 4 m bridge reaches the island from each side, so the enemies follow you there: no spot is safe from them (the existing rule `test-dungeon.ts` checks).
    - Four 10 m walls jut over the lava from the walkway to the island's corners: run along one to cross.
  - **Lava bridges:** a 16 m channel of lava across the middle, with 8 m walkways down both sides.
    - Four 20 m walls stand across it: wall-run over.
    - The middle of the channel is too wide for a running jump (about 9 m); a wall run carries about 13 m before you jump off.
  - **Gauntlet:** two lanes of lava, each 6 m wide, between 36 m walls.
    - You can run from wall to wall down a lane, or walk round by the walkways.
    - The walls are also cover.
- A floor picks 5 of its rooms. Floor 1 picks from the old 9, floors 2 and 3 from all 12.

## Floor 3's look (stone)
Floors 1 and 2 are brick, as before. Floor 3 is the Modular Dungeon Pack **part 2** set, exported into the kit (`export_dungeon_kit.py`, turned to face the room) and chosen per floor in `world/dungeon/styles.ts`:
- **Walls:** grey cobbled stone, three high, with the same dark slate cap.
- **Floor:** grey stone tiles.
- **Doorways:** part 2's stone arch, stretched to the 4 m doorway and through the wall's depth, with its keystone block over it.
- **Gates:** part 2's square **portcullis**. It **drops from above** into the doorway when a room's fight starts and is **drawn back up** slowly when you win (floors 1–2's bars rise out of the floor).
- **Columns:** stacked stone drums (base, seven drums, top).
- **Walls and floor details:**
  - rubble patches on the walls where floors 1–2 hang banners;
  - grey rocks among the bones;
  - dark grey wall cores.
- **Boss room:** its sliding walls in stone too. The Dragon is still floor 3's boss (no floor 3 boss yet).
- **Other choice:** the packs have a second kind of "gate", part 1's wooden arch doors. I chose part 2's portcullis to match part 2's walls. If you meant the wooden doors, it's a small change in `styles.ts`.

## The Lab
- **Floors 1, 2, 3** on its panel (F8): a run from that floor's start.
- Its way down goes on to the next floor as usual; dying, or **Back**, returns to the Lab.

## Not checked in-game
The feel of the snake, the Dragon's charge line, the lava's glow and pits, the wall-run distances over the lava, floor 3's stone look and its portcullis are unverified until played. Floor 3 and the lava rooms were looked at in Blender renders only.
