# Update 0.3.90 — Gravity Sean: healing by stance, longer Black Hole reach, faster sphere, doomed enemies show red

Status: built (2026-11-06), not played. The designer:

> * when the black hole is casted and player change to normal mode the healing need to go through since it's an attack in the unstable mode
> * the black hole range increases by 25%
> * to max out the RMB in normal is 5.5 sec, now deal 25% more damage than before in general
> * Normal mode heals too on kills. 2 HP on kill and 5 HP on mini bosses
> * change unstable mode healing to -> 4 HP on kill and 12 on mini boss
> * IN time stop mode, enemies that dies during time stop mode will be highlighted in red

## Healing

| | A kill | A mini-boss or boss |
|---|---|---|
| Unstable mode attack | 4 | 12 |
| Normal mode attack | 2 | 5 |

**A kill now counts by the stance its attack was struck in, not the one you're in as it dies** (`g.as`, `gravKill`). That's the Black Hole fix, and the same rule covers the rest, so it can't come back in another form:
- Black Hole, its damage and its burst: Unstable.
- Vent, and the overload's blast: Unstable, though they end it.
- Shockwave Punch, even if you leave Unstable in its wind-up: Unstable.
- Rocks, the sphere and the plunge, landing after you've gone Unstable: normal.
- Time Stop's stored hits: by the stance they were struck in. If a target took both, it counts as Unstable.

## Black Hole
"Range" went up 25% both ways, as with Meteor: it pulls from 15 m (12), and flies 37.5 m (30). Its burst and its damage are as they were.

## Right click in normal mode
- **Full in 5.5 s**, from 10. **My call:** it no longer comes down the moment it's full. It waits for you, so you choose when, and still comes down at 10 s, your earlier limit (`Sphere hold`).
- **25% more damage in general:** a chunk 37.5 (30), a pillar 100 (80) and its burst 37.5 (30), the sphere at its fullest 375 (300). Size, reach and knock are as they were.

## Time Stop: red means it dies
Once what it's holding on an enemy is enough to kill it, that enemy shows red (`engine/sean/doomTint.ts`): its own colour drawn to red and a red glow, so it reads on any model. Its spark goes red too, and there's one low note. You can see who's done and move on.

**The red is exact:** `wouldDie` in `enemy.ts` asks what the blow would do. Things that go on after 0 don't show red, because they aren't dying: a Skeleton, a Cursed Crewman, a mech with a pilot, the Bone King. Nor does a Swarm while its worms shield it, or a boss with its cancel window open.

**The stopped world's less grey:** 50%, from 75%. That grey is a filter over the whole screen, so it drained the red too. F1: `Time Stop grey`.

## Tests
`test-sean-moves.ts` (the healing, each attack by its stance), `test-sean-stop.ts` (red, and that it's exactly who dies, across nine kinds), `test-sean-unstable.ts`, `test-sean-grab.ts`. Not played by me.
