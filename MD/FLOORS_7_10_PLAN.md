# Floors 7–10 — the plan (draft, 2026-11-02)

The designer polled players: half want 10 floors, half more than 10 — "people want at least 10". The run goes back to
**10 floors** (it was cut to 7 on 2026-10-30). This is Claude's plan for the four new floors, to be agreed before
building. Each floor is built as floor 6 was: **the level and its look first, then its enemies, then its boss**, each
its own update with a spec in `MD_UPDATES/`. **The designer (2026-11-02, after floor 7's level): "I want all designs
to be done first"** — every floor's level (8, 9, 10) before any floor's enemies; floor 7's design: "fine". Floor 6 waits
on test phase 2's testers.

## The way down

After the Sunken Grove (6) you keep going down: the sea above has frozen (7), under the ice is the heat that melted the
temple (8), under that the ground gives way to an abyss (9), and at the bottom, the last floor (10). Every floor stays
**bright** (the designer's rule): snow light, lava glow, the abyss's pale light.

| Floor | Name | Its new mechanic | Its boss |
| --- | --- | --- | --- |
| 7 | **Frozen Depths** | ice floors: you slide, momentum carries | a giant snow bird (Birb, big) |
| 8 | **The Forge** | timed crushers and fire vents; moving floors | needs a model |
| 9 | **The Rift** | islands over an abyss: fall = back to the door, hurt | needs a model |
| 10 | **The Last Floor** | every floor's rooms again, all of them at once | **you**: a dark Joseph with your moves |

## Floor 7 — Frozen Depths

- **Look:** frosted stone walls and floors; snow drifts; snowy pines, birches, willows and dead trees in snow beds (they
  grow from earth/snow, never paving); snowy rocks, stumps and logs; glowing ice crystals (RPG pack); falling snow; a
  white-blue haze. All real Quaternius pieces (the Nature pack's snow set).
- **Mechanic — ice:** patches of ice where your feet keep their speed: a dash or slide carries much further, turning and
  stopping take longer. Enemies slide on it too (a knocked-back enemy slides into walls: more splats and pins).
- **Hazards:** icicles over some rooms that fall where you stand (a shadow warns first); snow drifts that slow you.
- **Rooms (8–10 layouts):** frozen courtyards with trees, an ice-lake hall (all ice), a crystal cavern, a snowed-in
  chapel, narrow ice bridges over a frozen drop.
- **Enemies:** (Update 0.3.22 — the frozen warband instead: `MD/FLOOR7_WARBAND_PLAN.md`.) Was (proposal, from the unused
  models): Goleling (a small ice golem: slow, hits hard, armoured from the
  front), Bat (a swarm flier that dives), Alpaking (a flier that spits frost: frosted, you're slower), Pigeon (a
  harasser that steals your coins?), Goleling Evolved (mini boss: a big golem whose stomp freezes the floor round it).
- **Boss: the Frost Roc** (Birb, the big one): wing gusts that push you across the ice, dives, a freezing breath that
  turns the floor to ice under you.

## Floor 8 — The Forge

**Update 0.3.17 — reworked as the Moon** (the designer: "BIG REWORK of FLOOR 8"; `MD/FLOOR8_MOON_PLAN.md`). The Forge
below moved to floor 10 (unbuilt), kept for its echo rooms.

- **Look:** dark iron and stone lit by rivers of lava (bright with its glow), chains, anvils, braziers, sparks and
  smoke; the dungeon kit's metal pieces and code-made machinery.
- **Mechanics:** **crushers** (heavy hammers that slam rows of cells on a beat: their shadow and a clank warn),
  **fire vents** (jets on a timer), **moving floors** (belts that carry you and enemies). The lava from floors 1–2
  comes back, wider.
- **Rooms:** a smelting hall with crushers, a belt maze, a lava crossing on islands, a bellows room (gusts of hot air).
- **Enemies (proposal):** Dog (ember hounds: a fast pack that circles and bites), Cat (a pouncer that hides in
  smoke), Chicken (a cinder chicken that runs at you and bursts into fire), Armabee Evolved (a bomber flier), Mushnub
  Evolved (mini boss: it spreads burning spores), and one more mini boss.
- **Boss:** needs a model (a forge golem, a fire giant…). See "What's missing".

## Floor 9 — The Rift

- **Look:** pale stone islands and broken bridges floating over a bright abyss (white-violet light rising from below),
  ruined arches, wind.
- **Mechanics:** **edges** (fall off and you're back at the room's door, hurt: as lava does now), **crumbling
  platforms** (they give way a moment after you stand on them), **updrafts** (they lift you: jumps across gaps), jump
  pads and wall runs between islands. Knockback near an edge is deadly, for you and for them (punch them off).
- **Rooms:** an island ring, a bridge gauntlet, a tower climb, a field of crumbling stepping stones.
- **Enemies (proposal):** mostly fliers and shovers (Alpaking Evolved, Pigeon flocks…), plus ones that push you.
  Needs more models than are left.
- **Boss:** needs a model.

## Floor 10 — The Last Floor

- **Rooms:** each an echo of a floor before (the brick hall, the garden, the bone keep, the desert, the temple, the
  grove drained, the ice, the forge, the rift), their enemies **mixed together** at the run's hardest.
- **The final boss: "The Retrier"** — a dark copy of Joseph (the Adventurer model, which you play as) that fights
  with **your moves**: it dashes, slides, slams, parries your punches and your parried shots, and tries to execute
  you. Phase 2: the other characters (King, Suit, Swat) join as shadows. The game is *Born To Retry*: the last thing
  you beat is yourself. Uses the humanoid models already in `ASSETS` (their animations need checking).
- Its way down ends the run ("Run complete — Survived", as now).

## The run

- **The run's end** moves to floor 10 when floor 10 exists (`LAST_FLOOR`); until then it stays where it is. **Floor 6
  ships to the alpha** first (it's built).
- **Floor length:** one more fight room every 2 floors puts floors 9–10 at 9; the board holds 8. Proposal: 8 on floors
  7–10.
- **Difficulty:** enemy counts already reach 35 in floor 7's last room. Proposal: cap the count (about 30) and make
  floors 7–10 harder with **mixes, hazards and pace** instead (the game's rule: difficulty from knowledge, not numbers).
- **Mini bosses** keep the chest and key as now; executions, finishers and pinning work on the new humanoid runners.

## What's missing

- **Monster models.** Unused in the pack: about a dozen (Birb, Cat, Chicken, Dog, Pigeon, Bat, Goleling, Goleling
  Evolved, Alpaking, Alpaking Evolved, Armabee Evolved, Mushnub Evolved). Floors 1–6 each used about 7 kinds (2 mini
  bosses, a boss). Four floors need about 28: **more human-made monster packs** are needed (no AI-made art), at least
  **bosses for floors 8 and 9**. The other way is "evolved"/recoloured versions of earlier monsters, which the designer
  turned down for floor 6 ("no porting floor 5 monster").
- **Sounds:** later (the designer).

## Order of work

(Reordered by the designer, 2026-11-02: "all designs to be done first".)
1. Floor 6 into the run (`LAST_FLOOR` 6). Done (0.3.11). Its verdict: test phase 2's testers.
2. **The levels:** floor 7 (done, 0.3.11: "fine"), floor 8 (done, 0.3.13), floor 9, floor 10's echo rooms; each
   playable from the Lab (F8) with stand-in enemies.
3. **Then the enemies and bosses:** floor 7's and the Frost Roc, floor 8's, 9's (as their models arrive), The Retrier;
   `LAST_FLOOR` moves on as each floor is whole.
