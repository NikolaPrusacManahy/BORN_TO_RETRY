# Update 0.3.60 — The Velociraptor by the Boss Design Bible

Status: built (2026-11-06). The designer: "do floor 5, 6, 7 & 10 * Arena / Moves / Intro". Its lesson: **Trust your ears**. It's often out of sight, and its tells are sounds.

## New to the game: left and right
Sounds had no left or right. Now any sound can be panned by where its event happened as you face (`synth.ts` `pan`, `AudioEngine.pan`). Its hiss, clicks, scrapes, tail and eyes use it. Other enemies' sounds don't yet.

## Phase 1
| Move | Tell | What it does | Punish |
| --- | --- | --- | --- |
| **Sickle Pounce** | Crouches low with a sharp hiss, rising (0.75 s) | Leaps at you, 24. For the first 60% of its flight its landing follows you: dodge too early and it still gets you | Dodge late. Missed, it skids and is open 2 s, hits doing more |
| **Stalk & Ambush** | It runs off out of sight and it's gone. Clicks, quicker and louder, from the way it's coming | It shows for 0.45 s, low, then lunges, 22 | Turn to the clicks and hit it as it shows: it trips, down 2.5 s |
| **Tail Lash** | Turns side-on, its tail flicks | Spins all the way round in 0.5 s, its tail at chest height, 20 and thrown | Jump it (the slide's gone). It's dizzy 1 s |
| **Charge** (kept) | Lowers its head, scraping the sand twice | Runs at you, steering, 26 | Into a wall or a column: stunned 2.4 s |

## Phase 2 (at half health)
A roar, its eyes burning. It's 1.2 times as fast, and a pounce landing on you pins you (its old pin: dash on each bite's glow).

| Move | Tell | What it does | Punish |
| --- | --- | --- | --- |
| **Pack Call** | Head up, barks twice | 2 of the small Dinos (35 health) come, one to each side of you. Every 32 s, once they're dead | Kill them fast. While they live, it only ambushes |
| **Feint** | Crouches with no hiss | Blurs round to your other side, then a real pounce, with a short hiss | Listen, don't look: a crouch with no hiss isn't the pounce |

## Ultimate: Apex Hunt
Once as phase 2 starts, then every 60 s.

- **Tell (1 s):** the light dies (the haze closes in black to 9 m, and the room's darkened), it backs off into it.
- **Stalk (5 s, the cue "HIT ITS EYES"):** it's gone. A heart beats, clicks come from wherever it is.
- **Its eyes flash for 0.5 s** (they show through the dark, at a random moment), and it kicks a stone at you.
- **Cancel:** hit it in that time, or parry the stone back into its eyes: blinded, on its back, 6 s, 90 off it, hits doing more.
- **Fail:** it lunges out of the dark: 45, heavy, not a one-shot. A dash still beats it, without the stagger.

## Its arena
`world/dungeon/ruins.ts`: a boss room's size. The bible's "overgrown jungle ruins, tall walls and tight corridors", but floor 6 is the Desert, so sand-choked ruins with palms. Blocks of wall to break your sight, some corridors too tight for its body. `engine/boss/ruinsView.ts`: dunes and broken sandstone towers beyond the walls. On floor 10, where it still stands in, its room's the old one until floor 10's boss is built.

## Adapted from the bible (kit clashes)
- **The slide's gone (0.3.20):** the Tail Lash is jumped.
- **Fists can't shoot:** the stone it kicks at the flash can be parried back into its eyes, so bare hands have a way through its cancel. A shot, a thrown weapon or a punch in reach all count too.
- **"Hit it as it appears"** counts any hit, not only a shot.
- **The pin stays,** from its 0.2.8 moves, in phase 2: the bible doesn't have it, and it's the same reflex.
- **The charge stays,** so its walls are a weapon for you too.
- **No on-screen arrow for its clicks:** the lesson's your ears, so this leans on headphones or stereo. If players without them struggle, it's one small HUD mark away.

## Removed
Its charge's feint, wall launch, sand kick, sandstorm, screech, blitz and afterimages. Health unchanged: 1260.

## Placeholders
All numbers. The new sounds are code-made, with the library's roars and crashes; its clicks and hiss want real recordings (the Sonniss library may have them). The small raptors are floor 6's Dino as it is.

## Files
- **New:** `sim/enemies/dinoBody.ts`, `dinoApex.ts`; `sim/dungeon/dinoShow.ts` (its beats, wired in the next update); `world/dungeon/ruins.ts`; `engine/boss/raptorPose.ts`, `ruinsView.ts`.
- **Gone:** `sim/enemies/dinoBlitz.ts`, `dinoFrenzy.ts`.
- **Changed:** `sim/enemies/dino.ts`, `dinoMoves.ts`, `dinoHunt.ts`, `enemy.ts`, `evade.ts`; `sim/combat/parry.ts`, `events.ts`; `tuning/dino.ts`; `world/dungeon/rooms.ts`, `ownDressing.ts`; `engine/boss/raptorFx.ts`, `raptorFeedback.ts`, `bossShow.ts`, `showViews.ts`; `engine/enemiesView.ts`, `enemyLooks.ts`, `combatScene.ts`, `combatFeedback.ts`, `raptorHud.ts`, `run.ts`; `audio/raptorSounds.ts`, `synth.ts`, `audio.ts`; `tools/boss-shots.ts`; `tests/test-raptor.ts`.

## Unseen
- Not played. The poses and room were checked in Blender renders of the game's own pose code.
- Not heard: every sound, and whether the panning reads. The sound is the lesson here, so this is the one to check first, with headphones.
- Not seen: the dark and its eyes in the game's renderer, or anything moving.
