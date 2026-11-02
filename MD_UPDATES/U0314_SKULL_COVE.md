# Update 0.3.14 — floor 6 reworked: Skull Cove, its level (enemies and boss next)

Status: built (2026-11-02). The designer: "time to rework floor 6 entirely": a new `ASSETS/QUATERNIUS/FLOOR-6` (the
Pirate Kit); the boss the Big Shark, fought under water; the rest of floor 6 not under water any more, a pirate floor;
its enemies new. The plan (`MD/FLOOR6_PIRATE_PLAN.md`), the designer: "Go with it". This is its first part, the level;
the enemies are next, then the boss.

## The look
- **Sand** underfoot everywhere (no paving), each patch a slightly different shade; **the sea** in channels and pools
  (still, glossy blue water, no glow); floor 3's stone walls as weathered sea rock under a bright tropical sky; sea
  spray and sand blowing across.
- The **Pirate Kit**'s pieces keep their own palette: palms, rocks, **boardwalks** (its docks: planks and posts over the
  sea), **houses**, a **beached ship**, small **boats** up on the sand, **powder kegs**, giant **bones and skulls**, rock
  **outcrops**, chests and gold, buckets, bottles, anchors, small boats moored in the docks.

## The sea
- Fall in: hurt (as lava) and back where you came in; "The sea" on the death screen if it kills you. A splash, no
  burn, no poison.
- **A body knocked out over the sea sinks**: a live enemy dies (your kill) and goes under. (The same over any pit:
  lava, sludge.)

## No cannons
Built first (firing in turn down their lines), then taken out. The designer: "remove canons, they are far far
unmanagable on fast gameplay game". The Battery, built round them, became the Shipyard.

## Powder kegs
- A barrel with a bomb on its lid. It **goes up** when one of your punches lands on it, a slam lands by it, a body is
  thrown into it, or another keg's blast reaches it (a moment later: chains).
- Its **blast** (4.5 m): up to **30** to you and **150** to enemies (half at its edge), throwing you out and flinging the
  bodies. "A powder keg" on the death screen.
- Kegs wait while an execution, a grab or a pin holds the world (and while paused).

## Its rooms (nine, floor 6 only)
The Docks (a harbour basin, boardwalks crossing it), The Beach (palms, rocks, outcrops, rock pools), The Wreck (a ship
beached in the middle, its deck a 2.5 m platform with steps up), Pirate Town (houses along the lanes), The Shipyard
(small boats up on the sand for high cover, kegs between), The Hoard (outcrops like a cave's pillars, a giant
skull, chests and gold), The Powder Store (kegs everywhere), Bone Reef (arches of giant ribs to run under, skulls, rock
pools), The Kraken's Pool (a wide pool, a boardwalk round it). The Sunken Grove's rooms are retired.

## For now (stand-ins)
- **Enemies:** floor 7's stand-ins (dry-land ones from the floors before). **Boss:** the Velociraptor, in a dry boss
  room: the flooded room comes with the Big Shark (the plan's update 3), since its shape is the fight's.
- The Sunken Grove's fish and the Old Whale are out of the game; their code stays (the swimming and the underwater look
  are for the boss room).
- The Lab (F8): floor 6 is in the bottom row now (Floor 6, 7, 8) until it has its own enemies; floors 1–5 on two pages.

## Knobs (F1 → Skull Cove)
Keg blast 4.5 m, damage 30, on enemies 150, knock 12, chain 0.18 s; keg punch reach 2.4. **(placeholder numbers)**

## What was built
`world/dungeon/coveRooms.ts` (the rooms), `cove.ts` (kegs, set pieces and their dressing), `rooms.ts` (= * Z z M r X;
the Sunken Grove's rooms out), `styles.ts` (`COVE_LOOK`), `styleTypes.ts` (`sandFloor`, `palms`, a pit's
`calm` and `poisons`), `dressing.ts` (sand floors), `dressExtras.ts` (a look's palms), `ownDressing.ts`, `assemble.ts`;
`sim/dungeon/powder.ts`, `lava.ts` (the sea; bodies sinking), `roomLoop.ts`, `wavePlan.ts` and `enemies/kinds.ts`
(stand-ins), `player/state.ts`, `combat/events7.ts`, `screens/deathText.ts`, `tuning/cove.ts`;
`engine/cove/coveView.ts` (kegs), `depthsView.ts`, `dungeonView.ts`, `lavaView.ts` and `dungeonGlows.ts` (still
water), `sandView.ts` (sand's shades), `motesView.ts`, `depthsFeedback.ts` (floors 6–8's feedback, out of
`combatFeedback.ts`), `run.ts` (a blown keg's block out of the world), `moveFeedback.ts`, `audio/soundLayers.ts`,
`impactSounds.ts`, `moveSounds.ts` (made in code); `tools/blender/export_dungeon_kit.py` (the Pirate Kit, its palette as
one image and material), `tools/dungeon-shots.ts`. Tests: `test-floor6.ts` (rewritten), and the tests that still had
floor 6 under water, the fish on it or the Old Whale its boss; the kit's tests parse it untextured.

## Unseen in the game
Rendered in Blender (the rooms, the Pirate Kit's pieces with their palette); to see in the game: the sand, the sea's
gloss, the kegs' blasts and chains, bodies sinking.
