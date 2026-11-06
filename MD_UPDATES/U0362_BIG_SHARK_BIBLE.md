# Update 0.3.62 — The Big Shark by the Boss Design Bible

Status: built (2026-11-06). The designer: "Keep them, adapt", "do floor 5, 6, 7 & 10 * Arena / Moves / Intro". It stays the underwater fight, with your jaw moves. Its lesson: **The arena is a weapon**. The bible's sinking ship's deck over open ocean becomes the sunken ships in its flooded arena.

## Kept (your 0.3.16 moves)
Its lunge and snap with the left/right arrow, its swallow with your hands on its jaws, its tail, its feint, its frenzy's shorter warnings. Its swallow is still a one-shot if you don't break free: your own wish in 0.3.16. The bible says only the final boss's ultimate should one-shot, and the swallow isn't its ultimate, so I left it. Say if you want it softened.

## New, phase 1
About 45% of its moves are now these.

| Move | Tell | What it does | Punish |
| --- | --- | --- | --- |
| **Breach** | Bubbles rise round you, a ring on the seabed (0.7 s), following you for the first half | It comes straight up through the spot and out of the water: 28 | Dash off the bubbles. It's in the air 1.5 s, open |
| **Hull Ram** | It backs off, its wake growing (1.1 s) | Rams the nearest ship at 34 m/s: 26 in its way, a shock along the seabed (16), wreckage coming down on you | Be off the floor. Its teeth are stuck 1.6 s, hits doing more |
| **Undertow** | The water churns white (0.8 s) | A whirlpool toward the nearest ship drags you 4 s; in its eye, bitten, 22, flung out | Swim or dash against it |

## New, phase 2 (at half health)
Its frenzy as before, and the ships keep coming apart: wreckage comes down every 9 s.

| Move | Tell | What it does | Punish |
| --- | --- | --- | --- |
| **Blood Scent** | A hit of its leaves you bleeding 8 s: a red trail | Stay within 2.5 m of a spot for 2 s and it strikes there, with no arrow | Keep moving |
| **Deck Breaker** | It's gone; a ship's planks by you bulge and crack (1 s) | It smashes out, biting: 26 | Dodge. It's stuck in the hole 3 s, hits doing more; the hole stays |

## Ultimate: Abyss Jaws
Once as phase 2 starts, then every 60 s.

- **Tell (1.2 s):** the water goes still and silent, the anchors sway.
- **Wait (5 s, the cue "DROP THE ANCHOR"):** it comes to rest under the anchor nearest you, jaws wide, and its chain glows, brighter once it's under.
- **Cancel:** hit the chain while it's under, with anything: a shot, a thrown blade, or swim over and punch it. The anchor crushes it into the seabed: stunned 7 s, 110 off it, hits doing more.
- **Fail:** it comes down on you: 50, heavy, not a one-shot. That anchor's gone either way (they're all hung again once the four are gone).

## Its arena
The Shark's Graveyard (0.3.16) with four sunken ships in place of the giant bones in the middle of each side, the bones moved out, and four anchors hanging on chains (`engine/boss/sharkFx.ts`). Its middle stays open water, so it doesn't bump into things (your 0.3.16 note).

## Its intro
Your own show from 0.3.16 stands: the arena flooding, over its shoulder, straight at the view, the leap in slow motion with its name. It now plays among the sunken ships, with the anchors rocking. I didn't rebuild it: it's your beat list, and you called it good. Say if you want it redone.

## Adapted from the bible (kit clashes)
- **Under water, "jump before impact" is "be off the floor":** you swim, so the shock only catches you near the seabed.
- **"Grab a mast":** there's no grabbing in the game. You swim or dash against the pull.
- **"Lose the deck section you were on":** you aren't standing on a deck, so its failure takes the anchor instead.
- **"It leaps fully out of the water":** the water's 8.4 m deep and you're in it, so it comes down from the top of the water.
- **Fists:** its chain can be reached in the 5 s by swimming, so bare hands have a way through.

## Placeholders
All numbers. New sounds are code-made, with the library's crashes. The anchors, bubbles and whirlpool are made in code; the wreckage uses the Moon's falling boulders.

## Files
- **New:** `sim/enemies/sharkBody.ts`, `sharkArena.ts`, `sharkAbyss.ts`; `engine/boss/sharkFx.ts`; `tests/test-shark-arena.ts`.
- **Changed:** `sim/enemies/bigShark.ts`, `bigSharkMoves.ts`, `enemy.ts`, `evade.ts`; `sim/combat/strike.ts`, `eventsCove.ts`; `sim/dungeon/bossRoom.ts`; `tuning/bigShark.ts`; `world/dungeon/coveRooms.ts`; `engine/combatScene.ts`, `enemiesView.ts`, `depthsFeedback.ts`; `audio/sharkSounds.ts`; `tools/boss-shots.ts`; `tests/run-all.ts`.

## Unseen
- Not played. The arena and anchors were checked in Blender renders; the shark's moves weren't posed there.
- Not seen moving: all of it. Its nose-up in the Breach is whatever its swim gives it.
