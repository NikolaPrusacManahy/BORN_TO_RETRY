# Update 0.2.24 — floor 3, the Bone Keep

Status: built (2026-11-01). The designer: "I need a redesign of Floor 2 and floor 3 * they need to match their enemies";
Claude suggested the Venom Garden (floor 2, Update 0.2.23) and the Bone Keep (floor 3); the designer: "Yes, floor 2
first", then "finish floor 2 and 3".

## Why
Floor 3's enemies are the undead and the crypt's (Skeleton, Skull Wraith, Mushnub and Big Mushnub, White Rabbit, Ninja,
Dragonling; the Bone King its boss), but it was a grey stone castle with floor 2's lava rooms. Now it's their home.

## The look
- **The stone keep become a graveyard-castle, kept bright:** floor 3's stone **bleached bone-white** under a **pale
  lavender sky**.
- **Skulls on the walls**, skulls and bones along their feet, candles; **stone tombs** are the low cover; **tall
  candelabra** by the walls.
- **Open graves** (a bed of earth, its hole dark, a headstone at its head), **beds of glowing mushrooms** (violet caps),
  **burrows**, **crystal clusters** that glow violet.
- **Lava** stays, under the bone bridges.

## The lairs (one per enemy)
- **Skeleton:** in a room with graves, Skeletons **climb out of them** (lying in pieces, then rising as a fallen one
  rebuilds; their own revive still to come) instead of just appearing.
- **Mushnub:** they come **out of the mushroom beds**.
- **White Rabbit:** they **pop out of burrows** (the warren).
- **Skull Wraith:** in a room with crystals, its blink takes it **beside a crystal** (1.7 m from it, at least as far
  away as before) instead of anywhere: easier to read.
- **Ninja:** the warden's court, long open lines with columns only along its walls.
- **Dragonling:** the ramparts and the towers keep their perches.
- **Bone King:** its room is **the Throne Hall**: two rows of skull pillars (12 skulls up each), candelabra round it.
- A lair no one stands on first. Rooms without lairs: the enemies come in as before.

## Ten rooms and the boss room
Eight new: the ossuary, the graveyard court, the tomb hall, the fungal crypt, the warren, the crystal shrine, the
warden's court, the bone bridges (lava under a raised cross of stone, walls to run). And the ramparts and the towers,
dressed as the rest. **Retired:** the keep, the bridgeworks, the lava lake, the lava bridges, the gauntlet (no floor
has them now; `lavaRooms.ts` went to the Recycle Bin). The enemies, their numbers and the waves are unchanged.

## Art
The Ultimate RPG Pack's crystals, skulls and bone and part 2's candelabrum and candle, added to the kit
(`export_dungeon_kit.py --rpg`). The tombs and headstones are part 2's stone floor slab, stood tall. The mushrooms, the
open graves and the burrows are made in code (simple shapes and a canvas), as floor 2's hives and webs are.

## What was built
`world/dungeon/boneRooms.ts` (the rooms, the Throne Hall), `styles.ts` (BONE, `glow`), `rooms.ts` (`g` grave, `m`
mushroom bed, `o` burrow, `x` crystal), `lairs.ts` (each room's lairs), `keepDressing.ts`, `ownDressing.ts` (the
floors' own cells and marks, out of `dressing.ts`), `keepRooms.ts` (two rooms left). `sim/dungeon/lairs.ts`,
`roomLoop.ts` (enemies out of lairs; the fight's crystals), `enemies/evade.ts` (the Skull Wraith's crystal blink),
`combat/state.ts` (`crystals`). `engine/gardenView.ts` (graves, burrows, mushrooms), `dungeonView.ts` (crystals glow).
The preview tools are much faster on big floors (one mesh for the beds, the slab and the pits). Tests: `test-bone.ts`;
`test-lava.ts`, `test-floor3.ts` moved to the bone bridges and the towers.

## Unseen in the game
Checked by tests and Blender previews only: the skulls on the walls and pillars (which way they face), the crystals'
glow, the mushrooms, the open graves, the colours in the game's light, the balance.
