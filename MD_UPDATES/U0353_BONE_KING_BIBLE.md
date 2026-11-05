# Update 0.3.53 — The Bone King by the Boss Design Bible

Status: built (2026-11-05). The designer: "just go next boss, arena / moves and intro". Source: the bible's Boss 3, Giant Skeleton, "Go vertical": its own body is a platform you climb. Its intro is 0.3.54.

The bible's list replaces its old moves (thrown skeletons, double jump-smash, summons, final blast), as it did for the Dragon. Your two-life bar stays: it's the bible's phase 2 at half health.

## Its moves

| Phase | Move | What it does | Tell | Counter / punish |
|---|---|---|---|---|
| 1 | Rib Boomerang | 2 ribs thrown, curving out one side and back the other | Hand into its own chest, a cracking sound, 1 s | Watch the return. Jump them, or parry one back: it staggers 1.5 s. It stands open until they're back |
| 1 | Grave Grasp | Hands burst from the floor where you stand | Bone dust follows you under your feet, 1 s, stopping 0.25 s before | Dash off or jump. Caught: 6 hits in 2 s to mash out, and it reels 1.5 s. Otherwise they throw you at the wall for 30 |
| 1 | Arm Slam | Its forearm flat on the floor, 30 damage under it | Arm raised high, a long 1.2 s pause; a strip of floor shows where | Dodge aside, then run up its arm: a real ramp for 3.5 s to its shoulder, the skull in reach (2× damage) |
| 2 | Shatter & Rebuild | Bones fly out along 14 spokes to 25 m, hang, fly back; 16 per hit | Rattles, arms out, the spokes show on the floor, 0.8 s | Stand between the spokes or jump. Its core is bare for about 3.4 s: 1.5× damage |
| 2 | Rib Cage Trap | Ribs erupt in a 3.2 m ring round you and close | Ring of cracks round you, 0.8 s | Dash out first. Shut in: one swing breaks a bar, or it crushes you for 28 after 3.5 s |
| Ult | Bone Colossus | Every bone flies to it; it goes to the room's middle at twice its height, one arm down, a club rising | Bones float, green fire in its eyes, the music cuts | See below |

- **Phase 2:** it shatters and rebuilds wrong, as your two lives already did: a crooked spine, two more arms, green eyes. Tells 20% quicker, a shorter pause, and Grave Grasp comes twice.
- **On a ledge:** its hands and cage can't reach you, so it mostly throws ribs (aimed at your height), and Shatter in phase 2.

## Bone Colossus
On the shared ultimate (`sim/enemies/ultimate.ts`): once as phase 2 starts, then about every 60 s.

- **The cancel:** "CLIMB IT, BREAK ITS SPINE", 7 s (the bible's). Run up its lowered arm to the walkway across its shoulders, 5 m up, and land 3 blows on the glowing vertebra.
- **Only from up there:** any weapon counts, but a shot from the floor doesn't reach it. So fists-only players can do it as well as anyone.
- **Cancelled:** it shrinks back and reels 5 s, hits do 1.5×.
- **Failed:** its club crosses the whole floor: 65 damage and thrown, never an instant death. Only being up on a ledge clears it. A jump's top doesn't.

## The pit (`world/dungeon/pit.ts`, replaces the Throne Hall)
- "A bone-filled pit with ledges along the walls": 12 m walls, a 2.5 m ledge round all four, cut at the doorways, reached by steps, 4 jump pads and wall runs.
- Its middle is clear for the arm and the Colossus.
- Bones lie thickest by the walls and thin out towards the middle. My first go buried the floor, and the tells have to show there.

## Choices past the bible (placeholders; F1 → Bone King)
- Every damage, reach, speed and time not quoted from the bible.
- **Taller:** it's 7.5 m (was 6), so its arm is a climb. Same health (never tankier): 700 a life.
- **Long arms:** the model's are too short to reach the floor from its shoulder, so they're 25% longer always, and stretch further lying on the floor.
- **Grasp held still:** your existing grab screen and "thrown at the wall" are kept as the bible's "free hit", 6 hits in 2 s instead of 10 in 3.2 s. Your hits land on the hands and don't hurt it.
- **Any swing breaks the cage:** it doesn't check you aimed at a bar.

## Files
- **New:** `sim/enemies/kingBody.ts`, `engine/boss/kingPose.ts`, `world/dungeon/pit.ts`.
- **Rewritten:** `sim/enemies/boneKing.ts`, `boneKingMoves.ts`, `tuning/boneKing.ts`, `engine/boss/kingView.ts`, `kingFeedback.ts`, `audio/kingSounds.ts`, `tests/test-bone-king.ts`.
- **Changed:** `sim/enemies/enemy.ts`, `bodies.ts`; `sim/combat/orbs.ts`, `targets.ts`, `parry.ts`, `grab.ts`, `step.ts`, `strike.ts`, `events.ts`, `bombs.ts`; `world/arena.ts`, `dungeon/rooms.ts`, `ownDressing.ts`, `keepDressing.ts`, `boneRooms.ts`, `styles.ts`; `physics/rapierWorld.ts` (`setBody`); `engine/run.ts`, `enemiesView.ts`, `enemyLooks.ts`, `shotLooks.ts`, `shotsView.ts`, `boss/bossShow.ts`, `boss/bombView.ts`; `tools/boss-shots.ts`.
- **Tests:** `test-bone-king.ts` rewritten, walking its arm in the real physics and playing a 300 s fight; `test-bone.ts`, `test-floor3b.ts` adjusted.

## Unseen
- Not played: feel, timing and difficulty are unverified. Sounds are code-made placeholders plus your existing clips.
- Poses and props were checked in Blender renders of the game's own pose code on the real model; not seen moving, nor in the game's renderer.
