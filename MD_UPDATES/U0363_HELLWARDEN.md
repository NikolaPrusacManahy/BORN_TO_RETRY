# Update 0.3.63 — Hellwarden, floor 10's boss

Status: built (2026-11-06). The designer: "For floor 10 we have nothing designed so you need to start". It's the bible's Blazing Sword Demon, "The final exam", on the skull-faced knight agreed for floor 10 in 0.3.28 (`MD/FLOOR10_HELL_PLAN.md`). Each move retests a skill from an earlier boss. Floor 10 plays only from the Lab's floor list (F8) for now: public runs still end at floor 9.

## Phase 1
| Move | Skill | Tell | What it does | Punish |
| --- | --- | --- | --- | --- |
| **Blazing Arc** | The Frost Roc's: ground or air | Blade flares white (0.45 s) | A swing 200° wide, 9.5 m, 30. Cuts through columns in its way. Leaves a wall of fire 30 m long for 4 s, 14 to cross | Jump the swing (a jump clears the fire too). Plan your way round the wall |
| **Hellfire Lunge** | The Drowned King's parry and the Velociraptor's ears | It goes up in embers. A whoosh, panned, from the side it'll arrive on (behind or either side) | 0.45 s later it arrives and thrusts: 34 | Turn, and parry: it's open 2 s |
| **Brand of Ruin** | Okami's lines | Its sword in the floor, cracks glowing in 8 lines | Fire pillars spread out along each, 26 | Stand between the lines. Its sword stays planted 2.2 s |

## Phase 2 (at half health)
A roar: every column left comes down, the floor cracks glowing, its sword splits in two, and it's 1.25 times as fast. Its Arc swings twice.

| Move | Skill | Tell | What it does | Punish |
| --- | --- | --- | --- | --- |
| **Echoes of the Fallen** | All of them | Each one's own, black and red | 4 shadows, 3.2 s apart, on their real models, and it keeps attacking: the Dragon's dive (a ring where you stood, 22), the Giant's stomp (a ring along the floor, 18: jump), the Raptor's pounce (hiss; follows an early dodge, 20), the Wolf's dashes (3 lines on the floor, 16 each) | Dodge each exactly as it was |
| **Twin Blade Recall** | Parry | Arms cross | Both blades thrown, swinging out and back over 2.6 s, 22 | Parry one: it goes back into it, and it's weak for 12 s (60% damage, no fire walls, no second blade) |

## Ultimate: Last Verdict
Once as phase 2 starts, then every 60 s. **The only one-shot in the game**, as the bible says.

- **Tell (1.2 s):** the screen drains of colour, one heartbeat, it rises 4 m.
- **Charge (3 s, the cue "PARRY THE CLEAVE"):** its blades fuse into one great burning sword over it. It flashes 0.3 s before the cleave.
- **Cancel:** one parry, as the cleave comes: its sword shatters, it's down 8 s, 200 off it, hits doing more.
- **Fail:** dead, from anywhere. A dash or a jump doesn't save you.

## Its arena
`world/dungeon/throne.ts`, the Throne of Cinders: a boss room's size, columns to be cut through, lava pools to route round, a dais in each corner, bones. `engine/hell/throneView.ts`: floating in a void, its great throne past the far wall, chains up out of sight, rock drifting.

## Adapted from the bible
- **"The throne room breaks apart":** its columns come down and the floor cracks glowing, but the floor you stand on stays. Real falling floor would be a big job on its own.
- **Your fists come out as Last Verdict opens** (your weapon stays in its slot): a parry's bare-handed, and it's the only way through. The Drowned King's Maw does the same.
- **Hellfire Lunge's parry** is the one blow in phase 1 that can be parried. Other boss blows still can't.

## Not done for floor 10
Only its boss. Floor 10's rooms still have the stand-in enemies. The plan's Imps, Puglins, Bone Axemen and echo rooms aren't built, and neither is The Retrier. Its open questions in `MD/FLOOR10_HELL_PLAN.md` are still open.

## Placeholders
All numbers. New sounds are code-made, with the library's roars and crashes. The fire, cracks and great sword are made in code. The shadow bosses are their real models, darkened.

## Files
- **New:** `tuning/hellwarden.ts`; `sim/enemies/hellwarden.ts`, `wardenBody.ts`, `wardenMoves.ts`, `wardenEchoes.ts`, `wardenVerdict.ts`; `sim/combat/eventsHell.ts`; `sim/dungeon/wardenShow.ts` (its beats, wired in the next update); `world/dungeon/throne.ts`; `engine/hell/wardenLook.ts`, `wardenFx.ts`, `echoesView.ts`, `wardenFeedback.ts`, `throneView.ts`, `wardenCinema.ts`; `audio/wardenSounds.ts`; `public/models/enemies/hellwarden.glb` (the Bestiary's, from `tools/ual_bake.py`); `tests/test-hellwarden.ts`.
- **Changed:** `sim/enemies/kinds.ts`, `kindsMoon.ts`, `enemy.ts`, `evade.ts`, `update.ts`, `tokens.ts`; `sim/combat/parry.ts`, `targets.ts`, `events.ts`; `sim/dungeon/bossRoom.ts`, `wavePlan.ts`; `tuning/store.ts`; `world/dungeon/rooms.ts`, `ownDressing.ts`; `engine/run.ts`, `combatScene.ts`, `combatFeedback.ts`, `enemiesView.ts`, `enemyLooks.ts`, `shotLooks.ts`, `shotsView.ts`, `gameBase.ts`, `boss/bossShow.ts`, `boss/showViews.ts`; `audio/combatSounds.ts`; `screens/deathText.ts`, `labLists.ts`; `tools/ual_bake.py`, `boss-shots.ts`; tests.

## Unseen
- Not played. The poses and room were checked in Blender renders of the game's own view code.
- Those renders draw additive fire opaque and leave the lava out, so the fire's real look hasn't been seen.
- Not seen: the shadow bosses (they load at run time, and aren't in the renders), the grey screen, anything moving.
