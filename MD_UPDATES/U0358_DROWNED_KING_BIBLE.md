# Update 0.3.58 — The Drowned King by the Boss Design Bible

Status: built (2026-11-05). The designer: "Keep them, adapt", then "do all of the bosses … do floor 5, 6, 7 & 10 * Arena / Moves / Intro". It stays the crowned Fish rather than the bible's Humanoid Shark, and takes its lesson: **Master the parry**.

## Phase 1 (beneath)
Under the water between moves, out of reach, its fin circling you, as before. It's up only for its moves.

| Move | Tell | What it does | Punish |
| --- | --- | --- | --- |
| **Jaw Launch** | The little heads on its body snap their jaws, twice (0.85 s) | 3 heads leave it one by one (0.5 s apart), homing slowly; 12 each | Parry each back: 90 to it, wherever you aim. Shot or punched, it just pops. It stays up while they fly |
| **Fin Dive** | A splash, then its fin cuts the water, circling, speeding up | The fin disappears: it goes under you and the water rings, then it bursts up: 28, thrown | Dash when the fin goes. It's in the air 1 s, then stands 1.4 s |
| **Frenzy Combo** | Its shoulders hunch, all its heads turn on you | Swims at you, surfaces; 3 claws (18 each), the third 1.1 s after the second | Dodge two, wait. The third glints as it comes: parry it and it's open 3 s, hits doing more |

## Phase 2 (risen, at half health)
It roars and rises for good. The water goes from 0.45 m to 0.75 m, so **the low stones go under**. It wades at you, and its tells and blows are 1.2 times as fast. Its Fin Dive circles half as long at 15 m/s (you run at 12).

| Move | Tell | What it does | Punish |
| --- | --- | --- | --- |
| **Blood Frenzy** | Red mist at your screen's edges | A hit of its marks you for 5 s (a new hit starts it over): its heads fly and turn 1.5 times as fast | Don't get hit |
| **Riptide** | It leans back, rings of water racing in, dragging you | A low wave crosses the whole room: 24, thrown, off a low stone too. Taken by it and in the water, it Fin Dives you at once, no circling | Jump at the crest (1.5 m over the floor). Only a high ledge is above it |
| **Surf** (kept) | It sinks into a wave | Rides at you, steering: 26 | Lure it into a wall, column or stone: stunned 2.2 s |

Its Frenzy Combo chains: risen, two heads follow the third claw.

## Ultimate: Maw of Many
Once as it rises, then every 60 s.

- **Tell (1.2 s):** its heads scream and fly to its chest, which splits into one huge mouth.
- **Pull (5.8 s, the cue "PARRY THE BITE"):** it pulls you, harder as it goes. Inside 5.5 m, or in the last second from anywhere, the maw flashes.
- **Bite (0.45 s after the flash):** parry it: its jaw jams open, stunned 7 s, 100 off it, hits doing more. Not parried: 50, thrown into the water, and it Fin Dives you. Dashed through or cleared: nothing happens either way.

Only the final boss's ultimate is a one-shot, so this isn't.

## Its arena
`world/dungeon/temple.ts`: a boss room's size, flooded. 14 low stones (a new cell, `_`, 0.6 m) go under as it rises. 6 platforms (1 m) stay dry, and 4 corner high ledges (2.5 m) are up from a platform beside them. Columns to stun its surf on, lanes wide enough for its body. `engine/temple/templeView.ts` stands colossal columns round the walls.

## Adapted from the bible (kit clashes)
- **The third claw and the bite are the only boss blows that can be parried** (`meleeParry.ts parryBossBlow`). Every other boss blow still can't.
- **A parried head's wait is 0.3 s, not the usual 4 s**, or you could parry only one in a volley. Other parries keep their wait.
- **A parried head goes back to it wherever you look:** the lesson's the timing, not the aim.
- **Parry is bare-handed:** so as its Maw opens your fists come out (your weapon stays in its slot). With a weapon in hand you can still shoot heads and dodge the third claw, without the bonus.
- **The bible's "knee-deep with platforms"** has low stones under the second water, so "fewer dry platforms" is the water really rising over them.

## Removed
Its ambush (now the Fin Dive), undertow (now the Riptide's tell), jet, tidal wall (now the Riptide), bites (now the Frenzy Combo), geysers. Its brood of 6 Spawnlings stays, once, but after its first Maw, not on top of it. Health unchanged: 1400.

## Placeholders
All numbers. All new sounds are code-made, with the library's roar and crash. The heads and the maw are made in code.

## Files
- **New:** `sim/enemies/drownedBody.ts`, `drownedJaws.ts`, `drownedMaw.ts`; `world/dungeon/temple.ts`; `engine/temple/drownedHeads.ts`, `drownedPose.ts`, `headGeometry.ts`, `templeView.ts`.
- **Changed:** `sim/enemies/drownedKing.ts`, `drownedKingMoves.ts`, `drownedRisen.ts`, `enemy.ts`; `sim/combat/parry.ts`, `meleeParry.ts`, `strike.ts`, `step.ts`, `fists.ts`, `targets.ts`, `events5.ts`; `sim/dungeon/bossRoom.ts`; `tuning/drowned.ts`; `world/dungeon/rooms.ts`, `assemble.ts`, `cores.ts`, `dressing.ts`, `ownDressing.ts`; `engine/drownedFx.ts`, `drownedKingFx.ts`, `drownedFeedback.ts`, `shotLooks.ts`, `shotsView.ts`, `enemyLooks.ts`, `combatScene.ts`, `hudStore.ts`, `overlayFeed.ts`, `boss/showViews.ts`; `audio/drownedKingSounds.ts`; `screens/BossHud.tsx`; `ui/theme/theme-47-ultimate.css`; `tools/boss-shots.ts`; tests.

## Unseen
- Not played. The poses and room were checked in Blender renders of the game's own pose code.
- Those renders draw the King flat white and additive glows opaque, so these haven't been seen: the flash, the glint, the rings, the fan and the mist as they'll really look.
- Not seen moving: anything. The numbers are first guesses, especially the parry timings.
