# Update 0.3.50 — the Dragon's courtyard and its intro

Status: built (2026-11-05). The designer: "I am thinking of having each boss their designed room for them * dragon, maybe shift the arena a bit * We also need an intro".

"Shift the arena a bit" was read as: same size, same 4 pillars, but its own place, not the shared boss room. The bible asks for "a ruined castle courtyard with 4 stone pillars".

## The courtyard (`world/dungeon/courtyard.ts`, floor 1 only)
- **Size:** a boss room's, 60 m square, its middle open for its core and its dive.
- **Walls:** 10 m, up from 6 m, with battlements along their top.
- **Towers:** one in each corner, 8 m across and 12 m high, solid all the way up, each with a crown until the intro.
- **The 4 pillars:** where they were. Only these read as pillars, because only these stop the core's blast. The shared room's broken column stubs looked the same and wouldn't have, so they're now low ruined wall.
- **Ruins:** a low L of masonry behind each pillar, leaving floor in the pillar's shadow to shelter on.
- **Ash:** beds of ash with charred trees in them (never out of paving), the bones and logs the old Scorched Grove had, scorch marks, rubble at the foot of the stone.

## The intro (`sim/dungeon/dragonShow.ts`, `engine/boss/dragonCinema.ts`, `dragonShowView.ts`)
About 12 s as you see it. SPACE skips it, as any boss's.

1. **Over your head.** The view tilts up off your eyes. It comes in from behind you, huge and fast, its shadow racing over the floor, and away over the far wall.
2. **Its fire.** From high off the wall you came in by: it laps the courtyard breathing fire on the walls. A ring of flame races round behind it, the walls are driven back to the whole room, and blasts go off along them.
3. **The towers.** Passing each corner it knocks the crown off the tower there, falling outward. The view drops to the floor for the last one.
4. **Its climb.** From the middle's floor, up at it climbing straight up.
5. **Its dive.** Falling with it, head first, on the left of the view, its name on the right, slowed. Its shadow grows on the floor: the Dive Bomb you'll have to read in phase 2.
6. **Its strike.** A white flash, a fireball, a wall of shock, dust and rock, the whole place shaking, a crater left for good.
7. **Its scream.** Low in front of it: it staggers, rears and screams fire at the sky. Back into your eyes, facing it.

Tuning is in F1 → Dragon, "Show:". What the intro takes stays gone: the crowns and the walls don't come back, and the crater stays.

## Also
- The Dragon's core now brings it to the room's middle even though it no longer spawns there (`Enemy.from`, set by the show).
- `DUNGEON_LOOK` is floor 1's look: brick, plus these walls, towers and ash.
- `bossTowers` is a look's option for corner towers, and tall walls no longer imply the Big Shark's arena (`depthsView.ts` now asks for the cove's look).
- `boss-shots.ts` renders the intro's shots for floor 1 (`--beat=pass|high|low|climb|fall|scream`).

## Placeholders
- **Sounds:** the show's new ones are code-made, except its scream and fire shots, which keep their samples.
- **The Dragon's size:** 7 m. Next to a 60 m courtyard it looks smaller than the bible's "huge". F1 → Dragon size, untouched here.
- **Ruins:** plain brick blocks, the kit's ledges. A broken-wall piece would look better, but none is in the kit.

## Other bosses
Still on the shared `BOSS_ROOM`: the Frost Roc, the Drowned King, the Velociraptor and floor 10. Each gets its own room and intro when its turn comes in floor order. The Swarm, the Bone King, the Big Shark, Okami and Tidebreaker already have rooms of their own; The Swarm and the Bone King still need intros.

## Files
- **New:** `world/dungeon/courtyard.ts`, `sim/dungeon/dragonShow.ts`, `engine/boss/dragonCinema.ts`, `engine/boss/dragonShowView.ts`, `tests/test-dragon-show.ts`.
- **World:** `rooms.ts`, `styles.ts`, `styleTypes.ts`, `tallWalls.ts`, `dressing.ts`, `ownDressing.ts`.
- **Rules:** `sim/dungeon/bossRoom.ts`, `bossBeats.ts`, `sim/combat/events2.ts`, `sim/enemies/dragonMoves.ts`, `tuning/dragon.ts`.
- **View and sound:** `engine/boss/bossShow.ts`, `showViews.ts`, `dragonView.ts`, `bossFx.ts`; `engine/foeFeedback.ts`, `depthsView.ts`; `audio/dragonSounds.ts`.
- **Tests:** `test-dragon-show.ts` new; `test-dragon.ts` updated; `test-boss-room.ts` and `test-boss-show.ts` now run the shared intro with the Dragon's own switched off; `test-lava.ts` no longer takes floor 1's look for plain brick; `test-venom.ts` knows floor 1's room is the courtyard.

## Unseen
- Not played. The room and the shots were checked in Blender renders of the real kit and camera positions.
- Not seen at all: the flames, the crowns falling, the shadow, the flash and the crater, or the Dragon tipping in its dive and banking in its lap.
