# Update 0.3.68 — standing enemies keep moving

Status: built (2026-11-06). Found while fixing Hellwarden's missing skull (0.3.66). **The designer hasn't asked for this one, and it changes how nearly every enemy stands: please look at it in play.**

## What was wrong
Stand still for a moment and an enemy froze: its idle played once, then it was a statue until its next clip.

- `clipOf(look, 'rise')` falls back to the idle clip, and the mixer gives one action per clip. So on a look with no `rise` of its own, `rise` and `idle` were one action.
- `rise` is a one-off, so that action was set to play once and hold. Each frame its speed was overwritten too: every idle played once over a Skeleton's rise time (1.6 s), whatever its length.
- `hit` did the same on the looks that use their idle's clip as a flinch (the newer pack's, Okami, and others), so a `rise` of its own wasn't enough: a Skeleton and the Bone King froze too, after one play at their proper speed.

Of the 96 looks, 92 froze, and 4 didn't (Hellwarden, since 0.3.66; the draugr, the Barrow Maid and Haugbui). Of the 92, you'll see no change on 7: the 4 ships have no clips, and the Karateka, the Karate Girl and the Kunoichi stand on a one-frame `Stance`.

## The fix (`engine/enemiesView.ts`)
A role on its idle's clip now just stands. It can't change how the idle plays.
- **Rise, flinch and attack on the idle's clip:** the idle keeps looping, at its own pace, with no restart and no flash through the bind pose. That covers `rise` on 90 looks, `hit` on 22, and `attack` on the Gunner and the fish.
- **A corpse still stops.** A fish, the Tentacle and the Big Shark die on their idle's clip, so their death gets an action of its own (a copy of the clip sharing its tracks) that plays once and holds, as before.
- **A move's own clip on the idle's clip** (the Drowned King and the Velociraptor through their warnings, Okami's stances, the Shadow's) stands at its own pace, not fitted to the warning. A slowed one, like Okami's when its charge breaks, goes back to normal afterwards.
- **Real rises are untouched:** the Skeleton, the Bone King, the draugr and the rest play theirs once, held, at their knobs' speed.
- **Executions are as they were** (below).

## Did anything need the frozen idle?
One thing: **executions.** Your hands follow the body's bones as they're drawn (`exec/hands.ts`), so a body that kept breathing moved your fists. `test-executions.ts` caught it: the Jelly's clasped fists 0.24 mm closer than they were, and under the test's limit. So in an execution a body on its idle's clip still plays it once, at the speed it always did, and holds, through a copy of the clip of its own (`@stood`).

All 105 executions (plain and wall finishers, both hands and every bone, frame by frame) were compared, old code against new. 99 are identical to six decimal places. The 6 others are fish: identical while you hold them, and different only once they're dead, because a corpse's last wriggle now plays at its clip's own pace rather than at its run's.

Nothing else needed it. Each was run frame by frame through the real `EnemiesView`, old code against new:
- `temple/drownedPose.ts`, `norse/rocPose.ts`, the Bone King's arms in `boss/kingPose.ts`: they reach for a place in the world, so a live idle underneath is fine. Their arms now sway under a part-weight reach, as designed, where a frozen clip let the weight build up to full.
- `shrine/okamiFx.ts`: its tail starts from its stored rest each frame. `shrine/shrinePose.ts` only tips the whole body.
- `hell/wardenPose.ts`: starts from the clip each frame, and its look keeps its own `rise`.

## Found, not fixed: code poses that still build up
Both were there before this update, and neither is worse for it. They're the same kind of fault as Hellwarden's neck: a relative turn on a bone the clip holds still, so the mixer never writes it back.
- **The Bone King, `boss/kingPose.ts`:** once it has rebuilt (stage 1 on), `rotateX` on its torso and neck runs every frame, and `Skeleton_Idle` holds both still for its whole length. They turn right round, about 0.26–0.42 rad a frame, and only faster at 144 fps. Its Grasp's bow does the same to its hips (3.09 rad in its 1 s warning). Exactly the same numbers on the old code.
- **The Velociraptor, `boss/raptorPose.ts`:** its tail's `rotation.z += flick` runs every frame, and `Velociraptor_Idle` holds its tail still for up to 1.17 s. Through its wind-ups Tail2 still goes about 3 rad. This update helps the end of its tail (Tail4 in its Sickle's warning, 1.22 → 0.42 rad), but doesn't cure it.
- **Likely fix:** start each frame from the clip's pose, as `wardenPose.ts`'s `unpose` does.

## Checks
- **New:** `tests/test-idle-stands.ts`. All 96 looks (stand-in bodies, real `attach` and `update`) still moving past three plays of their idle, at their own pace; 13 real models the same; flinches, the Gunner's aim, moves on the idle's clip; corpses stop; a body in an execution plays its idle once and holds; a grunt's swing lands on time; the Skeleton's and the Bone King's rebuild, the Bone King's show and the draugr's rise once, at their knobs' speed.
- **On the old code it fails 32 checks**, then stops where it looks for the `@stood` action, which the old code doesn't have.
- **Frame cost:** 16 enemies standing, about 0.01–0.02 ms more a frame in `EnemiesView.update` (about 0.09 → 0.10 ms), on the mixers alone, nothing drawn.

## Files
- **New:** this spec; `tests/test-idle-stands.ts`.
- **Changed:** `engine/enemiesView.ts`, `tests/run-all.ts`.
- **Not touched:** `hell/wardenLook.ts`. Floors 8's and 9's bosses have only what the shared fix does: Okami and Tidebreaker now breathe when they stand.

## Unseen
Not played: tests only, no look at it in the game. Check:
- **Anyone standing**, floor 1 will do: a grunt on a perch, or one that's stopped because it can't reach you.
- **The bosses standing:** the Drowned King, the Bone King, Okami, Tidebreaker.
- **The fish:** they keep swimming as they wait, and stop when they die.
- **Press E on one already standing:** the one case where an execution can still look a little different. It used to be frozen already; now it plays its idle once as you take it.
