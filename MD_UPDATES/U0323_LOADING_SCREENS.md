# Update 0.3.23 — loading screens

Status: built (2026-11-03). The designer: "before everything else, we need to add few loading screens and give the
game some time to load stuff: after clicking on lab; after clicking on start; starting a new floor; from lab to level
buttons".

## What you see
The loader as before (Update 0.1.14): black, the logo's retry arrow turning bottom right, no words. It now comes up for
every way into a level and stays until the level is really ready, then fades off (0.5 s):
- **After Lab** (the main menu's): the fade to black, then the loader till the Lab is ready.
- **After Start**: the gate opens and fades to black as ever, then the loader till the lobby is ready.
- **A new floor**: stepping into the dark beyond the boss's gate, the loader on the black till the next floor is ready;
  its name ("FLOOR 2") shows as it clears.
- **The Lab's buttons**: a floor, a boss room, back to the Lab: the loader at once till it's ready.
- And the lobby's gate into a run, the death screen's Retry, the pause menu's Restart: the same.

## Ready means
- The level's models loaded: the level's own (the dungeon's kit, the lobby's), every enemy's, the bosses', the
  weapons', the shop's and chests' items, your arms. A model that fails to load doesn't hold it up (the console says
  so); it waits 20 s at most for them.
- Then its shaders compiled (`renderer.compileAsync`), so nothing stalls a frame the first time it's seen.
- And at least 1 s (the loader never flashes). **(placeholder numbers: `engine/levelLoad.ts`)**
- Meanwhile no time passes in the level (enemies, the floor's name, the fight's clock) and nothing you press counts.

## How
The level's build is heavy and holds the page, so the loader is put up and drawn first (two frames), then the level is
built behind it (`GameBase.covered`, `RunBase.loadCovered`, `LevelLoader`), and made ready (`readyLevel`). An older
load finishing after a newer one started is ignored.

## What was built
`engine/levelLoad.ts` (new: `readyLevel`, `whenTrue`, `LevelLoader`), `runBase.ts` (every level made ready; the way
down, a Retry and a Restart behind the loader; the old held floor name, `holdFloorTitle`/`LOADER_HIDES`, gone),
`run.ts` (no time while loading), `runLinks.ts` (`onLoading`), `gameBase.ts` (`covered`: the Lab, its floors and boss
rooms), `Game.ts` (the lobby, a run, F9), `combatScene.ts` (its models' `loaded`); `App.tsx` (the loader whenever
the Game says), `screens/GameView.tsx`, `useRunStart.ts` (its own one-second loader gone: the Game's covers it).
Tests: `test-loading.ts` (new).

## Checked without a browser
Rules (tests): at least 1 s, waiting for slow models, models before shaders, failures not blocking, the build two
frames after the loader goes up (once), an older load ignored, a gone run's load unheard; every way into a level goes
through it. **Not yet seen in the game**: how long each load takes (every level still loads every enemy's model: a
floor may sit on the loader a few seconds), the arrow turning while the level's built.
