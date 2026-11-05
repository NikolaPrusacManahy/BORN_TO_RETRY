# Update 0.3.52 — The Swarm's nest and its intro

Status: built (2026-11-05). The designer: "each boss their designed room", "We also need an intro", "very good, now next boss". The bible asks for "a round flesh cavern, soft floor the worms tunnel through".

## The nest (`world/dungeon/nest.ts`, `engine/swarm/swarmShowView.ts`, floor 2 only)
- **Round:** a boss room's size, its corners walled up in steps. A wall of flesh stands in front of the steps, and a ring of solid boxes behind it, so you walk a real curve and can't get behind the flesh. The doorways have gaps with the flesh closing over them.
- **Flesh:** a veined, breathing floor; ribbed walls 12 m high that lean in at the top; each pillar sheathed. From above, it's a pit in a mass of flesh. All made in code (no AI, no new assets).
- **12 pillars**, up from 4, because Gaze Beam, Split Pupil and the glare all stop at them, so they're what you fight round.
- **Open sky:** the bible says "cavern", but a roof would make it dark, and you want play spaces bright. It's a pit, with the sky above.

## The intro (`sim/dungeon/swarmShow.ts`, `engine/swarm/swarmCinema.ts`)
About 10 s as you see it. SPACE skips it.

1. **The floor heaves.** The view lifts off your eyes.
2. **The flood.** High over the pit: the walls that shut you in are forced back, and behind them 220 worms have been lying all over the floor. They wake, the nearest first, and pour in. These are the real simulated worms, not an effect. The view drops to the floor, low among them.
3. **The heap.** Low in front, pushing in, as they pile up round its eye, closed over.
4. **The eye opens.** The heap parts in front of it. Slowed, the eye on the left of the view and its name on the right.
5. **The laser.** Once round the whole room, shoving through the worms in its way. Back into your eyes, facing it, and the fight.

Tuning is in F1 → The Swarm, "Show:".

## Also
- `boss-shots.ts` can now run the real sim to a beat (`--beat=high|low|heap|open|sweep`) and render the code-made meshes and worms with their colours, on floor 2.
- Worms past its collision grid no longer collide (a whole room of them mustn't all land in its edge cells); `WAIT` is a new worm state; `rush` makes their heads swim harder through the flood.
- `bossRoomOf` no longer uses the Scorched Grove, which was built for the Dragon when it was floor 2's boss. Its template is gone; its ash, charred trees and scorch marks live on in the Dragon's courtyard. The Venom Garden's cobwebs stay out of the nest.
- The floor behind the ring, 432 cells of it, is shut off from everyone, so `test-dungeon.ts` lets the nest off its check for pockets there, and only there.

## Placeholders
- The show's sounds are code-made.
- The burrow holes the bible's "soft floor the worms tunnel through" suggests are only the floor bulging before a burst. There are no permanent holes.

## Files
- **New:** `world/dungeon/nest.ts`, `sim/dungeon/swarmShow.ts`, `engine/swarm/swarmCinema.ts`, `engine/swarm/swarmShowView.ts`, `tests/test-swarm-show.ts`.
- **Changed:** `world/dungeon/rooms.ts`, `assemble.ts`; `sim/enemies/swarmBody.ts`; `sim/dungeon/bossRoom.ts`, `bossBeats.ts`; `sim/combat/events.ts`; `tuning/swarm.ts`; `engine/boss/bossShow.ts`, `showViews.ts`; `engine/swarm/swarmView.ts`, `engine/foeFeedback.ts`; `audio/bossSounds.ts`; `tools/boss-shots.ts`, `tools/blender/render_dungeon.py`.
- **Tests:** `test-swarm-show.ts` new; `test-swarm.ts` and `test-venom.ts` updated.

## Unseen
- Not played. The room, the worms and the shots were checked in Blender renders of the real worm sim and camera positions, with colours.
- Not seen in the game's own renderer: the materials' gloss, the eye's moves, the flood's motion, the laser's sweep, the dust.
