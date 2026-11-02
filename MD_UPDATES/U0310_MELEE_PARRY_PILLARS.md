# Update 0.3.10 — parrying melee blows; pillar collision fixed

Status: built (2026-11-02). The designer, after playing 0.3.1–0.3.9 ("game feels great"): "Allow parries melee attacks,
not mini bosses"; "fix collision with pillar". (Sounds: later. No more finishers.)

## Parrying melee blows
- A melee blow that lands while your **parry window is open** (right click pressed, 0.2 s) is **parried**:
  - it doesn't touch you;
  - your right fist **punches back** (the parry's punch, as on a shot) for the **parry's damage (60)**, a hard knock (a
    kill flings the body, so it may end up pinned to a wall or a pillar);
  - it's **staggered**;
  - the freeze, the ring, the clang, "PARRY" on the style rank;
  - the **4 s** wait starts, as after a parried shot (Giant Killer: none).
- **Whose:** the Grunt, the White Rabbit, the Skeleton, the Mushnub, the Leaper's landing, the Frog's tongue, the
  Snake's bite, the Wasp's sting, the Green Blob's and the Dino's, the Snapper's bite, the Spawnling's.
- **Never:** a **mini boss's** or a **boss's** blow; a blast or a burst (the Slime's, the Cactoros' spines); shots
  (they have their own parry).
- Press too early or too late: it lands as ever.

## Pillar collision
- **A broken pillar:** its stump stops you only as high as the break (you can stand on it; above it the way is clear),
  and its **fallen top** has its own collision where it lies (you bump into it; enemies walk round it). Where the top
  lands is decided once, so what you see and what you hit are the same.
- **The stone columns** (floors 3 to 7, the stacked ones): their collision was a whole cell (2 m) round 1 m of stone, so
  you stopped half a metre short of them. Now it's as wide as the stone; the Throne Hall's skull pillars with their
  skulls. Enemies walk closer by them too. Floors 1–2's columns were already right (their base is the whole cell).
- **Each column is its own box** now (side by side, they were merged into one).
- A body **pinned to a pillar** hangs against its stone, and its blood is on the stone (they floated off the plain
  column's wide base).

## What was built
`sim/combat/meleeParry.ts` (the melee parry), `fists.ts` (`parried`), `step.ts` (the wait), `enemies/enemy.ts` (the
fight's fists), the melee blows of `brawler.ts`, `grunt.ts`, `leaper.ts`, `frog.ts`, `snake.ts`, `wasp.ts`,
`greenBlob.ts`, `dinoBlob.ts`, `snapper.ts`, `squidle.ts`; `sim/combat/pillars.ts` (the stump's and the top's boxes,
the walk grids, against the stone), `splat.ts`, `world/navGrid.ts` (`addWall`), `world/dungeon/assemble.ts` and
`styles.ts` (each column its own box, as wide as its stone), `world/arena.ts`, `physics/rapierWorld.ts` (`swap`),
`engine/run.ts`, `engine/pillarBreak.ts`. Tests: `test-parry.ts`, `test-pillar.ts`.

## Unseen in the game
Checked by tests: the melee parry's timing against real swings, and walking round the fallen tops.
