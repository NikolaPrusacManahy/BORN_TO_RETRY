# Update 0.2.23 — floor 2, the Venom Garden

Status: built (2026-11-01). The designer: "I need a redesign of Floor 2 and floor 3 * they need to match their enemies *
what do you suggest?"; Claude suggested the Venom Garden (floor 2) and the Bone Keep (floor 3); the designer: "Yes,
floor 2 first". Floor 3 is a later update.

## Why
Floor 2's enemies are the venomous and crawling ones (Slime, Frog, Snake, Wasp, Spider, Blue Demon; the Dragon its
boss), but it looked like floor 1 (the same brick, the same rooms) with lava. Now it looks and plays like their home.

## The look
- **Floor 1's brick ruins, overgrown, in bright sun:** the brick mossy (olive), the paving greener, a warm pale
  yellow-green sky and haze, a soft green light from the ground.
- **Earth beds** (dark earth, no paving) with flowers, short grass and plants; **trees** (birches, common trees) in
  their beds; **bushes** are the low cover, each in its own bed. Nothing green grows out of paving.
- **Thick cobwebs** at the foot of the walls, in most corners; mossy rocks, fallen logs, skulls and bones along the
  walls.
- **Green sludge** in the pits instead of lava: bubbling (bubbles swell and pop on it), a dimmer green glow.

## The hazards (one per enemy)
- **Sludge (all pits):** as lava (health lost, back to your checkpoint) and **you're poisoned** too (Sludge poison, 6 s).
- **Webs (the spiders):** patches of web on the floor (a sheet of web, cobwebs on some); in one you move at **40%** of
  your speed (Web slow). A dash keeps its own speed: **dash out**.
- **Tall grass (the snakes):** beds of chest-high grass the snakes hunt in. It **parts** round you and the enemies
  walking through it (a shader: the nearest 7 enemies and you).
- **Hives (the wasps):** papery hives on the walls, 2.4 m up. While their room fights, each lets a **wasp** out every
  7 s (the first after 3.5 s), **3 a hive**, never while 3 of the hives' wasps are flying. **Punch one down** (jump to
  reach it, or throw a weapon): 40 health. A fallen hive lets out no more. The room is won as before (its own enemies
  sent and dead, and every wasp dead); a full hive stays quiet then.
- **Banks (the frogs):** earth banks round the sludge ponds. **Pillars (the Blue Demon):** stout brick pillars, 4 m
  square, to bait its charge into.

## Nine rooms and the boss room
The toad pond, the hive hall (8 hives), the web cellar, the snake grass, the overgrown cloister (4 hives), the sludge
channels, the rot bridges, the sludge gauntlet (4 hives), the pillar hall. **The Scorched Grove** (the Dragon's room):
the old boss room, its broken columns now charred trees in beds of ash, ash with burnt stumps, logs and bones in it,
scorch marks on the paving.
- Floor 1 keeps its nine rooms (they were floors 1–2's). The lava rooms (the lava lake, the lava bridges, the
  gauntlet) are floor 3's only now.
- The enemies, their numbers and the waves are unchanged.

## Numbers
All placeholders, on F1 → Venom Garden: Web slow 0.4, Sludge poison 6 s, Hive health 40, Wasps a hive 3, Hive gap 7 s,
Hive wasps at once 3.

## Art
The Nature pack's bushes, flowers, grass, plants, birches, trees, stump and log, and part 1's second cobweb, added to the
kit (`export_dungeon_kit.py`). The hives, the web sheets, the scorch marks and the sludge's bubbles are made in code
(simple shapes and a canvas), as the game's other effects are. The hives' sounds are made in code (a buzz, a crunch
and a thud).

## What was built
`world/dungeon/venomRooms.ts` (the rooms, the Scorched Grove), `styles.ts` (VENOM: `pit`, `burnt`, `ash`, `lowBed`),
`rooms.ts` (`,` bed, `G` tall grass, `R` tree, `w` web, `h` hive; `bossRoomOf`), `garden.ts` (webs, hive spots),
`gardenDressing.ts` (beds, grass, trees, webs, cobwebs, ash, scorch), `cellBoxes.ts` (out of `assemble.ts`).
`sim/dungeon/hives.ts`, `quicksand.ts` (`webSlow`), `lava.ts` (the sludge's poison), `combat/strike.ts` (a hive is a
target), `combat/events2.ts` (floor 2's events: the Dragon's moved there, the hives'), `tuning/garden.ts`.
`engine/lavaView.ts` (the sludge, bubbles), `gardenView.ts` (web sheets, scorch marks), `grassShader.ts`,
`hivesView.ts`, `dungeonSolid.ts` (out of `dungeonView.ts`), `sandView.ts` (ash), `audio/gardenSounds.ts`. The preview
tools draw the sludge's colour, ash and the charred trees. Tests: `test-venom.ts`.

## Unseen in the game
Checked by tests and Blender previews only: the parting grass, the hives (their place, their fall, their reach with a
punch), the web sheets, the bubbles, the colours in the game's own light, the balance.
