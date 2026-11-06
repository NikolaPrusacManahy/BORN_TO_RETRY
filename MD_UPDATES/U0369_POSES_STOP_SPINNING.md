# Update 0.3.69 — the Bone King and the Velociraptor stop spinning

Status: built (2026-11-06). The designer: "Yes, fix them", on the two bugs found while fixing Hellwarden's skull (0.3.66) and reported in `U0368_IDLE_STANDS.md`.

## What was wrong
Both had the same fault as Hellwarden's neck. Their poses turn a bone by an amount every frame, and the mixer only writes a bone when its clip's value changes. Where the clip holds that bone still, last frame's turn is still there, and it turns again. The higher the frame rate, the faster it goes.

Measured against the pose it should have had at that moment:

| Boss | When | Bone | Off by |
|---|---|---|---|
| Bone King | Rebuilt, raising its arm | Neck | 1.95 rad |
| Bone King | Grasp's bow | Hips | 3.05 rad |
| Bone King | Rebuilt, Grasp's bow | Hips | 2.84 rad |
| Bone King | Cage | Head | 2.31 rad |
| Velociraptor | Crouched for its Sickle or Feint | Tail | 0.95 rad |

## The fix (`engine/poseBase.ts`)
Each frame starts from the clip's pose. `fromClip` puts the bones back before posing, and `posedNow` notes what the pose left. So next frame it can tell whether the mixer has written over them. It handles a bone's turn and place separately, because a clip may write one and leave the other.

- `engine/boss/kingPose.ts`, `raptorPose.ts` use it.
- `engine/hell/wardenPose.ts` had the first version of this and now uses the shared one.

## What you'll see
Their poses are now what they were designed to be, the same as the stills checked when they were built:
- The Bone King is crooked by a set amount once rebuilt, and bows by a set amount in its Grasp.
- The Velociraptor's tail barely moves as it crouches (0.05 rad per bone, 3 bones) and swings by up to 0.4 rad per bone for its Lash.

None of their timing or rules changed. If the tail looks too still when it crouches, that's the 0.05 in `raptorPose.ts`: it can be raised now that it doesn't build up.

## Checks
- **New:** `tests/test-poses-settle.ts`. It plays each pose through the real `EnemiesView` and the boss's real view, at 60 fps, at 144 fps and in one frame, and all three must agree. On the old code 6 of its 9 poses failed. Now all 9 agree to within 0.001 rad.
- A search of `src/engine` found no other boss bone turned this way.

## Files
- **New:** `engine/poseBase.ts`, `tests/test-poses-settle.ts`, this spec.
- **Changed:** `engine/boss/kingPose.ts`, `raptorPose.ts`; `engine/hell/wardenPose.ts`; `tests/run-all.ts`.

## Unseen
Not played. Check the Bone King's Slam and Grasp once it's rebuilt, and the Velociraptor's crouch before a pounce.
