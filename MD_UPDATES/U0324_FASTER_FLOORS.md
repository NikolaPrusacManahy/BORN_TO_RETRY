# Update 0.3.24 — floors load faster

Status: built (2026-11-03). After the loading screens (0.3.23) every level still loaded every enemy's model (78), so a
floor could sit on the loader a few seconds; asked whether to load only each floor's own enemies, the designer: "Yes, do
it".

## What changed
- A dungeon floor loads only the enemies it can bring in (`sim/dungeon/floorKinds.ts`): every kind its rooms' waves send
  (planned with the floor: its lairs and perches send the same kinds), its boss and whom the boss calls (the Demon's
  Grunts, the Drowned King's Spawnlings), floor 2's hives' Wasps, and what any of them becomes or lets out (the Cursed
  Crewman's headless self, the Bee mech's Barbara, a Green Blob's Bloblings, a Big Mushnub's Mushnubs, the Bone King's
  Skeletons). At most 12 of the 78 on any floor.
- The lobby loads none (it has no enemies): Start into the lobby is quicker.
- The Lab (its own room, its floors and boss rooms) still loads every one: its panel can call up any enemy.

## What was built
`sim/dungeon/floorKinds.ts` (new: `floorKinds`, `levelKinds`, `BRINGS`), `bossRoom.ts` (`calledBy`);
`engine/enemiesView.ts` (only the level's kinds), `combatScene.ts`, `runBase.ts` (the Lab's: every one), `gameBase.ts`.
Tests: `test-floor-kinds.ts` (new).

## Checked without a browser
Rules (tests): on floors 1–8 (4 seeds each) every kind sent, the boss, its calls, the hives' Wasps and what they bring
are loaded; at most 12 a floor; floor 7 only its warband (and its stand-in boss); the Lab every one, the lobby none;
every kind an enemy's moves let out is listed with it. **Not yet seen in the game**: how long the loader now stays up.
