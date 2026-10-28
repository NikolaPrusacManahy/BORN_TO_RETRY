# Update 0.1.1 — bigger bars, more enemies per floor, the snake execution

Status: built (2026-10-28), from the designer's list:
- "Make the Dash bar and the execution bar bigger, x2."
- "Increase the number of enemies each time we go down a floor. On floor 1 we start at 8, then 11. I want floor 2 to start at 11, then 14, and so on."
- "Start with the snake thing": the execution. With the meter full, press E near a snake: grab its tail, the POV camera follows, smack the body on the ground, swing it onto the ground again, then throw it away, and it one-shots it.

## Bars ×2
- **Dash charges:** each pip is 92 × 14 px (was 46 × 7), 12 px apart.
- **Execution Power meter:** 300 × 10 px (was 150 × 5), still just above the dash charges.

## Enemies per room (Rooms tab)
- A fight room's count = **8** (First room's count) **+ 3 per room deeper** (Per room deeper) **+ 3 per floor down** (Per floor down).
  - Floor 1: 8, 11, 14, 17, 20.
  - Floor 2: 11, 14, 17, …
  - Floor 3: 14, 17, 20, …
- The kinds are still drawn from the floor's roster (weighted, the cheap ones more often), but the number is now exact. The point budget is gone.
- **At most 2 mini bosses a room** (Mini bosses a room).
- Two waves are planned, three from 18 enemies. They still come as one stream that keeps 5 on the field (Update 0.1.0).
- On floor 3's two-level rooms, the perched spitters are part of the count: they replace the cheapest kinds in each wave.
- **(placeholders)** 2 mini bosses; the 18-enemy line for a third wave.

## The snake execution (Execution tab)
- **Who:** a snake within **2.6 m** (Execution reach), no more than **60°** off where you look (Execution aim). The meter must be full.
- **Ready:** that snake pulses crimson.
- **E** grabs it. The meter empties.
- **The moves** (1.3 s at Execution speed 1):
  1. Your fists seize its tail and lift it, the body hanging.
  2. Up in front of you, then **SLAM** into the floor ahead. You look down at it; a short freeze (Slam freeze 0.09 s), a shock ring, debris, sparks, a shake and a deep thud.
  3. Swung up round your right, overhead again, then **SLAM** on your right, harder.
  4. Wound back on your right, then thrown straight ahead.
- **Your hands** (the designer: "make it grab the snake's tail", not the crossed-arms stance): both hands hold its tail as you'd hold a rope or a bat.
  - The left hand holds the tip, the right is beside it, and the tail runs across your right through both fists.
  - Your arms never cross.
  - The tail is held still in your grip; the body and head thrash.
  - It's lifted out of where it stood as you grab it.
- **While you hold it:**
  - You can't move, fight or be hurt.
  - The world holds still (it's frozen in place, not slowed).
  - Your view is turned with the moves (down at each slam, ahead for the throw), then left where you looked.
- **The throw:** it flies **9 m** ahead (Throw distance), short of a wall, in a **2 m** arc (Throw height) over **0.5 s** (Throw flight), tumbling. You're free again as it flies.
- **It lands:**
  - It dies (one shot). Its coins burst, but its kill doesn't refill the meter.
  - Enemies within **2.5 m** (Landing reach) take **40** (Landing damage) and are knocked back (Landing knock 1). Their kills do fill the meter.
- **The Lab's Meter** (the designer: "max execution gauge, only inside the Lab"): on at first, it keeps the meter full, so you can execute again straight away. Lab only (and the rooms and floors started from it).
- **Snake only for now.** Other enemies come once the designer has played this one.
- **(placeholders)** All the numbers above, the synth sounds (grab, slam ×2, whoosh, crunch) and the keyframed moves (`KEYS` in `sim/combat/execution.ts`). They have no animation from Quaternius or Mixamo: the snake's own walk clip, played 3× fast, is its thrash.
