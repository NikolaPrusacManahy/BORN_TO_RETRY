# M3, seventh slice — Update 0.0.19: the Lab, the wasp's sting, enemy sizes

Status: built (2026-10-28), from the designer's list:
- "The snake and slime are way too big in game."
- "The wasps are shooting venom, where they should actually sting the player."
- "Can I have a 'Lab' option for me where I get to pick what to do and test stuff?" It should let you:
  - select objects and spawn them;
  - try fighting actual enemies you pick, even bosses;
  - "you just simulate the boss fight there for me if I need".

## Enemy sizes (bug)
- **The cause:** Ultimate Monsters' newer models (the Slime, Frog, Snake, Wasp, Spider, Dragon) store their meshes turned on their side.
  - The view sized each enemy from its raw mesh box, which measured them the wrong way up: the Slime 0.6 tall instead of 1.95, the Snake 0.3 instead of 3.
  - They were drawn about **3× (Slime)** and **10× (Snake)** too big. Their hit capsules were always the right size.
- **The fix:** those models (and the Dragon) are now measured from their skinned body in their idle clip (`engine/bodyMeasure.ts`).
  - Each is drawn at its size knob: Slime 1 m, Snake 1.2 m, Frog 1.1 m, Wasp 1 m, Spider 1.4 m.
  - The older pack's enemies are measured as before (unchanged).
- **Test:** `test-floor2.ts` checks each newer model's drawn height against its knob.

## The Wasp stings (the designer's correction)
- **Its venom shots are gone** (and the poisoned shots behind them).
- **Up high:** it flies 3.2 m up and circles 6–14 m off while its sting is ready again (1.8 s).
- **The swoop:** with you in sight and within 14 m, it swoops down at 9 m/s to hover in front of your chest. You give it up by running for 3 s.
- **The sting:** it curls its sting forward and buzzes (0.45 s, glowing), then stabs. If your chest is within 1.6 m of it and in front, 6 damage and **poisoned**.
- **Dodging:** dash away during the warning and it stabs the air.
- **After:** it climbs away (0.6 s). Down at your height your fists reach it, and a hit flinches it and cancels the sting.
- **New knobs (Floor 2 enemies tab):** Wasp swoop, Wasp reach. Wasp sting speed is gone. **(placeholders)**

## The Lab (dev builds only)
**How to get in:** the main menu has **Lab** (under Settings) in dev builds (`START_GAME.bat`), like the F-key tools. It fades straight into the Feel Lab: no gate, no character select. The Feel Lab's own waves are **off** here.

**The panel: F8** in the Lab. The mouse is freed and the world holds still while it's open. A click does its thing and closes the panel; **shift-click** keeps it open; Esc closes it.
- **Enemies:**
  - Grunt, Spitter, Yeti, Leaper, Stinger, Wraith, Slime, Frog, Snake, Wasp, Spider, Blue Demon.
  - ×1, ×3 or ×5 at a time.
  - They appear in front of where you look, facing you, side by side: 7 m off (big ones 10, fliers 8, bosses 16).
  - Each one appears with its usual spawn puff.
- **Bosses:**
  - **Demon** or **Dragon** comes into the Lab: its name and health bar show. Its room's extras (calling minions, its loot) don't happen here.
  - **Demon room** / **Dragon room** takes you to that boss's real room: a new floor 1 or 2 laid out, you standing just inside its boss room facing the portal. Its show starts at once, then the fight.
  - Afterwards: the dark beyond its wooden gate, or dying, brings you back to the Lab. **Back** on the panel leaves early.
- **Items** fall just in front of you; walk over them:
  - heart, plate, gold armour, the four rings;
  - key, white key, gold key;
  - snowflake, gold ingots, blue potion.
- **Weapons** lie in front of you (E): sword, gold sword.
- **Chest:** one stands 3 m in front of you, its front to you. Open it with a key as usual. At most 6 (the oldest goes).
- **Clear** takes every enemy, shot, quake, item, loose weapon and chest away (the stands keep their swords).
- **Heal** fills your health and ends poison.
- **Waves** switches the Feel Lab's own waves on or off.
- **God** switches invincibility on or off (as F4 does).

**Also fixed on the way:** items on the floor are now drawn outside the dungeon too. Kill bonuses dropped in the Feel Lab were invisible.

**Changed:** F9's Feel Lab is now the Lab, so its waves are off until you switch them on.

- **Update 0.0.20:** Floor 1, 2, 3 on the panel start a run from that floor (`M3_FLOOR3.md`).

## Not checked in-game
The panel's look, F8 in your browser, the mouse coming back after a pick, the boss rooms from the Lab, and the new sizes are all unverified until played.
