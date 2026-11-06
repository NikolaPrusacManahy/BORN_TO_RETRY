# Update 0.3.82 — Gravity Sean, 2 of 3: Grab and Fling

Status: built (2026-11-06), not played. From the bible (`enemy_bibles/Born to Retry — Gravity Sean.docx`), the move it calls "Sean's standout move". The designer: "open suggestion, just put place holders".

## Grab (right click, normal mode; `sim/combat/gravityGrab.ts`)
- **Press:** pulls what you're aiming at to your hand, over 0.35 s. **Press again:** throws it at what you're looking at.
- **What it takes:**
  - A **pillar** on your line of sight, within 14 m: a big chunk. Its stump's left and its collision goes with it.
  - Otherwise the **floor** where you look: a small chunk, leaving a crater.
  - Aimed at a wall or the sky: the floor 3.5 m ahead. So it always works, as the bible asks. The arena's walls are never taken.
- **Size matters:**

| | Speed | Hit | |
|---|---|---|---|
| Small | 36 m/s | 30 | |
| Big | 20 m/s, falling a little | 80 | and a burst as it breaks up: 30 within 3.5 m |

- **Shield:** while held, a shot passing within 0.55 m of the piece is stopped. It hangs in front of you, so that's from the front. Shots from behind still hit you. It doesn't stop melee, beams or thrown bombs.
- **Outline:** what you'd take shows a faint outline: a box on a pillar, a very faint ring on the floor (fainter, because the floor is always there).
- **Going Unstable or overloading** breaks up whatever you're holding.
- A floor keeps its last 12 craters, as a look only: they don't change how you walk.

## Fling (right click, Unstable mode; `sim/combat/gravityFling.ts`)
- **Press on an enemy within 16 m:** it's caught and lifted, held the way an execution holds one, so whatever it was doing stops.
- **Let go** (or after 2.5 s): it flies to what you're looking at, at 24 m/s, 22 m at most, then gets up. Damage scales with Instability, like his fists.
- **Too big to lift** (a boss, a mini-boss, a large one): my call: it just takes a blow of 22.

## Open decision in the bible: placeholder
**Fling targets:** flung into a wall, another enemy, or what can't be walked on (lava), it takes double. Into another enemy, that one takes it too. A wall gets the usual splat on top. I took the bible's suggestion.

## What the bible asks that isn't there yet
- **"Anything except the arena's boundary walls."** For now that's pillars and floor. The floor's other pieces (rocks, barrels, statues) are only drawn, with no rules of their own to tear them from. They'd need a list of what's loose on each floor.
- **Lava:** a flung enemy strikes the edge and takes the bonus, rather than falling in.

## The hand (`viewmodel/seanHands.ts`)
The right hand comes up, open, palm out, while holding a piece or an enemy, and shoves as it throws. The left stays in its guard. The wrist is 14°.

## Still placeholders
Every number (F1, Gravity Sean); the stone, craters and outline (`engine/sean/piecesView.ts`); the sounds (`audio/seanSounds.ts`). A held pillar shows as a lump of stone, not the pillar itself.

## Tests
`tests/test-sean-grab.ts`, through `stepCombat` with real blows. Not seen moving by me.
