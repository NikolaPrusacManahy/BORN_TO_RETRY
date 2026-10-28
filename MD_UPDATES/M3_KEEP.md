# M3, ninth slice — Update 0.0.21: floor 3's rooms, the Dragon's sky phase, enemies left

Status: built (2026-10-28), from the designer's list:
- "A new folder in Ultimate Monsters, used_monster: it will help me know which monsters were already used and fully in game." Move them all under it; leave whatever wasn't used yet.
- "An enemy room count that shows how many enemies are left in the room, like a total enemy count left."
- "I am assuming the amount keeps increasing as floors go up." It does: a fight room's budget is 6 + 3 × its depth + 4 × (floor − 1). Enemy cost: grunt, slime, snake 1; spitter, leaper, stinger, frog, wasp 2; wraith 3; Yeti, Spider, Blue Demon 4.
- "Change the Dragon's moves: no more spawning wasps."
- "When the Dragon starts its second phase, right away it flies in the air and starts bombing the ground with massive fireballs; the player can see where they will land; it lasts 5 to 8 seconds in the air."
- "A second new move when the player is near: it charges up and explodes in flames, forcing the player to run away if they stay too close. A rare one, like if the player stayed too close for too long, maybe 30 s."
- "Scrap all of floor 3's levels copied from lower floors, keep the new ones and create more. You may add 2 floors inside a room, making use of enemies that attack from a distance and giving the player options to climb up and take them down."

## Monsters in ASSETS
`ASSETS/QUATERNIUS/Ultimate Monsters/used_monster/` (the designer made it, with these subfolders) holds the 14 monsters in the game, each subfolder with a copy of `Atlas_Monsters.png`:

| Subfolder | Monsters |
|---|---|
| `Boss/` | Demon, Dragon |
| `mini_boss/` | Yeti, Spider, BlueDemon |
| `flying/` | Armabee (Stinger), Ghost (Wraith), Wasp |
| `blobs/` | Orc (Grunt), Wizard (Spitter), Ninja (Leaper), Slime, Frog, Snake |

What's still in `big/`, `blob/`, `flying/` and `boss/` isn't in the game.
- Some same-named files there are different models, and the game's came from the other folder: `blob/` Orc, Yeti and Ninja; `big/` Frog; `flying/` Demon and Dragon.

## Enemies left (HUD)
- Top middle, in a fight: a skull and the number of enemies left: those alive and every one still to come in the room's waves. It pops when it drops.
- In the Lab: the enemies alive.
- A boss isn't counted (its bar takes that spot).

## The Dragon (Dragon (boss) tab; placeholders)
- **No more wasps.** The Summoned wasps and Dragon summon every knobs are gone.
- **Its second phase, the sky:**
  - At half health it screams and **flies up 12 m** at once (no standing roar).
  - It stays up a random **5–8 s** (Sky time least / most), drifting after you about 9 m off.
  - It lobs a **fire bomb** every 0.5 s: about a third right at your feet, the rest within 6 m of you.
  - Each bomb's landing spot shows the moment it's thrown: a red ring as wide as its blast, filling in and brightening until it lands 1.2 s later. Inside the ring as it bursts: 25 damage and thrown.
  - Then it comes back down and fights on, quicker as before (rage warnings, pauses, speed).
- **Flame burst:**
  - The Dragon counts how long you've been within 6 m of it. Stepping away makes it forget at half the rate.
  - Once that reaches **30 s** (Burst after), its next move is the burst:
    - it charges 1.8 s, glowing white-hot and screaming, with a ring on the floor at the blast's reach;
    - then it bursts into flame: within 9 m, 35 damage and thrown far.
  - Run out of the ring while it charges.

## Floor 3's rooms
- **Floor 3 has only its own rooms now.** The nine original rooms are floors 1–2 only. Floor 3 uses the three lava rooms and four new rooms, each with an upper floor.
- **The upper floor:** high ledges, 2.5 m up.
  - **Ways up:** steps (a 1 m ledge beside it, then a jump), jump pads, and walls and tower sides to run along and jump from.
  - **Perches:** spots on the upper floor where **spitters** (the Wizard) stand. Each wave of such a room brings **2 spitters** for them, and any spitter in the wave takes a free perch first.
  - **A perched spitter stays on its ledge:**
    - it turns to you and spits whenever it has a clear line, from twice its usual range;
    - hits don't slide it off;
    - killed, it lies up there.
  - Climb up and take it down.

| Room | What it is |
|---|---|
| **The keep** | A raised square walk (4 m wide) round a courtyard, open at the middle of each side. Spitters on its corners and sides; steps and a pad up from outside, a step up from the courtyard. |
| **Ramparts** | Raised walks along all four walls; an open middle with columns. Steps and pads up at the corners. |
| **Towers** | Eight 6 m-square towers, a spitter on each. A step beside each, and walls to run along and jump from. |
| **Bridgeworks** | Lava below; two raised bridges across it, spitters on them; steps up at the bridges' ends; walkways down the sides. |

- Every room's floor joins every door on foot, and no floor is out of the enemies' reach (`test-dungeon.ts` checks 40 floors).

## Not checked in-game
- the Dragon's sky phase (its height, the bombs' rings);
- the flame burst's charge;
- the perched spitters' aim from above;
- climbing the new rooms;
- the counter's place on screen.

Floor 3's rooms were looked at in Blender renders only.
