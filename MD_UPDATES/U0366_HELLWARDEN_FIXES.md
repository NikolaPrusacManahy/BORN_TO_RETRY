# Update 0.3.66 — Hellwarden's mask and swing fixed

Status: built (2026-11-06). The designer, playing 0.3.65: "he is supposed to have his skull face on here" and "like he is about to swing with the blade like he is faking the swing".

## The mask
- **What was wrong:** in the close-up its skull was folded back behind its collar, about 1.2 m lower than it belongs, so the shot showed an empty collar.
- **Why:**
  - Its look had no `rise` clip, so `clipOf` gave its idle clip for it. That's one shared action, so `Sword_Idle` played once, sped up, and stopped.
  - The mixer only writes a bone when the clip's value changes. Once the clip stopped, nothing wrote over its neck, and the pose's small turn built up on itself every frame.
- **Fix:**
  - It has a `rise` of its own that it never plays, so its idle loops at its proper speed.
  - `wardenPose.ts` starts each frame from the clip's pose, so a pose can't build up.
- A single posed still can't show this. `test-warden-show.ts` now plays the show frame by frame through the real `EnemiesView` and `WardenFx`.

## The swing
- **What was wrong:** its Blazing Arc played `Sword_Heavy_B`, the second hit of a combo. It starts with the sword already out, goes up, dips, goes up again and comes down. The blow fell at 42% of it, with the sword on its way up.
- **Fix:**
  - The Arc plays `Sword_Heavy_A`, the opening swing, from idle. The blow falls mid-sweep (0.40 s of 0.73 s).
  - Risen, the first swing plays out and chains into `Sword_Heavy_B` for the second swing, whose blade lands as the second blow does.
- **Balance change:** risen, the swings are now about 0.58 s apart instead of 0.32 s, so there's a clip to show for each. It's two separate jumps now.

## Its Brand
The same fault: its blow wasn't on its slam, and it stood back up while its sword was still "planted". The blow now falls on the slam, and it stays down with its sword in the floor for as long as the rules say it's there to be hit (F1 → Hellwarden, "Sword planted"), then gets up.

## Also
- The eye's flare is just the eye's: it was 9 m wide and washed out its whole face.
- The embers are round and smaller: they were big flat squares up close.
- Less orange rim in the show, so the armor reads less gold.
- The mask shot comes closer the wider your field of view, no closer than 0.95 m.
- `boss-shots.ts` scales and places it as the game does, and takes the shot after posing.

## Files
- **New:** this spec.
- **Changed:** `engine/hell/wardenPose.ts`, `wardenLook.ts`, `wardenSkull.ts`, `wardenCinema.ts`, `wardenForge.ts`, `throneView.ts`; `sim/enemies/wardenMoves.ts`, `hellwarden.ts`; `tools/boss-shots.ts`; `tests/test-warden-show.ts`.

## Not touched
Every other enemy whose look has no `rise` clip has the same fault: its idle plays once, at a speed set for rising, and stops. It's a one-line fix in `enemiesView.ts`, but it changes how all of them stand, so it's for the designer to decide.

## Unseen
Not played yet. The swing clips and the blow's timing were checked in rendered frames, not in motion.
