# Update 0.3.42 — The Swarm, the Venom Garden's boss (first playable)

Status: built (2026-11-04). The designer: "try floor 2 Boss 'The Swarm'". Their spec is `MD/the-knot-3d-boss.md`, written
for Unity; here it's in this engine and fought with fists. They also sent the reel it came from (@NEENERDEV's).
After the first renders, the designer said: "make the worm models 2 times smaller and increase the amount" (see Thin
worms below).

## The reel's method (read from its frames; the narration wasn't heard)
- **The worms:** each is a chain of beads moved by Verlet steps and held by distance constraints. This is Jakobsen's
  "Advanced Character Physics", from *Hitman: Codename 47*. A tube is drawn over the beads.
- **The cost:** bead against bead was the bottleneck: 32,000,000 checks a frame at 8.8 fps. A grid fixes it (each bead
  tests the 27 cells round it), giving 64 fps, then 125 fps.
- **Walls:** a distance field baked from the level. Not needed here: the boss rooms' walls and pillars are boxes, which
  the nav grid already lists.

## What it is now
- **The heap:**
  - 220 thin worms, 16 beads each (6.5 cm thick, 1.5 m long), coiled round one eye (0.9 m) that floats half a metre off
    the floor;
  - about 3.7 m across and 2.2 m high, the top of the eye showing;
  - each worm's head swims round the eye on its own axis, wriggling; its body is pulled to the eye;
  - beads stay out of each other, the eye, the floor, and the walls and pillars near.
- **It drifts at you** (3 m/s) and keeps about 5 m off.
- **The lash** (its first attack):
  - every 2.6 s, if you're near, the 5 worms on your side wind up: they glow orange and draw back (0.6 s, the tell);
  - then they're flung at where you stood (0.42 s), the whip along their front half: 12 damage each, once per lash;
  - then the eye draws them back.
- **Punching it:**
  - from where your blow lands in towards the eye, the first worm in the way takes it: it flashes white and is shoved;
  - 5 health a worm, so a jab kills one. A dead worm drops off the heap, bleeds, shrinks away, and its share of the bar
    goes with it (4.4 each);
  - **through a gap, the eye takes the whole blow.** All the worms are worth 60% of its 1,600 health; the eye the rest;
  - a big blow (a charged punch, a slam) tears out every worm near where it lands, as many as it's worth (60 → about
    12);
  - a punch at a full heap never reaches the eye (0 of 400 tried): the worms have to go first;
  - a blow with no landing point (a slam's ring, a bleed, Fire and Ice) lands on the side it came from;
  - **as worms die, the heap thins:** its reach comes in towards the eye, so you can get closer.
- **Its show** is the shared portal intro: the eye rises out of the portal as its worms pour round it. Its name card
  reads THE SWARM.
- **Dead:** its worms drop off in a wave (1.4 s), then the eye's death show is every boss's (rise, hang, sink, burst),
  and its chest gives 15 coins.
- **Never staggered, never stunned,** and not executable (it's a boss).

## Thin worms (the designer: "make the worm models 2 times smaller and increase the amount")
- **Half as thick** (13 → 6.5 cm), and **2.2 times as many** (100 → 220).
- **Not half as long:** halved in length too (1.1 m), packed in the heap they read as short red shards, not worms
  (rendered). At 16 beads they're 1.5 m long and thin, like the reel's.
- **Matching that:**
  - gentler bends (every other bead at least 1.92 spacings apart, was 1.85; tight curls of short links looked like
    shards);
  - a jab kills one (5 health, was 9);
  - 5 lash at once (was 3);
  - a lashing worm is flung whole, the whip along its front half (dragging fifteen beads, the head alone fell short of
    you).
- **Volume:** an eighth of the volume a worm. Keeping the old heap's size would take about 800 worms, several times the
  budget. So the heap is a little smaller (3.7 m, was 4.5 m).

## Cost (measured headless, one 60 fps frame)
- The worms: 1.9 ms. They step 60 times a second (the spec's rate), every other game tick, and are drawn between steps.
- Building the tubes: 0.9 ms (six sides, a ring a bead: about 21,600 vertices).
- About **2.8 ms in all**; the first try, 100 fat worms, was 1.5 ms. F1 → The Swarm → Worms lowers it if your PC
  struggles.
- **Getting there:**
  - a dense grid round the heap (no hash-collision bookkeeping);
  - plain square roots in place of `Math.hypot`;
  - only every other bead of a worm colliding, as a ball half a spacing bigger. Its neighbours share half its shove, so
    no zig-zags. Pairs tested went from 108,000 to 55,000 a step.

## Tuning (F1 → The Swarm)
Health, the worms' share, worm count and health, beads, spacing, thickness, eye size and lift, heap reach, the pull to
the eye, gravity, damping, wriggle, head pull, speed, keep-off distance, the lash (count, every, wind-up, time, speed,
reach, damage, recoil), coins.

## Next (the spec's build order)
1. Lashes parryable: the glow is the cue; parried, the worm dies and the boss staggers.
2. Spew (crawlers that hunt you).
3. Phases at 66% and 33%: the roll and charge (into a wall it's stunned, its eye bare), the worm rain from the
   pillars, the swallow.
4. Its own intro (Tidebreaker's standard).
5. Real sounds from the Sonniss library (synth placeholders now).

## Files
- **Sim:**
  - `src/sim/enemies/swarmBody.ts`: the worms;
  - `swarmHits.ts`: blows;
  - `swarm.ts`: the boss, the lash, its death.
- **Tuning:** `src/tuning/swarm.ts`.
- **View:** `src/engine/swarm/swarmView.ts`.
- **Wiring:** the Enemy's `swarm` body, `radiusOf` and `enemyAxis` (a ball round its eye), `hitEnemy`'s `at` (where a
  blow landed, from `hitTarget`), floor 2's boss, names, coins, the Lab, blood, synth sounds.
- **Tests:** `tests/test-swarm.ts` (21 checks):
  - the heap sound, the grid against every pair, the cost;
  - the lash's tell and bite;
  - jabs on worms, the share off the bar, the crater, the eye through a gap, the thinning;
  - the death, floor 2's room show into the fight, the drawn tubes and eye.
- **Floor 2's boss in tests:** the Lab, the bestiary, the boss skip, the Bone King's and the Dragon's (the Dragon's
  room test moved to floor 1).

## Unseen
- Seen in Blender renders from the game's own meshes (settled, winding up, lashing, thinned), shaded smooth as the game
  does (`render_view.py` learned a `smooth` flag), and in tests.
- Not played: the feel of punching into it, and its speed on your PC. Please try it: Lab → floor 2 → Room, or a run
  to floor 2.
